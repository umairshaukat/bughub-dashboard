import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.resolve(dataDir, "dev.db");

export function openDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
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
  `);
}

