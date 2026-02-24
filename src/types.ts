import z from 'zod'

export const HelloMessageSchema = z.strictObject({
    type: z.literal('hello'),
    version: z.string().regex(/^0\.10\.[0-9]+$/),
    agent: z.optional(z.string().max(128))
})

export const ErrorMessageSchema = z.strictObject({
    type: z.literal('error'),
    name: z.literal([
      'INTERNAL_ERROR',
      'INVALID_FORMAT',
      'UNKNOWN_OBJECT',
      'UNFINDABLE_OBJECT',
      'INVALID_HANDSHAKE',
      'INVALID_TX_OUTPOINT',
      'INVALID_TX_SIGNATURE',
      'INVALID_TX_CONSERVATION',
      'INVALID_BLOCK_COINBASE',
      'INVALID_BLOCK_TIMESTAMP',
      'INVALID_BLOCK_POW',
      'INVALID_GENESIS']),
      description: z.string()
})

export const GetPeersMessageSchema = z.strictObject({
    type: z.literal('getpeers')
})

export const PeersMessageSchema = z.strictObject({
    type: z.literal('peers'),
    peers: z.array(z.union([z.hostname(),z.ipv4(),z.ipv6(), z.string().refine(
        (str) => {
            if(!str.includes(':')) return false
            
            let n = str.lastIndexOf(':')
            let hostname = str.substring(0,n)
            if (hostname[0] == '[' && hostname[n-1] == ']') hostname = str.substring(1,n-1)
            let port = str.substring(n + 1);
            
            return z.union([z.hostname(),z.ipv4(),z.ipv6()]).safeParse(hostname).success && z.int().max(65535).safeParse(port).success
        }
        )]))
})

export const MessageSchema = z.discriminatedUnion('type', [
    HelloMessageSchema, ErrorMessageSchema, GetPeersMessageSchema, PeersMessageSchema
])

export type Message = z.infer<typeof MessageSchema>