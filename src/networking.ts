import { type Message } from './types'
import { Socket } from 'net'
import canonicalize from 'canonicalize'
import { peerSockets } from './node'

// Networking helper functions

export async function send_message(socket: Socket, msg: Message) {
  socket.write(canonicalize(msg) + '\n')
}

export async function send_error(node_id: string, socket: Socket, name:
    "INTERNAL_ERROR" | "INVALID_FORMAT" | "UNKNOWN_OBJECT" |
    "UNFINDABLE_OBJECT" | "INVALID_HANDSHAKE" | "INVALID_TX_OUTPOINT" | 
    "INVALID_TX_SIGNATURE" |"INVALID_TX_CONSERVATION" | "INVALID_BLOCK_COINBASE" |
     "INVALID_BLOCK_TIMESTAMP" | "INVALID_BLOCK_POW" | "INVALID_GENESIS", description: string, is_fatal : boolean = true) {
  await send_message(socket, {
    type: 'error',
    name: name,
    description: description
  });
  
  if (is_fatal) {
    console.error(`[${node_id}]: ` + description);
    socket.end();
  } 
}

export async function connect(socket: Socket) {
  await send_message(socket, {
      type: 'hello',
      version: '0.10.1',
      agent: 'MMA'
  } as Message)

  await send_message(socket, {
      type: 'getpeers'
  } as Message)
}

export async function broadcast_ihaveobject(exceptPeerId: string, objectid: string) {
  for (const [peerId, sock] of peerSockets.entries()) {
    if (peerId === exceptPeerId) continue;
    if (sock.destroyed) continue; 
    await send_message(sock, {
        type: 'ihaveobject',
        objectid
    } as Message);
  }
}

export async function broadcast_getobject(objectid: string) {
  for (const [_, sock] of peerSockets.entries()) {
    if (sock.destroyed) continue; 
    await send_message(sock, {
        type: 'getobject',
        objectid
    } as Message);
  }
}


export function parse_peer_address(peer: string): { host: string, port: number } | null {
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
