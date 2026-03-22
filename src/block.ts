import canonicalize from "canonicalize";
import {blake2s} from "@noble/hashes/blake2.js";
import {utf8ToBytes, bytesToHex} from "@noble/hashes/utils.js";
import{BlockSchema, type Block} from "./types";

export const REQUIRED_TARGET =
"00000000abc00000000000000000000000000000000000000000000000000000";

export function parseBlock(value: unknown): Block {
  return BlockSchema.parse(value);
}

export function safeParseBlock(value: unknown): Block{
  const result = BlockSchema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  throw new Error(`Invalid block: ${result.error.message}`);
}
