"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Users, Trophy, MessageCircle } from "lucide-react";
import Link from "next/link";

interface ProfileData {
  id: string;
  nickname: string;
  email?: string;
  avatar_url?: string;
  roomCode?: string;
  bio?: string;
  stats?: {
    friends: number;
    following: number;
    totalHours: number;
    rooms: number;
  };
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/profile/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("timii_token") || ""}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  const profile = data ?? {
    id: id as string,
    nickname: "用户",
    bio: "学习陪伴，专注每一刻",
    roomCode: undefined as string | undefined,
    stats: { friends: 0, following: 0, totalHours: 0, rooms: 0 },
  } as ProfileData;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold truncate">
          {loading ? "加载中…" : profile.nickname}
        </h1>
        <Link
          href="/messages"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors ml-auto"
        >
          <MessageCircle className="h-5 w-5" />
        </Link>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground text-sm">加载中…</p>
        </div>
      ) : (
        <div className="px-4 py-4">
          {/* Hero */}
          <div className="flex flex-col items-center pt-8 pb-5">
            <div className="avatar-ring avatar-ring--online w-[84px] h-[84px] avatar-ring--accent mb-4">
              <div
                className="avatar-ring__img flex items-center justify-center text-[34px] text-white font-bold"
                style={{ background: "linear-gradient(135deg, #4A90E2, #8B5CF6)" }}
              >
                {profile.nickname[0]}
              </div>
            </div>
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold mb-1">
              {profile.nickname}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{profile.bio}</p>
            {profile.roomCode && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-accent text-primary px-3 py-1 rounded-full font-semibold">
                房间号 {profile.roomCode}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-around bg-card rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] py-4 mb-5">
            <div className="flex flex-col items-center gap-1">
              <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                {profile.stats?.friends ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">好友</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                {profile.stats?.following ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">关注</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                {profile.stats?.totalHours ?? 0}h
              </span>
              <span className="text-xs text-muted-foreground">学习时长</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full py-3 text-sm font-semibold active:scale-[0.98] transition-transform">
              <Users className="h-4 w-4" /> 加好友
            </button>
            <button
              onClick={() => profile.roomCode && router.push(`/room/${profile.roomCode}`)}
              className="flex-1 flex items-center justify-center gap-2 bg-secondary text-foreground rounded-full py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              <Clock className="h-4 w-4" /> 去连线
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
