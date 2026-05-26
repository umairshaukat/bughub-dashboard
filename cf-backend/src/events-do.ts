export class EventsHub implements DurableObject {
  private state: DurableObjectState;
  private sessions: Set<WebSocket>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.accept(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      const msg = await request.text();
      for (const ws of this.sessions) {
        try {
          ws.send(msg);
        } catch {
          // ignore
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  }

  private accept(ws: WebSocket) {
    ws.accept();
    this.sessions.add(ws);
    ws.send(JSON.stringify({ event: "server:hello", payload: { time: new Date().toISOString() } }));
    ws.addEventListener("close", () => this.sessions.delete(ws));
    ws.addEventListener("error", () => this.sessions.delete(ws));
  }
}
