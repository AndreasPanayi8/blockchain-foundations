#include <iostream>
#include "miner.hpp"
#include <cstdlib>
#include <chrono>
#include <iomanip>
#include <cstring>
#include <atomic>
#include <thread>
#include <mutex>
#include <vector>
#include <functional>
#include "./blake2.h"
#include "client.hpp"


char nonce[64];
std::mutex mutex;

void mine(std::stop_token token, int i, const char *object_postfix, size_t len, const blake2s_state &state, int &found, std::atomic<uint64_t> &cnt) {
  alignas(64) Object obj;
  initialize_object(obj, object_postfix, len);
  
  while (found == 0) {
    if (token.stop_requested()) return;
    if (check_pow(obj, state, len)) {
      found = i;
      std::lock_guard<std::mutex> lock(mutex);
      std::memcpy(nonce, obj.postfix,64);
      break;
    }
    increment_nonce(obj);
    ++cnt;
  }
}
void miner_controller(std::stop_token token, std::string objectStr) {
  const int NONCE_OFFSET = 116;

  size_t len = objectStr.length() - NONCE_OFFSET;

  blake2s_state state;

  if (blake2s_init(&state, BLAKE2S_OUTBYTES) != 0) {
      return;
  }

  blake2s_update(&state, (uint8_t *)objectStr.c_str(), NONCE_OFFSET);

  const int n = 16;
  std::vector<std::jthread> threads;
  std::atomic<uint64_t> cnt[n] = {};
  int found = 0;
  for (int i = 0; i < n; ++i) {
      threads.emplace_back(mine, token, i+1, objectStr.c_str() + NONCE_OFFSET, len, state, std::ref(found), std::ref(cnt[i]));
  }

  auto last_time = std::chrono::steady_clock::now();
  while(found == 0) {
    if (token.stop_requested()) return;
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

  objectStr.replace(NONCE_OFFSET, 64, nonce);

  objectStr = "{\"object\":"+objectStr+",\"type\":\"object\"}\n";
  std::cout << "Sending: " << objectStr << std::endl;
  Client::send(objectStr);
}

int main() {
  Client::connect();

  std::jthread controller;
  while (true) {
    std::string objectStr = Client::readline();
    std::cout << "Recieved: " << objectStr << std::endl;

    controller.request_stop();
    controller = std::jthread(miner_controller, objectStr);
  }
 
  Client::quit();
}