import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateToken, hashPassword } from "@/lib/auth-server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email, password, nickname } = await request.json();
    if (!email || !password || !nickname) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedNickname = nickname.trim().slice(0, 16);

    const db = getDb();

    // Check if email already exists
    const existing = db.prepare("SELECT id FROM profiles WHERE email = ?").get(trimmedEmail);
    if (existing) {
      return NextResponse.json({ error: "email_exists" }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    db.prepare(
      "INSERT INTO profiles (id, email, password, nickname, avatar_url) VALUES (?, ?, ?, ?, ?)"
    ).run(id, trimmedEmail, hashedPassword, trimmedNickname, "");

    const token = generateToken(id);

    return NextResponse.json({
      token,
      user: {
        id,
        email: trimmedEmail,
        nickname: trimmedNickname,
        avatar_url: "",
        created_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("POST /api/auth/register error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
