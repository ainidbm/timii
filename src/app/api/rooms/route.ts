import { NextResponse } from "next/server";
import { getDb, generateRoomCode } from "@/lib/db";
import { getTokenFromRequest, validateToken } from "@/lib/auth-server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const session = validateToken(token);
    if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const { name } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const code = generateRoomCode(db);

    const insertRoom = db.prepare(
      "INSERT INTO rooms (id, code, name, created_by) VALUES (?, ?, ?, ?)"
    );
    const insertMember = db.prepare(
      "INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, ?)"
    );
    const insertTomato = db.prepare(
      "INSERT OR IGNORE INTO room_tomato (room_id, status, mode, focus_minutes, break_minutes) VALUES (?, 'stopped', 'focus', 25, 5)"
    );

    const room = db.transaction(() => {
      insertRoom.run(id, code, name.trim(), session.userId);
      insertMember.run(crypto.randomUUID(), id, session.userId);
      insertTomato.run(id);
      return db.prepare("SELECT * FROM rooms WHERE id = ?").get(id);
    })();

    return NextResponse.json(room);
  } catch (e) {
    console.error("POST /api/rooms error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
