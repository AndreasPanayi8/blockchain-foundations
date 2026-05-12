#include "miner.hpp"
#include  <stdint.h>
#include <random>
#include <cstring>
#include <immintrin.h>
#include <iostream>

static std::mt19937_64 generator(std::random_device{}());
static std::uniform_int_distribution<uint64_t> distribution(0, std::numeric_limits<uint64_t>::max());

void bytes_to_hex(const uint8_t *bytes, char *hex) {
  static const char hex_digits[] = "0123456789abcdef";
  for (size_t i = 0; i < 32; ++i) {
    hex[i * 2] = hex_digits[bytes[i] >> 4];
    hex[i * 2 + 1] = hex_digits[bytes[i] & 0x0F];
  }
}

void initialize_object(Object &object, const char *postfix, size_t len) {
  for(int i = 0;i < 4;++i) {
    object.nonce[i] = distribution(generator);  
  }

  std::memcpy(object.postfix, postfix, len);

  bytes_to_hex((const uint8_t*)object.nonce, object.postfix);
}

void increment_nonce(Object &object) {
  unsigned char carry = 1;
  carry = _addcarry_u64(carry, object.nonce[0], 0, &object.nonce[0]);
  carry = _addcarry_u64(carry, object.nonce[1], 0, &object.nonce[1]);
  carry = _addcarry_u64(carry, object.nonce[2], 0, &object.nonce[2]);
  _addcarry_u64(carry, object.nonce[3], 0, &object.nonce[3]);

  bytes_to_hex((const uint8_t*)object.nonce, object.postfix);
}

bool check_pow(const Object &object, const blake2s_state &state, size_t len) {
  blake2s_state state_copy = state;
  blake2s_update(&state_copy, (const uint8_t *)&object.postfix, len);
  
  uint8_t hash[BLAKE2S_OUTBYTES];
  if (blake2s_final(&state_copy, hash, BLAKE2S_OUTBYTES) != 0) {
    return false;
  }

  // Check for if POW condition is satisfied

  return __builtin_expect(hash[0] == 0 && hash[1] == 0 && hash[2] == 0 && hash[3] == 0 && (hash[4] < 0xab || (hash[4] == 0xab && hash[5] < 0xc0)),0);
}