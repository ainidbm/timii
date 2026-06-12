export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string;
  created_at: string;
  room_id?: string;
  bio?: string;
  level?: number;
  certification?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: "personal" | "community";
  owner_id: string;
  room_id?: string;
  cover_url: string;
  tags: string[];
  member_count: number;
  active_count: number;
  requires_approval: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  room_id: string;
  channel_id: string;
  name: string;
  type: "video" | "voice";
  has_password: boolean;
  is_active: boolean;
  max_members: number;
  archived: boolean;
  created_at: string;
}

export interface FriendRelation {
  id: string;
  user_id: string;
  friend_id: string;
  is_friend: boolean;
  is_following: boolean;
  is_blocked: boolean;
}

export interface TomatoSession {
  id: string;
  user_id: string;
  room_id: string;
  focus_minutes: number;
  break_minutes: number;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
}

export interface ConnectionRecord {
  id: string;
  user_id: string;
  room_id: string;
  room_name: string;
  duration_minutes: number;
  date: string;
}

export interface Diary {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  visibility: "public" | "friends" | "private";
  allow_stranger_comment: boolean;
  created_at: string;
}

export interface UserStatus {
  user_id: string;
  is_online: boolean;
  is_in_room: boolean;
  current_room_id: string | null;
}
