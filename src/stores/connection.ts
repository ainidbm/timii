"use client";

import { create } from "zustand";

/* ── Persistent connection state shape ── */
export interface ConnectionState {
  /** Currently connected room code */
  roomCode: string | null;
  /** Connection start timestamp (ISO) */
  connectedAt: string | null;
  /** Is the connection marked as active */
  isActive: boolean;
}

const STORAGE_KEY = "timii_connection";

function loadPersisted(): ConnectionState {
  if (typeof window === "undefined") return { roomCode: null, connectedAt: null, isActive: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { roomCode: null, connectedAt: null, isActive: false };
    const parsed = JSON.parse(raw) as ConnectionState;
    // Only restore if connectedAt is within last 24h
    if (parsed.connectedAt && Date.now() - new Date(parsed.connectedAt).getTime() < 86400000) {
      return parsed;
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return { roomCode: null, connectedAt: null, isActive: false };
}

function persist(state: ConnectionState) {
  if (typeof window === "undefined") return;
  if (state.isActive) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface ConnectionStore {
  /** Current persisted connection state */
  connection: ConnectionState;
  /** Start a new connection */
  connect: (roomCode: string) => void;
  /** End the connection cleanly */
  disconnect: () => void;
  /** Clear persisted state (user dismissed reconnect prompt) */
  dismiss: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connection: loadPersisted(),

  connect: (roomCode: string) => {
    const state: ConnectionState = {
      roomCode,
      connectedAt: new Date().toISOString(),
      isActive: true,
    };
    persist(state);
    set({ connection: state });
  },

  disconnect: () => {
    // Record the session to the API before clearing
    const { connection } = get();
    if (connection.roomCode && connection.connectedAt) {
      // Fire-and-forget: record the connection duration to the server
      const durationMs = Date.now() - new Date(connection.connectedAt).getTime();
      const token = localStorage.getItem("timii_token");
      if (token) {
        navigator.sendBeacon?.(
          "/api/connection/end",
          JSON.stringify({
            roomCode: connection.roomCode,
            connectedAt: connection.connectedAt,
            endedAt: new Date().toISOString(),
            durationMs,
          })
        );
      }
    }
    const empty: ConnectionState = { roomCode: null, connectedAt: null, isActive: false };
    persist(empty);
    set({ connection: empty });
  },

  dismiss: () => {
    const empty: ConnectionState = { roomCode: null, connectedAt: null, isActive: false };
    persist(empty);
    set({ connection: empty });
  },
}));

/* ── beforeunload: auto-record on tab close ── */
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as ConnectionState;
      if (!state.isActive || !state.connectedAt || !state.roomCode) return;
      const durationMs = Date.now() - new Date(state.connectedAt).getTime();
      const token = localStorage.getItem("timii_token");
      if (token) {
        navigator.sendBeacon?.(
          "/api/connection/end",
          JSON.stringify({
            roomCode: state.roomCode,
            connectedAt: state.connectedAt,
            endedAt: new Date().toISOString(),
            durationMs,
          })
        );
      }
    } catch {}
  });

  // Re-persist on visibility change (tab hidden → active again)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Keep the state; don't clear
      }
    }
  });
}
