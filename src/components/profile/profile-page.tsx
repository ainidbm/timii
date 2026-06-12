"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Users,
  LayoutGrid,
  Trophy,
  Info,
  ChevronRight,
  Radio,
} from "lucide-react";
import Link from "next/link";

interface ProfileData {
  id: string;
  nickname: string;
  email: string;
  avatar_url: string;
  roomCode: string;
  bio: string;
  stats: {
    friends: number;
    following: number;
    totalHours: number;
  };
  achievementsUnlocked: number;
  version: string;
}

export function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile", {
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
    if (user) void load();
  }, [user]);

  async function handleLogout() {
    await logout();
    router.replace("/auth");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">加载中…</p>
      </div>
    );
  }

  const profile = data || {
    nickname: user?.nickname || "用户",
    email: user?.email || "",
    avatar_url: user?.avatar_url || "",
    roomCode: "",
    bio: "",
    stats: { friends: 0, following: 0, totalHours: 0 },
    achievementsUnlocked: 0,
    version: "1.0.0",
  };

  const menuItems = [
    {
      href: "/room",
      icon: Users,
      iconBg: "rgba(74,144,226,0.1)",
      iconColor: "#4A90E2",
      label: "我的房间",
      hint: "管理已加入的房间",
    },
    {
      href: "/dashboard",
      icon: LayoutGrid,
      iconBg: "rgba(51,199,89,0.1)",
      iconColor: "#33C759",
      label: "学习仪表盘",
      hint: "查看学习数据与趋势",
    },
    {
      href: "#",
      icon: Trophy,
      iconBg: "rgba(245,166,35,0.1)",
      iconColor: "#F5A623",
      label: "成就徽章",
      hint: `已解锁 ${profile.achievementsUnlocked} 个成就`,
      onClick: true,
    },
    {
      href: "#",
      icon: Settings,
      iconBg: "rgba(140,140,145,0.1)",
      iconColor: "#8C8C91",
      label: "设置",
      hint: "通知、隐私与通用",
      onClick: true,
    },
    {
      href: "#",
      icon: Info,
      iconBg: "rgba(140,140,145,0.1)",
      iconColor: "#8C8C91",
      label: "关于",
      hint: `v${profile.version} · 学习陪伴社交`,
      onClick: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Settings button (top right) */}
      <button className="absolute top-4 right-4 w-9 h-9 rounded-[10px] bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center text-muted-foreground hover:text-primary transition-colors z-10">
        <Settings className="h-5 w-5" />
      </button>

      <div className="px-4 py-4">
        {/* ── Hero: Avatar + Info ── */}
        <div className="flex flex-col items-center pt-8 pb-5">
          <div className="mb-4">
            <div className="avatar-ring avatar-ring--online w-[84px] h-[84px] avatar-ring--accent">
              <div className="avatar-ring__img flex items-center justify-center text-[34px] text-white font-bold"
                style={{ background: "linear-gradient(135deg, #4A90E2, #8B5CF6)" }}>
                {profile.nickname[0]}
              </div>
            </div>
          </div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold mb-1">
            {profile.nickname}
          </h1>
          <p className="text-sm text-muted-foreground mb-3">{profile.bio || "学习陪伴，专注每一刻"}</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {profile.roomCode && (
              <Badge className="bg-accent text-primary">房间号 {profile.roomCode}</Badge>
            )}
            <Badge variant="secondary" className="bg-[#F5A623]/10 text-[#F5A623]">全栈开发</Badge>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="flex justify-around bg-card rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] py-4 mb-5">
          <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-[10px] cursor-pointer hover:bg-secondary transition-colors">
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
              {profile.stats.friends}
            </span>
            <span className="text-xs text-muted-foreground">好友</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-[10px] cursor-pointer hover:bg-secondary transition-colors">
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
              {profile.stats.following}
            </span>
            <span className="text-xs text-muted-foreground">关注</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-[10px] cursor-pointer hover:bg-secondary transition-colors">
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
              {profile.stats.totalHours}h
            </span>
            <span className="text-xs text-muted-foreground">学习时长</span>
          </div>
        </div>

        {/* ── Menu ── */}
        <div className="bg-card rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          {menuItems.map((item, i) => (
            <div key={i}>
              {item.onClick ? (
                <button
                  className="w-full flex items-center gap-3 px-4 py-4 border-b border-border last:border-b-0 hover:bg-secondary transition-colors text-left"
                  onClick={() => {
                    // Placeholder actions for settings, about, etc.
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: item.iconBg }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.iconColor }} />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-4 border-b border-border last:border-b-0 hover:bg-secondary transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: item.iconBg }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.iconColor }} />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          className="w-full mt-5 py-3 text-sm text-muted-foreground hover:text-destructive transition-colors text-center"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
