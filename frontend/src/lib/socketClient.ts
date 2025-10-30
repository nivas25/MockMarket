import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  const base = process.env.NEXT_PUBLIC_BACKEND_WS_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:5000";
  socket = io(base, { transports: ["websocket"], autoConnect: true });
  return socket;
}


