import type { Socket } from "net";
import { CoinbaseTransactionSchema, RegularTransactionSchema, type Block, type NetworkObject } from "./types";
import { send_error, broadcast_getobject } from "./networking";
import { get_transaction } from "./transaction";
import { outpointKey, utxoManager, type UTXOEntry } from "./utxo";
import { objectManager } from "./object";
import { chain_data } from "./chain";
import { heightManager } from "./height";
import { GENESIS_BLOCK_ID } from "./types";

async function findParentBlock(previd: string): Promise<NetworkObject | null> {
  try {
    return await objectManager.find(previd, async (id) => {
      await broadcast_getobject(id);
    });
  } catch {
    return null;
  }
}

async function get_object_height(block: Block, block_id: string): Promise<number | null> {
  if (await heightManager.exists(block_id)) {
    return await heightManager.get(block_id);
  }

  if (block.previd === null) {
    if (block_id !== GENESIS_BLOCK_ID) {
      return null;
    }
    return 0;
  }

  if (!(await heightManager.exists(block.previd))) {
    return null;
  }

  const parentHeight = await heightManager.get(block.previd);
  return parentHeight + 1;
}

async function validate_block_timestamp(node_id: string, socket: Socket, block: Block, block_id: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  if (block.created >= now) {
    await send_error(node_id, socket, "INVALID_BLOCK_TIMESTAMP", "Block timestamp is not earlier than current time");
    return false;
  }

  if (block.previd === null) {
    if (block_id !== GENESIS_BLOCK_ID) {
      await send_error(node_id, socket, "INVALID_GENESIS", "Block has null previd but is not genesis");
      return false;
    }
    return true;
  }

  const parent = await objectManager.get(block.previd) as Block;

  if (block.created <= parent.created) {
    await send_error(node_id, socket, "INVALID_BLOCK_TIMESTAMP", "Block timestamp is not later than parent timestamp");
    return false;
  }

  return true;
}

export async function verifyBlock(node_id: string, socket: Socket, block: Block, block_id: string): Promise<boolean> {
  // A. Check PoW and genesis
  if (BigInt('0x' + block_id) >= BigInt('0x' + block.T)) {
    await send_error(node_id, socket, 'INVALID_BLOCK_POW', 'Proof of work failed');
    return false;
  }

  if (block.previd === null && block_id !== GENESIS_BLOCK_ID) {
    await send_error(node_id, socket, 'INVALID_GENESIS', 'Previous block is null but the block is not the genesis block');
    return false;
  }

  // B. Ensure parent is in the DB, UTXO DB.
  // The parent's UTXO entry is written only after it passes full validation, so its presence
  // means the entire ancestor _da is already valid — no need to re-validate it here.
  if (block.previd !== null && !(await utxoManager.exists(block.previd))) {
    const parent = await findParentBlock(block.previd);

    if (parent === null || parent.type !== "block") {
      await send_error(node_id, socket, "UNFINDABLE_OBJECT", "Could not find predecessor block");
      return false;
    }

    if (!(await utxoManager.exists(block.previd))) {
      await send_error(node_id, socket, "UNFINDABLE_OBJECT", "Could not validate predecessor chain");
      return false;
    }
  }

  // C. Validate timestamp
  if (!(await validate_block_timestamp(node_id, socket, block, block_id))) {
    return false;
  }

  // D. Compute height
  const height = await get_object_height(block, block_id);
  if (height === null) {
    await send_error(node_id, socket, "UNFINDABLE_OBJECT", "Could not compute block height");
    return false;
  }

  // E. Validate transactions (coinbase + regular) and build UTXO state
  let UTXO = await utxoManager.getBaseState(block.previd);
  if (UTXO === null) {
    await send_error(node_id, socket, "UNFINDABLE_OBJECT", "Parent block's UTXO not found");
    return false;
  }

  if (block.txids.length > 0) {
    let fee = 50_000_000_000_000;

    const firstTxid = block.txids[0];
    if (firstTxid === undefined) return false;

    try {
      const firstTransaction = await get_transaction(firstTxid);
      const c = CoinbaseTransactionSchema.safeParse(firstTransaction);

      if (c.success && c.data.height !== height) {
        await send_error(node_id, socket, "INVALID_BLOCK_COINBASE", "Coinbase height does not match block height");
        return false;
      }

      if (!c.success) {
        // First tx is regular — spend its inputs
        const reg = RegularTransactionSchema.parse(firstTransaction);
        for (const input of reg.inputs) {
          let spent: UTXOEntry;
          try {
            spent = utxoManager.spendOutpoint(UTXO, outpointKey(input.outpoint.txid, input.outpoint.index));
          } catch {
            await send_error(node_id, socket, 'INVALID_TX_OUTPOINT', 'Could not spend transaction\'s input');
            return false;
          }
          fee += spent.value;
        }
        for (const output of reg.outputs) {
          fee -= output.value;
        }
      }

      utxoManager.addOutputs(UTXO, firstTxid, firstTransaction.outputs);

      for (let i = 1; i < block.txids.length; ++i) {
        const txid = block.txids[i];
        if (txid === undefined) return false;

        const t = await get_transaction(txid);
        const reg = RegularTransactionSchema.safeParse(t);

        if (!reg.success) {
          await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase must be at 0');
          return false;
        }

        const transaction = reg.data;

        for (const input of transaction.inputs) {
          if (c.success && input.outpoint.txid === firstTxid) {
            await send_error(node_id, socket, 'INVALID_TX_OUTPOINT', 'Coinbase cannot be spent in its block');
            return false;
          }

          let spent: UTXOEntry;
          try {
            spent = utxoManager.spendOutpoint(UTXO, outpointKey(input.outpoint.txid, input.outpoint.index));
          } catch {
            await send_error(node_id, socket, 'INVALID_TX_OUTPOINT', "Could not spend transaction's input");
            return false;
          }
          fee += spent.value;
        }

        for (const output of transaction.outputs) {
          fee -= output.value;
        }

        utxoManager.addOutputs(UTXO, txid, transaction.outputs);
      }

      if (c.success) {
        let coinbaseOut = 0;
        for (const output of c.data.outputs) {
          coinbaseOut += output.value;
        }
        if (coinbaseOut > fee) {
          await send_error(node_id, socket, 'INVALID_BLOCK_COINBASE', 'Coinbase\'s total output exceeded fees + reward');
          return false;
        }
      }
    } catch (e) {
      console.error(`[${node_id}]: ` + e);
      await send_error(node_id, socket, 'UNFINDABLE_OBJECT', `Transaction txid not found in database`);
      return false;
    }
  }

  // F. Persist UTXO state and height, update chain tip
  try {
    await utxoManager.put(block_id, UTXO);
    await heightManager.put(block_id, height);
  } catch (e) {
    console.error(`[${node_id}] utxo/height manager put failed`, e);
    return false;
  }

  await chain_data.update(block_id, height);

  return true;
}