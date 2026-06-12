"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SIDEBAR_TABS } from "./nav-config";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav lg:hidden">
      {SIDEBAR_TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/discover" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            prefetch
            className={cn(
              "bottom-nav__item",
              active && "bottom-nav__item--active"
            )}
          >
            <Icon className="h-[22px] w-[22px]" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
