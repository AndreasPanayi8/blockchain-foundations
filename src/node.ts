import { Socket, createServer } from 'net'
import { type Message, MessageSchema  } from './types'
import canonicalize from 'canonicalize'
import { add_peer, get_peers } from './peers'
import { objectManager } from './object'
import type { NetworkObject } from './types'
import { object } from 'zod'
import { ca } from 'zod/locales'


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

async function send_getobject(socket: Socket, objectid: string) {
  await send_message(socket, {
        type: 'getobject',
        objectid
    } as Message);
}

async function send_ihaveobject(socket: Socket, objectid: string) {
    await send_message(socket, {
        type: 'ihaveobject',
        objectid
    } as Message);
}

function request_object_from_network(objectid: string) {
  for (const sock of peerSockets.values()) {
    if (!sock.destroyed) send_getobject(sock, objectid);
  }
}

async function send_object(socket: Socket, object: NetworkObject) {
    await send_message(socket, {
        type: 'object',
        object
    } as Message);
}

async function broadcast_ihaveobject(exceptPeerId: string, objectid: string) {
    for (const [peerId, sock] of peerSockets.entries()) {
        if (peerId === exceptPeerId) continue;
        if (sock.destroyed) continue; 
        await send_ihaveobject(sock, objectid);
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

      switch (message.type) {
        case 'hello':
          console.log(`[${id}]: Received hello message, connecting to node with name ${message.agent} and version ${message.version}`)
          connected_peers.add(id)
          peerSockets.set(id, socket)
          if(!discovered_peers.has(id)){
            discovered_peers.add(id)
            add_peer(id)
          }

          break

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

        case 'ihaveobject': {
          const objectid = message.objectid;
          objectManager.exists(objectid).then((known) => {
            if (!known) send_getobject(socket, objectid);
          }).catch((err) => {
            console.error(`[${id}]: exists failed`, err)
          })
          break;
        }

        case 'getobject': {
          const objectid = message.objectid;
          objectManager.exists(objectid).then((known) => {
            if (!known) {
              send_message(socket, {
                type: 'error',
                name: 'UNKNOWN_OBJECT',
                description: `Object ${objectid} not found`
              } as Message);
              return;
            }
            return objectManager.get(objectid).then((obj) => {
              send_object(socket, obj);
            });
          }).catch((err) => {
            console.error(`[${id}]: get failed`, err);
          });
          break;
        }

        case 'object': {
          const obj = message.object;

          const objectid = objectManager.objectId(obj);

          objectManager.exists(objectid).then((known) => {
            if (known) return;
            return objectManager.put(obj).then(() => {
              broadcast_ihaveobject(id, objectid);
            });
          }).catch((err) => {
            console.error(`[${id}]: object store failed`, err);
          });

          break;
        }
        
      //end of object exchange and gossiping


        case 'error':
          console.log(`[${id}]: Recieved error: ${message.name} - ${message.description}`)  
          break
      }
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