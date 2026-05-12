import fs from "fs";
import path from "path";
import canonicalize from "canonicalize";

import {
  type Block,
  type Transaction,
} from "./types";
import { objectManager } from "./object";
import { heightManager } from "./height";
import { mempool } from "./mempool";

const TEMPLATE_FILE = "./storage/block-template.json";

const TARGET =
  "00000000abc00000000000000000000000000000000000000000000000000000";

const INITIAL_NONCE = "0000000000000000000000000000000000000000000000000000000000000000";

const BASE_REWARD = 50_000_000_000_000;

// Bootstrap miner/team data here.
const MINER_NAME = "MMA";

const MINER_PUBKEY =
  "3eece7ce52199c3e2f61e641fdb960a2d6de2a40280e4b016c76b76b021eea5f";

// Replace with the actual SUNet/student IDs required by PSET6.
const STUDENT_IDS = ["id1", "id2", "id3"];

function ensureTemplateDir(): void {
  const dir = path.dirname(TEMPLATE_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function makeCoinbase(height: number): Transaction {
  return {
    type: "transaction",
    height,
    outputs: [
      {
        value: BASE_REWARD,
        pubkey: MINER_PUBKEY,
      },
    ],
  };
}

export async function buildBlockTemplate(previd: string): Promise<Block> {
  const parent = await objectManager.get(previd);

  if (parent.type !== "block") {
    throw new Error(`Parent object ${previd} is not a block`);
  }

  const height = (await heightManager.get(previd)) + 1;
  const created = Math.floor(Date.now() / 1000);

  const coinbase = makeCoinbase(height);
  const coinbaseTxid = await objectManager.put(coinbase);

  const txids = [
    coinbaseTxid,
    ...mempool.getTxids(),
  ];

  const block: Block = {
    type: "block",
    txids,
    nonce: INITIAL_NONCE,
    previd,
    created,
    T: TARGET,
    miner: MINER_NAME,
    studentids: STUDENT_IDS,
  };

  return block;
}

export async function writeBlockTemplate(previd: string): Promise<Block> {
  const block = await buildBlockTemplate(previd);

  ensureTemplateDir();

  const canonical = canonicalize(block);

  if (canonical === undefined) {
    throw new Error("Could not canonicalize block template");
  }

  fs.writeFileSync(TEMPLATE_FILE, canonical + "\n", "utf8");

  console.log(`[blockbuilder] Wrote block template to ${TEMPLATE_FILE}`);
  console.log(`[blockbuilder] Parent: ${previd}`);
  console.log(`[blockbuilder] Transactions: ${block.txids.length}`);

  return block;
}

export const BLOCK_TEMPLATE_FILE = TEMPLATE_FILE;