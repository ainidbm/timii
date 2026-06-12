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

    /* ── User profile ── */
    const profile = db
      .prepare("SELECT id, email, nickname, avatar_url, created_at FROM profiles WHERE id = ?")
      .get(userId) as Record<string, string> | undefined;

    if (!profile) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    /* ── Personal room code ── */
    const room = db
      .prepare("SELECT code FROM rooms WHERE created_by = ? ORDER BY created_at ASC LIMIT 1")
      .get(userId) as { code: string } | undefined;

    /* ── Stats ── */
    const friendCount = (
      db
        .prepare("SELECT COUNT(*) as c FROM friend_relations WHERE user_id = ? AND is_friend = 1")
        .get(userId) as { c: number }
    ).c;

    const followingCount = (
      db
        .prepare("SELECT COUNT(*) as c FROM friend_relations WHERE user_id = ? AND is_following = 1")
        .get(userId) as { c: number }
    ).c;

    const totalHours = (
      db
        .prepare(
          `SELECT COALESCE(SUM(ROUND((julianday(COALESCE(left_at, datetime('now'))) - julianday(joined_at)) * 24)), 0) as hours
           FROM room_members WHERE user_id = ?`
        )
        .get(userId) as { hours: number }
    ).hours;

    /* ── Achievements count ── */
    const achievementsUnlocked = 0; // placeholder — compute from actual stats in future

    return NextResponse.json({
      id: profile.id,
      nickname: profile.nickname,
      email: profile.email,
      avatar_url: profile.avatar_url,
      roomCode: room?.code ?? "",
      bio: "学习使我快乐",
      stats: {
        friends: friendCount,
        following: followingCount,
        totalHours: Math.round(totalHours),
      },
      achievementsUnlocked,
      version: "1.0.0",
    });
  } catch (e) {
    console.error("GET /api/profile error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
