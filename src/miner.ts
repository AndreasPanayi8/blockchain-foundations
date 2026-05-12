import { Socket, createServer } from 'net'
import { broadcast_ihaveobject, send_error, send_message } from './networking'
import { ObjectMessageSchema, type Block, type Message, type ObjectMessage } from './types'
import { objectManager } from './object'
import { verifyBlock } from './block'
import { chain_data } from './chain'
import { buildBlockTemplate } from './blockbuilder'
import { heightManager } from './height'
import canonicalize from 'canonicalize'

const MINER_PORT = 1302
 
const miner_sockets = new Set<Socket>()
 
// ─── Send helpers ────────────────────────────────────────────────────────────
 
async function send_block_template(socket: Socket, block: Block): Promise<void> {
  const msg = canonicalize({ type: 'block', block })
  if (msg === undefined) throw new Error('Could not canonicalize block template')
  socket.write(msg + '\n')
}
 
// ─── Push a fresh template to one or all connected miners ───────────────────
 
async function pushTemplateTo(socket: Socket, previd: string): Promise<void> {
  try {
    const block = await buildBlockTemplate(previd)
    await send_block_template(socket, block)
    console.log(`[miner]: Sent fresh template (parent ${previd}) to ${socket.remoteAddress}`)
  } catch (err) {
    console.error(`[miner]: Failed to build/send template to ${socket.remoteAddress}`, err)
  }
}
 
// Called from node.ts whenever the chain tip advances.
export async function pushTemplateToAllMiners(newTip: string): Promise<void> {
  if (miner_sockets.size === 0) return
  for (const sock of miner_sockets) {
    await pushTemplateTo(sock, newTip)
  }
}
 
// ─── Handle a solved block arriving from the miner ──────────────────────────
 
async function handle_object(id: string, socket: Socket, message: ObjectMessage): Promise<void> {
  const obj = message.object
 
  if (obj.type === 'transaction') {
    await send_error(id, socket, 'INVALID_FORMAT', 'Expected block, not transaction')
    return
  }
 
  const objectid = objectManager.objectId(obj)
  console.log(`[${id}]: Received mined block ${objectid}`)
 
  if (!(await verifyBlock(id, socket, obj, objectid))) {
    console.log(`[${id}]: Mined block verification failed`)
    return
  }
 
  console.log(`[${id}]: Mined block verified, storing`)
 
  try {
    await objectManager.put(obj)
 
    const height = await heightManager.get(objectid)
    await chain_data.update(objectid, height)
 
    // Gossip to the network.
    broadcast_ihaveobject(id, objectid)
 
    // chain_data.update already calls pushTemplateToAllMiners via node.ts,
    // but the miner that just submitted this block needs a refresh too
    // since it won't receive its own ihaveobject.
    await pushTemplateTo(socket, objectid)
  } catch (err) {
    console.error(`[${id}]: Mined block store / chain update failed`, err)
  }
}
 
// ─── Per-connection message handler ─────────────────────────────────────────
 
function attach_miner_handlers(socket: Socket, id: string): void {
  socket.setEncoding('utf8')
  let buffer = ''
 
  socket.on('data', async (data) => {
    buffer += data
 
    const messages = buffer.split('\n')
    while (messages.length > 1) {
      const msg = messages.shift()
      if (msg === undefined) continue
 
      let parsed: unknown
      try {
        parsed = JSON.parse(msg)
      } catch {
        await send_error(id, socket, 'INVALID_FORMAT', 'Error parsing message as JSON')
        return
      }
 
      // 'getblock' request — build and send a fresh template
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        (parsed as Record<string, unknown>).type === 'getblock'
      ) {
        await pushTemplateTo(socket, chain_data.get_chaintip())
        continue
      }
 
      // 'object' message — miner found a valid nonce
      let objectMessage: ObjectMessage
      try {
        objectMessage = ObjectMessageSchema.parse(parsed)
      } catch {
        await send_error(id, socket, 'INVALID_FORMAT', 'Unknown miner protocol message')
        return
      }
 
      await handle_object(id, socket, objectMessage)
    }
 
    buffer = messages[0] ?? ''
  })
 
  socket.on('error', (err) => {
    console.error(`[${id}]: socket error`, err)
  })
 
  socket.on('close', () => {
    miner_sockets.delete(socket)
    console.log(`[${id}]: Miner disconnected`)
  })
}
 
// ─── Server ──────────────────────────────────────────────────────────────────
 
const miner_server = createServer((socket) => {
  if (socket.remoteAddress === undefined) return
 
  const id = `Miner ${socket.remoteAddress}:${socket.remotePort}`
  console.log(`Miner connected from ${id}`)
 
  miner_sockets.add(socket)
  attach_miner_handlers(socket, id)
 
  // Send an initial template as soon as the miner connects.
  pushTemplateTo(socket, chain_data.get_chaintip())
})
 
miner_server.listen(MINER_PORT, () => {
  console.log(`Miner server listening on port ${MINER_PORT}`)
})
