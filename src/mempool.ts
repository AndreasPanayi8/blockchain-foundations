import { GENESIS_BLOCK_ID, type Transaction } from "./types";
import type { UTXOState } from "./utxo";
import { outpointKey, utxoManager } from "./utxo";
import { objectManager } from "./object";
import { chain_data } from "./chain";


export class Mempool {
  private txids: Set<string> = new Set();

  has(txid: string): boolean {
    return this.txids.has(txid);
  }

  add(txid: string): void {
    this.txids.add(txid);
  }

  remove(txid: string): void {
    this.txids.delete(txid);
  }

  getTxids(): string[] {
    return [...this.txids];
  }

  clear(): void {
    this.txids.clear();
  }
}

export class MempoolState {
  private state: UTXOState = {};

  reset(baseState: UTXOState): void {
    this.state = utxoManager.cloneState(baseState);
  }

  canApplyTransaction(transaction: Transaction): boolean {
    if ("height" in transaction) {
      return false; // coinbase transactions do not enter the mempool
    }

    for (const input of transaction.inputs) {
      const key = outpointKey(input.outpoint.txid, input.outpoint.index);

      if (!utxoManager.hasOutpoint(this.state, key)) {
        return false;
      }
    }

    return true;
  }

  applyTransaction(txid: string, transaction: Transaction): void {
    if ("height" in transaction) {
      throw new Error("Cannot apply coinbase transaction to mempool state");
    }

    for (const input of transaction.inputs) {
      const key = outpointKey(input.outpoint.txid, input.outpoint.index);
      utxoManager.spendOutpoint(this.state, key);
    }

    utxoManager.addOutputs(this.state, txid, transaction.outputs);
  }
}

export const mempool = new Mempool();
export const mempoolState = new MempoolState();

export async function rebuildMempoolFromNewChainTip(
  newTip: string,
  abandonedTxids: string[] =[]
): Promise<void> {
  const oldMempoolTxids = mempool.getTxids();

  const candidateTxids = [
    ...abandonedTxids,
    ...oldMempoolTxids,   
  ];

  const baseState = await utxoManager.get(newTip);

  mempool.clear();
  mempoolState.reset(baseState);

  const alreadyTried = new Set<string>();

  for (const txid of candidateTxids) {
    if (alreadyTried.has(txid)) {
      continue;
    }
    alreadyTried.add(txid);

    const obj = await objectManager.get(txid);

    if (obj.type !== "transaction") {
      continue;
    }

    if (!mempoolState.canApplyTransaction(obj)) {
      continue;
    }

    mempoolState.applyTransaction(txid, obj);
    mempool.add(txid);
  }
}

export async function initializeMempoolStateFromChainTip(tip: string): Promise<void> {
  if (tip === GENESIS_BLOCK_ID) {
    mempoolState.reset(utxoManager.emptyState());
    return;
  }

  if (!(await utxoManager.exists(tip))) {
    mempoolState.reset(utxoManager.emptyState());
    return;
  }

  const baseState = await utxoManager.get(tip);
  mempoolState.reset(baseState);
}