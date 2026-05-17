# Marabu Node Implementation

In this repository there is:
- A typescript implementation of a Marabu node
- A C++ implementation of a Marabu miner for x86 architecture
- A simple typesript tester 

## Node

The protocol of the node is described here:
https://www.marabu.dev/protocol

In order to start the node run:
```
bun install 
bun ./src/node.ts```

## Miner

The compilation of the miner is done by `clang++`. In order to compile and start the miner run:
```
cd ./src/miner/
make
./miner```

The miner will connect to `HOST:PORT` defined by `src/miner/client.cpp` and will expect to recieve a block in Marabu's format.

The miner will start mining that block and it will send the mined object to `HOST:PORT`.

If the miner recieves another block by `HOST:PORT` it will stop mining the current block and will start mine the new one.

In order to achieve maximum hashrate you could try to adjust n in `src/miner/miner.cpp` which is the miner thread count. 

## Testing

In `testing/` there is a tester. In order to start it run:
```
bun install 
bun ./testing/tester.ts```

This will run the first testcase which is defined in `testing/testcase.ts`. Each testcase is a list of messeges that the tester will send to the node.

## Contributors

Antreas Panagi,
Maria Zaza,
Michail Vitantzakis
