import { Socket, createServer } from 'net'
import { send_error } from './networking'
import { ObjectMessageSchema, type Block, type Message } from './types'
import { chain_data } from './chain'
import { buildBlockTemplate } from './blockbuilder'
import canonicalize from 'canonicalize'
import { handle_message } from './node'

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

      // solved block — hand straight into node's pipeline
      try {
        const objectMessage = ObjectMessageSchema.parse(parsed)
        await handle_message(socket, id, objectMessage as Message)
      } catch {
        await send_error(id, socket, 'INVALID_FORMAT', 'Unknown miner protocol message')
        return
      }
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