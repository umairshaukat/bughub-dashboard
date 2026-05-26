-- D1 schema for Twilio Omni Dashboard

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  address TEXT,
  pestpac_location_number TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  call_sid TEXT UNIQUE,
  direction TEXT,
  from_number TEXT,
  to_number TEXT,
  status TEXT,
  answered_by TEXT,
  duration_seconds INTEGER,
  started_at TEXT,
  ended_at TEXT,
  recording_url TEXT,
  transcript_text TEXT,
  ai_summary TEXT,
  disposition TEXT,
  score INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS call_events (
  id TEXT PRIMARY KEY,
  call_sid TEXT,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  conversation_sid TEXT,
  message_sid TEXT,
  from_number TEXT,
  to_number TEXT,
  body TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

