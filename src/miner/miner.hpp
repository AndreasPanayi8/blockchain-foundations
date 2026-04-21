#ifndef MINER_HPP
#define MINER_HPP
#include <cstdlib>

void randomize_nonce(char *objectStr);
void increment_nonce(char *objectStr);
bool chech_pow(const char *objectStr, size_t len);

#endif // MINER_HPP