const hasKvConfig = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let kv = null;
if (hasKvConfig) {
  try {
    ({ kv } = require("@vercel/kv"));
  } catch {
    kv = null;
  }
}

const memoryRooms = new Map();
const memoryIndex = new Set();
const ROOMS_INDEX_KEY = "rooms:index";

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

async function listRoomCodes() {
  if (!kv) return Array.from(memoryIndex.values());
  const values = await kv.smembers(ROOMS_INDEX_KEY);
  return Array.isArray(values) ? values : [];
}

async function getRoom(code) {
  if (!kv) return clone(memoryRooms.get(code)) || null;
  return (await kv.get(`room:${code}`)) || null;
}

async function saveRoom(room) {
  if (!room?.code) throw new Error("Room code missing");
  if (!kv) {
    memoryRooms.set(room.code, clone(room));
    memoryIndex.add(room.code);
    return room;
  }
  await kv.set(`room:${room.code}`, room);
  await kv.sadd(ROOMS_INDEX_KEY, room.code);
  return room;
}

async function deleteRoom(code) {
  if (!kv) {
    memoryRooms.delete(code);
    memoryIndex.delete(code);
    return;
  }
  await kv.del(`room:${code}`);
  await kv.srem(ROOMS_INDEX_KEY, code);
}

module.exports = {
  hasKv: Boolean(kv),
  listRoomCodes,
  getRoom,
  saveRoom,
  deleteRoom
};
