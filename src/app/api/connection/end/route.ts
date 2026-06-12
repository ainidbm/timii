import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest, validateToken } from "@/lib/auth-server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const session = validateToken(token);
    if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const body = await request.json();
    const { roomCode, connectedAt, endedAt, durationMs } = body;

    if (!roomCode || !connectedAt) {
      return NextResponse.json({ ok: false, reason: "missing_fields" });
    }

    const db = getDb();

    // Find the room by code
    const room = db
      .prepare("SELECT id, name FROM rooms WHERE code = ?")
      .get(roomCode) as { id: string; name: string } | undefined;

    if (!room) {
      return NextResponse.json({ ok: false, reason: "room_not_found" });
    }

    // Record the connection session in room_members if not already recorded
    // (the join already created a room_members row; update left_at)
    db.prepare(
      `UPDATE room_members
       SET left_at = ?
       WHERE room_id = ? AND user_id = ? AND left_at IS NULL`
    ).run(endedAt || new Date().toISOString(), room.id, session.userId);

    // Also ensure tomato is stopped for this room-member
    db.prepare(
      `UPDATE room_tomato SET status = 'stopped', anchor_started_at = NULL, updated_at = datetime('now')
       WHERE room_id = ?`
    ).run(room.id);

    return NextResponse.json({ ok: true, durationMs, roomName: room.name });
  } catch (e) {
    console.error("POST /api/connection/end error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
