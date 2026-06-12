import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest, validateToken } from "@/lib/auth-server";

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
    const db = getDb();
    db.prepare(
      "UPDATE room_members SET left_at = datetime('now') WHERE room_id = ? AND user_id = ? AND left_at IS NULL"
    ).run(id, session.userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/rooms/[id]/leave error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
