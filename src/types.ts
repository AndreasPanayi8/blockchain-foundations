import z from 'zod'

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

function isPeerString(s: string): boolean {
  // [IPv6]:port
  if (s.startsWith("[")) {
    const close = s.indexOf("]");
    if (close < 0) return false;

    const host = s.slice(1, close);
    const rest = s.slice(close + 1);
    if (!rest.startsWith(":")) return false;

    const port = Number(rest.slice(1));
    return z.ipv6().safeParse(host).success
      && Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  // host:port (hostname or ipv4)
  const i = s.lastIndexOf(":");
  if (i <= 0) return false;

  const host = s.slice(0, i);
  const port = Number(s.slice(i + 1));
  return z.union([z.hostname(), z.ipv4()]).safeParse(host).success
    && Number.isInteger(port) && port >= 1 && port <= 65535;
}

export const PeersMessageSchema = z.strictObject({
  type: z.literal("peers"),
  peers: z.array(z.string().refine(isPeerString, "peer must be <host>:<port>")),
});

export const MessageSchema = z.discriminatedUnion('type', [
    HelloMessageSchema, ErrorMessageSchema, GetPeersMessageSchema, PeersMessageSchema
])

export type Message = z.infer<typeof MessageSchema>