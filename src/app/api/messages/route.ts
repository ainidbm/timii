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

    // Get private chats — users this user is friends with
    const privateChats = db
      .prepare(
        `SELECT DISTINCT p.id, p.nickname as name, '' as avatar,
                (SELECT content FROM room_messages rm
                 WHERE (rm.user_id = p.id OR rm.user_id = ?)
                 ORDER BY rm.created_at DESC LIMIT 1) as lastMsg,
                (SELECT created_at FROM room_messages rm
                 WHERE (rm.user_id = p.id OR rm.user_id = ?)
                 ORDER BY rm.created_at DESC LIMIT 1) as msgTime,
                0 as unread
         FROM friend_relations fr
         JOIN profiles p ON p.id = fr.friend_id
         WHERE fr.user_id = ? AND fr.is_friend = 1
         LIMIT 10`
      )
      .all(userId, userId, userId) as Array<{ id: string; name: string; avatar: string; lastMsg: string | null; msgTime: string | null; unread: number }>;

    // Get community chats
    const communityChats = db
      .prepare(
        `SELECT id, name, '' as avatar, member_count, active_count
         FROM communities
         LIMIT 5`
      )
      .all() as Array<{ id: string; name: string; avatar: string; member_count: number; active_count: number }>;

    // System notices
    const systemNotices = [
      {
        id: "n1",
        text: "欢迎使用 Timii！开始你的第一次连线学习吧",
        time: new Date().toISOString(),
        icon: "Bell",
      },
    ];

    const chats = [
      ...privateChats.map((c) => ({
        id: c.id,
        name: c.name,
        lastMsg: c.lastMsg || "开始聊天吧",
        time: c.msgTime ? formatRelativeTime(c.msgTime) : "",
        unread: c.unread,
        avatar: c.avatar,
        type: "private" as const,
      })),
      ...communityChats.map((c) => ({
        id: c.id,
        name: c.name,
        lastMsg: `${c.member_count} 位成员`,
        time: "",
        unread: 0,
        avatar: c.avatar,
        type: "community" as const,
      })),
    ];

    return NextResponse.json({
      chats,
      systemNotices: systemNotices.map((n) => ({
        id: n.id,
        text: n.text,
        time: "刚刚",
        icon: n.icon,
      })),
    });
  } catch (e) {
    console.error("GET /api/messages error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}
