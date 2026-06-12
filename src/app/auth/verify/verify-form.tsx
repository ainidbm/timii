"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export function VerifyForm({ email, next }: { email: string; next: string }) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  const safeEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlMode = searchParams.get("mode");
    if (urlMode === "register") setMode("register");
  }, []);

  const isRegister = mode === "register";

  async function onSubmit() {
    if (!safeEmail || !password.trim()) return;
    if (isRegister && !nickname.trim()) {
      setError("请输入昵称");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) {
        await register(safeEmail, password.trim(), nickname.trim());
      } else {
        await login(safeEmail, password.trim());
      }
      router.replace(next || "/discover");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "操作失败";
      if (msg.includes("user_not_found")) {
        setMode("register");
        return;
      }
      setError(msg);
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
            "radial-gradient(ellipse 60% 40% at 20% 80%, rgba(74,144,226,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-[calc(100vw-64px)] max-w-[340px] flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[72px] h-[72px] rounded-[20px] bg-primary/10 flex items-center justify-center shadow-[0_0_60px_rgba(74,144,226,0.15)]">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#4A90E2" strokeWidth="2.5" />
              <circle cx="24" cy="27" r="4" fill="#4A90E2" opacity="0.85" />
              <path d="M22 27l1.5 1.5 3-3" stroke="#080D0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[28px] font-bold text-[#E6E8EB] tracking-[-0.5px]">
            {isRegister ? "创建账号" : "登录"}
          </h1>
          <p className="text-sm text-[#B3B3B8]">{safeEmail}</p>
        </div>

        {/* Form */}
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#B3B3B8] uppercase tracking-wider">密码</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="h-12 px-4 bg-[#121721] border border-white/10 rounded-[10px] text-[#E6E8EB] text-sm outline-none transition-all focus:border-[#4A90E2] focus:shadow-[0_0_0_3px_rgba(74,144,226,0.15)] placeholder:text-white/20"
              onKeyDown={(e) => { if (e.key === "Enter") void onSubmit(); }}
            />
          </div>

          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#B3B3B8] uppercase tracking-wider">昵称</label>
              <input
                placeholder="你的名字（最多16字）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 16))}
                autoComplete="nickname"
                className="h-12 px-4 bg-[#121721] border border-white/10 rounded-[10px] text-[#E6E8EB] text-sm outline-none transition-all focus:border-[#4A90E2] focus:shadow-[0_0_0_3px_rgba(74,144,226,0.15)] placeholder:text-white/20"
                onKeyDown={(e) => { if (e.key === "Enter") void onSubmit(); }}
              />
            </div>
          )}

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button
            className="w-full h-[50px] rounded-[14px] bg-[#4A90E2] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:opacity-90 shadow-[0_0_40px_rgba(74,144,226,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || !safeEmail || !password.trim() || (isRegister && !nickname.trim())}
            onClick={onSubmit}
          >
            {submitting ? "处理中…" : isRegister ? "注册并登录" : "登录"}
          </button>

          <button
            className="w-full h-12 rounded-[14px] bg-transparent text-[#B3B3B8] border border-white/10 font-medium text-sm flex items-center justify-center transition-colors hover:bg-white/5 hover:text-[#E6E8EB]"
            onClick={() => router.replace("/auth")}
          >
            返回修改邮箱
          </button>

          {!isRegister && (
            <p className="text-xs text-[#9CA6B0] text-center">
              测试账号密码: test1234
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
