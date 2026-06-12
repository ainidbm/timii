"use client";

import { apiFetch } from "@/lib/api-client";

export type RoomRow = {
  id: string;
  code: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type RoomTomatoRow = {
  room_id: string;
  status: "running" | "paused" | "stopped";
  mode: "focus" | "break";
  focus_minutes: number;
  break_minutes: number;
  anchor_started_at: string | null;
  updated_at: string;
};

export type RoomMessageRow = {
  id: number;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  nickname?: string;
  avatar_url?: string;
};

function normalizeRoomMessage(row: Record<string, unknown>): RoomMessageRow {
  return {
    id: row.id as number,
    room_id: row.room_id as string,
    user_id: row.user_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    nickname: (row.nickname as string) ?? "匿名",
    avatar_url: (row.avatar_url as string) ?? "",
  };
}

export async function createRoom(name: string) {
  return apiFetch<RoomRow>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function joinRoom(code: string) {
  return apiFetch<RoomRow>("/api/rooms/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function leaveRoom(roomId: string) {
  return apiFetch<{ ok: boolean }>(`/api/rooms/${roomId}/leave`, {
    method: "POST",
  });
}

export async function getRoomTomato(roomId: string) {
  return apiFetch<RoomTomatoRow>(`/api/rooms/${roomId}/tomato`);
}

export async function startRoomTomato(params: {
  roomId: string;
  mode: "focus" | "break";
  focusMinutes: number;
  breakMinutes: number;
}) {
  return apiFetch<RoomTomatoRow>(`/api/rooms/${params.roomId}/tomato`, {
    method: "POST",
    body: JSON.stringify({
      action: "start",
      mode: params.mode,
      focusMinutes: params.focusMinutes,
      breakMinutes: params.breakMinutes,
    }),
  });
}

export async function stopRoomTomato(roomId: string) {
  return apiFetch<RoomTomatoRow>(`/api/rooms/${roomId}/tomato`, {
    method: "POST",
    body: JSON.stringify({ action: "stop" }),
  });
}

export async function listRoomMessages(params: { roomId: string; limit: number }) {
  const data = await apiFetch<Record<string, unknown>[]>(
    `/api/rooms/${params.roomId}/messages?limit=${params.limit}`
  );
  // API returns messages in DESC order for initial load; reverse to chronological
  return data.map(normalizeRoomMessage).reverse();
}

export async function listRoomMessagesAfter(params: { roomId: string; afterId: number }) {
  const data = await apiFetch<Record<string, unknown>[]>(
    `/api/rooms/${params.roomId}/messages?after=${params.afterId}`
  );
  return data.map(normalizeRoomMessage);
}

export async function sendRoomMessage(params: { roomId: string; content: string }) {
  const data = await apiFetch<Record<string, unknown>>(
    `/api/rooms/${params.roomId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content: params.content }),
    }
  );
  return normalizeRoomMessage(data);
}
