CXX = clang++
CC = clang
CXXFLAGS = -std=c++20 -Ofast -march=native -flto -mavx2 -mfma
CCFLAGS = -Ofast -march=native -flto -mavx2 -mfma

OBJS = miner.o main.o blake2s.o client.o

TARGET = miner

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJS)

main.o: main.cpp miner.hpp
	$(CXX) $(CXXFLAGS) -c main.cpp -o main.o

miner.o: miner.cpp miner.hpp
	$(CXX) $(CXXFLAGS) -c miner.cpp -o miner.o

client.o: client.cpp client.hpp
	$(CXX) $(CXXFLAGS) -c client.cpp -o client.o


blake2s.o: blake2s.c
	$(CC) $(CCFLAGS) -c blake2s.c -o blake2s.o

clean:
	rm -f $(TARGET) $(OBJS)