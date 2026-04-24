#include <iostream>
#include "miner.hpp"
#include <cstdlib>
#include <chrono>
#include <iomanip>
#include <cstring>
#include <atomic>
#include <thread>
#include <vector>
#include <functional>
#include "./blake2.h"

void mine(int i, const char *object_postfix, size_t len, const blake2s_state &state, int &found, std::atomic<uint64_t> &cnt) {
  alignas(64) Object obj;
  initialize_object(obj, object_postfix, len);
  
  while (found == 0) {
    if (check_pow(obj, state, len)) {
      found = i;
      break;
    }
    increment_nonce(obj);
    ++cnt;
  }
}

int main() {
  char objectStr[] = "{\"object\":{\"T\":\"00000000abc00000000000000000000000000000000000000000000000000000\",\"created\":1771170155,\"miner\":\"grader\",\"nonce\":\"fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0\",\"previd\":\"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6\",\"txids\":[\"6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb\"],\"type\":\"block\"},\"type\":\"object\"}";
  size_t len = std::strlen(objectStr) - 129;

  blake2s_state state;

  if (blake2s_init(&state, BLAKE2S_OUTBYTES) != 0) {
      return -1;
  }

  blake2s_update(&state, (uint8_t *)objectStr, 129);

  const int n = 16;
  std::vector<std::thread> threads;
  std::atomic<uint64_t> cnt[n] = {};
  int found = 0;
  for (int i = 0; i < n; ++i) {
      threads.emplace_back(mine, i+1, objectStr + 129, len, state, std::ref(found), std::ref(cnt[i]));
  }

  auto last_time = std::chrono::steady_clock::now();
  while(found == 0) {
    std::this_thread::sleep_for(std::chrono::seconds(5));
    uint64_t total = 0;
    for (int i = 0;i < n;++i) {
      total += cnt[i];
      cnt[i] = 0;
    }
    auto cur_time = std::chrono::steady_clock::now();
    std::chrono::duration<double> elapsed = cur_time - last_time;
    double hashrate = total / elapsed.count();
    std::cout << std::fixed << std::setprecision(2) << hashrate << '\n';

    last_time = cur_time;
  } 

  for (auto& t : threads) t.join();



}