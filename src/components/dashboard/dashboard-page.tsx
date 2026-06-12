"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeekDay {
  day: string;
  minutes: number;
  isToday: boolean;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  done: boolean;
}

interface Record {
  date: string;
  time: string;
  roomName: string;
  duration: number;
}

interface DashboardData {
  todayMinutes: number;
  tomatoCount: number;
  streakDays: number;
  weekChart: WeekDay[];
  achievements: Achievement[];
  recentRecords: Record[];
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartTab, setChartTab] = useState<"duration" | "count">("duration");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${localStorage.getItem("timii_token") || ""}` },
        });
        const json = await res.json();
        if (!json.error) setData(json);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">加载中…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">暂无数据</p>
      </div>
    );
  }

  const maxMinutes = Math.max(...data.weekChart.map((d) => d.minutes), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
            学习仪表盘
          </h1>
          {/* Date switcher */}
          <div className="flex items-center gap-2">
            <button className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[13px] font-semibold min-w-[60px] text-center">
              {new Date().getMonth() + 1}月{new Date().getDate()}日
            </span>
            <button className="w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-foreground opacity-35 cursor-default">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* ── 3 Stat Cards ── */}
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col items-center gap-2 bg-card rounded-[14px] p-4 border border-border text-center">
            <div className="w-11 h-11 rounded-[10px] bg-primary/10 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                {formatDuration(data.todayMinutes)}
              </span>
              <span className="text-[11px] text-muted-foreground">今日连线时长</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2 bg-card rounded-[14px] p-4 border border-border text-center">
            <div className="w-11 h-11 rounded-[10px] bg-[#F5A623]/10 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2">
                <path d="M12 22c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2" />
                <path d="M14 22c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                {data.tomatoCount} 次
              </span>
              <span className="text-[11px] text-muted-foreground">番茄钟完成</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2 bg-card rounded-[14px] p-4 border border-border text-center">
            <div className="w-11 h-11 rounded-[10px] bg-[#33C759]/10 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#33C759" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                {data.streakDays} 天
              </span>
              <span className="text-[11px] text-muted-foreground">连续专注</span>
            </div>
          </div>
        </div>

        {/* ── Weekly Chart ── */}
        <div className="bg-card rounded-[14px] border border-border p-4">
          <div className="flex items-center justify-between mb-5">
            <span className="font-[family-name:var(--font-space-grotesk)] text-base font-bold">
              本周趋势
            </span>
            <div className="flex gap-1 bg-secondary rounded-full p-[3px]">
              <button
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  chartTab === "duration"
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-muted-foreground"
                }`}
                onClick={() => setChartTab("duration")}
              >
                时长
              </button>
              <button
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  chartTab === "count"
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-muted-foreground"
                }`}
                onClick={() => setChartTab("count")}
              >
                次数
              </button>
            </div>
          </div>
          {/* Bars */}
          <div className="flex items-end justify-between h-[140px]">
            {data.weekChart.map((d, i) => {
              const heightPct = maxMinutes > 0 ? (d.minutes / maxMinutes) * 100 : 0;
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`w-6 rounded-t-[6px] transition-all duration-500 ease-out ${
                      d.isToday
                        ? "bg-gradient-to-t from-[#4A90E2] to-[#63B3ED]"
                        : "bg-gradient-to-t from-[#4A90E2] to-[#4A90E2]/40"
                    }`}
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  />
                  <span
                    className={`text-[11px] font-medium ${
                      d.isToday ? "text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Achievements ── */}
        <section className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">成就</h2>
          <div className="flex gap-2">
            {data.achievements.map((a) => (
              <div
                key={a.id}
                className={`flex-1 flex flex-col items-center gap-1 bg-card rounded-[10px] p-3 border ${
                  a.done ? "border-accent opacity-100" : "border-border opacity-45"
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[11px] font-semibold">{a.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Recent Records ── */}
        <section className="flex flex-col gap-3 pb-4">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">近期记录</h2>
          <div className="flex flex-col">
            {data.recentRecords.map((r, i) => (
              <div key={i} className="flex gap-3 py-3 relative">
                {i < data.recentRecords.length - 1 && (
                  <div
                    className="absolute left-[37px] top-[48px] bottom-[-1px] w-[2px] bg-border"
                  />
                )}
                <div className="flex flex-col items-end gap-0.5 w-[55px] shrink-0">
                  <span className="text-xs font-semibold">{r.date}</span>
                  <span className="text-[11px] text-muted-foreground">{r.time}</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-[13px] font-semibold">{r.roomName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDuration(r.duration)}
                  </span>
                </div>
              </div>
            ))}
            {data.recentRecords.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-4">
                暂无连线记录
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
