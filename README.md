# Marabu Node Implementation

##  File structure

The source code for the node is inside the `src/` folder which contains three files.
- `node.ts`: The implementation of the node's networking functionality
- `peer.ts`: Peer handling helper functions for storing and loading the peers
- `type.ts`: Protocol validation using zod

The `storage/` folder is used to store the information that need to be saved after reboots. It contains:
- `discovered_peers.txt`: The peers that are discovered, stored in plain text format

## Node execution

In order to start the node using bun run:
``` bun ./src/node.ts```

## Message handling

The node accepts every message type that the protocol describes.

The current implementation of the node only handles hello, getpeers, peer or error messeges. The rest of the valid messages are ignored.

## Peer discovery

A peer address is considered valid only if it is of the form `<host>:<port>` where `<host>` is IPv4, IPv6 or any dns hostname that is not a localhost. 

The node discovers another peer if:
- The peer sends a hello message
- The peer is in a valid peers message. Note that, if a single peer address is invalid in an incoming peer array, then the whole peers message is considered invalid.

## Contributors

Andreas Panagi,
Maria Zaza,
Michail Vitantzakis
