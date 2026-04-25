#include "client.hpp"
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <iostream>
#include <cstring>

namespace Client {
  // const char HOST[] = "95.179.176.219";
  const char HOST[] = "127.0.0.1";
  const int PORT = 18018;

  int sock = 0;

  std::string buffer;
  
  void connect() {
    if ((sock = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
      std::cerr << "Socket creation error" << std::endl;
      exit(-1);
    }

    sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(PORT);

    if (inet_pton(AF_INET, HOST, &server_addr.sin_addr) <= 0) {
      std::cerr << "Invalid address/ Address not supported" << std::endl;
      exit(-1);
    }

    if (connect(sock, (sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
      std::cout << "Connect failed" << std::endl;
      exit(-1);
    }

    std::string line;

    line = readline();
    std::cout << "Recieved: " << line << std::endl;
    line = readline();
    std::cout << "Recieved: " << line << std::endl;
  }

  std::string readline() {
    ssize_t bytes_read;

    const ssize_t BUFFER_SIZE = 1024;
    char temp_buffer[BUFFER_SIZE];
    
    while (true) {
      size_t pos = buffer.find('\n');
      if (pos != std::string::npos) {
          std::string line = buffer.substr(0, pos);
          buffer.erase(0, pos + 1);
          return line;
      }

      bytes_read = recv(sock, temp_buffer, BUFFER_SIZE, 0);
      
      if (bytes_read <= 0) {
          std::string remainder = buffer;
          buffer.clear();
          return remainder; 
      }

      buffer.append(temp_buffer, bytes_read);
    }
    
  }

  void quit() {
    close(sock);
  }
}