#ifndef MINER_HPP
#define MINER_HPP
#include <string>

class Miner {
  private:
    std::string objectStr;
  public:
    Miner(std::string objectStr);
    void increment_nonce();
    bool chech_pow() const;

    std::string get_object_str() const;
};

#endif // MINER_HPP