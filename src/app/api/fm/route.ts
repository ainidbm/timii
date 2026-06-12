import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest, validateToken } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const session = validateToken(token);
    if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

    const db = getDb();
    const userId = session.userId;

    // Find or create personal FM room for this user
    let personalRoom = db
      .prepare("SELECT * FROM rooms WHERE created_by = ? ORDER BY created_at ASC LIMIT 1")
      .get(userId) as Record<string, string> | undefined;

    // If no room exists, create one
    if (!personalRoom) {
      // Check if there are any rooms for this user
      const { generateRoomCode } = await import("@/lib/db");
      const crypto = await import("crypto");
      const id = crypto.randomUUID();
      const code = generateRoomCode(db);

      db.transaction(() => {
        db.prepare("INSERT INTO rooms (id, code, name, created_by) VALUES (?, ?, ?, ?)").run(
          id, code, "我的频道", userId
        );
        db.prepare("INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, ?)").run(
          crypto.randomUUID(), id, userId
        );
        db.prepare(
          "INSERT OR IGNORE INTO room_tomato (room_id, status, mode, focus_minutes, break_minutes) VALUES (?, 'stopped', 'focus', 25, 5)"
        ).run(id);
      })();

      personalRoom = db.prepare("SELECT * FROM rooms WHERE id = ?").get(id) as Record<string, string>;
    }

    const userProfile = db
      .prepare("SELECT id, email, nickname, avatar_url, created_at FROM profiles WHERE id = ?")
      .get(userId) as Record<string, string>;

    return NextResponse.json({
      roomId: personalRoom.code,
      roomName: personalRoom.name,
      userProfile: {
        id: userProfile.id,
        nickname: userProfile.nickname,
        avatar_url: userProfile.avatar_url,
      },
    });
  } catch (e) {
    console.error("GET /api/fm error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
