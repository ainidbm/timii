import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest, validateToken } from "@/lib/auth-server";
import crypto from "crypto";

/* ── Ensure the signaling table exists ── */
function ensureSignalTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_signals (
      id          TEXT PRIMARY KEY,
      room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      from_user   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      to_user     TEXT,       -- NULL = broadcast to all room members
      signal_type TEXT NOT NULL CHECK(signal_type IN ('offer','answer','ice-candidate','hangup')),
      payload     TEXT NOT NULL,  -- JSON string
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rs_room_time ON room_signals(room_id, created_at);
  `);
}

/** GET: poll for signals since a timestamp */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const session = validateToken(token);
    if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const { id: roomId } = await params;

    // Verify membership
    const member = getDb()
      .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ? AND left_at IS NULL")
      .get(roomId, session.userId);
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const url = new URL(request.url);
    const since = url.searchParams.get("since") || "1970-01-01T00:00:00.000Z";
    const toUser = url.searchParams.get("to") || session.userId;

    ensureSignalTable();

    const signals = getDb()
      .prepare(
        `SELECT id, from_user, to_user, signal_type, payload, created_at
         FROM room_signals
         WHERE room_id = ?
           AND created_at > ?
           AND (to_user IS NULL OR to_user = ?)
           AND from_user != ?
         ORDER BY created_at ASC
         LIMIT 50`
      )
      .all(roomId, since, toUser, session.userId) as Array<{
      id: string;
      from_user: string;
      to_user: string | null;
      signal_type: string;
      payload: string;
      created_at: string;
    }>;

    return NextResponse.json({
      signals: signals.map((s) => ({
        id: s.id,
        from: s.from_user,
        to: s.to_user,
        type: s.signal_type,
        payload: JSON.parse(s.payload),
        createdAt: s.created_at,
      })),
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    console.error("GET /api/rooms/[id]/signal error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** POST: send a signaling message */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const session = validateToken(token);
    if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const { id: roomId } = await params;

    // Verify membership
    const member = getDb()
      .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ? AND left_at IS NULL")
      .get(roomId, session.userId);
    if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });

    const { signalType, toUser, payload } = await request.json();
    if (!signalType || !payload) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    ensureSignalTable();

    const id = crypto.randomUUID();
    getDb()
      .prepare(
        `INSERT INTO room_signals (id, room_id, from_user, to_user, signal_type, payload)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, roomId, session.userId, toUser || null, signalType, JSON.stringify(payload));

    // Cleanup old signals (> 5 min old)
    getDb()
      .prepare("DELETE FROM room_signals WHERE created_at < datetime('now', '-5 minutes')")
      .run();

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("POST /api/rooms/[id]/signal error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
