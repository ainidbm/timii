import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTokenFromRequest, validateToken } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const session = validateToken(token);
    if (!session) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const db = getDb();
    const user = db
      .prepare("SELECT id, email, nickname, avatar_url, created_at FROM profiles WHERE id = ?")
      .get(session.userId) as Record<string, string> | undefined;

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("GET /api/auth/me error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
