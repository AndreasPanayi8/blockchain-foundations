
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
    console.error('Received error ${error}')
})

client.on('close', () => {
    console.log('Client disconnected')
})

async function connect(socket: Socket) {
    
}

async function send_message(socket: Socket, msg: Message) {
    socket.write(canonicalize(msg) + '\n')
}

const SERVER_ID = '127.0.0.1:18018'
const PORT = 18018
const NAME = 'TO_BE_DECIDED'
const VERSION = '0.10.0'

let discovered_peers = get_peers()
let connected_peers = new Set<string>()
const server = createServer(async (socket) => {
    const id = '${socket.remoteAddress}:${socket.remotePort}'
    console.log('Client connected from ${id}')

    connect(socket)

    let buffer = ''
    socket.on('data', (data) => {
        buffer += data

        const messages = buffer.split('\n')
        while (messages.length > 1) {
            let msg = messages.shift()
            if (msg === undefined) {
                console.error('[${id}]: Error defragmenting messages')
                return
            }

            let message
            try {
                message = JSON.parse(msg)
            } catch (error) {
                console.error('[${id}]: Error parsing message as JSON', message)
                send_message(socket, {
                    type: 'error',
                    name: 'INVALID_FORMAT',
                    description: 'Received invalid message that could not parse as json ' + message          
                })
                continue
            }

            try {
                message = MessageSchema.parse(message)
            } catch (_) {
                console.error('[${id}]: Unknown protocol message', message)
                send_message(socket, {
                    type: 'error',
                    name: 'INVALID_FORMAT',
                    description: 'Received invalid protocol message ' + message
                })
                continue
            }

            if (!connected_peers.has(id) && message.type != 'hello') {
                console.log('[${id}]: Invalid handshake')
                send_message(socket, {
                    type: 'error',
                    name: 'INVALID_HANDSHAKE',
                    description: 'Did not recieve hello message'
                })
                continue
            }

            switch (message.type) {
                case 'hello':
                    console.log('[${id}]: Recieved hello message, connecting to node with name ' +  message.agent)
                    connected_peers.add(id)
                    if(!discovered_peers.has(id)) {
                        discovered_peers.add(id)
                        add_peer(id)
                    }
                    break
                case 'error':
                    console.log('[${id}]: Recieved ' +  message.name + ' ' + message.description)
                    break
                case 'getpeers':
                    console.log('[${id}]: Requested peers, sending descovered peers')
                    send_message(socket, {
                        type: 'peers',
                        peers: Array.from(discovered_peers).concat(SERVER_ID)
                    }
                    )
                    break
                case 'peers':
                    console.log('[${id}]: Recieved peers, updating descovered peers')
                    for (let peer_id of message.peers) {
                        if(!discovered_peers.has(peer_id)) {
                            discovered_peers.add(peer_id)
                            add_peer(peer_id)
                        }
                    }
                    break
            }
        }

        if (messages[0] === undefined) {
            console.error('Error in parsing messages')
            return
        }

        buffer = messages[0]
    })

    socket.on('error', (error) => {
        console.error('[${id}]: Received error ${error}')
    })

    socket.on('close', () => {
        connected_peers.delete(id)
        console.log('[${id}]: Client disconnected')
    })
})

server.listen(PORT, () => {
    console.log('Server listening on port ${PORT}')
})