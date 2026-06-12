"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    try {
      const data = await apiFetch<{ exists: boolean }>("/api/auth/check-email", {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });
      const mode = data.exists ? "login" : "register";
      const nextQuery = next ? `&next=${encodeURIComponent(next)}` : "";
      router.push(`/auth/verify?email=${encodeURIComponent(trimmed)}&mode=${mode}${nextQuery}`);
    } catch {
      const nextQuery = next ? `&next=${encodeURIComponent(next)}` : "";
      router.push(`/auth/verify?email=${encodeURIComponent(trimmed)}&mode=login${nextQuery}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080D0F] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(74,144,226,0.12) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 40% at 20% 80%, rgba(74,144,226,0.06) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 40% at 80% 70%, rgba(139,92,246,0.05) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-[calc(100vw-64px)] max-w-[340px] flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[72px] h-[72px] rounded-[20px] bg-primary/10 flex items-center justify-center shadow-[0_0_60px_rgba(74,144,226,0.15)]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#4A90E2" strokeWidth="2.5" />
              <path d="M24 6c-1.1 0-2 .9-2 2v28c0 1.1.9 2 2 2" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M26 38c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M24 14V8" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M4 18h40" stroke="#4A90E2" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <circle cx="24" cy="27" r="4" fill="#4A90E2" opacity="0.85" />
              <path d="M22 27l1.5 1.5 3-3" stroke="#080D0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[28px] font-bold text-[#E6E8EB] tracking-[-0.5px]">
            Timii
          </h1>
          <p className="text-sm text-[#B3B3B8]">学习陪伴 · 专注每一刻</p>
        </div>

        {/* Form */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#B3B3B8] uppercase tracking-wider">
              邮箱
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              className="h-12 px-4 bg-[#121721] border border-white/10 rounded-[10px] text-[#E6E8EB] text-sm outline-none transition-all focus:border-[#4A90E2] focus:shadow-[0_0_0_3px_rgba(74,144,226,0.15)] placeholder:text-white/20"
              onKeyDown={(e) => { if (e.key === "Enter") void onSubmit(); }}
            />
          </div>

          <button
            className="w-full h-[50px] rounded-[14px] bg-[#4A90E2] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:opacity-90 shadow-[0_0_40px_rgba(74,144,226,0.3)] hover:shadow-[0_0_50px_rgba(74,144,226,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || !email.trim()}
            onClick={onSubmit}
          >
            {submitting ? "检查中…" : "继续"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-[#9CA6B0] whitespace-nowrap">其他登录方式</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Social buttons */}
          <div className="flex justify-center gap-5">
            <button className="w-12 h-12 rounded-full border border-white/10 bg-transparent text-[#B3B3B8] flex items-center justify-center transition-colors hover:bg-white/5 hover:text-[#E6E8EB]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.68 10.74a.75.75 0 100-1.5.75.75 0 000 1.5zm3.14 0a.75.75 0 100-1.5.75.75 0 000 1.5zm-2.43 2.92c-2.96 0-5.39 2.25-5.39 5.05 0 1.5.69 2.9 1.84 3.88l-.43 1.29 1.5-.86a5.9 5.9 0 002.48.54c2.96 0 5.39-2.25 5.39-5.05 0-2.8-2.43-5.05-5.39-5.05zm-1.23 2.54a.6.6 0 110 1.2.6.6 0 010-1.2zm3.78 1.2a.6.6 0 11-.6-.6.6.6 0 01.6.6z"/>
                <path d="M14.5 2C10.36 2 7 5.13 7 9c0 1.33.42 2.58 1.13 3.63-.04.01-.08.02-.13.02-.19 0-.38-.04-.56-.1l-1.87.74.38-1.13C4.44 11.16 3.5 10.1 3.5 9 3.5 5.36 6.86 2.5 11 2.5c1.45 0 2.8.4 3.98 1.1C14.23 3.18 13.5 2.5 12.5 2z"/>
              </svg>
            </button>
            <button className="w-12 h-12 rounded-full border border-white/10 bg-transparent text-[#B3B3B8] flex items-center justify-center transition-colors hover:bg-white/5 hover:text-[#E6E8EB]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="13" r="5"/><path d="M12 4c-2.5 0-4.5 1.7-5 4h10c-.5-2.3-2.5-4-5-4z"/>
                <ellipse cx="12" cy="12.5" rx="7" ry="6.5"/><path d="M7 13.5c0-1 .8-1.5 1.5-1.5h7c.7 0 1.5.5 1.5 1.5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center gap-2 text-sm">
          <button className="text-[#4A90E2] font-medium hover:opacity-80">没有账号？注册</button>
          <span className="text-[#9CA6B0] text-xs">·</span>
          <button className="text-[#4A90E2] font-medium hover:opacity-80">游客登录</button>
        </div>
      </div>
    </div>
  );
}
