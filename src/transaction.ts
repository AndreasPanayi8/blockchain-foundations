import type { Socket } from "net";
import { RegularTransactionSchema, type Transaction } from "./types";
import { send_error, } from "./networking";
import { objectManager } from "./object";
import canonicalize from "canonicalize";

import { utf8ToBytes, hexToBytes} from '@noble/hashes/utils.js'
import { verifyAsync } from "@noble/ed25519";




export async function verifyTransaction(node_id : string, socket : Socket, t : Transaction): Promise<boolean> {
  const reg = RegularTransactionSchema.safeParse(t);
  if (!reg.success) return true;  // Coinbase validation is checked at block validation

  const transaction = reg.data;

  const unsigned = {
    type: transaction.type,
    inputs: transaction.inputs.map(({ outpoint, sig }) => ({
      outpoint,
      sig: null,
    })),
    outputs: transaction.outputs,
  };

  const canonicalized = canonicalize(unsigned);
  if (!canonicalized) {
    console.error("Failed to canonicalize unsigned transaction");
    return false;
  }

  var inputSum = 0;
  const usedOutputs = new Set<string>();
  for (const input of transaction.inputs) {
    const outpointkey = `${input.outpoint.txid}:${input.outpoint.index}`;
    if (usedOutputs.has(outpointkey)) {
      await send_error(node_id, socket, 'INVALID_FORMAT', 'Transaction outpoints must be unique');
      return false;
    }

    usedOutputs.add(outpointkey);

    const txid = input.outpoint.txid;
    const found = await objectManager.exists(txid);
    if(!found) {
      await send_error(node_id, socket, 'UNKNOWN_OBJECT', 'Transaction txid not found in database');
      return false;
    }

    try {
      const inObj = await objectManager.get(txid);

      switch (inObj.type) {
        case 'transaction':
          if (input.outpoint.index >= inObj.outputs.length) {
            await send_error(node_id, socket, 'INVALID_TX_OUTPOINT', 'The transaction outpoint index is too large');
            return false;
          }
          const output = inObj.outputs[input.outpoint.index];
          if (output === undefined) {
            await send_error(node_id, socket, 'INVALID_FORMAT', 'Referenced output is undefined');
            return false;
          }

          const verify = await verifyAsync(
            hexToBytes(input.sig),
            utf8ToBytes(canonicalized),
            hexToBytes(output.pubkey)
          );
          
          if (!verify) {
            await send_error(node_id, socket, 'INVALID_TX_SIGNATURE', 'Invalid signature');
            return false;
          }

          inputSum += output.value;
          break;

        case 'block':
          await send_error(node_id, socket, 'INVALID_FORMAT', 'Transaction txid is a block id');
          return false;
      }
    } catch (err) { 
      console.error(`[${node_id}]: get failed`, err);
    }
  }

  var outputSum = 0;
  for (const o of transaction.outputs) {
    outputSum += o.value;
  }

  if (inputSum < outputSum) {
    await send_error(node_id, socket, 'INVALID_TX_CONSERVATION', 'The transaction does not satisfy the weak law of conservation');
    return false;
  }
  return true
}