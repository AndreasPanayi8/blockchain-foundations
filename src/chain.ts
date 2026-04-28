import fs from 'fs';
import path from "path";
import { GENESIS_BLOCK_ID } from "./types";

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

  update(block_id: string, height: number) : void{
    if (height > this.chain_height) {
      this.chaintip = block_id;
      this.chain_height = height

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

