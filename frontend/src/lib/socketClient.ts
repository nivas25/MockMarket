import { io, Socket } from "socket.io-client";
import { url as API_BASE_URL } from "../config";

let socket: Socket | null = null;
let initializing = false;
let lastInitTs = 0;
const INIT_DEBOUNCE_MS = 1500; // avoid rapid re-inits if multiple components mount fast

export function getSocket(): Socket {
  // Return the existing instance even if it's still connecting.
  // This avoids spawning multiple parallel connections when multiple hooks/components
  // call getSocket() before the first connection is established.
  if (socket) return socket;
  const now = Date.now();
  if (initializing && now - lastInitTs < INIT_DEBOUNCE_MS) {
    // Another call during initialization window; return existing (still null?)
    // Ensure we don't create parallel connections.
    if (socket) return socket;
    // Not yet created; proceed to create below.
  }
  initializing = true;
  lastInitTs = now;

  // Initialize a real Socket.IO client connected to the backend
  // Prefer starting with long-polling, then upgrade to WebSocket (more reliable across setups)
  socket = io(API_BASE_URL, {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    timeout: 10000,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    // Avoid sending cookies on WS/polling in dev to skip CORS preflights
    withCredentials: false,
  });

  // Optional: basic logging for connection lifecycle
  socket.on("connect", () => {
    initializing = false;
    console.log("[socket] connected", socket?.id);
  });
  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected", reason);
    // If server initiated close or ping timeout, allow auto reconnection.
  });
  socket.on("connect_error", (err) => {
    console.warn("[socket] connect_error", err.message);
    initializing = false;
  });

  return socket;
}
