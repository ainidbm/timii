import { getDb } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  const db = getDb();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 86400000).toISOString();

  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );

  return token;
}

export function validateToken(token: string): { userId: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')")
    .get(token) as { user_id: string } | undefined;
  return row ? { userId: row.user_id } : null;
}

export function invalidateToken(token: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

// Periodically clean expired sessions (every 10 minutes)
// Skip on Vercel — serverless functions are ephemeral
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
export function startSessionCleanup() {
  if (cleanupInterval) return;
  if (process.env.VERCEL) return;
  cleanupInterval = setInterval(() => {
    try {
      const db = getDb();
      db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
    } catch {
      // DB may not be open yet
    }
  }, 600000);
}

export function getTokenFromRequest(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Check cookie
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/timii_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}
