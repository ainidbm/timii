"use client";

import { create } from "zustand";

interface ThemeState {
  /** Current theme applied to <html> */
  theme: "dark" | "light";
  /** Apply a specific theme (called by ShellLayout when entering dark pages) */
  setTheme: (t: "dark" | "light") => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }),
}));
