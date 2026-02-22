import z from 'zod'

export const HelloMessageSchema = z.object({
    type: z.literal('hello'),
    version: z.string(),  // TODO: regex for correct version
    agent: z.optional(z.string().max(128))
})

export const ErrorMessageSchema = z.object({
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

export const GetPeersMessageSchema = z.object({
    type: z.literal('getpeers')
})

export const PeersMessageSchema = z.object({
    type: z.literal('peers'),
    peers: z.array(z.string())  // TODO: regex for dns, IPv4 or IPv6
})

export const MessageSchema = z.discriminatedUnion('type', [
    HelloMessageSchema, ErrorMessageSchema, GetPeersMessageSchema, PeersMessageSchema
])

export type Message = z.infer<typeof MessageSchema>