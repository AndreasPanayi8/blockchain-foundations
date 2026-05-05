import fs from 'fs';
import path from "path";
import { GENESIS_BLOCK_ID, type Block } from "./types";
import { rebuildMempoolFromNewChainTip } from './mempool';
import { objectManager } from "./object";


const FILENAME = './storage/chaintip.txt'
const k = 6;

function ensureFile(): void {
  const dir = path.dirname(FILENAME);

  // create storage/ if missing
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // create file if missing
  if (!fs.existsSync(FILENAME)) { 
    fs.writeFileSync(FILENAME, JSON.stringify({
      chaintip: GENESIS_BLOCK_ID,
      chain_height: 0
    }), "utf8");
  }
}

async function getBlock(blockid: string): Promise<Block>{
  const obj = await objectManager.get(blockid);

  if (obj.type !== "block"){
    throw new Error(`Object ${blockid} is not a block`);
  }

  return obj;
}

export async function findCommonAncestorForLongerNewChain(
  oldTip: string,
  oldHeight: number,
  newTip: string,
  newHeight: number
): Promise<string> {
  let oldCursor: string = oldTip;
  let newCursor: string = newTip;

  while (newHeight > oldHeight) {
    const newBlock = await getBlock(newCursor);
    newCursor = newBlock.previd!;
    newHeight--;
  }

  while (oldCursor !== newCursor) {
    const oldBlock = await getBlock(oldCursor);
    const newBlock = await getBlock(newCursor);

    oldCursor = oldBlock.previd!;
    newCursor = newBlock.previd!;
  }

  return oldCursor;
}
   
export async function collectTransactionsFromAbandonedBlocks(
  oldTip: string,
  commonAncestor: string
): Promise<string[]> {
  const txids: string[] = [];

  let current: string = oldTip;

  while (current !== commonAncestor){
    const block = await getBlock(current);

    for (const txid of block.txids) {
      txids.push(txid);
    }

    current = block.previd!;
  }

  return txids.reverse();
}




class ChainData {
  private chain_height;
  private chaintip;
  constructor() {
    ensureFile();
    const rawData = fs.readFileSync(FILENAME,{encoding: 'utf-8'});

    const data = JSON.parse(rawData)

    this.chain_height = data.chain_height;
    this.chaintip = data.chaintip;

  }

  async update(block_id: string, height: number) : Promise<void>{
    if (height > this.chain_height) {
      const oldTip = this.chaintip;
      const oldHeight =this.chain_height;

      const commonAncestor = await findCommonAncestorForLongerNewChain(
        oldTip,
        oldHeight,
        block_id,
        height
      );

      const abandonedTxids = await collectTransactionsFromAbandonedBlocks(
        oldTip,
        commonAncestor
      );

      await rebuildMempoolFromNewChainTip(block_id, abandonedTxids);

      this.chaintip = block_id;
      this.chain_height = height;

      fs.writeFileSync(FILENAME, JSON.stringify({
        chaintip: this.chaintip,
        chain_height: this.chain_height
      }), "utf8");
    }
  }

  get_chaintip() : string {
    return this.chaintip;
  }

  get_chain_height() : number {
    return this.chain_height;
  }
}

export const chain_data = new ChainData()

