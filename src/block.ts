import type { Socket } from "net";
import{type Block} from "./types";
import { send_error } from "./networking";
 
export async function verifyBlock(node_id : string, socket : Socket, block : Block, block_id : string) : Promise<boolean> {
  if (Number('0x' + block_id) >= Number('0x' + block.T)) {
    await send_error(node_id, socket, 'INVALID_BLOCK_POW', 'Proof of work failed');
    return false;
  } 
  return true;
}