import { io } from "socket.io-client";
import { BACKEND_URL } from "./api.js";

export function connectSocketIo({ onMessage }) {
  const s = io(BACKEND_URL, { transports: ["websocket"] });
  s.onAny((event, payload) => onMessage(event, payload));
  s.on("connect_error", () => {
    // ignore
  });
  return s;
}

