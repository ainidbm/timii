import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken, verifyPassword } from "@/lib/auth-server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const db = getDb();
    const user = db
      .prepare("SELECT id, email, password, nickname, avatar_url, created_at FROM profiles WHERE email = ?")
      .get(email.trim().toLowerCase()) as Record<string, string> | undefined;

    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "wrong_password" }, { status: 401 });
    }

    const token = generateToken(user.id);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (e) {
    console.error("POST /api/auth/login error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
