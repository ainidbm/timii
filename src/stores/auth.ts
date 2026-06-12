"use client";

import { create } from "zustand";
import { apiFetch, setToken, clearToken, hasToken, ApiError } from "@/lib/api-client";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

function handleUnauthorized() {
  clearToken();
  // This will be called when the event is dispatched
}

if (typeof window !== "undefined") {
  window.addEventListener("timii:unauthorized", () => {
    clearToken();
    // Force a re-render by updating the auth store
    // We need to access the store, but we can't import it here due to circular dependency
    // Instead, we'll reload the page to force a clean state
    window.location.reload();
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const data = await apiFetch<{ user: User; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    setToken(data.token);
    set({ user: data.user, loading: false });
  },

  register: async (email, password, nickname) => {
    const data = await apiFetch<{ user: User; token: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password, nickname }),
      }
    );
    setToken(data.token);
    set({ user: data.user, loading: false });
  },

  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors during logout
    }
    clearToken();
    set({ user: null, loading: false });
  },

  fetchUser: async () => {
    if (!hasToken()) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const data = await apiFetch<{ user: User }>("/api/auth/me");
      set({ user: data.user, loading: false });
    } catch (e) {
      clearToken();
      set({ user: null, loading: false });
    }
  },
}));
