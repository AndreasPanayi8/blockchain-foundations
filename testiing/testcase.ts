import { type Message } from "../src/types";

type Testcase = {
  msg: Message,
};

export const testcases : Testcase[] = [
  {msg: {type:'hello', version: '0.10.1', agent:'Grader'}},
  {
    msg: {
      "object": {
        "T":"00000000abc00000000000000000000000000000000000000000000000000000",
        "created": 1771159355,
        "miner": "Marabu",
        "nonce": "00dd82159556175752d9ba7349df67bddd237b59183747383f7b720e85c32347",
        "note": "Financial Times 2026-02-13: Crypto's battle with the banks is splitting Trump's base",
        "previd": null,
        "txids":[],
        "type":"block"
      },"type":"object"}
  },
  {msg: {"objectid":"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6","type":"getobject"}}
]