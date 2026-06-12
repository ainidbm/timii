"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCached, setCache } from "@/lib/cache";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createRoom } from "@/lib/room-api";
import { useAuthStore } from "@/stores/auth";
import { Search, Users, ChevronRight, MessageCircle, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface OnlineFriend {
  id: string;
  name: string;
  avatar: string;
  inRoom: boolean;
}

interface HotCommunity {
  id: string;
  name: string;
  members: number;
  active: number;
  cover: string;
}

interface RecommendedRoom {
  id: string;
  name: string;
  user: string;
  online: number;
  tags: string[];
  roomId: string;
}

export function DiscoverPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [hotCommunities, setHotCommunities] = useState<HotCommunity[]>([]);
  const [recommendedRooms, setRecommendedRooms] = useState<RecommendedRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  const CACHE_KEY = "discover";

  useEffect(() => {
    // Serve cached data immediately for instant navigation
    const cached = getCached<{
      onlineFriends: OnlineFriend[];
      hotCommunities: HotCommunity[];
      recommendedRooms: RecommendedRoom[];
    }>(CACHE_KEY);
    if (cached) {
      setOnlineFriends(cached.onlineFriends);
      setHotCommunities(cached.hotCommunities);
      setRecommendedRooms(cached.recommendedRooms);
      setLoading(false);
    }

    async function load() {
      try {
        const res = await fetch("/api/discover", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("timii_token") || ""}`,
          },
        });
        const data = await res.json();
        if (!data.error) {
          const friends = data.onlineFriends || [];
          const communities = data.hotCommunities || [];
          const rooms = data.recommendedRooms || [];
          setCache(CACHE_KEY, { onlineFriends: friends, hotCommunities: communities, recommendedRooms: rooms });
          setOnlineFriends(friends);
          setHotCommunities(communities);
          setRecommendedRooms(rooms);
        }
      } catch {
        // Silently fail — user sees cached or empty state
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
            发现
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/messages"
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
            </Link>
            <Link
              href="#"
              className="text-sm text-primary font-medium"
              onClick={(e) => {
                e.preventDefault();
                // QR scanner placeholder
              }}
            >
              扫码加入
            </Link>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Search Capsule */}
        <div className="search-capsule">
          <Search className="search-capsule__icon" />
          <input className="search-capsule__input" type="text" placeholder="搜索房间或社群..." />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-muted-foreground text-sm py-8">加载中…</div>
        )}

        {/* Online Friends */}
        {onlineFriends.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                在线好友
              </h2>
              <Badge variant="secondary" className="bg-[#33C759]/10 text-[#33C759] text-[10px]">
                {onlineFriends.length} 人在线
              </Badge>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
              {onlineFriends.map((f) => (
                <Link
                  key={f.id}
                  href={`/profile/${f.id}`}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className="avatar-ring avatar-ring--online w-12 h-12">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={f.avatar} />
                      <AvatarFallback
                        className="text-sm"
                        style={{
                          background: `linear-gradient(135deg, ${
                            ["#4A90E2,#6366F1", "#F5A623,#F97316", "#33C759,#22C55E", "#EC4899,#F472B6", "#8B5CF6,#A78BFA"][
                              f.name.charCodeAt(0) % 5
                            ]
                          })`,
                          color: "white",
                        }}
                      >
                        {f.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{f.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Hot Communities */}
        {hotCommunities.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                热门社群
              </h2>
              <Link href="/communities" className="text-sm text-muted-foreground">
                全部 ›
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {hotCommunities.map((c, i) => {
                const gradients = [
                  "from-[#4A90E2] to-[#63B3ED]",
                  "from-[#F5A623] to-[#FBBF24]",
                  "from-[#33C759] to-[#86EFAC]",
                  "from-[#8B5CF6] to-[#C4B5FD]",
                ];
                return (
                  <Link
                    key={c.id}
                    href={`/community/${c.id}`}
                    className="bg-card rounded-[14px] overflow-hidden border border-border active:scale-[0.98] transition-transform"
                  >
                    <div
                      className={`h-[72px] bg-gradient-to-br ${gradients[i % 4]}`}
                    />
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[13px] font-semibold truncate flex-1 mr-2">
                        {c.name}
                      </span>
                      <Badge variant="secondary" className="bg-[#33C759]/10 text-[#33C759] text-[10px] shrink-0">
                        {c.members} 人
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recommended Rooms */}
        {recommendedRooms.length > 0 && (
          <section className="flex flex-col gap-3 pb-4">
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
              推荐房间
            </h2>
            <div className="flex flex-col gap-2">
              {recommendedRooms.map((room) => (
                <button
                  key={room.id}
                  className="w-full text-left"
                  onClick={() => router.push(`/room/${room.roomId}`)}
                >
                  <div className="flex items-center gap-3 bg-card rounded-[10px] px-4 py-3 border border-border active:bg-secondary transition-colors">
                    <div
                      className="w-10 h-10 rounded-[10px] shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${
                          ["#4A90E2,#6366F1", "#F5A623,#F97316", "#EC4899,#F472B6"][
                            room.name.charCodeAt(0) % 3
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
                    <Badge className="bg-accent text-primary text-[10px]">加入</Badge>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Create Room — Floating Button (mounted guard prevents SSR hydration mismatch) */}
        {mounted && user && (
          <Dialog>
            <DialogTrigger render={
              <Button className="fixed bottom-24 right-4 lg:right-8 z-40 w-14 h-14 rounded-full shadow-lg shadow-primary/30 p-0">
                <QrCode className="h-6 w-6" />
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建房间</DialogTitle>
                <DialogDescription>创建后会自动加入并生成房间号</DialogDescription>
              </DialogHeader>
              <Input
                placeholder="例如：深夜刷题中"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <DialogFooter>
                <Button
                  disabled={creating || !createName.trim()}
                  onClick={async () => {
                    setCreating(true);
                    try {
                      const room = await createRoom(createName.trim());
                      router.push(`/room/${room.code}`);
                    } catch {
                      // silently fail
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  {creating ? "创建中…" : "创建并进入"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Empty state */}
        {!loading && recommendedRooms.length === 0 && hotCommunities.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            还没有数据，请先运行 <code className="bg-muted px-1 rounded">npm run seed</code> 填充测试数据
          </div>
        )}
      </div>
    </div>
  );
}
