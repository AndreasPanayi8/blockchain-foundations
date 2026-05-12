import {
  type Block,
  type Transaction,
  RegularTransactionSchema,
} from "./types";
import { objectManager } from "./object";
import { heightManager } from "./height";
import { mempool } from "./mempool";
import { utxoManager, outpointKey, type UTXOState } from "./utxo";

const TARGET =
  "00000000abc00000000000000000000000000000000000000000000000000000";

const INITIAL_NONCE = "0000000000000000000000000000000000000000000000000000000000000000";

const BASE_REWARD = 50_000_000_000_000;

const MINER_NAME = "MMA";

const MINER_PUBKEY =
  "3eece7ce52199c3e2f61e641fdb960a2d6de2a40280e4b016c76b76b021eea5f";

const STUDENT_IDS = ["id1", "id2", "id3"];

function makeCoinbase(height: number, value: number): Transaction {
  return {
    type: "transaction",
    height,
    outputs: [
      {
        value,
        pubkey: MINER_PUBKEY,
      },
    ],
  };
}


async function computeMempoolFees(
  mempoolTxids: string[],
  baseState: UTXOState
): Promise<number> {
  const state = utxoManager.cloneState(baseState);
  let fees = 0;

  for (const txid of mempoolTxids) {
    const obj = await objectManager.get(txid);
    const reg = RegularTransactionSchema.safeParse(obj);
    if (!reg.success) continue; // skip coinbase (shouldn't be in mempool anyway)

    const tx = reg.data;

    let inputSum = 0;
    let outputSum = 0;

    for (const input of tx.inputs) {
      const key = outpointKey(input.outpoint.txid, input.outpoint.index);
      const entry = utxoManager.getOutpoint(state, key);
      if (entry === undefined) continue; // shouldn't happen for valid mempool txs
      inputSum += entry.value;
      utxoManager.spendOutpoint(state, key);
    }

    for (const output of tx.outputs) {
      outputSum += output.value;
    }

    utxoManager.addOutputs(state, txid, tx.outputs);
    fees += inputSum - outputSum;
  }

  return fees;
}

export async function buildBlockTemplate(previd: string): Promise<Block> {
  const parent = await objectManager.get(previd);

  if (parent.type !== "block") {
    throw new Error(`Parent object ${previd} is not a block`);
  }

  const height = (await heightManager.get(previd)) + 1;
  const created = Math.floor(Date.now() / 1000);

  const mempoolTxids = mempool.getTxids();

  // Get the parent UTXO state to resolve input values for fee computation.
  const baseState = await utxoManager.getBaseState(previd);
  if (baseState === null) {
    throw new Error(`UTXO state for parent ${previd} not found`);
  }

  const fees = await computeMempoolFees(mempoolTxids, baseState);
  const coinbaseValue = BASE_REWARD + fees;

  const coinbase = makeCoinbase(height, coinbaseValue);
  const coinbaseTxid = await objectManager.put(coinbase);

  const txids = [
    coinbaseTxid,
    ...mempoolTxids,
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