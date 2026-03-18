import { Socket, createServer } from 'net'
import { type Message, MessageSchema, RegularTransactionSchema  } from './types'
import canonicalize from 'canonicalize'
import { add_peer, get_peers } from './peers'
import { objectManager } from './object'

import { verifyAsync } from '@noble/ed25519'
import { utf8ToBytes, hexToBytes} from '@noble/hashes/utils.js'


const PORT = 18018
const SERVER_ID = '95.179.176.219:'+PORT
const NAME = 'MMA'
const VERSION = '0.10.1'


function parse_peer_address(peer: string): { host: string, port: number } | null {
    //[IPv6]:port
    if (peer.startsWith('[')) {
        const close = peer.indexOf(']')
        if (close === -1) {
            return null
        }
        const host = peer.slice(1, close).trim()
        const rest = peer.slice(close + 1)
        if (!rest.startsWith(':')) return null
        const port = Number(rest.slice(1).trim())
        if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null
        return { host, port }
    }

    //IPv4 or dns
    const idx = peer.lastIndexOf(':')
    if (idx <= 0) return null
    const host = peer.slice(0, idx).trim()
    const port = Number(peer.slice(idx + 1).trim())
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null
    return { host, port }
}

// Networking helper functions
    
async function send_message(socket: Socket, msg: Message) {
  socket.write(canonicalize(msg) + '\n')
}

async function broadcast_ihaveobject(exceptPeerId: string, objectid: string) {
    for (const [peerId, sock] of peerSockets.entries()) {
        if (peerId === exceptPeerId) continue;
        if (sock.destroyed) continue; 
        await send_message(sock, {
            type: 'ihaveobject',
            objectid
        } as Message);
    }
  }

// Handshake
async function connect(socket: Socket) {
    await send_message(socket, {
        type: 'hello',
        version: VERSION,
        agent: NAME
    } as Message)

    await send_message(socket, {
        type: 'getpeers'
    } as Message)
}

async function handle_message(socket: Socket, id: string, message: Message) {
  switch (message.type) {
    case 'getpeers':
        console.log(`[${id}]: Requested peers, sending discovered peers`) 
      send_message(socket, {
        type: 'peers',
        peers: Array.from(discovered_peers).concat(SERVER_ID)
      } as Message)
      break

    case 'peers':
      console.log(`[${id}]: Received peers, updating discovered peers`)
      for (const peer_id of message.peers) {
        if (!discovered_peers.has(peer_id)) {
          discovered_peers.add(peer_id)
          add_peer(peer_id)
        }
      }
      break

    // objects exchange and gossiping

    case 'ihaveobject': 
      const objectid = message.objectid;
      
      try { 
        const known = await objectManager.exists(objectid);
        if (!known) {
          send_message(socket, {
              type: 'getobject',
              objectid
          } as Message);
        }
      } catch (err) {
        console.error(`[${id}]: exists failed`, err);
      }
      break;

    case 'getobject': {
      const objectid = message.objectid;
      
      const known = await objectManager.exists(objectid);
      if (!known) {
        send_message(socket, {
          type: 'error',
          name: 'UNKNOWN_OBJECT',
          description: `Object ${objectid} not found`
        } as Message);
        break;
      }
      
      try {
        const obj = await objectManager.get(objectid);
        send_message(socket, {
            type: 'object',
            object: obj
        } as Message);
        
      } catch(err)  {
        console.error(`[${id}]: get failed`, err);
      }
      break;
    }

    case 'object': {
      const obj = message.object;

      const objectid = objectManager.objectId(obj);

      const known = await objectManager.exists(objectid);
      if (known) return;

      switch (obj.type) {
        case 'transaction':
          console.log("Received transaction");
          const reg = RegularTransactionSchema.safeParse(obj);
          if (!reg.success) break;  // Coinbases are valid for now

          const transaction = reg.data;

          const unsigned = {
            type: transaction.type,
            inputs: transaction.inputs.map(({ outpoint, sig }) => ({
              outpoint,
              sig: null,
            })),
            outputs: transaction.outputs,
          };

          const canonicalized = canonicalize(unsigned);
          if (!canonicalized) {
            console.log("Failed to canonicalize unsigned transaction");
            return;
          }

          var inputSum = 0;
          const usedOutputs = new Set<string>();
          for (const input of transaction.inputs) {
            const outpointkey = `${input.outpoint.txid}:${input.outpoint.index}`;
            if (usedOutputs.has(outpointkey)) {
              console.error(`[${id}]: Duplicate transaction outpoint`);
              send_message(socket, {
                type: 'error',
                name: 'INVALID_FORMAT',
                description: 'Transaction outpoints must be unique'
              });
              socket.end();
              return;
            }

            usedOutputs.add(outpointkey);

            const txid = input.outpoint.txid;
            const found = await objectManager.exists(txid);
            if(!found) {
              send_message(socket, {
                type: 'error',
                name: 'UNKNOWN_OBJECT',
                description: 'Transaction txid not found in database'
              });
              socket.end();
              return;
            }

            try {
              const inObj = await objectManager.get(txid);

              switch (inObj.type) {
                case 'transaction':
                  if (input.outpoint.index >= inObj.outputs.length) {
                    console.error(`[${id}]: Too large transaction outpoint index`);
                    await send_message(socket, {
                      type: 'error',
                      name: 'INVALID_TX_OUTPOINT',
                      description: 'The transaction outpoint index is too large'
                    });
                    socket.end();
                    return;
                  }
                  const output = inObj.outputs[input.outpoint.index];
                  if (output === undefined) {
                    console.error(`[${id}]: Output object from ${txid} is undefined`);
                    await send_message(socket, {
                      type: 'error',
                      name: 'INVALID_FORMAT',
                      description: 'Referenced output is undefined'
                    });
                    socket.end();
                    return;
                  }

                  const verify = await verifyAsync(
                    hexToBytes(input.sig),
                    utf8ToBytes(canonicalized),
                    hexToBytes(output.pubkey)
                  );
                  
                  if (!verify) {
                    console.error(`[${id}]: Invalid TX signature`);
                    await send_message(socket, {
                      type: 'error',
                      name: 'INVALID_TX_SIGNATURE',
                      description: 'Invalid signature'
                    });
                    socket.end();
                    return;
                  }

                  inputSum += output.value;
                  break;
                case 'block':
                  console.log(`[${id}]: Transaction txid is a block id`)
                  await send_message(socket, {
                    type: 'error',
                    name: 'INVALID_FORMAT',
                    description: 'Transaction txid is a block id'
                  });
                  socket.end();
                  return;
              }
            } catch (err) { 
              console.error(`[${id}]: get failed`, err);
            }
          }

          var outputSum = 0;
          for (const o of obj.outputs) {
            outputSum += o.value;
          }

          if (inputSum < outputSum) {
            console.error(`[${id}]: Weak law of conservation is not satisfied`);
            await send_message(socket, {
              type: 'error',
              name: 'INVALID_TX_CONSERVATION',
              description: 'The transaction does not satisfy the weak law of conservation'
            });
            socket.end();
            return;
          }
          break;
        }

        try {
          await objectManager.put(obj)
          broadcast_ihaveobject(id, objectid);
        } catch(err) {
          console.error(`[${id}]: object store failed`, err);
        }

      break;
    }

    case 'error':
      console.log(`[${id}]: Recieved error: ${message.name} - ${message.description}`)  
      break
  }
}

// Message handlers
function attach_handlers(socket: Socket, id: string) {
  socket.setEncoding('utf8')  
  let buffer = ''

  socket.on('data', (data) => {
    buffer += data

    const messages = buffer.split('\n')
    while (messages.length > 1) {
      const msg = messages.shift()

      // Error handling
      
      if (msg === undefined){
          console.error(`[${id}]: Error defragmenting messages`)
          return}

      // Parse JSON
      let message
      try {
        message = JSON.parse(msg)
      } catch (err) {
        console.error(`[${id}]: Error parsing message as JSON`, msg)
        send_message(socket, {
          type: 'error',
          name: 'INVALID_FORMAT',
          description: 'Received invalid message that could not parse a json'
        } as Message)
        socket.end()
        return
      }
      
      // Check protocol schema
      try {
        message = MessageSchema.parse(message)
      } catch(err) {
        console.error(`[${id}]: Unknown protocol message`, message)
        send_message(socket, {
          type: 'error',
          name: 'INVALID_FORMAT',
          description: 'Received invalid protocol message that does not match schema'
        } as Message)
        socket.end()
        return
      }

      // Check handshake
      if (!connected_peers.has(id) && message.type !== 'hello') {
        console.error(`[${id}]: Invalid handshake, expected hello message first`)
        send_message(socket, {
          type: 'error',
          name: 'INVALID_HANDSHAKE',
          description: 'Did not receive hello message'
        } as Message)
        socket.end()
        return
      }

      // Valid message
      if (message.type === 'hello') {
        console.log(`[${id}]: Received hello message, connecting to node with name ${message.agent} and version ${message.version}`)
        connected_peers.add(id)
        peerSockets.set(id, socket)
        if(!discovered_peers.has(id)){
          discovered_peers.add(id)
          add_peer(id)
        }
      }


      handle_message(socket, id, message);
      
    }

    buffer = messages[0] ?? ''
  })

  socket.on('error', (err) => {
    console.error(`[${id}]: socket error`, err)
  })

  socket.on('close', () => {
    connected_peers.delete(id)
    peerSockets.delete(id)
    console.log(`[${id}]: Disconnected`)
  })
}


let discovered_peers = get_peers();
let connected_peers = new Set<string>();
const peerSockets = new Map<string, Socket>();

const server = createServer(async (socket) => {
    const id = `${socket.remoteAddress}:${socket.remotePort}`
    console.log(`Client connected from ${id}`)

   attach_handlers(socket, id)
   await connect(socket)
})

async function connect_to_random_discovered_peer() {
    const peersArr = Array.from(discovered_peers).filter((p) => p !== SERVER_ID)
    if (peersArr.length === 0) {
        console.log(`No discovered peers to connect to`)
        return
    }
    
    // Pick random peer
    const peer = peersArr[Math.floor(Math.random() * peersArr.length)]
    if (!peer) return
    
    const parsed = parse_peer_address(peer)
    if (!parsed) {
        console.error(`Bad peer format: ${peer}`)
        return
    }

    const { host, port } = parsed

    const outbound = new Socket()

    outbound.connect(port, host, async () => {
        const id = `${outbound.remoteAddress}:${outbound.remotePort}`
        console.log(`Outbound connected to ${peer} (${id})`)

        attach_handlers(outbound, id)
        await connect(outbound)
    })

    outbound.on('error', (err) => {
        console.error(`Error connecting to peer ${peer}:`, err)
    })
    
  }

// Start the server
server.listen(PORT, async() => {
    console.log(`Server listening on port ${PORT}`)
    await connect_to_random_discovered_peer()
})