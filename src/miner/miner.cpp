#include "miner.hpp"
#include <blake2.h>

const std::string T = "00000000abc00000000000000000000000000000000000000000000000000000";
const std::string Miner::NAME = "MMA";
const std::string STUDENT_IDS = "[7115142400006,7115142400008,7115142500002]";

Miner::Miner(std::string previd, std::string txids) : timestamp(/*TODO*/ ), previd(previd), txids(txids) {
  // TODO nonce
}

void Miner::increment_nonce() {
  const int NONCE_INDEX = 127;
  int i = 63;
  ++objectStr[NONCE_INDEX + i];

  if(objectStr[NONCE_INDEX + i] == ':') objectStr[NONCE_INDEX + i] = 'a';
  
  while(i > 0 && objectStr[NONCE_INDEX + i] == 'g') {
    objectStr[NONCE_INDEX + i] = '0';
    --i;
    ++objectStr[NONCE_INDEX + i];
    if(objectStr[NONCE_INDEX + i] == ':') objectStr[NONCE_INDEX + i] = 'a';
  }
  
  if (objectStr[NONCE_INDEX] == 'g') objectStr[NONCE_INDEX] = '0'; 
}

bool Miner::chech_pow() {
  uint8_t hash[BLAKE2S_OUTBYTES];
  if (blake2s(hash, objectStr.c_str(), NULL, BLAKE2S_OUTBYTES, objectStr.size(), 0) != 0) {
    return false;
  }

  // Check for if POW condition is satisfied

  return hash[0] == 0 && hash[1] == 0 && hash[2] == 0 && hash[3] == 0 && (hash[4] < 0xab || hash[4] == 0xab && hash[5] < 0xc0);
}

std::string Miner::get_object_str() {
  return objectStr;
}
