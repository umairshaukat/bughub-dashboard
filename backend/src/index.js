import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { Server as SocketIOServer } from "socket.io";
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";

import { openDb } from "./db.js";
import { getEnv } from "./twilio/env.js";
import { createConversationsToken, createTaskRouterWorkerToken, createVoiceToken } from "./twilio/tokens.js";
import { buildInboundVoiceTwiML, buildWaitTwiML } from "./twilio/twiml.js";
import twilio from "twilio";

const env = getEnv();
const db = openDb();

const app = express();
app.use(helmet({
  // Allow this backend to be embedded in GoHighLevel iframes
  frameguard: false,
  contentSecurityPolicy: false,
}));
app.use(morgan("dev"));
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));

// Twilio webhooks use x-www-form-urlencoded by default
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: env.FRONTEND_ORIGIN, credentials: true }
});

const wss = new WebSocketServer({ noServer: true });
const wsClients = new Set();

function emit(event, payload) {
  io.emit(event, payload);
  const msg = JSON.stringify({ event, payload });
  for (const ws of wsClients) {
    try {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    } catch {
      // ignore
    }
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- Tokens for the dashboard clients
app.get("/api/twilio/token/voice", (req, res) => {
  const identity = String(req.query.identity || "").trim();
  if (!identity) return res.status(400).json({ error: "Missing identity" });
  res.json({ token: createVoiceToken(identity) });
});

app.get("/api/twilio/token/conversations", (req, res) => {
  const identity = String(req.query.identity || "").trim();
  if (!identity) return res.status(400).json({ error: "Missing identity" });
  res.json({ token: createConversationsToken(identity) });
});

app.get("/api/twilio/token/taskrouter", (req, res) => {
  const workerSid = String(req.query.workerSid || "").trim();
  if (!workerSid) return res.status(400).json({ error: "Missing workerSid" });
  res.json({ token: createTaskRouterWorkerToken({ workerSid }) });
});

// --- Voice webhooks
app.post("/api/twilio/voice/inbound", (req, res) => {
  // Twilio sends: From, To, CallSid
  const from = req.body.From || "";
  const to = req.body.To || "";
  const callSid = req.body.CallSid || "";

  // Persist a call stub
  const callId = nanoid();
  db.prepare(
    `INSERT OR IGNORE INTO calls (id, call_sid, direction, from_number, to_number, status, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(callId, callSid, "inbound", from, to, "queued", new Date().toISOString());

  emit("call:created", { callSid, from, to, status: "queued" });

  res.type("text/xml").send(buildInboundVoiceTwiML({ from, to, callSid }));
});

// TwiML App Voice URL should point here for browser->PSTN calling.
app.post("/api/twilio/voice/outbound", (req, res) => {
  const to = String(req.body.To || "").trim();
  const from = env.TWILIO_DEFAULT_FROM || String(req.body.From || "").trim();

  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial({ callerId: from || undefined });

  if (!to) {
    twiml.say({ voice: "Polly.Joanna" }, "Missing destination.");
    return res.type("text/xml").send(twiml.toString());
  }

  if (to.startsWith("client:")) {
    dial.client(to.slice("client:".length));
  } else if (to.startsWith("+") || /^[0-9()+\\-\\s]+$/.test(to)) {
    dial.number(to);
  } else {
    twiml.say({ voice: "Polly.Joanna" }, "Invalid destination.");
  }

  res.type("text/xml").send(twiml.toString());
});

app.post("/api/twilio/voice/wait", (_req, res) => {
  res.type("text/xml").send(buildWaitTwiML());
});

app.post("/api/twilio/voice/status", (req, res) => {
  // Configure this URL as "Status Callback" on your calls/TwiML App if desired.
  const callSid = req.body.CallSid || "";
  const callStatus = req.body.CallStatus || req.body.CallStatusCallbackEvent || req.body.CallStatusCallback || "";
  const payload = req.body || {};

  db.prepare(
    `INSERT INTO call_events (id, call_sid, type, payload_json) VALUES (?, ?, ?, ?)`
  ).run(nanoid(), callSid, "voice_status", JSON.stringify(payload));

  if (callSid) {
    db.prepare(`UPDATE calls SET status = ? WHERE call_sid = ?`).run(String(callStatus || "unknown"), callSid);
  }
  emit("call:status", { callSid, status: callStatus, payload });

  res.json({ ok: true });
});

// --- TaskRouter assignment callback
// Set Workflow -> Assignment Callback URL to this endpoint.
app.post("/api/twilio/taskrouter/assignment", (req, res) => {
  // TaskRouter sends SelectedWorkerSid and TaskAttributes among other fields.
  const selectedWorkerSid = req.body.SelectedWorkerSid;
  const taskAttributesRaw = req.body.TaskAttributes || "{}";
  const taskAttributes = safeJson(taskAttributesRaw);

  // The "to" value for dequeue should match your worker attributes / client identity strategy.
  // Common pattern: store contact_uri in worker attributes like "client:alice".
  const to = taskAttributes?.to || (req.body.SelectedWorkerAttributes ? safeJson(req.body.SelectedWorkerAttributes)?.contact_uri : undefined);

  // If you don't have contact_uri on the worker yet, default to `client:<workerSid>` (update this to your scheme).
  const target = to || `client:${selectedWorkerSid}`;

  res.json({
    instruction: "dequeue",
    from: env.TWILIO_DEFAULT_FROM || req.body.To,
    to: target,
    status_callback_url: `${env.PUBLIC_BASE_URL}/api/twilio/voice/status`
  });
});

// --- Messaging inbound (SMS webhook example)
app.post("/api/twilio/messaging/inbound", (req, res) => {
  const from = req.body.From || "";
  const to = req.body.To || "";
  const body = req.body.Body || "";
  const messageSid = req.body.MessageSid || "";

  db.prepare(
    `INSERT INTO messages (id, channel, message_sid, from_number, to_number, body) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(nanoid(), "sms", messageSid, from, to, body);

  emit("message:inbound", { channel: "sms", from, to, body, messageSid });
  res.type("text/xml").send("<Response></Response>");
});

// --- Basic read APIs for UI
app.get("/api/calls/recent", (_req, res) => {
  const rows = db.prepare(
    `SELECT call_sid AS callSid, direction, from_number AS fromNumber, to_number AS toNumber, status, answered_by AS answeredBy,
            duration_seconds AS durationSeconds, started_at AS startedAt, ended_at AS endedAt, ai_summary AS aiSummary, transcript_text AS transcriptText,
            disposition, score
     FROM calls
     ORDER BY datetime(created_at) DESC
     LIMIT 100`
  ).all();
  res.json({ calls: rows });
});

app.get("/api/messages/recent", (_req, res) => {
  const rows = db.prepare(
    `SELECT channel, conversation_sid AS conversationSid, message_sid AS messageSid, from_number AS fromNumber, to_number AS toNumber, body, created_at AS createdAt
     FROM messages
     ORDER BY datetime(created_at) DESC
     LIMIT 200`
  ).all();
  res.json({ messages: rows });
});

// --- Contact lookup (wire this to PestPac in production)
app.get("/api/contacts/lookup", (req, res) => {
  const phone = String(req.query.phone || "").trim();
  if (!phone) return res.status(400).json({ error: "Missing phone" });
  const row = db
    .prepare(
      `SELECT id, name, phone, address, pestpac_location_number AS pestpacLocationNumber
       FROM contacts
       WHERE phone = ?
       LIMIT 1`
    )
    .get(phone);
  res.json({ contact: row || null });
});

// --- Call updates (disposition/summary placeholders)
app.post("/api/calls/:callSid/disposition", (req, res) => {
  const callSid = req.params.callSid;
  const disposition = String(req.body.disposition || "").trim();
  if (!disposition) return res.status(400).json({ error: "Missing disposition" });
  db.prepare(`UPDATE calls SET disposition = ? WHERE call_sid = ?`).run(disposition, callSid);
  emit("call:updated", { callSid, disposition });
  res.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.emit("server:hello", { time: new Date().toISOString() });
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  if (url.pathname !== "/api/events/ws") return;
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ event: "server:hello", payload: { time: new Date().toISOString() } }));
  ws.on("close", () => wsClients.delete(ws));
});

server.listen(Number(env.PORT), () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on ${env.PUBLIC_BASE_URL}`);
});

function safeJson(value) {
  try {
    if (typeof value !== "string") return value;
    return JSON.parse(value);
  } catch {
    return {};
  }
}
