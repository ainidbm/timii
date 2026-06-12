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

    /* ── Today's connection time ── */
    const todayRow = db
      .prepare(
        `SELECT COALESCE(SUM(
          ROUND((julianday(COALESCE(left_at, datetime('now'))) - julianday(joined_at)) * 24 * 60)
        ), 0) as mins
         FROM room_members
         WHERE user_id = ? AND date(joined_at) = date('now')`
      )
      .get(userId) as { mins: number };

    /* ── Today's completed tomato count ── */
    // Count tomato mode switches as completions (simplified)
    const tomatoRow = db
      .prepare(
        `SELECT COUNT(*) as count FROM room_tomato
         WHERE room_id IN (SELECT room_id FROM room_members WHERE user_id = ? AND left_at IS NULL)
         AND status = 'stopped'`
      )
      .get(userId) as { count: number };

    /* ── Consecutive days ── */
    const streakRow = db
      .prepare(
        `WITH RECURSIVE dates(d) AS (
           SELECT date('now')
           UNION ALL
           SELECT date(d, '-1 day') FROM dates
           WHERE EXISTS (
             SELECT 1 FROM room_members
             WHERE user_id = ? AND date(joined_at) = date(d, '-1 day')
           )
           LIMIT 60
         )
         SELECT COUNT(*) as streak FROM dates`
      )
      .get(userId) as { streak: number };

    /* ── Weekly chart data ── */
    const weekRows = db
      .prepare(
        `SELECT date(joined_at) as day,
                COALESCE(SUM(ROUND((julianday(COALESCE(left_at, datetime('now'))) - julianday(joined_at)) * 24 * 60)), 0) as mins
         FROM room_members
         WHERE user_id = ? AND date(joined_at) >= date('now', '-6 days')
         GROUP BY date(joined_at)
         ORDER BY day`
      )
      .all(userId) as Array<{ day: string; mins: number }>;

    // Fill in missing days with 0
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    const chartData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const row = weekRows.find((r) => r.day === dateStr);
      chartData.push({
        day: dayNames[d.getDay()],
        minutes: row ? Math.round(row.mins) : 0,
        isToday: i === 0,
      });
    }

    /* ── Achievements ── */
    const totalHoursRow = db
      .prepare(
        `SELECT COALESCE(SUM(ROUND((julianday(COALESCE(left_at, datetime('now'))) - julianday(joined_at)) * 24)), 0) as hours
         FROM room_members WHERE user_id = ?`
      )
      .get(userId) as { hours: number };

    const achievements = [
      {
        id: "streak-7",
        name: "连续7天",
        icon: "🔥",
        done: streakRow.streak >= 7,
      },
      {
        id: "hours-100",
        name: "100 小时",
        icon: "⭐",
        done: totalHoursRow.hours >= 100,
      },
      {
        id: "social",
        name: "社交达人",
        icon: "💬",
        done: (tomatoRow.count as number) >= 20,
      },
    ];

    /* ── Recent records (last 10 sessions) ── */
    const records = db
      .prepare(
        `SELECT rm.joined_at, rm.left_at, r.name as room_name, r.id as room_id,
                ROUND((julianday(COALESCE(rm.left_at, datetime('now'))) - julianday(rm.joined_at)) * 24 * 60) as duration_mins
         FROM room_members rm
         JOIN rooms r ON r.id = rm.room_id
         WHERE rm.user_id = ?
         ORDER BY rm.joined_at DESC
         LIMIT 10`
      )
      .all(userId) as Array<{
      joined_at: string;
      left_at: string | null;
      room_name: string;
      room_id: string;
      duration_mins: number;
    }>;

    const recentRecords = records.map((r) => {
      const d = new Date(r.joined_at);
      return {
        date: `${d.getMonth() + 1}月${d.getDate()}日`,
        time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        roomName: r.room_name,
        duration: r.duration_mins,
      };
    });

    return NextResponse.json({
      todayMinutes: Math.round(todayRow.mins),
      tomatoCount: tomatoRow.count,
      streakDays: streakRow.streak,
      weekChart: chartData,
      achievements,
      recentRecords,
    });
  } catch (e) {
    console.error("GET /api/dashboard error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
