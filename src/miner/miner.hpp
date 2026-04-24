#ifndef MINER_HPP
#define MINER_HPP
#include "./blake2.h"

struct Object {
  unsigned long long nonce[4];
  char postfix[992];
};

void initialize_object(Object &object, const char *postfix, size_t len);

void increment_nonce(Object &object);

bool check_pow(const Object &object, const blake2s_state &state, size_t len);

#endif // MINER_HPP