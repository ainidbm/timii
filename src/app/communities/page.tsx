"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CommunityItem {
  id: string;
  name: string;
  members: number;
  active: number;
  cover: string;
}

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/discover", {
          headers: { Authorization: `Bearer ${localStorage.getItem("timii_token") || ""}` },
        });
        const data = await res.json();
        if (!data.error && data.hotCommunities) {
          setCommunities(data.hotCommunities);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const gradients = [
    "from-[#4A90E2] to-[#63B3ED]",
    "from-[#F5A623] to-[#FBBF24]",
    "from-[#33C759] to-[#86EFAC]",
    "from-[#8B5CF6] to-[#C4B5FD]",
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold">
          全部社群
        </h1>
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground text-sm">加载中…</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {communities.map((c, i) => (
              <Link
                key={c.id}
                href={`/community/${c.id}`}
                className="bg-card rounded-[14px] overflow-hidden border border-border active:scale-[0.98] transition-transform"
              >
                <div
                  className={`h-[72px] bg-gradient-to-br ${gradients[i % 4]}`}
                />
                <div className="px-3 py-3">
                  <span className="text-[14px] font-semibold block truncate mb-1">
                    {c.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.members} 成员 · {c.active} 在线
                  </span>
                </div>
              </Link>
            ))}
            {communities.length === 0 && (
              <div className="col-span-2 text-center text-muted-foreground text-sm py-12">
                暂无社群
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
