
import { Socket } from 'net'

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
    console.log(`Client disconnected`)
})