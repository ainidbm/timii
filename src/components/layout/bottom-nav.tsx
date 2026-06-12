"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Radio, MessageCircle, LogIn, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const isRoomPage = pathname.startsWith("/room/");

  if (isRoomPage) return null;

  const tabs = user
    ? [
        { href: "/discover", icon: Compass, label: "发现" },
        { href: "/fm", icon: Radio, label: "FM" },
        { href: "/messages", icon: MessageCircle, label: "消息" },
      ]
    : [
        { href: "/discover", icon: Compass, label: "发现" },
        { href: "/fm", icon: Radio, label: "FM" },
        { href: "/auth", icon: LogIn, label: "登录" },
      ];

  if (loading) {
    // Show minimal nav during auth check to avoid layout flash
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16 items-center justify-around max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-0.5 px-3 py-1">
            <Compass className="h-6 w-6 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">发现</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3 py-1">
            <Radio className="h-6 w-6 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">FM</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-3 py-1">
            <User className="h-6 w-6 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">···</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around max-w-lg mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
