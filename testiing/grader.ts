import { Socket } from "net";
import { MessageSchema } from "../src/types";
import { testcases } from "./testcase";
import canonicalize from 'canonicalize' 


async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const IP = '127.0.0.1';
const PORT = 18018;

const grader = new Socket();

grader.connect(PORT, IP, async () => {
  console.log(`Grader connected to ${IP}:${PORT}`);
  grader.setEncoding('utf8')  
  let buffer = ''

  grader.on('data', (data) => {
    buffer += data

    const messages = buffer.split('\n')
    while (messages.length > 1) {
      const msg = messages.shift()

      // Error handling
      
      if (msg === undefined){
          console.error(`Error defragmenting messages`)
          return}

      // Parse JSON
      let message
      try {
        message = JSON.parse(msg)
      } catch (err) {
        console.error('Error parsing message as JSON');        
      }

      try {
        message = MessageSchema.parse(message)
      } catch(err) {
        console.error('Unknown protocol message')
        return
      }

      console.log('Recieved: ' + JSON.stringify(message));
    }

    buffer = messages[0] ?? ''
  });

  grader.on('error', (err) => {
      console.error(`Socket error`, err)
    })
  
  grader.on('close', () => {
    console.log(`Node disconnected`)
  })

  for (const testcase of testcases) {
    console.log('Sending: ' + JSON.stringify(testcase.msg));
    grader.write(canonicalize(testcase.msg) + '\n');
    await sleep(1000)
  }

  grader.end();
})