CXX = g++
CXXFLAGS = -Wall -std=c++17

OBJS = miner.o

TARGET = miner

all: $(TARGET)

$(TARGET): $(OBJS) main.cpp
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(OBJS) main.cpp -lb2

%.o: %.cpp %.hpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(TARGET) $(OBJS)