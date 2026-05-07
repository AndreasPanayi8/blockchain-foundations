import { Socket, createServer } from 'net'
import { type Message, MessageSchema } from './types'
import { add_peer, get_peers } from './peers'
import { objectManager } from './object'

import { send_message, send_error, connect, broadcast_ihaveobject, parse_peer_address, broadcast_getobject} from './networking'
import { verifyTransaction } from './transaction'
import { verifyBlock } from './block'
import { chain_data } from './chain'
import { heightManager } from './height'

import { initializeMempoolStateFromChainTip, mempool, mempoolState } from './mempool'



const PORT = 18018
const SERVER_ID = '95.179.176.219:' + PORT

const banned_ips = ['::ffff:95.179.178.136', '::ffff:78.141.219.35']

async function handle_message(socket: Socket, id: string, message: Message) {
  switch (message.type) {
    case 'getpeers':
      //   console.log(`[${id}]: Requested peers, sending discovered peers`) 
      // await send_message(socket, {
      //   type: 'peers',
      //   peers: Array.from(discovered_peers).concat(SERVER_ID)
      // } as Message)
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
          await send_message(socket, {
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
        await send_error(id, socket, 'UNKNOWN_OBJECT', `Object ${objectid} not found`);
        break;
      }
      
      try {
        const obj = await objectManager.get(objectid);
        await send_message(socket, {
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

      console.log(`[${id}]: Recieved object ` + objectid);

      const known = await objectManager.exists(objectid);
      if (known)  {
        console.log(`[${id}]: Object ` + objectid + ' already in database.');
      } else {
        switch (obj.type) {
          case 'transaction':
          console.log(`[${id}]: Object ` + objectid + ` is a transaction.`);
            if (!(await verifyTransaction(id, socket, obj))) {
              console.log(`[${id}]: Transaction verification failed`);
              return;
            }
            break;
          case 'block':
          console.log(`[${id}]: Object ` + objectid + ` is a block.`);
            if (!(await verifyBlock(id, socket, obj, objectid))) {
              console.log(`[${id}]: Block verification failed`);
              return;
            }
            break
        }
        console.log(`[${id}]: Verification succeeded, storing object`);
        try {
          await objectManager.put(obj);

          if (obj.type === "block") {
            const height = await heightManager.get(objectid);
            await chain_data.update(objectid, height);
          }

          broadcast_ihaveobject(id, objectid);
        } catch (err) {
          console.error(`[${id}]: object store / chain update failed`, err);
        }
      }

      
      if (obj.type === 'transaction' && !("height" in obj)) {
        if (!mempoolState.canApplyTransaction(obj)) {
          await send_error(
            id,
            socket,
            "INVALID_TX_OUTPOINT",
            "Transaction is invalid with respect to the mempool UTXO state"
          );
          console.log(`[${id}]: Transaction ` + objectid + ` is valid syntactically but conflicts with mempool state`);
        } else {
          console.log(`[${id}]: Applying transaction` + objectid);
          mempoolState.applyTransaction(objectid, obj);
        }
      }

      break;
    }
    case 'getchaintip':
      console.log(`[${id}]: Recieved getchaintip message, sending chaintip`);
      await send_message(socket, {
        type:'chaintip',
        blockid: chain_data.get_chaintip()
      } as Message)
      break
    
    case 'chaintip':
      console.log(`[${id}]: Recieved chaintip message, updating chaintip`);
      if (!(await objectManager.exists(message.blockid))) {
        await broadcast_getobject(message.blockid);
      }
      break
    
    case 'getmempool':
      console.log(`[${id}]: Recieved getmempool message, sending mempool`);
      await send_message(socket, {
        type: 'mempool',
        txids: mempool.getTxids()
      } as Message)
      break

    case 'mempool':
      console.log(`[${id}]: Recieved mempool message, updating mempool`);
      for (const txid of message.txids) {
        if (!(await objectManager.exists(txid))) {
          await send_message(socket, {
            type: 'getobject',
            objectid: txid
          } as Message)
        }
      }
      break
      
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
        send_error(id, socket, 'INVALID_FORMAT', 'Error parsing message as JSON');
        return
      }
      
      // Check protocol schema
      try {
        message = MessageSchema.parse(message)
      } catch(err) {
        send_error(id, socket, 'INVALID_FORMAT', 'Unknown protocol message');
        return
      }

      // Check handshake
      if (!peerSockets.has(id) && message.type !== 'hello') {
        send_error(id, socket, 'INVALID_HANDSHAKE', 'Did not receive hello message');
        return
      }

      // Valid message
      if (message.type === 'hello') {
        console.log(`[${id}]: Received hello message, connecting to node with name ${message.agent} and version ${message.version}`)
        peerSockets.set(id, socket);
      }


      handle_message(socket, id, message);
    }

    buffer = messages[0] ?? ''
  })

  socket.on('error', (err) => {
    console.error(`[${id}]: socket error`, err)
  })

  socket.on('close', () => {
    peerSockets.delete(id)
    console.log(`[${id}]: Disconnected`)
  })
}

let discovered_peers = get_peers();
export const peerSockets = new Map<string, Socket>();

const server = createServer(async (socket) => {
  if (socket.remoteAddress !== undefined && !banned_ips.includes(socket.remoteAddress)) {
    const id = `${socket.remoteAddress}:${socket.remotePort}`
    console.log(`Client connected from ${id}`)

   attach_handlers(socket, id)
   await connect(socket)
  }
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
    const outbound = new Socket()

    outbound.connect(18018, '95.179.132.22', async () => {
        const id = `${outbound.remoteAddress}:${outbound.remotePort}`
        console.log(`Outbound connected to 95.179.132.22:18018 (${id})`)

        attach_handlers(outbound, id)
        await connect(outbound)
    })

    outbound.on('error', (err) => {
        console.error(`Error connecting to peer 95.179.132.22:18018:`, err)
    })
    await connect_to_random_discovered_peer()
    await initializeMempoolStateFromChainTip(chain_data.get_chaintip());
})