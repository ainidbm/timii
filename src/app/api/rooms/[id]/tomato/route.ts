import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest, validateToken } from "@/lib/auth-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const session = validateToken(token);
    if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const { id } = await params;

    // Verify membership
    const member = getDb()
      .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ? AND left_at IS NULL")
      .get(id, session.userId);
    if (!member) {
      return NextResponse.json({ error: "not_member" }, { status: 403 });
    }

    const tomato = getDb()
      .prepare("SELECT * FROM room_tomato WHERE room_id = ?")
      .get(id);

    if (!tomato) {
      // Auto-create if missing
      getDb()
        .prepare("INSERT OR IGNORE INTO room_tomato (room_id, status, mode, focus_minutes, break_minutes) VALUES (?, 'stopped', 'focus', 25, 5)")
        .run(id);
      return NextResponse.json({
        room_id: id,
        status: "stopped",
        mode: "focus",
        focus_minutes: 25,
        break_minutes: 5,
        anchor_started_at: null,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(tomato);
  } catch (e) {
    console.error("GET /api/rooms/[id]/tomato error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const session = validateToken(token);
    if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const { id } = await params;

    // Verify membership
    const member = getDb()
      .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ? AND left_at IS NULL")
      .get(id, session.userId);
    if (!member) {
      return NextResponse.json({ error: "not_member" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    const db = getDb();
    let tomato: unknown;

    if (action === "start") {
      const { mode = "focus", focusMinutes = 25, breakMinutes = 5 } = body;
      db.prepare(
        `INSERT INTO room_tomato (room_id, status, mode, focus_minutes, break_minutes, anchor_started_at, updated_at)
         VALUES (?, 'running', ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(room_id) DO UPDATE SET
           status = 'running',
           mode = excluded.mode,
           focus_minutes = excluded.focus_minutes,
           break_minutes = excluded.break_minutes,
           anchor_started_at = datetime('now'),
           updated_at = datetime('now')`
      ).run(id, mode, focusMinutes, breakMinutes);
    } else if (action === "stop") {
      db.prepare(
        `UPDATE room_tomato SET status = 'stopped', anchor_started_at = NULL, updated_at = datetime('now')
         WHERE room_id = ?`
      ).run(id);
    } else {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    tomato = db.prepare("SELECT * FROM room_tomato WHERE room_id = ?").get(id);
    return NextResponse.json(tomato);
  } catch (e) {
    console.error("POST /api/rooms/[id]/tomato error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
