import z, { object } from 'zod'

export const HelloMessageSchema = z.strictObject({
    type: z.literal('hello'),
    version: z.string().regex(/^0\.10\.[0-9]+$/),
    agent: z.optional(z.string().max(128))
})

export const ErrorMessageSchema = z.strictObject({
  type: z.literal("error"),
  name: z.enum([
    "INTERNAL_ERROR",
    "INVALID_FORMAT",
    "UNKNOWN_OBJECT",
    "UNFINDABLE_OBJECT",
    "INVALID_HANDSHAKE",
    "INVALID_TX_OUTPOINT",
    "INVALID_TX_SIGNATURE",
    "INVALID_TX_CONSERVATION",
    "INVALID_BLOCK_COINBASE",
    "INVALID_BLOCK_TIMESTAMP",
    "INVALID_BLOCK_POW",
    "INVALID_GENESIS",
  ]),
  description: z.string(),
});

export const GetPeersMessageSchema = z.strictObject({
    type: z.literal('getpeers')
})

// Returns true if host is not localhost
function checkForLocalhostIPv4DNS(host: string): boolean {
  if (host === "localhost") return false;

  const octets = host.split(".").map(o => Number(o));

  if (octets[0] == 0) return false;
  
  if (octets[0] == 10) return false;
  
  if (octets[0] == 127) return false;
  
  if (octets[0] === 169 && octets[1] === 254) return false;
  
  if (octets[0] === 172 && (octets[1] === undefined || octets[1] >= 16 && octets[1] <= 31)) return false;

  if (octets[0] === 192 && octets[1] === 168) return false;

  return true;
}

// Returns true if host is not localhost
function checkForLocalhostIPv6(host: string): boolean {
  if (host === "::1") return false;
  if (host == "::") return false;

  if (host.startsWith('fe80')) return false;

  return true;
}

function isPeerString(s: string): boolean {
  // [IPv6]:port
  if (s.startsWith("[")) {
    const close = s.indexOf("]");
    if (close < 0) return false;

    const host = s.slice(1, close);
    if (!checkForLocalhostIPv6(host)) return false
    const rest = s.slice(close + 1);
    if (!rest.startsWith(":")) return false;

    const port = Number(rest.slice(1));
    return z.ipv6().safeParse(host).success
      && Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  // host:port (dns or ipv4)
  const i = s.lastIndexOf(":");
  if (i <= 0) return false;

  const host = s.slice(0, i);
  if (!checkForLocalhostIPv4DNS(host)) return false;
  
  const port = Number(s.slice(i + 1));
  return z.union([z.hostname(), z.ipv4()]).safeParse(host).success
    && Number.isInteger(port) && port >= 1 && port <= 65535;
}

export const PeersMessageSchema = z.strictObject({
  type: z.literal("peers"),
  peers: z.array(z.string().refine(isPeerString, "peer must be <host>:<port>")),
});


const Hash32Schema = z.string().regex(/^[0-9a-f]{64}$/);

// Hex and non-negative schemas
const LowerHexSchema = z.string().regex(/^[0-9a-f]+$/, "must be lowercase hex");
const NonNegativeIntSchema = z.number().int().nonnegative();

// Primitive schemas
const TxidSchema = LowerHexSchema.length(64);
const PubKeySchema = LowerHexSchema.length(64);
const SigSchema = LowerHexSchema.length(128);

const IndexSchema = NonNegativeIntSchema;
const ValueSchema = NonNegativeIntSchema;
const HeightSchema = NonNegativeIntSchema;

// Composite schemas
const OutpointSchema = z.object({
  txid: TxidSchema,
  index: IndexSchema,
});

const InputSchema = z.object({
  outpoint: OutpointSchema,
  sig: SigSchema,
});

const OutputSchema = z.object({
  value: ValueSchema,
  pubkey: PubKeySchema,
});

// Transaction schemas
const RegularTransactionSchema = z.object({
  type: z.literal("transaction"),
  inputs: z.array(InputSchema).nonempty(),
  outputs: z.array(OutputSchema),
}).strict();

const CoinbaseTransactionSchema = z.object({
  type: z.literal("transaction"),
  height: HeightSchema,
  outputs: z.array(OutputSchema),
}).strict();

const TransactionSchema = z.union([
  RegularTransactionSchema,
  CoinbaseTransactionSchema,
]);

//Block type schemas
const AsciiPrintableSchema = z
  .string()
  .max(128)
  .regex(/^[\x20-\x7E]*$/, "must be ASCII-printable");

const StudentIdSchema = AsciiPrintableSchema;

const NonceSchema = LowerHexSchema.max(64);
const TargetSchema = LowerHexSchema.length(64);

// Block schemas
const BlockSchema = z.object({
  type: z.literal("block"),
  txids: z.array(TxidSchema),
  nonce: NonceSchema,
  previd: z.union([TxidSchema, z.null()]),
  created: z.number().int(),
  T: TargetSchema,
  miner: AsciiPrintableSchema.optional(),
  note: AsciiPrintableSchema.optional(),
  studentids: z.array(StudentIdSchema).max(10).optional(),
}).strict();

const NetworkObjectSchema = z.union([
  TransactionSchema,
  BlockSchema,
]);

const ObjectMessageSchema = z.object({
  type: z.literal("object"),
  object: NetworkObjectSchema,
}).strict();


export const GetObjectMessageSchema = z.strictObject({
  type: z.literal("getobject"),
  objectid: Hash32Schema,
});

export const IHaveObjectMessageSchema = z.strictObject({
  type: z.literal("ihaveobject"),
  objectid: Hash32Schema,
});

export const GetMempoolMessageSchema = z.strictObject({
  type: z.literal("getmempool"),
});

export const MempoolMessageSchema = z.strictObject({
  type: z.literal("mempool"),
  txids: z.array(Hash32Schema),
});

export const GetChainTipMessageSchema = z.strictObject({
  type: z.literal("getchaintip"),
});

export const ChainTipMessageSchema = z.strictObject({
  type: z.literal("chaintip"),
  blockid: Hash32Schema,
});

export const MessageSchema = z.discriminatedUnion("type", [
  HelloMessageSchema,
  ErrorMessageSchema,

  GetPeersMessageSchema,
  PeersMessageSchema,

  // object exchange
  GetObjectMessageSchema,
  IHaveObjectMessageSchema,
  ObjectMessageSchema,

  GetMempoolMessageSchema,
  MempoolMessageSchema,
  GetChainTipMessageSchema,
  ChainTipMessageSchema,
]);


export type Message = z.infer<typeof MessageSchema>
export type NetworkObject = z.infer<typeof NetworkObjectSchema>;
export type GetObjectMessage = z.infer<typeof GetObjectMessageSchema>;
export type IHaveObjectMessage = z.infer<typeof IHaveObjectMessageSchema>;
export type ObjectMessage = z.infer<typeof ObjectMessageSchema>;