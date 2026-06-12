"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";

export function AuthInit() {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  return null;
}
