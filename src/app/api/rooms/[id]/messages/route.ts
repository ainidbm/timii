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

    const url = new URL(request.url);
    const after = parseInt(url.searchParams.get("after") || "0", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

    const db = getDb();
    let messages: unknown[];

    if (after > 0) {
      messages = db
        .prepare(
          `SELECT m.id, m.room_id, m.user_id, m.content, m.created_at,
                  p.nickname, p.avatar_url
           FROM room_messages m
           LEFT JOIN profiles p ON p.id = m.user_id
           WHERE m.room_id = ? AND m.id > ?
           ORDER BY m.id ASC`
        )
        .all(id, after);
    } else {
      messages = db
        .prepare(
          `SELECT m.id, m.room_id, m.user_id, m.content, m.created_at,
                  p.nickname, p.avatar_url
           FROM room_messages m
           LEFT JOIN profiles p ON p.id = m.user_id
           WHERE m.room_id = ?
           ORDER BY m.id DESC
           LIMIT ?`
        )
        .all(id, limit);
    }

    return NextResponse.json(messages);
  } catch (e) {
    console.error("GET /api/rooms/[id]/messages error:", e);
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

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "content_required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO room_messages (room_id, user_id, content) VALUES (?, ?, ?)")
      .run(id, session.userId, content.trim());

    // Fetch the inserted message with profile
    const message = db
      .prepare(
        `SELECT m.id, m.room_id, m.user_id, m.content, m.created_at,
                p.nickname, p.avatar_url
         FROM room_messages m
         LEFT JOIN profiles p ON p.id = m.user_id
         WHERE m.id = ?`
      )
      .get(result.lastInsertRowid);

    return NextResponse.json(message);
  } catch (e) {
    console.error("POST /api/rooms/[id]/messages error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
