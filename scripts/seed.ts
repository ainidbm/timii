/**
 * Seed script — populates the SQLite database with test data.
 * Run: npx tsx scripts/seed.ts
 * Use --force to truncate and re-seed.
 */

import { getDb, generateRoomCode, closeDb } from "../src/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const force = process.argv.includes("--force");
const db = getDb();

// Check if already seeded
const existingCount = (db.prepare("SELECT COUNT(*) as cnt FROM profiles").get() as { cnt: number }).cnt;
if (existingCount > 0 && !force) {
  console.log(`Database already has ${existingCount} users. Use --force to re-seed.`);
  closeDb();
  process.exit(0);
}

if (force && existingCount > 0) {
  console.log("Truncating existing data...");
  db.exec(`
    DELETE FROM room_messages;
    DELETE FROM room_tomato;
    DELETE FROM room_members;
    DELETE FROM rooms;
    DELETE FROM communities;
    DELETE FROM friend_relations;
    DELETE FROM sessions;
    DELETE FROM profiles;
  `);
}

console.log("Seeding database...");

// ─── Create users ───
const passwordHash = bcrypt.hashSync("test1234", 10);

const users = [
  { id: crypto.randomUUID(), email: "alice@timii.dev", nickname: "小明", avatar_url: "" },
  { id: crypto.randomUUID(), email: "bob@timii.dev", nickname: "小红", avatar_url: "" },
  { id: crypto.randomUUID(), email: "carol@timii.dev", nickname: "阿杰", avatar_url: "" },
  { id: crypto.randomUUID(), email: "dave@timii.dev", nickname: "莉莉", avatar_url: "" },
];

const insertUser = db.prepare(
  "INSERT INTO profiles (id, email, password, nickname, avatar_url) VALUES (?, ?, ?, ?, ?)"
);

for (const u of users) {
  insertUser.run(u.id, u.email, passwordHash, u.nickname, u.avatar_url);
}
console.log(`  ✓ ${users.length} users created`);

// ─── Create friend relations ───
const insertFriend = db.prepare(
  "INSERT OR IGNORE INTO friend_relations (id, user_id, friend_id, is_friend, is_following) VALUES (?, ?, ?, ?, ?)"
);

// Alice is friends with everyone, following everyone
for (let i = 1; i < users.length; i++) {
  insertFriend.run(crypto.randomUUID(), users[0].id, users[i].id, 1, 1);
  insertFriend.run(crypto.randomUUID(), users[i].id, users[0].id, 1, 1);
}
// Bob and Carol are mutual followers
insertFriend.run(crypto.randomUUID(), users[1].id, users[2].id, 1, 1);
insertFriend.run(crypto.randomUUID(), users[2].id, users[1].id, 1, 1);
// Dave follows Alice
insertFriend.run(crypto.randomUUID(), users[3].id, users[0].id, 0, 1);
console.log("  ✓ Friend relations created");

// ─── Create rooms ───
const roomData = [
  { name: "深夜刷题中", code: "A7X9K2", createdBy: users[0].id },
  { name: "前端学习小组", code: "B3M8N1", createdBy: users[1].id },
  { name: "英语口语练习", code: "C5P2Q4", createdBy: users[2].id },
  { name: "考公行测刷题", code: "D9R7S3", createdBy: users[3].id },
];

const insertRoom = db.prepare(
  "INSERT INTO rooms (id, code, name, created_by) VALUES (?, ?, ?, ?)"
);
const insertMember = db.prepare(
  "INSERT INTO room_members (id, room_id, user_id) VALUES (?, ?, ?)"
);
const insertTomato = db.prepare(
  "INSERT OR IGNORE INTO room_tomato (room_id, status, mode, focus_minutes, break_minutes) VALUES (?, 'stopped', 'focus', 25, 5)"
);

const roomIds: string[] = [];

for (const r of roomData) {
  const id = crypto.randomUUID();
  roomIds.push(id);
  db.transaction(() => {
    insertRoom.run(id, r.code, r.name, r.createdBy);
    insertMember.run(crypto.randomUUID(), id, r.createdBy);
    insertTomato.run(id);
  })();
}
console.log(`  ✓ ${roomData.length} rooms created`);

// Add additional members to rooms
// All users join room A7X9K2 (Alice's room)
for (let i = 1; i < users.length; i++) {
  insertMember.run(crypto.randomUUID(), roomIds[0], users[i].id);
}
// Bob and Alice join Carol's room
insertMember.run(crypto.randomUUID(), roomIds[2], users[0].id);
insertMember.run(crypto.randomUUID(), roomIds[2], users[1].id);
console.log("  ✓ Room members added");

// ─── Create communities ───
const insertCommunity = db.prepare(
  "INSERT INTO communities (id, name, owner_id, member_count, active_count) VALUES (?, ?, ?, ?, ?)"
);
insertCommunity.run(crypto.randomUUID(), "考研自习室", users[0].id, 1286, 89);
insertCommunity.run(crypto.randomUUID(), "编程打卡群", users[1].id, 642, 34);
console.log("  ✓ 2 communities created");

// ─── Create messages ───
const messageData = [
  { roomId: roomIds[0], userId: users[1].id, content: "加油加油！今天目标刷完第三章" },
  { roomId: roomIds[0], userId: users[2].id, content: "我刚刚开始，一起坚持✊" },
  { roomId: roomIds[0], userId: users[3].id, content: "高数好难啊，求大佬带" },
  { roomId: roomIds[0], userId: users[0].id, content: "有问题可以直接开麦问，互相帮助~" },
  { roomId: roomIds[0], userId: users[1].id, content: "好的！第二章那个极限题有人会吗" },
  { roomId: roomIds[0], userId: users[0].id, content: "我看看...你把题目发出来" },
  { roomId: roomIds[0], userId: users[1].id, content: "lim x→0 (sin x)/x 的证明" },
  { roomId: roomIds[0], userId: users[2].id, content: "这个用夹逼定理就可以了" },
  { roomId: roomIds[0], userId: users[0].id, content: "没错，几何法也很直观" },
  { roomId: roomIds[0], userId: users[3].id, content: "有谁在做英语阅读吗" },
  { roomId: roomIds[0], userId: users[2].id, content: "我在刷考研英语真题" },
  { roomId: roomIds[0], userId: users[0].id, content: "今天先休息了，明天继续！大家加油💪" },
  { roomId: roomIds[0], userId: users[1].id, content: "晚安！明天见~" },
  { roomId: roomIds[1], userId: users[1].id, content: "有人一起学React吗" },
  { roomId: roomIds[1], userId: users[0].id, content: "我在学Next.js，可以一起" },
  { roomId: roomIds[2], userId: users[2].id, content: "Let's practice English speaking!" },
  { roomId: roomIds[2], userId: users[0].id, content: "Hello! What topic today?" },
  { roomId: roomIds[3], userId: users[3].id, content: "行测资料分析好难啊" },
  { roomId: roomIds[3], userId: users[0].id, content: "多做真题就好了，稳住" },
];

const insertMessage = db.prepare(
  "INSERT INTO room_messages (room_id, user_id, content, created_at) VALUES (?, ?, ?, ?)"
);

const baseTime = Date.now() - 7200000; // 2 hours ago
for (let i = 0; i < messageData.length; i++) {
  const m = messageData[i];
  const msgTime = new Date(baseTime + i * 180000).toISOString(); // 3 min apart
  insertMessage.run(m.roomId, m.userId, m.content, msgTime);
}
console.log(`  ✓ ${messageData.length} messages created`);

closeDb();
console.log("\n✅ Seed complete! Database ready.");
console.log("\nTest accounts (password: test1234):");
for (const u of users) {
  console.log(`  ${u.email} — ${u.nickname}`);
}
