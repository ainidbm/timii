"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { ReconnectDialog } from "./reconnect-dialog";
import { SIDEBAR_TABS } from "./nav-config";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DARK_PAGES = ["/fm", "/auth"];
const HIDE_NAV_PAGES = ["/auth", "/room"];

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isDark = DARK_PAGES.some((p) => pathname.startsWith(p));
  const isRoomPage = pathname.startsWith("/room");
  const hideNav = HIDE_NAV_PAGES.some((p) => pathname.startsWith(p)) || isRoomPage;

  /* Toggle dark class on <html> — ensures CSS variables cascade correctly */
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    return () => {
      // cleanup only when navigating away from dark pages
      root.classList.remove("dark");
    };
  }, [isDark]);

  return (
    <div className={cn("min-h-screen bg-background")}>
      {/* PC Sidebar — lg+ only */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[90px] flex-col items-center gap-2 py-6 border-r border-border bg-card z-50">
        <Link
          href="/discover"
          className="font-title text-primary font-bold text-lg mb-6 tracking-tight"
        >
          Timii
        </Link>
        {SIDEBAR_TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/discover" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] transition-colors",
                active
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </Link>
          );
        })}
      </aside>

      {/* Main content area */}
      <main
        className={cn(
          !hideNav && "pb-[calc(5rem+env(safe-area-inset-bottom))]",
          "lg:ml-[90px] lg:max-w-[440px] xl:max-w-[640px]"
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Nav — hidden on auth and room pages */}
      {!hideNav && <BottomNav />}

      {/* Reconnect prompt */}
      <ReconnectDialog />
    </div>
  );
}
