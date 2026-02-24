
import { Socket, createServer } from 'net'

import { type Message, MessageSchema  } from './types'
import canonicalize from 'canonicalize'
import { error } from 'console'
import { add_peer, get_peers } from './peers'

const SERVER_PORT = 18018
const SERVER_HOST = '0.0.0.0'

const client = new Socket()
client.connect(SERVER_PORT, SERVER_HOST, () => {
    
})

client.on('data', (data) => {

})

client.on('error', (error) => {
    console.error(`Received error ${error}`)
})

client.on('close', () => {
    console.log('Client disconnected')
})

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

    //IPv4
    const idx = peer.lastIndexOf(':')
    if (idx <= 0) return null
    const host = peer.slice(0, idx).trim()
    const port = Number(peer.slice(idx + 1).trim())
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null
    return { host, port }
}


    
async function send_message(socket: Socket, msg: Message) {
    socket.write(canonicalize(msg) + '\n')
}

function attach_handlers(socket: Socket, id: string) {
  let buffer = ''

  socket.on('data', (data) => {
    buffer += data

    const messages = buffer.split('\n')
    while (messages.length > 1) {
      const raw = messages.shift()
      if (raw === undefined) return

      let message: any
      try {
        message = JSON.parse(raw)
      } catch {
        send_message(socket, {
          type: 'error',
          name: 'INVALID_FORMAT',
          description: 'Could not parse JSON'
        } as Message)
        socket.end()
        return
      }

      try {
        message = MessageSchema.parse(message)
      } catch {
        send_message(socket, {
          type: 'error',
          name: 'INVALID_FORMAT',
          description: 'Message does not match schema'
        } as Message)
        socket.end()
        return
      }

      if (!connected_peers.has(id) && message.type !== 'hello') {
        send_message(socket, {
          type: 'error',
          name: 'INVALID_HANDSHAKE',
          description: 'Expected hello as first message'
        } as Message)
        socket.end()
        return
      }

      switch (message.type) {
        case 'hello':
          connected_peers.add(id)
          if (!discovered_peers.has(id)) {
            discovered_peers.add(id)
            add_peer(id)
          }
          break

        case 'getpeers':
          send_message(socket, {
            type: 'peers',
            peers: Array.from(discovered_peers).concat(SERVER_ID)
          } as Message)
          break

        case 'peers':
          for (const peer_id of message.peers) {
            if (!discovered_peers.has(peer_id)) {
              discovered_peers.add(peer_id)
              add_peer(peer_id)
            }
          }
          break

        case 'error':
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
    console.log(`[${id}]: disconnected`)
  })
}


const SERVER_ID = '127.0.0.1:18018'
const PORT = 18018
const NAME = 'TO_BE_DECIDED'
const VERSION = '0.10.0'

let discovered_peers = get_peers()
let connected_peers = new Set<string>()
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



server.listen(PORT, async() => {
    console.log(`Server listening on port ${PORT}`)
    await connect_to_random_discovered_peer()
})