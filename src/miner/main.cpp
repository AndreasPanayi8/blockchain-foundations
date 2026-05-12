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
#include "client.hpp"

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
  Client::connect();

  std::string objectStr = Client::readline();
  std::cout << "Recieved: " << objectStr << std::endl;
  const int NONCE_OFFSET = 125;
  size_t len = objectStr.length() - NONCE_OFFSET;

  blake2s_state state;

  if (blake2s_init(&state, BLAKE2S_OUTBYTES) != 0) {
      return -1;
  }

  blake2s_update(&state, (uint8_t *)objectStr.c_str(), NONCE_OFFSET);

  const int n = 16;
  std::vector<std::thread> threads;
  std::atomic<uint64_t> cnt[n] = {};
  int found = 0;
  for (int i = 0; i < n; ++i) {
      threads.emplace_back(mine, i+1, objectStr.c_str() + NONCE_OFFSET, len, state, std::ref(found), std::ref(cnt[i]));
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


  Client::quit();
}