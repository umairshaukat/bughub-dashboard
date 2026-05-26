import { Hono } from "hono";
import { cors } from "hono/cors";
import { parseEnv, type Env } from "./env";
import { EventsHub } from "./events-do";
import { conversationsGrants, signTwilioAccessToken, voiceGrants } from "./twilio/jwt";

export { EventsHub };

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  // Validate env early (throws with a clear message)
  parseEnv(c.env as unknown as Record<string, unknown>);
  await next();
});

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const env = parseEnv(c.env as unknown as Record<string, unknown>);
      return origin === env.FRONTEND_ORIGIN ? origin : env.FRONTEND_ORIGIN;
    },
    credentials: true
  })
);

app.get("/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

// Realtime events via Durable Object WebSocket
app.get("/api/events/ws", async (c) => {
  const id = c.env.EVENTS.idFromName("global");
  const stub = c.env.EVENTS.get(id);
  return stub.fetch(c.req.raw);
});

// Tokens
app.get("/api/twilio/token/voice", async (c) => {
  const env = parseEnv(c.env as unknown as Record<string, unknown>);
  const identity = (c.req.query("identity") || "").trim();
  if (!identity) return c.json({ error: "Missing identity" }, 400);
  const token = await signTwilioAccessToken({
    accountSid: env.TWILIO_ACCOUNT_SID,
    apiKeySid: env.TWILIO_API_KEY_SID,
    apiKeySecret: env.TWILIO_API_KEY_SECRET,
    identity,
    grants: voiceGrants({ twimlAppSid: env.TWILIO_TWIML_APP_SID })
  });
  return c.json({ token });
});

app.get("/api/twilio/token/conversations", async (c) => {
  const env = parseEnv(c.env as unknown as Record<string, unknown>);
  const identity = (c.req.query("identity") || "").trim();
  if (!identity) return c.json({ error: "Missing identity" }, 400);
  const token = await signTwilioAccessToken({
    accountSid: env.TWILIO_ACCOUNT_SID,
    apiKeySid: env.TWILIO_API_KEY_SID,
    apiKeySecret: env.TWILIO_API_KEY_SECRET,
    identity,
    grants: conversationsGrants({ serviceSid: env.TWILIO_CONVERSATIONS_SERVICE_SID })
  });
  return c.json({ token });
});

// Voice: inbound -> enqueue TaskRouter workflow (TwiML)
app.post("/api/twilio/voice/inbound", async (c) => {
  const env = parseEnv(c.env as unknown as Record<string, unknown>);
  const body = await c.req.parseBody();
  const from = String(body.From || "");
  const to = String(body.To || "");
  const callSid = String(body.CallSid || "");

  await upsertCall(c.env.DB, {
    id: crypto.randomUUID(),
    callSid,
    direction: "inbound",
    from,
    to,
    status: "queued",
    startedAt: new Date().toISOString()
  });

  await broadcast(c.env, { event: "call:created", payload: { callSid, from, to, status: "queued" } });

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Enqueue workflowSid="${escapeXml(env.TWILIO_TR_WORKFLOW_SID)}">
    <Task>${escapeXml(
      JSON.stringify({ type: "inbound_call", from, to, callSid, createdAt: new Date().toISOString() })
    )}</Task>
  </Enqueue>
</Response>`;
  return new Response(twiml, { headers: { "content-type": "text/xml" } });
});

// Voice: outbound (TwiML App Voice URL)
app.post("/api/twilio/voice/outbound", async (c) => {
  const env = parseEnv(c.env as unknown as Record<string, unknown>);
  const body = await c.req.parseBody();
  const to = String(body.To || "").trim();
  const from = String(env.TWILIO_DEFAULT_FROM || body.From || "").trim();

  if (!to) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing destination.</Say></Response>`,
      { headers: { "content-type": "text/xml" } }
    );
  }

  const dialTarget = to.startsWith("client:")
    ? `<Client>${escapeXml(to.slice("client:".length))}</Client>`
    : `<Number>${escapeXml(to)}</Number>`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial${from ? ` callerId="${escapeXml(from)}"` : ""}>
    ${dialTarget}
  </Dial>
</Response>`;
  return new Response(twiml, { headers: { "content-type": "text/xml" } });
});

// Voice status callback
app.post("/api/twilio/voice/status", async (c) => {
  const body = await c.req.parseBody();
  const callSid = String(body.CallSid || "");
  const status = String(body.CallStatus || body.CallStatusCallbackEvent || "unknown");

  await c.env.DB.prepare(`UPDATE calls SET status = ? WHERE call_sid = ?`).bind(status, callSid).run();
  await c.env.DB.prepare(`INSERT INTO call_events (id, call_sid, type, payload_json) VALUES (?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), callSid, "voice_status", JSON.stringify(body))
    .run();

  await broadcast(c.env, { event: "call:status", payload: { callSid, status, payload: body } });
  return c.json({ ok: true });
});

// TaskRouter assignment callback: dequeue to worker contact_uri
app.post("/api/twilio/taskrouter/assignment", async (c) => {
  const env = parseEnv(c.env as unknown as Record<string, unknown>);
  const body = await c.req.parseBody();
  const taskAttrs = safeJson(String(body.TaskAttributes || "{}"));
  const workerAttrs = safeJson(String(body.SelectedWorkerAttributes || "{}"));
  const selectedWorkerSid = String(body.SelectedWorkerSid || "");

  const target = String(taskAttrs?.to || workerAttrs?.contact_uri || `client:${selectedWorkerSid}`);
  return c.json({
    instruction: "dequeue",
    from: env.TWILIO_DEFAULT_FROM || String(body.To || ""),
    to: target,
    status_callback_url: `${env.PUBLIC_BASE_URL}/api/twilio/voice/status`
  });
});

// Messaging inbound (SMS webhook example)
app.post("/api/twilio/messaging/inbound", async (c) => {
  const body = await c.req.parseBody();
  const from = String(body.From || "");
  const to = String(body.To || "");
  const text = String(body.Body || "");
  const messageSid = String(body.MessageSid || "");

  await c.env.DB.prepare(
    `INSERT INTO messages (id, channel, message_sid, from_number, to_number, body) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), "sms", messageSid, from, to, text)
    .run();

  await broadcast(c.env, { event: "message:inbound", payload: { channel: "sms", from, to, body: text, messageSid } });
  return new Response("<Response></Response>", { headers: { "content-type": "text/xml" } });
});

// Read APIs
app.get("/api/calls/recent", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT call_sid AS callSid, direction, from_number AS fromNumber, to_number AS toNumber, status,
            answered_by AS answeredBy, duration_seconds AS durationSeconds, started_at AS startedAt, ended_at AS endedAt,
            ai_summary AS aiSummary, transcript_text AS transcriptText, disposition, score
     FROM calls ORDER BY datetime(created_at) DESC LIMIT 100`
  ).all();
  return c.json({ calls: rows.results || [] });
});

app.get("/api/messages/recent", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT channel, conversation_sid AS conversationSid, message_sid AS messageSid, from_number AS fromNumber,
            to_number AS toNumber, body, created_at AS createdAt
     FROM messages ORDER BY datetime(created_at) DESC LIMIT 200`
  ).all();
  return c.json({ messages: rows.results || [] });
});

app.get("/api/contacts/lookup", async (c) => {
  const phone = (c.req.query("phone") || "").trim();
  if (!phone) return c.json({ error: "Missing phone" }, 400);
  const row = await c.env.DB.prepare(
    `SELECT id, name, phone, address, pestpac_location_number AS pestpacLocationNumber FROM contacts WHERE phone = ? LIMIT 1`
  )
    .bind(phone)
    .first();
  return c.json({ contact: row || null });
});

app.post("/api/calls/:callSid/disposition", async (c) => {
  const callSid = c.req.param("callSid");
  const body = await c.req.json().catch(() => ({}));
  const disposition = String((body as any).disposition || "").trim();
  if (!disposition) return c.json({ error: "Missing disposition" }, 400);
  await c.env.DB.prepare(`UPDATE calls SET disposition = ? WHERE call_sid = ?`).bind(disposition, callSid).run();
  await broadcast(c.env, { event: "call:updated", payload: { callSid, disposition } });
  return c.json({ ok: true });
});

export default app;

async function broadcast(env: Env, message: { event: string; payload: unknown }) {
  const id = env.EVENTS.idFromName("global");
  const stub = env.EVENTS.get(id);
  await stub.fetch("https://events/broadcast", {
    method: "POST",
    body: JSON.stringify(message)
  });
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function upsertCall(
  db: D1Database,
  call: { id: string; callSid: string; direction: string; from: string; to: string; status: string; startedAt: string }
) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO calls (id, call_sid, direction, from_number, to_number, status, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(call.id, call.callSid, call.direction, call.from, call.to, call.status, call.startedAt)
    .run();
}
