#include "miner.hpp"
#include <stdlib.h>
#include <blake2.h>


const int NONCE_OFFSET = 129;
const int NONCE_SIZE = 64;

void randomize_nonce(char *objectStr) {
  for (int i = NONCE_OFFSET; i < NONCE_OFFSET + NONCE_SIZE;++i) {
    int num = std::rand() % 16;
    if (num >= 10) {
      num -= 10;
      objectStr[i] = 'a' + num; 
    } else {
      objectStr[i] = '0' + num; 
    }
  }
}

void increment_nonce(char *objectStr) {
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

bool chech_pow(const char *objectStr, size_t len) {
  uint8_t hash[BLAKE2S_OUTBYTES];
  if (blake2s(hash, objectStr, NULL, BLAKE2S_OUTBYTES, len, 0) != 0) {
    return false;
  }

  // Check for if POW condition is satisfied

  return hash[0] == 0 && hash[1] == 0 && hash[2] == 0 && hash[3] == 0 && (hash[4] < 0xab || (hash[4] == 0xab && hash[5] < 0xc0));
}