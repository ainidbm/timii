import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const isVercel = !!process.env.VERCEL;

const DB_PATH =
  process.env.DB_PATH ||
  (isVercel
    ? path.join("/tmp", "timii.db")
    : path.join(process.cwd(), "data", "timii.db"));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);

  // On Vercel, seed demo data if tables are empty
  if (isVercel) {
    const count = db.prepare("SELECT COUNT(*) as c FROM profiles").get() as { c: number };
    if (count.c === 0) {
      seedVercelDemo(db);
    }
  }

  return db;
}

function initSchema(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id         TEXT PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      nickname   TEXT NOT NULL,
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS rooms (
      id         TEXT PRIMARY KEY,
      code       TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id         TEXT PRIMARY KEY,
      room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
      left_at    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_rm_room ON room_members(room_id);
    CREATE INDEX IF NOT EXISTS idx_rm_user ON room_members(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rm_active
      ON room_members(room_id, user_id) WHERE left_at IS NULL;

    CREATE TABLE IF NOT EXISTS room_tomato (
      room_id           TEXT PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
      status            TEXT NOT NULL CHECK(status IN ('running','paused','stopped')),
      mode              TEXT NOT NULL CHECK(mode IN ('focus','break')),
      focus_minutes     INTEGER NOT NULL,
      break_minutes     INTEGER NOT NULL,
      anchor_started_at TEXT,
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rm_msg_room_time ON room_messages(room_id, created_at);

    CREATE TABLE IF NOT EXISTS communities (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      owner_id     TEXT NOT NULL REFERENCES profiles(id),
      cover_url    TEXT NOT NULL DEFAULT '',
      member_count INTEGER NOT NULL DEFAULT 0,
      active_count INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS friend_relations (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      friend_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      is_friend   INTEGER NOT NULL DEFAULT 0,
      is_following INTEGER NOT NULL DEFAULT 0,
      is_blocked  INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_fr_user ON friend_relations(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fr_pair ON friend_relations(user_id, friend_id);
  `);
}

// ─── Vercel demo seed (runs once when DB is empty) ───

function seedVercelDemo(d: Database.Database) {
  const bcrypt = require("bcryptjs");
  const crypto = require("crypto");

  // Demo users
  const users = [
    { id: "u1", email: "demo@timii.app", nickname: "Timii Demo", password: bcrypt.hashSync("demo123", 10) },
    { id: "u2", email: "alice@timii.app", nickname: "Alice 学习中", password: bcrypt.hashSync("demo123", 10) },
    { id: "u3", email: "bob@timii.app", nickname: "Bob 刷题ing", password: bcrypt.hashSync("demo123", 10) },
    { id: "u4", email: "charlie@timii.app", nickname: "Charlie", password: bcrypt.hashSync("demo123", 10) },
  ];
  const insertUser = d.prepare(
    "INSERT INTO profiles (id, email, nickname, password) VALUES (?, ?, ?, ?)"
  );
  for (const u of users) insertUser.run(u.id, u.email, u.nickname, u.password);

  // Demo room
  const roomId = crypto.randomUUID();
  d.prepare("INSERT INTO rooms (id, code, name, created_by) VALUES (?, ?, ?, ?)").run(
    roomId, "STUDY1", "深夜自习室", "u1"
  );
  d.prepare("INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, ?)").run(
    crypto.randomUUID(), roomId, "u1"
  );
  d.prepare("INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, ?)").run(
    crypto.randomUUID(), roomId, "u2"
  );
  d.prepare(
    "INSERT INTO room_tomato (room_id, status, mode, focus_minutes, break_minutes) VALUES (?, ?, ?, ?, ?)"
  ).run(roomId, "running", "focus", 25, 5);

  // Demo communities
  const commId = crypto.randomUUID();
  d.prepare("INSERT INTO communities (id, name, owner_id, member_count, active_count) VALUES (?, ?, ?, ?, ?)").run(
    commId, "考研冲刺群", "u1", 128, 36
  );
  const commId2 = crypto.randomUUID();
  d.prepare("INSERT INTO communities (id, name, owner_id, member_count, active_count) VALUES (?, ?, ?, ?, ?)").run(
    commId2, "前端技术交流", "u2", 89, 21
  );

  // Demo friend relations
  d.prepare("INSERT INTO friend_relations (id, user_id, friend_id, is_friend, is_following) VALUES (?, ?, ?, ?, ?)").run(
    crypto.randomUUID(), "u1", "u2", 1, 1
  );
  d.prepare("INSERT INTO friend_relations (id, user_id, friend_id, is_friend, is_following) VALUES (?, ?, ?, ?, ?)").run(
    crypto.randomUUID(), "u1", "u3", 1, 1
  );
}

// ─── Helper functions (replace PG RPC) ───

export function generateRoomCode(d: Database.Database): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Check uniqueness
  const exists = d.prepare("SELECT 1 FROM rooms WHERE code = ?").get(code);
  if (exists) return generateRoomCode(d); // recurse (very rare collision)
  return code;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
