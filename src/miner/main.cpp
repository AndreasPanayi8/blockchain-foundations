#include <iostream>
#include "miner.hpp"
#include <ctime>
#include <cstdlib>
#include <chrono>
#include <iomanip>
#include <cstring>
#include <atomic>
#include <thread>
#include <vector>

std::atomic<uint64_t> cnt(0);

void mine(char *objectStr, size_t len) {
  randomize_nonce(objectStr);
  while (true) {
    if (chech_pow(objectStr, len)) {
      // break;
    }
    increment_nonce(objectStr);
    ++cnt;
  }
}

int main() {
  std::srand(time(0));

  char objectStr[] = "{\"object\":{\"T\":\"00000000abc00000000000000000000000000000000000000000000000000000\",\"created\":1771170155,\"miner\":\"grader\",\"nonce\":\"fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0\",\"note\":\"This block has a coinbase transaction\",\"previd\":\"00000000522473196b73bc619a8b18472c4cb4c6caf785a13fa32aaae7222ff6\",\"txids\":[\"6e77eb8eb23aa6c6dfb28ac72b38116d4826c6a96299199ae0013654bc71a5fb\"],\"type\":\"block\"},\"type\":\"object\"}";  
  size_t len = std::strlen(objectStr);

  int n = 16;
  std::vector<std::thread> threads;

  char* objectStrs[n];
  for (int i = 0; i < n; ++i) {
      objectStrs[i] = new char[len +1];
      std::strcpy(objectStrs[i], objectStr);
      threads.emplace_back(mine, objectStrs[i], len);
  }

  auto last_time = std::chrono::steady_clock::now();
  while(true) {
    std::this_thread::sleep_for(std::chrono::seconds(1));
    auto cur_time = std::chrono::steady_clock::now();
    std::chrono::duration<double> elapsed = cur_time - last_time;
    double hashrate = cnt / elapsed.count();
    std::cout << std::fixed << std::setprecision(2) << hashrate << '\n';
    cnt = 0;
    last_time = cur_time;
  }
}