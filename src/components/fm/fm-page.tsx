"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRoomStore } from "@/stores/room";
import { useConnectionStore } from "@/stores/connection";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, Settings, Lock, Share2, Play, Square } from "lucide-react";

/* ── Starfield generation ── */
const stars = Array.from({ length: 30 }, (_, i) => ({
  size: i % 3 === 0 ? 4 : i % 2 === 0 ? 3 : 2,
  left: (i * 37.7) % 100,
  top: (i * 19.3) % 60 + 10,
  delay: ((i % 12) * 0.25).toFixed(2),
  isBlue: i % 3 === 0,
}));

export function FMPage() {
  const router = useRouter();
  const { tomatoRunning, tomatoMinutes, tomatoSeconds, startTomato, stopTomato } = useRoomStore();
  const { connection, connect, disconnect } = useConnectionStore();

  const isConnecting = connection.isActive;
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [roomCode, setRoomCode] = useState(connection.roomCode || "------");
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetch("/api/fm", {
          headers: { Authorization: `Bearer ${localStorage.getItem("timii_token") || ""}` },
        }).then((r) => r.json());
        if (data.roomId) setRoomCode(data.roomId);
      } catch {
        // keep default
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleToggleConnect = useCallback(() => {
    if (isConnecting) {
      disconnect();
    } else {
      if (roomCode && roomCode !== "------") {
        connect(roomCode);
        router.push(`/room/${roomCode}`);
      }
    }
  }, [isConnecting, roomCode, connect, disconnect, router]);

  /* ── Local timer tick (separate from room store for FM solo mode) ── */
  const tick = useRoomStore((s) => s.tickTomato);
  useEffect(() => {
    if (tomatoRunning) {
      timerRef.current = setInterval(() => tick(), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tomatoRunning, tick]);

  const formatTime = (m: number, s: number) =>
    `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#080D0F] relative overflow-hidden text-[#E6E8EB]">
      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((s, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${
              s.isBlue ? "bg-[#4A90E2]" : "bg-[#E6E8EB]"
            }`}
            style={{
              width: `${s.size}px`,
              height: `${s.size}px`,
              left: `${s.left}%`,
              top: `${s.top}%`,
              animation: `starTwinkle 3s ease-in-out ${s.delay}s infinite`,
              opacity: 0.15,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen px-6 pb-28">
        {/* ── Header ── */}
        <div className="flex items-start justify-between pt-6">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#4A90E2] font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A90E2]" />
              我的频道
            </span>
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-[40px] font-bold text-white leading-none">
              FM
            </h1>
            <p className="text-sm text-[#B3B3B8]">开启你的专注频道，与世界连线</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 bg-[#121721] rounded-[10px] px-4 py-2">
            <span className="text-[10px] text-[#B3B3B8]">房间号</span>
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#4A90E2]">
              {loading ? "---" : roomCode}
            </span>
          </div>
        </div>

        {/* ── Starfield + Connect Button ── */}
        <div className="relative h-[280px] flex items-center justify-center my-5">
          {/* Additional decorative stars */}
          {stars.slice(0, 10).map((s, i) => (
            <div
              key={`sf-${i}`}
              className={`absolute rounded-full ${
                s.isBlue ? "bg-[#4A90E2]" : "bg-[#E6E8EB]"
              }`}
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                left: `${s.left}%`,
                top: `${s.top}%`,
                animation: `starTwinkle 3s ease-in-out ${s.delay}s infinite`,
                opacity: 0,
              }}
            />
          ))}

          {/* Connect Button */}
          <button
            onClick={handleToggleConnect}
            className="relative z-10 w-[160px] h-[160px] rounded-full bg-[#4A90E2] flex items-center justify-center cursor-pointer transition-transform active:scale-95"
            style={{
              boxShadow: isConnecting
                ? "0 0 60px rgba(239,68,68,0.5)"
                : "0 0 40px rgba(74,144,226,0.3)",
              animation: isConnecting ? "none" : "btnPulse 2s ease-in-out infinite",
            }}
          >
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-white tracking-wide">
              {isConnecting ? "结束连线" : "开始连线"}
            </span>
          </button>
        </div>

        {/* ── Quick Controls ── */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`p-3 rounded-full transition-all ${
              micOn ? "bg-white/10 text-white" : "bg-red-500/20 text-red-400"
            }`}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setCameraOn(!cameraOn)}
            className={`p-3 rounded-full transition-all ${
              cameraOn ? "bg-white/10 text-white" : "bg-red-500/20 text-red-400"
            }`}
          >
            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
          <button className="p-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-all">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* ── Room Utils ── */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <button className="p-3 rounded-full bg-white/5 text-white/50 hover:bg-white/10 transition-all">
            <Lock className="h-5 w-5" />
          </button>
          <button className="p-3 rounded-full bg-white/5 text-white/50 hover:bg-white/10 transition-all">
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* ── Solo Tomato Timer ── */}
        <div className="w-full bg-[#121721] rounded-[14px] px-5 py-4 flex items-center justify-between cursor-pointer active:bg-white/5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[#B3B3B8]">单人番茄钟</span>
            <span className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-white tabular-nums">
              {formatTime(tomatoMinutes, tomatoSeconds)}
            </span>
          </div>
          {!tomatoRunning ? (
            <button
              onClick={() => startTomato(25, 5)}
              className="text-[#4A90E2] hover:text-[#4A90E2]/80 transition-colors"
            >
              <Play className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={stopTomato}
              className="text-red-400 hover:text-red-400/80 transition-colors"
            >
              <Square className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* ── Mini Player ── */}
        <div className="w-full bg-[#121721] rounded-[14px] px-4 py-3 flex items-center gap-3 mt-4">
          <div
            className="w-11 h-11 rounded-[6px] shrink-0"
            style={{ background: "linear-gradient(135deg, #4A90E2, #8B5CF6)" }}
          />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-sm font-semibold truncate">Lofi Study Beats</span>
            <span className="text-xs text-[#B3B3B8]">Chillhop Music</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2">
              <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
            </svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#4A90E2" stroke="#4A90E2" strokeWidth="1">
              <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="white" />
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
