import type { Socket } from "net";
import{CoinbaseTransactionSchema, RegularTransactionSchema, type Block, type NetworkObject} from "./types";
import { send_error, broadcast_getobject } from "./networking";
import { get_transaction } from "./transaction";
import { outpointKey, utxoManager, type UTXOEntry } from "./utxo";
import { objectManager } from "./object";

const GENESIS_BLOCK_ID =
  "00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6";


async function findParentBlock(previd: string) : Promise<NetworkObject | null> {
  try{
    return await objectManager.find(previd, async (id) => {
      await broadcast_getobject(id);
    });
  } catch {
    return null;
  }
}

async function findMissingAncestorPath(
  block: Block
): Promise<Array<{ block: Block; blockid: string }> | null> {
  const path: Array<{ block: Block; blockid: string }> = [];

  let current = block;

  while (current.previd !== null) {
    if (await utxoManager.exists(current.previd)) {
      return path.reverse();
    }

    const parent = await findParentBlock(current.previd);

    if (parent === null || parent.type !== "block") {
      return null;
    }

    const parentBlockId = current.previd;

    if (BigInt("0x" + parentBlockId) >= BigInt("0x" + parent.T)) {
      return null;
    }

    path.push({ block: parent, blockid: parentBlockId });
    current = parent;
  }

  if (block.previd === null) {
    return [];
  }

  if (objectManager.objectId(current) === GENESIS_BLOCK_ID) {
    return path.reverse();
  }

  return null;
}


async function validateBlockLocal(node_id : string, socket : Socket, block : Block, block_id : string) : Promise<boolean> {
  if (block.previd === null && block_id !== GENESIS_BLOCK_ID) {
    await send_error(node_id, socket, 'INVALID_GENESIS', 'Previous block is null but the block is not the genesis block');
    return false;
  } 
  
  if (BigInt('0x' + block_id) >= BigInt('0x' + block.T)) {
    await send_error(node_id, socket, 'INVALID_BLOCK_POW', 'Proof of work failed');
    return false;
  }

  let UTXO = await utxoManager.getBaseState(block.previd);
  if (UTXO === null) {
    await send_error(
      node_id,
      socket,
      "UNFINDABLE_OBJECT",
      "Parent block's UTXO not found"
    );
    return false;
  }  // If the previous block is not in the database it is ingored
  

  if (block.txids.length > 0) {
    let fee = 50_000_000_000_000;

    // First transaction validation
    const firstTxid = block.txids[0];
    if (firstTxid === undefined) return false;
    try {
      const firstTransaction = await get_transaction(firstTxid);

      const c = CoinbaseTransactionSchema.safeParse(firstTransaction)

      if (!c.success) {
        // If the first transaction is not a coinbase spend its inputs
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

      // Create transaction's outputs
      utxoManager.addOutputs(UTXO, firstTxid, firstTransaction.outputs)

      // Validate the rest transactions
      for (let i = 1;i < block.txids.length;++i) {
        const txid = block.txids[i];
        if (txid === undefined) return false;
        
        const t = await get_transaction(txid);
        const reg = RegularTransactionSchema.safeParse(t);
        
        if(!reg.success) {
          // The transaction is a coinbase
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
          if (c.success) fee += spent.value;
        }

        for (const output of transaction.outputs) {
          // Reduce the fee by the amount spend
          fee -= output.value;
        }
        
        // Create transaction's outputs
        utxoManager.addOutputs(UTXO, txid, transaction.outputs);
      }

      if (c.success) {
        // Check for law of conservation for the coinbase transaction, if it exists
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
      await send_error(node_id, socket, 'UNFINDABLE_OBJECT', `Transaction txid not found in database`); 
      return false;
    }
  }

  try {
    await utxoManager.put(block_id, UTXO);
  } catch (e) {
    console.error(`[${node_id}] utxo manager put failed`, e);
    return false;
  }
  
  return true;
}

export async function verifyBlock(
  node_id: string,
  socket: Socket,
  block: Block,
  block_id: string
): Promise<boolean> {
  const missingAncestors = await findMissingAncestorPath(block);

  if (missingAncestors === null) {
    await send_error(
      node_id,
      socket,
      "UNFINDABLE_OBJECT",
      "Could not find valid predecessor chain"
    );
    return false;
  }

    for (const ancestor of missingAncestors) {
    if (!(await utxoManager.exists(ancestor.blockid))) {
      const ok = await validateBlockLocal(
        node_id,
        socket,
        ancestor.block,
        ancestor.blockid
      );

      if (!ok) {
        await send_error(
          node_id,
          socket,
          "UNFINDABLE_OBJECT",
          "Could not validate predecessor chain"
        );
        return false;
      }
    }

    if (!(await objectManager.exists(ancestor.blockid))) {
      await objectManager.put(ancestor.block);
    }
  }

  return await validateBlockLocal(node_id, socket, block, block_id);
}