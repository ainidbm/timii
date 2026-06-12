import { NextResponse } from "next/server";
import { getTokenFromRequest, invalidateToken } from "@/lib/auth-server";

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (token) {
      invalidateToken(token);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/auth/logout error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
