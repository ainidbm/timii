"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Radio, MessageCircle, Plus } from "lucide-react";
import Link from "next/link";

interface CommunityRoom {
  id: string;
  name: string;
  roomId: string;
  online: number;
}

interface CommunityData {
  id: string;
  name: string;
  members: number;
  active: number;
  cover: string;
  rooms: CommunityRoom[];
}

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/community/${id}`, {
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

  const community = data || {
    name: "社群",
    members: 0,
    active: 0,
    rooms: [],
  };

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
        <div className="flex flex-col gap-px flex-1 min-w-0">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold truncate">
            {loading ? "加载中…" : community.name}
          </h1>
          <span className="text-xs text-muted-foreground">
            {community.members} 成员 · {community.active} 在线
          </span>
        </div>
        <Link
          href="/messages"
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
        </Link>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground text-sm">加载中…</p>
          </div>
        ) : (
          <>
            {/* Cover */}
            <div
              className="w-full h-[140px] rounded-[14px] mb-5 flex items-end"
              style={{
                background:
                  "linear-gradient(135deg, #4A90E2 0%, #63B3ED 50%, #8B5CF6 100%)",
              }}
            >
              <div className="px-4 py-3">
                <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-white">
                  {community.name}
                </h2>
              </div>
            </div>

            {/* Room List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                  连线房间
                </h3>
                <span className="text-xs text-muted-foreground">
                  {community.rooms.length} 个房间
                </span>
              </div>
              {community.rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => router.push(`/room/${room.roomId}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 bg-card rounded-[10px] px-4 py-3 border border-border active:bg-secondary transition-colors">
                    <div
                      className="w-10 h-10 rounded-[10px] shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${
                          ["#4A90E2,#6366F1", "#F5A623,#F97316", "#EC4899,#F472B6", "#33C759,#22C55E"][
                            room.name.charCodeAt(0) % 4
                          ]
                        })`,
                      }}
                    />
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate">{room.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {room.online} 人在线
                      </span>
                    </div>
                    <span className="text-[10px] bg-accent text-primary px-2 py-0.5 rounded-full font-semibold">
                      {room.roomId}
                    </span>
                  </div>
                </button>
              ))}
              {community.rooms.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8 bg-card rounded-[14px] border border-border">
                  暂无连线房间
                </div>
              )}
            </div>

            {/* Join Button */}
            <button className="w-full mt-5 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full py-3 text-sm font-semibold active:scale-[0.98] transition-transform">
              <Plus className="h-4 w-4" /> 加入社群
            </button>
          </>
        )}
      </div>
    </div>
  );
}
