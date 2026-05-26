import { BACKEND_URL } from "./api.js";

const mode = import.meta.env.VITE_REALTIME || "ws";

const handlers = new Map(); // event -> Set(fn)
let socket = null;
let connected = false;

export const realtime = {
  connect,
  on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(fn);
    connect();
  },
  off(event, fn) {
    handlers.get(event)?.delete(fn);
  }
};

function connect() {
  if (connected) return;
  connected = true;
  if (mode === "socketio") {
    // Lazy import to avoid bundling unless used
    import("./socketio.js").then(({ connectSocketIo }) => {
      socket = connectSocketIo({ onMessage });
    });
    return;
  }
  socket = connectWs({ onMessage });
}

function onMessage(event, payload) {
  const set = handlers.get(event);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch {
      // ignore handler errors
    }
  }
}

function connectWs({ onMessage }) {
  const wsUrl = toWsUrl(`${BACKEND_URL}/api/events/ws`);
  const ws = new WebSocket(wsUrl);
  ws.addEventListener("message", (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      onMessage(msg.event, msg.payload);
    } catch {
      // ignore
    }
  });
  ws.addEventListener("close", () => {
    // simple reconnect
    connected = false;
    setTimeout(connect, 800);
  });
  return ws;
}

function toWsUrl(url) {
  if (url.startsWith("https://")) return url.replace("https://", "wss://");
  if (url.startsWith("http://")) return url.replace("http://", "ws://");
  return url;
}

