import type { Socket } from "net";
import{CoinbaseTransactionSchema, RegularTransactionSchema, type Block} from "./types";
import { send_error } from "./networking";
import { get_transaction } from "./transaction";
import { outpointKey, utxoManager } from "./utxo";
 
export async function verifyBlock(node_id : string, socket : Socket, block : Block, block_id : string) : Promise<boolean> {
  if (Number('0x' + block_id) >= Number('0x' + block.T)) {
    await send_error(node_id, socket, 'INVALID_BLOCK_POW', 'Proof of work failed');
    return false;
  }

  let UTXO = await utxoManager.getBaseState(block.previd);
  if (UTXO === null) return true;

  let fee = 50_000_000_000_000;
  const firstTxid = block.txids[0];
  if (firstTxid === undefined) return false;
  try {
    const firstTransaction = await get_transaction(firstTxid);

    const c = CoinbaseTransactionSchema.safeParse(firstTransaction)

    if (!c.success) {
      const reg = RegularTransactionSchema.parse(firstTransaction);
      for (const input of reg.inputs) {
        try {
          utxoManager.spendOutpoint(UTXO, outpointKey(input.outpoint.txid, input.outpoint.index));
        }
        catch {
          await send_error(node_id, socket, 'INVALID_TX_OUTPOINT', 'Could not spend transaction\'s input');
          return false;
        }
      }
    }

    utxoManager.addOutputs(UTXO, firstTxid, firstTransaction.outputs)

    for (let i = 1;i < block.txids.length;++i) {
      const txid = block.txids[i];
      if (txid === undefined) return false;
      
      const t = await get_transaction(txid);
      const reg = RegularTransactionSchema.safeParse(t);
      if(!reg.success) {
        await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase must be at 0');
        return false;
      }
      const transaction = reg.data;

      for (const input of transaction.inputs) {
        if (c.success && input.outpoint.txid === firstTxid) {
          await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase cannot be spent in its block');
          return false;
        }

        try {
          utxoManager.spendOutpoint(UTXO, outpointKey(input.outpoint.txid, input.outpoint.index));
        }
        catch {
          await send_error(node_id, socket, 'INVALID_TX_OUTPOINT', 'Could not spend transaction\'s input');
          return false;
        }
        
        if (c.success) {
          const inTransaction = await get_transaction(input.outpoint.txid);
          const output = inTransaction.outputs[input.outpoint.index];
          if (output === undefined) return false; 
          fee += output.value;
        }
      }

      for (const output of transaction.outputs) {
        fee -= output.value;
      }
      utxoManager.addOutputs(UTXO, txid, transaction.outputs);
    }

    if (c.success) {
      const coinbase = c.data;

      let coinbaseOut = 0;
      for (const output of coinbase.outputs) {
        coinbaseOut += output.value;
      } 

      if (coinbaseOut > fee) {
        await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase\'s total output exceeded fees + reward');
        return false;
      }
    }
  } catch (e) {
    console.error(`[${node_id}]: ` +  e);
    send_error(node_id, socket, 'UNFINDABLE_OBJECT', `Transaction txid not found in database`); 
    return false;
  }

  try {
    utxoManager.put(block_id, UTXO);
  } catch (e) {
    console.error(`[${node_id}] utxo manager put failed`, e);
    return false;
  }
  
  return true;
}