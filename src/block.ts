import type { Socket } from "net";
import{CoinbaseTransactionSchema, RegularTransactionSchema, type Block} from "./types";
import { send_error } from "./networking";
import { objectManager } from "./object";
import { get_transaction } from "./transaction";
import { outpointKey, utxoManager } from "./utxo";
 
export async function verifyBlock(node_id : string, socket : Socket, block : Block, block_id : string) : Promise<boolean> {
  if (Number('0x' + block_id) >= Number('0x' + block.T)) {
    await send_error(node_id, socket, 'INVALID_BLOCK_POW', 'Proof of work failed');
    return false;
  }

  let fee = 50;
  const firstTxid = block.txids[0];
  if (firstTxid === undefined) return false;
  try {
    const firstTransaction = await get_transaction(node_id, socket, firstTxid);

    const c = CoinbaseTransactionSchema.safeParse(firstTransaction)

    for (let i = 1;i < block.txids.length;++i) {
      const txid = block.txids[i];
      if (txid === undefined) return false;
      
      const t = await get_transaction(node_id, socket, txid);
      const reg = RegularTransactionSchema.safeParse(t);
      if(!reg.success) {
        await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase must be at 0 index in the block');
        return false;
      }
      const transaction = reg.data;

      for (const input of transaction.inputs) {
        if (c.success && input.outpoint.txid === firstTxid) {
          await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase cannot be spent in its block');
          return false;
        }
        if (c.success) {
          const inTransaction = await get_transaction(node_id, socket, input.outpoint.txid);
          const output = inTransaction.outputs[input.outpoint.index];
          if (output === undefined) return false; 
          fee += output.value;
        }
      }

      if (c.success) {
        const coinbase = c.data;

        for (const output of transaction.outputs) {
          fee -= output.value;
        }

        let coinbaseOut = 0;
        for (const output of coinbase.outputs) {
          coinbaseOut += output.value;
        } 

        if (coinbaseOut > fee) {
          await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase\'s total output exceeded fees + reward');
          return false;
        }
      }
    }
  } catch { 
    return false;
  }

  try {
    let UTXO = await utxoManager.getBaseState(block.previd);
    for (const txid of block.txids) {
      const transaction = await get_transaction(node_id, socket, txid);

      utxoManager.addOutputs(UTXO, txid, transaction.outputs)
    }

    for (const txid of block.txids) {
      const t = await get_transaction(node_id, socket, txid);
      const transaction = RegularTransactionSchema.safeParse(t);
      if (!transaction.success) continue;
      for (const input of transaction.data.inputs)
        try {
          utxoManager.spendOutpoint(UTXO, outpointKey(input.outpoint.txid, input.outpoint.index));
        }
        catch {
          await send_error(node_id, socket, 'INVALID_TX_OUTPOINT', 'Could not spend transaction\'s input');
          return false;
        }
    }

    try {
      utxoManager.put(block_id, UTXO);
    } catch (e) {
      console.error(`[${node_id}] utxo manager put failed`, e);
      return false;
    }
  }
  catch (e) {
    // console.error(e);
    return true;
  }

  return true;
}