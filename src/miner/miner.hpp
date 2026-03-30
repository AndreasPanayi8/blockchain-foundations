#ifndef MINER_HPP
#define MINER_HPP
#include <string>

class Miner {
  private:
    static const std::string T;
    static const std::string NAME;
    static const std::string STUDENT_IDS;
    const std::string timestamp;
    const std::string previd;
    const std::string txids;
    std::string nonce;

    std::string objectStr;
  public:
    Miner(std::string previd, std::string txids);
    void increment_nonce();
    bool chech_pow();

    std::string get_object_str();
};

#endif // MINER_HPP