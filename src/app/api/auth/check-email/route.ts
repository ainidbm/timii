import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const db = getDb();
    const user = db.prepare("SELECT 1 FROM profiles WHERE email = ?").get(email.trim().toLowerCase());
    return NextResponse.json({ exists: !!user });
  } catch (e) {
    console.error("POST /api/auth/check-email error:", e);
    return NextResponse.json({ exists: false });
  }
}
