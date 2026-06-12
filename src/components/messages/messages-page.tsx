"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, Bell, History, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ChatItem {
  id: string;
  name: string;
  lastMsg: string;
  time: string;
  unread: number;
  avatar: string;
  type: "private" | "community";
}

interface SystemNotice {
  id: string;
  text: string;
  time: string;
  icon: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bell,
  History,
};

export function MessagesPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [systemNotices, setSystemNotices] = useState<SystemNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/messages", {
          headers: { Authorization: `Bearer ${localStorage.getItem("timii_token") || ""}` },
        });
        const data = await res.json();
        if (!data.error) {
          setChats(data.chats || []);
          setSystemNotices(data.systemNotices || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">消息</h1>
        </div>
        <Link href="/profile">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-sm">我</AvatarFallback>
          </Avatar>
        </Link>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Search Capsule */}
        <div className="search-capsule">
          <Search className="search-capsule__icon" />
          <input className="search-capsule__input" placeholder="搜索消息..." />
        </div>

        {loading && (
          <div className="text-center text-muted-foreground text-sm py-4">加载中…</div>
        )}

        {/* System Notices */}
        {systemNotices.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-medium text-muted-foreground">系统通知</h2>
            <div className="space-y-1">
              {systemNotices.map((n) => {
                const IconComp = iconMap[n.icon] || Bell;
                return (
                  <div key={n.id} className="bg-card rounded-[10px] border border-border p-3 flex items-center gap-3">
                    <IconComp className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm flex-1">{n.text}</span>
                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Chats */}
        {chats.length > 0 && (
          <section className="flex flex-col gap-2 pb-4">
            <h2 className="text-xs font-medium text-muted-foreground">会话</h2>
            <div className="space-y-0.5">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={chat.type === "community" ? `/community/${chat.id}` : `/messages/${chat.id}`}
                  className="flex items-center gap-3 p-3 rounded-[10px] hover:bg-secondary transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback
                      className={
                        chat.type === "community"
                          ? "bg-accent text-primary text-sm"
                          : "bg-primary/20 text-primary text-sm"
                      }
                    >
                      {chat.type === "community" ? <Users className="h-4 w-4" /> : chat.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">{chat.name}</h3>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{chat.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMsg}</p>
                  </div>
                  {chat.unread > 0 && (
                    <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] px-1 shrink-0">
                      {chat.unread}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && chats.length === 0 && systemNotices.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">暂无消息</div>
        )}
      </div>
    </div>
  );
}
