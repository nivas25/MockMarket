import { Socket } from "socket.io-client";

// Mock Socket implementation to prevent connection when backend Socket.IO is disabled
const mockSocket: Socket = {
  connected: false,
  on: () => mockSocket,
  off: () => mockSocket,
  emit: () => mockSocket,
  // Add other necessary mock methods if they are called elsewhere
} as unknown as Socket; // Cast to Socket to satisfy type checking

export function getSocket(): Socket {
  // Always return the mock socket if real Socket.IO is not enabled on backend
  return mockSocket;
}
