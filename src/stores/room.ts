"use client";

import { create } from "zustand";

interface RoomState {
  isConnecting: boolean;
  currentRoomId: string | null;
  tomatoRunning: boolean;
  tomatoMinutes: number;
  tomatoSeconds: number;
  tomatoMode: "focus" | "break";
  tomatoFocusMinutes: number;
  tomatoBreakMinutes: number;
  setConnecting: (v: boolean) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  startTomato: (focusMin: number, breakMin: number) => void;
  stopTomato: () => void;
  tickTomato: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  isConnecting: false,
  currentRoomId: null,
  tomatoRunning: false,
  tomatoMinutes: 25,
  tomatoSeconds: 0,
  tomatoMode: "focus",
  tomatoFocusMinutes: 25,
  tomatoBreakMinutes: 5,

  setConnecting: (v) => set({ isConnecting: v }),

  joinRoom: (roomId) => set({ currentRoomId: roomId, isConnecting: true }),

  leaveRoom: () =>
    set({
      currentRoomId: null,
      isConnecting: false,
      tomatoRunning: false,
    }),

  startTomato: (focusMin, breakMin) =>
    set({
      tomatoRunning: true,
      tomatoMinutes: focusMin,
      tomatoSeconds: 0,
      tomatoMode: "focus",
      tomatoFocusMinutes: focusMin,
      tomatoBreakMinutes: breakMin,
    }),

  stopTomato: () =>
    set({ tomatoRunning: false, tomatoMinutes: 25, tomatoSeconds: 0, tomatoMode: "focus" }),

  tickTomato: () =>
    set((state) => {
      if (!state.tomatoRunning) return state;
      if (state.tomatoSeconds > 0) {
        return { tomatoSeconds: state.tomatoSeconds - 1 };
      }
      if (state.tomatoMinutes > 0) {
        return { tomatoMinutes: state.tomatoMinutes - 1, tomatoSeconds: 59 };
      }
      // switch mode
      if (state.tomatoMode === "focus") {
        return { tomatoMode: "break", tomatoMinutes: state.tomatoBreakMinutes, tomatoSeconds: 0 };
      }
      return { tomatoRunning: false, tomatoMode: "focus", tomatoMinutes: state.tomatoFocusMinutes, tomatoSeconds: 0 };
    }),
}));
