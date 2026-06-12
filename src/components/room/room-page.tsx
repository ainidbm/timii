"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useConnectionStore } from "@/stores/connection";
import {
  getRoomTomato,
  joinRoom,
  leaveRoom,
  listRoomMessages,
  listRoomMessagesAfter,
  sendRoomMessage,
  startRoomTomato,
  stopRoomTomato,
  type RoomMessageRow,
  type RoomRow,
  type RoomTomatoRow,
} from "@/lib/room-api";
import { useWebRTC } from "@/lib/webrtc";
import {
  ArrowLeft,
  Play,
  Square,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageCircle,
  Share2,
  LogOut,
  MoreHorizontal,
  Send,
} from "lucide-react";

/* ── Helpers ── */
function formatClock(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function computeRemainingMs(tomato: RoomTomatoRow | null, now: number) {
  if (!tomato) return 25 * 60 * 1000;
  const minutes = tomato.mode === "focus" ? tomato.focus_minutes : tomato.break_minutes;
  const durationMs = minutes * 60 * 1000;
  if (tomato.status !== "running" || !tomato.anchor_started_at) return durationMs;
  const anchor = Date.parse(tomato.anchor_started_at);
  const elapsed = Math.max(0, now - anchor);
  return Math.max(0, durationMs - elapsed);
}

function progressPercent(tomato: RoomTomatoRow | null, remainingMs: number) {
  if (!tomato) return 0;
  const minutes = tomato.mode === "focus" ? tomato.focus_minutes : tomato.break_minutes;
  const totalMs = minutes * 60 * 1000;
  if (totalMs === 0) return 0;
  return Math.min(100, ((totalMs - remainingMs) / totalMs) * 100);
}

const MEMBER_GRADIENTS = [
  "linear-gradient(135deg, #4A90E2, #6366F1)",
  "linear-gradient(135deg, #F5A623, #F97316)",
  "linear-gradient(135deg, #EC4899, #F472B6)",
  "linear-gradient(135deg, #8B5CF6, #A78BFA)",
];

/* ── Video Tile ── */
function VideoTile({
  isMe, name, stream, micOn, gradient, isActive,
}: {
  isMe: boolean; name: string; stream: MediaStream | null; micOn: boolean; gradient: string; isActive: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative aspect-square bg-card rounded-[14px] border overflow-hidden ${
        isActive ? "border-primary shadow-[0_0_0_2px_rgba(74,144,226,0.15)]" : "border-border"
      }`}
    >
      {stream ? (
        <video
          ref={videoRef} autoPlay playsInline muted={isMe}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full" style={{ background: gradient }} />
          <span className="text-[13px] font-medium">{name}</span>
        </div>
      )}
      {/* Name tag */}
      <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/50 text-white px-1.5 py-0.5 rounded">
        {name}
      </span>
      {/* Mic indicator */}
      <span
        className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
          micOn ? "bg-[#33C759]/80 text-white" : "bg-red-500/80 text-white"
        }`}
      >
        {micOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
      </span>
    </div>
  );
}

export function RoomPage({ code }: { code: string }) {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const { connect, disconnect } = useConnectionStore();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [tomato, setTomato] = useState<RoomTomatoRow | null>(null);
  const [messages, setMessages] = useState<RoomMessageRow[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [remainingMs, setRemainingMs] = useState(25 * 60 * 1000);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const lastMessageId = useMemo(() => messages[messages.length - 1]?.id ?? 0, [messages]);
  const switchInFlightRef = useRef(false);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastSignalTime = useRef<string>("1970-01-01T00:00:00.000Z");

  /* ── WebRTC signaling ── */
  const sendSignal = useCallback(async (toUser: string, signalType: string, payload: unknown) => {
    if (!room) return;
    const token = localStorage.getItem("timii_token") || "";
    await fetch(`/api/rooms/${room.id}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ signalType, toUser, payload }),
    });
  }, [room]);

  /* ── WebRTC hook ── */
  const {
    localStream, peers, startCapture, stopCapture, handleSignal,
  } = useWebRTC(user?.id || "", room?.id || "", sendSignal) as ReturnType<typeof useWebRTC> & {
    offerToPeer: (peerUserId: string) => Promise<void>;
  };

  /* ── Auth gate ── */
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent(`/room/${code}`)}`);
    }
  }, [code, loading, router, user]);

  /* ── Bootstrap: join room, start media ── */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function bootstrap() {
      try {
        setSyncing(true);
        const joined = await joinRoom(code);
        if (cancelled) return;
        setRoom(joined);
        connect(code);

        const [t, msgs] = await Promise.all([
          getRoomTomato(joined.id),
          listRoomMessages({ roomId: joined.id, limit: 50 }),
        ]);
        if (cancelled) return;
        setTomato(t);
        setMessages(msgs.slice().reverse());
        requestAnimationFrame(() => {
          const el = chatRef.current;
          if (!el) return;
          el.scrollTop = el.scrollHeight;
        });

        void startCapture(true, true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
      stopCapture();
    };
  }, [code, user]);

  /* ── Clock tick + auto mode switch ── */
  useEffect(() => {
    if (!room) return;
    const tick = window.setInterval(() => {
      const now = Date.now();
      const remaining = computeRemainingMs(tomato, now);
      setRemainingMs(remaining);
      if (tomato?.status === "running" && remaining === 0 && !switchInFlightRef.current) {
        switchInFlightRef.current = true;
        const nextMode = tomato.mode === "focus" ? "break" : "focus";
        void startRoomTomato({
          roomId: room.id,
          mode: nextMode,
          focusMinutes: tomato.focus_minutes,
          breakMinutes: tomato.break_minutes,
        }).then(() => getRoomTomato(room.id)).then((t) => setTomato(t)).finally(() => {
          switchInFlightRef.current = false;
        });
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [room, tomato]);

  /* ── Poll tomato state (12s) ── */
  useEffect(() => {
    if (!room) return;
    const roomId = room.id;
    let cancelled = false;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void getRoomTomato(roomId).then((t) => {
        if (!cancelled) setTomato(t);
      }).catch(() => {});
    }, 12000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [room]);

  /* ── Poll messages (4s) ── */
  useEffect(() => {
    if (!room) return;
    const roomId = room.id;
    let cancelled = false;
    let running = false;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (running) return;
      running = true;
      const after = lastMessageId;
      void (after
        ? listRoomMessagesAfter({ roomId, afterId: after })
        : Promise.resolve([] as RoomMessageRow[])
      )
        .then((more) => {
          if (cancelled) return;
          if (more.length) {
            setMessages((prev) => [...prev, ...more]);
            if (stickToBottomRef.current) {
              requestAnimationFrame(() => {
                const el = chatRef.current;
                if (!el) return;
                el.scrollTop = el.scrollHeight;
              });
            }
          }
        })
        .catch(() => {})
        .finally(() => { running = false; });
    }, 4000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [lastMessageId, room]);

  /* ── Poll WebRTC signals (3s) ── */
  useEffect(() => {
    if (!room) return;
    const roomId = room.id;
    let cancelled = false;
    const token = localStorage.getItem("timii_token") || "";
    const id = window.setInterval(() => {
      void fetch(
        `/api/rooms/${roomId}/signal?since=${encodeURIComponent(lastSignalTime.current)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
        .then((r) => r.json())
        .then((data) => {
          if (cancelled || !data.signals) return;
          for (const s of data.signals) {
            void handleSignal(s.from, s.type, s.payload);
          }
          if (data.serverTime) lastSignalTime.current = data.serverTime;
        })
        .catch(() => {});
    }, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [room, handleSignal]);

  /* ── Actions ── */
  async function onLeave() {
    stopCapture();
    disconnect();
    if (room) {
      try { await leaveRoom(room.id); } catch {}
    }
    router.replace("/discover");
  }

  async function onToggleMic() {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  }

  async function onToggleCamera() {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  }

  async function onToggleTomato() {
    if (!room || !tomato) return;
    if (tomato.status === "running") {
      await stopRoomTomato(room.id);
    } else {
      await startRoomTomato({
        roomId: room.id,
        mode: "focus",
        focusMinutes: tomato.focus_minutes,
        breakMinutes: tomato.break_minutes,
      });
    }
    const t = await getRoomTomato(room.id);
    setTomato(t);
  }

  async function onSend() {
    if (!room) return;
    const text = messageInput.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendRoomMessage({ roomId: room.id, content: text });
      setMessages((prev) => [...prev, msg]);
      setMessageInput("");
      requestAnimationFrame(() => {
        const el = chatRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  /* ── Derived ── */
  const tomatoMode = tomato?.mode ?? "focus";
  const tomatoLabel = tomatoMode === "focus" ? "专注" : "休息";
  const isRunning = tomato?.status === "running";
  const pct = progressPercent(tomato, remainingMs);
  const totalMinutes =
    tomatoMode === "focus" ? (tomato?.focus_minutes ?? 25) : (tomato?.break_minutes ?? 5);
  const totalLabel = `${tomatoLabel}目标 ${String(totalMinutes).padStart(2, "0")}:00`;

  /* ── Video tiles ── */
  const peerArray = Array.from(peers.values());
  const maxTiles = 4;
  const tilesToShow = [
    {
      id: "me", isMe: true, name: user?.nickname || "我", stream: localStream, micOn,
      gradient: MEMBER_GRADIENTS[0], isActive: true,
    },
    ...peerArray.slice(0, maxTiles - 1).map((p, i) => ({
      id: p.userId,
      isMe: false,
      name: `用户${p.userId.slice(0, 4)}`,
      stream: p.stream,
      micOn: p.connectionState === "connected",
      gradient: MEMBER_GRADIENTS[(i + 1) % MEMBER_GRADIENTS.length],
      isActive: false,
    })),
  ];
  while (tilesToShow.length < maxTiles) {
    const i = tilesToShow.length;
    tilesToShow.push({
      id: `placeholder-${i}`,
      isMe: false,
      name: "等待中…",
      stream: null,
      micOn: false,
      gradient: MEMBER_GRADIENTS[i % MEMBER_GRADIENTS.length],
      isActive: false,
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top Bar ── */}
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-px flex-1 text-center min-w-0">
          <h2 className="font-title text-lg font-bold truncate">
            {room?.name || "房间"}
          </h2>
          <span className="text-xs text-muted-foreground">
            {peerArray.length + 1} 人连线中
          </span>
        </div>
        <button className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground shrink-0">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-28">
        {error && <div className="text-xs text-destructive">{error}</div>}
        {syncing && (
          <div className="text-xs text-muted-foreground text-center">加载中…</div>
        )}

        {/* ── Tomato Timer ── */}
        <div className="bg-card rounded-[14px] border border-border p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {isRunning ? "进行中" : tomatoLabel}
            </span>
            <span className="font-title text-[28px] font-bold text-primary">
              {formatClock(remainingMs)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #4A90E2, #63B3ED)",
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{totalLabel}</span>
            <button
              onClick={onToggleTomato}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              {isRunning ? (
                <Square className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Play className="h-3.5 w-3.5 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* ── Video Grid 2×2 ── */}
        <div className="grid grid-cols-2 gap-3">
          {tilesToShow.map((tile) => (
            <VideoTile key={tile.id} {...tile} />
          ))}
        </div>

        {/* ── Chat Messages ── */}
        <div
          ref={chatRef}
          className="flex flex-col gap-1 min-h-[60px] max-h-[200px] overflow-y-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottomRef.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 24;
          }}
        >
          {messages.map((m) => (
            <div key={m.id} className="flex gap-1 text-sm leading-relaxed animate-slide-up-fade">
              <span className="text-primary font-semibold shrink-0">
                {m.nickname ?? "匿名"}:
              </span>
              <span className="text-muted-foreground break-words">{m.content}</span>
            </div>
          ))}
        </div>

        {/* ── Chat input (mobile expandable) ── */}
        {chatOpen && (
          <div className="flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border shadow-[var(--shadow-nav)] animate-fade-scale-in">
            <input
              placeholder="发条消息…"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSend();
              }}
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground h-10"
              autoFocus
            />
            <button
              onClick={onSend}
              disabled={sending || !messageInput.trim()}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Control Capsule Bar ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-64px)] max-w-[326px] flex items-center justify-around bg-card rounded-full px-2 py-2 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] border border-border z-50">
        <button
          onClick={onToggleMic}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            micOn ? "bg-accent text-primary" : "bg-red-500/10 text-red-500"
          }`}
          title="麦克风"
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>
        <button
          onClick={onToggleCamera}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            cameraOn ? "bg-accent text-primary" : "bg-red-500/10 text-red-500"
          }`}
          title="摄像头"
        >
          {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
        <button
          onClick={onLeave}
          className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"
          title="离开"
        >
          <LogOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            chatOpen ? "bg-accent text-primary" : "bg-secondary text-muted-foreground"
          }`}
          title="聊天"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          className="w-11 h-11 rounded-full bg-secondary text-muted-foreground flex items-center justify-center"
          title="分享"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
