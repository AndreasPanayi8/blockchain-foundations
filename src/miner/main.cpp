#include <iostream>
#include "miner.hpp"
#include "time.h"
#include "stdlib.h"

int main() {
  std::srand(time(0));

  Miner* miner = new Miner("{\"object\":{\"T\":\"00000000abc00000000000000000000000000000000000000000000000000000\",\"created\":1771170155,\"miner\":\"grader\",\"nonce\":\"fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0\",\"note\":\"This block has a coinbase transaction\",\"previd\":\"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6\",\"txids\":[\"6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb\"],\"type\":\"block\"},\"type\":\"object\"}");
  
  while (true) {
    if (miner->chech_pow()) {
      std::cout << miner->get_object_str() << std::endl;
      break;
    }
    miner->increment_nonce();

  }

  delete miner;
}