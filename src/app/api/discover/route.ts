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

    // Online friends — users with friend_relations where is_following=1
    const friends = db
      .prepare(
        `SELECT p.id, p.nickname as name, p.avatar_url as avatar,
                CASE WHEN EXISTS (
                  SELECT 1 FROM room_members rm
                  WHERE rm.user_id = p.id AND rm.left_at IS NULL
                ) THEN 1 ELSE 0 END as inRoom
         FROM friend_relations fr
         JOIN profiles p ON p.id = fr.friend_id
         WHERE fr.user_id = ? AND fr.is_following = 1
         LIMIT 10`
      )
      .all(userId) as Array<{ id: string; name: string; avatar: string; inRoom: number }>;

    // Hot communities
    const communities = db
      .prepare(
        `SELECT id, name, member_count as members, active_count as active, cover_url as cover
         FROM communities
         ORDER BY member_count DESC
         LIMIT 3`
      )
      .all() as Array<{ id: string; name: string; members: number; active: number; cover: string }>;

    // Recommended rooms — rooms with active members, excluding user's own
    const rooms = db
      .prepare(
        `SELECT r.id, r.name, r.code as roomId,
                p.nickname as user,
                (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.id AND rm2.left_at IS NULL) as online,
                '考研' as tag1, '学习' as tag2
         FROM rooms r
         JOIN profiles p ON p.id = r.created_by
         WHERE EXISTS (
           SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.left_at IS NULL
         )
         ORDER BY r.created_at DESC
         LIMIT 10`
      )
      .all() as Array<{ id: string; name: string; roomId: string; user: string; online: number; tag1: string; tag2: string }>;

    return NextResponse.json({
      onlineFriends: friends.map((f) => ({
        id: f.id,
        name: f.name,
        avatar: f.avatar,
        inRoom: f.inRoom === 1,
      })),
      hotCommunities: communities,
      recommendedRooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        user: r.user,
        online: r.online,
        tags: [r.tag1, r.tag2],
        roomId: r.roomId,
      })),
    });
  } catch (e) {
    console.error("GET /api/discover error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
