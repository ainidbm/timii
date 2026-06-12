import { Compass, Radio, LayoutGrid, User } from "lucide-react";

export const SIDEBAR_TABS = [
  { href: "/discover", icon: Compass, label: "发现" },
  { href: "/fm", icon: Radio, label: "FM" },
  { href: "/dashboard", icon: LayoutGrid, label: "仪表盘" },
  { href: "/profile", icon: User, label: "个人" },
] as const;
