import  {Socket, createServer } from 'net'
import { broadcast_ihaveobject, send_error, send_message } from './networking'
import { ObjectMessageSchema, type Block, type Message, type ObjectMessage } from './types'
import { objectManager } from './object';
import { verifyBlock } from './block';


async function broadcast_target_block(block: Block) {
  for (const sock of miner_sockets) {
    send_target_block(sock, block)
  }
}

async function send_target_block(sock: Socket, block: Block) {
    await send_message(sock, {
        type: 'object',
        object: block
    } as Message);
}


async function handle_object(id: string, socket: Socket, message: ObjectMessage) {
   const obj = message.object;
  if (obj.type === 'transaction') {
    send_error(id, socket, 'INVALID_FORMAT', 'Expected block not transaction');
    return
  }

  const objectid = objectManager.objectId(message.object);

  console.log(`[${id}]: Recieved object ` + objectid);

  if (!(await verifyBlock(id, socket, obj, objectid))) {
    console.log(`[${id}]: Block verification failed`);
    return;
  }

  console.log(`[${id}]: Veryfication succeded, storing object`)
  try {
    await objectManager.put(obj)
    broadcast_ihaveobject(id, objectid);
  } catch(err) {
    console.error(`[${id}]: object store failed`, err);
  }
}

const MINER_PORT = 1302

let miner_sockets = new Set<Socket>();

const miner = createServer(async (socket) => {
  if (socket.remoteAddress !== undefined) {
    const id = `$Miner {socket.remoteAddress}:${socket.remotePort}`
    console.log(`Miner connected from ${id}`)

    miner_sockets.add(socket);

    socket.setEncoding('utf8')  
    let buffer = ''
  
    socket.on('data', (data) => {
    buffer += data

    const messages = buffer.split('\n')
    while (messages.length > 1) {
      const msg = messages.shift()

      // Error handling
      
      if (msg === undefined) {
          console.error(`[${id}]: Error defragmenting messages`)
          return
      }

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
        message = ObjectMessageSchema.parse(message)
      } catch(err) {
        send_error(id, socket, 'INVALID_FORMAT', 'Unknown protocol message');
        return
      }

      handle_object(id, socket, message);
    }
    buffer = messages[0] ?? ''
  })

  socket.on('error', (err) => {
    console.error(`[${id}]: socket error`, err)
  })

  socket.on('close', () => {
    miner_sockets.delete(id)
    console.log(`[${id}]: Disconnected`)
  })
  }
})


miner.listen(MINER_PORT, async() => {
    console.log(`Miner server listening on port ${MINER_PORT}`)
})