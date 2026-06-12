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

    const { code } = await request.json();
    if (!code?.trim()) {
      return NextResponse.json({ error: "code_required" }, { status: 400 });
    }

    const db = getDb();
    const room = db.prepare("SELECT * FROM rooms WHERE code = ?").get(code.trim().toUpperCase()) as Record<string, string> | undefined;

    if (!room) {
      return NextResponse.json({ error: "room_not_found" }, { status: 404 });
    }

    // Check if already an active member
    const existing = db
      .prepare("SELECT id FROM room_members WHERE room_id = ? AND user_id = ? AND left_at IS NULL")
      .get(room.id, session.userId) as { id: string } | undefined;

    if (!existing) {
      db.prepare("INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, ?)").run(
        crypto.randomUUID(),
        room.id,
        session.userId
      );
    }

    // Ensure tomato row exists
    db.prepare(
      "INSERT OR IGNORE INTO room_tomato (room_id, status, mode, focus_minutes, break_minutes) VALUES (?, 'stopped', 'focus', 25, 5)"
    ).run(room.id);

    return NextResponse.json(room);
  } catch (e) {
    console.error("POST /api/rooms/join error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
