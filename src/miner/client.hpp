#ifndef CLIENT_HPP
#define CLIENT_HPP
#include <string>

namespace Client {
  void connect();
  std::string readline();
  void send(std::string str);
  void quit();
}

#endif    // CLIENT_HPP