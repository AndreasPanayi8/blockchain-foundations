#include "miner.hpp"
#include <stdlib.h>
#include <blake2.h>


const int NONCE_OFFSET = 129;
const int NONCE_SIZE = 64;

Miner::Miner(std::string objectStr) : objectStr(objectStr) {
  for (int i = NONCE_OFFSET; i < NONCE_OFFSET + NONCE_SIZE;++i) {
    int num = std::rand() % 16;
    if (num >= 10) {
      num -= 10;
      this->objectStr[i] = 'a' + num; 
    } else {
      this->objectStr[i] = '0' + num; 
    }
  }
}

void Miner::increment_nonce() {
  int i = NONCE_SIZE - 1;
  ++objectStr[NONCE_OFFSET + i];

  if(objectStr[NONCE_OFFSET + i] == ':') objectStr[NONCE_OFFSET + i] = 'a';
  
  while(i > 0 && objectStr[NONCE_OFFSET + i] == 'g') {
    objectStr[NONCE_OFFSET + i] = '0';
    --i;
    ++objectStr[NONCE_OFFSET + i];
    if(objectStr[NONCE_OFFSET + i] == ':') objectStr[NONCE_OFFSET + i] = 'a';
  }
  
  if (objectStr[NONCE_OFFSET] == 'g') objectStr[NONCE_OFFSET] = '0'; 
}

bool Miner::chech_pow() const {
  uint8_t hash[BLAKE2S_OUTBYTES];
  if (blake2s(hash, objectStr.c_str(), NULL, BLAKE2S_OUTBYTES, objectStr.size(), 0) != 0) {
    return false;
  }

  // Check for if POW condition is satisfied

  return hash[0] == 0 && hash[1] == 0 && hash[2] == 0 && hash[3] == 0 && (hash[4] < 0xab || (hash[4] == 0xab && hash[5] < 0xc0));
}

std::string Miner::get_object_str() const {
  return objectStr;
}
