const { listRoomCodes, getRoom, saveRoom, deleteRoom } = require("./store");

const SEAT_COUNT = 4;
const START_HP = 3;
const START_AMMO = 1;
const MAX_AMMO = 6;
const PLAYER_RADIUS = 2.1;
const PLANNING_SECONDS = 5;
const RESOLVE_SECONDS = 2;
const PRESENCE_TIMEOUT_MS = 15000;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createSeatPosition(seat) {
  const starts = [
    { x: 0, z: -5.6 },
    { x: 5.6, z: 0 },
    { x: 0, z: 5.6 },
    { x: -5.6, z: 0 }
  ];
  return { ...starts[seat] };
}

function makeCylinder(bulletCount) {
  const cylinder = Array(MAX_AMMO).fill(false);
  const slots = Array.from({ length: MAX_AMMO }, (_, i) => i);
  for (let i = 0; i < bulletCount; i += 1) {
    const randomIndex = Math.floor(Math.random() * slots.length);
    const slot = slots.splice(randomIndex, 1)[0];
    cylinder[slot] = true;
  }
  return cylinder;
}

function recountAmmo(player) {
  player.ammo = player.cylinder.filter(Boolean).length;
}

function addBulletToCylinder(player) {
  const empty = player.cylinder.map((loaded, index) => ({ loaded, index })).filter((slot) => !slot.loaded);
  if (!empty.length) return false;
  const slot = empty[Math.floor(Math.random() * empty.length)].index;
  player.cylinder[slot] = true;
  recountAmmo(player);
  return true;
}

function normalize(v) {
  const len = Math.hypot(v.x, v.z) || 1;
  return { x: v.x / len, z: v.z / len };
}

function dot(a, b) {
  return a.x * b.x + a.z * b.z;
}

function vector(a, b) {
  return { x: b.x - a.x, z: b.z - a.z };
}

function distancePointToRay(point, origin, dir) {
  const op = vector(origin, point);
  const proj = dot(op, dir);
  if (proj < 0) return { distance: Infinity, t: proj };
  const cx = origin.x + dir.x * proj;
  const cz = origin.z + dir.z * proj;
  return { distance: Math.hypot(point.x - cx, point.z - cz), t: proj };
}

function makePlayer(seat, bot = true) {
  return {
    seat,
    id: null,
    clientId: null,
    name: bot ? `BOT ${seat + 1}` : `Oyuncu ${seat + 1}`,
    isBot: bot,
    connected: false,
    lastSeenAt: 0,
    hp: START_HP,
    ammo: START_AMMO,
    cylinder: makeCylinder(START_AMMO),
    chamberIndex: Math.floor(Math.random() * MAX_AMMO),
    roundsWon: 0,
    pos: createSeatPosition(seat),
    yaw: 0,
    pitch: 0,
    action: "hold",
    aimDir: { x: 0, z: 1 },
    lastShot: null,
    lastTrigger: null,
    recentlyHit: false,
    botWander: createSeatPosition(seat)
  };
}

function createRoom(code) {
  return {
    code,
    hostSeat: null,
    shotSerial: 0,
    restartVotes: Array(SEAT_COUNT).fill(false),
    round: 1,
    phase: "waiting_host",
    phaseEndsAt: 0,
    log: "Oda sahibi oyunu baslatmayi bekliyor.",
    winnerSeat: null,
    players: Array.from({ length: SEAT_COUNT }, (_, i) => makePlayer(i, true))
  };
}

function publicPlayer(p) {
  return {
    seat: p.seat,
    id: p.id,
    name: p.name,
    isBot: p.isBot,
    connected: p.connected,
    hp: p.hp,
    ammo: p.ammo,
    cylinder: p.cylinder,
    chamberIndex: p.chamberIndex,
    roundsWon: p.roundsWon,
    pos: p.pos,
    yaw: p.yaw,
    pitch: p.pitch,
    aimDir: p.aimDir,
    action: p.action,
    lastShot: p.lastShot,
    lastTrigger: p.lastTrigger,
    recentlyHit: p.recentlyHit
  };
}

function snapshot(room) {
  return {
    code: room.code,
    hostSeat: room.hostSeat,
    restartVotes: room.restartVotes,
    round: room.round,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    log: room.log,
    winnerSeat: room.winnerSeat,
    players: room.players.map(publicPlayer)
  };
}

function nextHumanName(room) {
  const count = room.players.filter((p) => !p.isBot).length + 1;
  return `Oyuncu ${count}`;
}

function seatForJoin(room) {
  return room.players.find((p) => p.isBot || !p.connected) || null;
}

function alivePlayers(room) {
  return room.players.filter((p) => p.hp > 0);
}

function sanitizeName(value, fallback) {
  const safe = String(value || "").trim().slice(0, 18).replace(/[^\p{L}\p{N}\s_-]/gu, "");
  return safe || fallback;
}

function setupRound(room, keepScore = true) {
  room.restartVotes = Array(SEAT_COUNT).fill(false);
  room.players.forEach((p) => {
    p.hp = START_HP;
    p.ammo = START_AMMO;
    p.cylinder = makeCylinder(START_AMMO);
    p.chamberIndex = Math.floor(Math.random() * MAX_AMMO);
    p.pos = createSeatPosition(p.seat);
    p.yaw = 0;
    p.pitch = 0;
    p.action = "hold";
    p.aimDir = { x: 0, z: 1 };
    p.lastShot = null;
    p.lastTrigger = null;
    p.recentlyHit = false;
    p.botWander = createSeatPosition(p.seat);
    if (!keepScore) p.roundsWon = 0;
    if (p.isBot) p.name = `BOT ${p.seat + 1}`;
  });
  room.phase = "planning";
  room.phaseEndsAt = Date.now() + PLANNING_SECONDS * 1000;
  room.winnerSeat = null;
  room.log = `Round ${room.round}: 5 sn icinde ates/bekle sec.`;
}

function pickBotBehavior(room, bot) {
  if (bot.hp <= 0) {
    bot.action = "hold";
    return;
  }
  const enemies = room.players.filter((p) => p.seat !== bot.seat && p.hp > 0);
  if (!enemies.length) {
    bot.action = "hold";
    return;
  }
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  const dir = normalize(vector(bot.pos, target.pos));
  bot.aimDir = dir;
  bot.yaw = Math.atan2(dir.x, dir.z);
  bot.pitch = -0.08 + Math.random() * 0.16;
  bot.action = bot.ammo <= 0 || Math.random() < 0.28 ? "hold" : "shoot";
}

function resolveShots(room) {
  const impacts = [];
  const shooters = room.players.filter((p) => p.hp > 0 && p.action === "shoot").map((p) => ({
    seat: p.seat,
    pos: { ...p.pos },
    aimDir: normalize(p.aimDir)
  }));

  shooters.forEach((shot) => {
    const shooter = room.players[shot.seat];
    if (shooter.ammo <= 0) {
      shooter.action = "hold";
      addBulletToCylinder(shooter);
      return;
    }

    const spinSteps = 1 + Math.floor(Math.random() * MAX_AMMO);
    shooter.chamberIndex = (shooter.chamberIndex + spinSteps) % MAX_AMMO;
    const chamberFired = shooter.cylinder[shooter.chamberIndex] === true;
    shooter.lastShot = {
      from: { ...shot.pos },
      to: { x: shot.pos.x + shot.aimDir.x * 40, z: shot.pos.z + shot.aimDir.z * 40 }
    };
    shooter.lastTrigger = {
      shotId: ++room.shotSerial,
      chamberIndex: shooter.chamberIndex,
      fired: chamberFired,
      hitSeat: null
    };

    if (!chamberFired) return;
    shooter.cylinder[shooter.chamberIndex] = false;
    recountAmmo(shooter);

    const candidates = room.players.filter((p) => p.seat !== shot.seat && p.hp > 0).map((enemy) => {
      const hit = distancePointToRay(enemy.pos, shot.pos, shot.aimDir);
      return { seat: enemy.seat, distance: hit.distance, t: hit.t };
    }).filter((h) => h.t > 0 && h.distance <= PLAYER_RADIUS).sort((a, b) => a.t - b.t);

    if (candidates.length) {
      impacts.push({ from: shot.seat, to: candidates[0].seat });
      shooter.lastTrigger.hitSeat = candidates[0].seat;
    }
  });

  room.players.forEach((p) => {
    p.recentlyHit = false;
  });

  impacts.forEach((h) => {
    const victim = room.players[h.to];
    if (victim.hp > 0) {
      victim.hp -= 1;
      victim.recentlyHit = true;
    }
  });

  room.players.forEach((p) => {
    if (p.hp > 0 && p.action === "hold") addBulletToCylinder(p);
  });

  if (impacts.length) {
    room.log = impacts.map((h) => `${room.players[h.from].name} -> ${room.players[h.to].name}`).join(" | ");
  } else if (shooters.some((s) => room.players[s.seat].lastTrigger?.fired)) {
    room.log = "Atilan kursunlar kimseye gelmedi.";
  } else {
    room.log = "Klik. Bos hazne.";
  }
}

function maybeEndRound(room) {
  const alive = alivePlayers(room);
  if (alive.length > 1) return false;
  room.phase = "game_over";
  room.phaseEndsAt = 0;
  room.winnerSeat = alive.length ? alive[0].seat : null;
  if (room.winnerSeat !== null) {
    room.players[room.winnerSeat].roundsWon += 1;
    room.log = `${room.players[room.winnerSeat].name} oyunu kazandi. Restart oylarini bekliyor.`;
  } else {
    room.log = "Herkes dustu. Restart oylarini bekliyor.";
  }
  room.restartVotes = room.players.map((p) => !!p.isBot);
  if (room.restartVotes.every(Boolean)) {
    room.round += 1;
    setupRound(room, true);
  }
  return true;
}

function sweepInactivePlayers(room, now = Date.now()) {
  room.players.forEach((player) => {
    if (player.isBot) return;
    const stale = now - (player.lastSeenAt || 0) > PRESENCE_TIMEOUT_MS;
    if (!stale) {
      player.connected = true;
      return;
    }
    player.isBot = true;
    player.connected = false;
    player.id = null;
    player.clientId = null;
    player.name = `BOT ${player.seat + 1}`;
    player.action = "hold";
    player.lastShot = null;
    player.lastTrigger = null;
    player.pitch = 0;
    player.aimDir = { x: 0, z: 1 };
  });

  if (room.hostSeat === null || !room.players[room.hostSeat] || room.players[room.hostSeat].isBot) {
    const nextHost = room.players.find((p) => !p.isBot && p.connected);
    room.hostSeat = nextHost ? nextHost.seat : null;
    if (room.phase === "waiting_host") {
      room.log = room.hostSeat === null ? "Oyuncu bekleniyor." : "Yeni oda sahibi oyunu baslatabilir.";
    }
  }
}

function advanceRoom(room, now = Date.now()) {
  sweepInactivePlayers(room, now);
  if (room.phase === "waiting_host") return;

  if (room.phase === "planning") {
    room.players.forEach((p) => {
      if (p.isBot) pickBotBehavior(room, p);
      if (p.hp <= 0) p.action = "hold";
    });
  }

  let guard = 0;
  while (room.phase !== "waiting_host" && room.phaseEndsAt && now >= room.phaseEndsAt && guard < 6) {
    guard += 1;
    if (room.phase === "planning") {
      room.phase = "resolve";
      room.phaseEndsAt = now + RESOLVE_SECONDS * 1000;
      resolveShots(room);
      maybeEndRound(room);
      continue;
    }
    if (room.phase === "resolve") {
      if (!maybeEndRound(room)) {
        room.phase = "planning";
        room.phaseEndsAt = now + PLANNING_SECONDS * 1000;
        room.log = "Yeni el basladi";
        room.players.forEach((p) => {
          p.action = "hold";
          p.lastShot = null;
          p.lastTrigger = null;
          p.recentlyHit = false;
        });
      }
      continue;
    }
    if (room.phase === "game_over") {
      if (room.restartVotes.every(Boolean)) {
        room.round += 1;
        setupRound(room, true);
        continue;
      }
      break;
    }
  }
}

function roomHasHumans(room) {
  return room.players.some((p) => !p.isBot);
}

function heartbeatPlayer(room, playerId, now = Date.now()) {
  const player = room.players.find((p) => p.id === playerId && !p.isBot);
  if (!player) return null;
  player.lastSeenAt = now;
  player.connected = true;
  return player;
}

function buildLobbyEntry(room) {
  const humans = room.players.filter((p) => !p.isBot).length;
  const openSeats = room.players.filter((p) => p.isBot || !p.connected).length;
  const host = room.hostSeat === null ? null : room.players[room.hostSeat];
  const canJoin = room.phase === "waiting_host" && openSeats > 0;
  const statusLabel = room.phase === "waiting_host"
    ? "Beklemede"
    : room.phase === "planning"
      ? "Planlama"
      : room.phase === "resolve"
        ? "Cozumleniyor"
        : room.phase === "game_over"
          ? "Oyun Bitti"
          : "Beklemede";
  return {
    code: room.code,
    humans,
    openSeats,
    totalSeats: SEAT_COUNT,
    hostName: host?.name || "Oda Sahibi Bekleniyor",
    phase: room.phase,
    canJoin,
    statusLabel
  };
}

async function listOpenRooms() {
  const now = Date.now();
  const codes = await listRoomCodes();
  const rooms = [];
  for (const code of codes) {
    const room = await getRoom(code);
    if (!room) {
      await deleteRoom(code);
      continue;
    }
    advanceRoom(room, now);
    if (!roomHasHumans(room)) {
      await deleteRoom(code);
      continue;
    }
    await saveRoom(room);
    rooms.push(buildLobbyEntry(room));
  }
  return rooms.sort((a, b) => a.code.localeCompare(b.code));
}

function joinRoomInMemory(room, { name }) {
  const seat = seatForJoin(room);
  if (!seat) {
    const error = new Error("Oda dolu.");
    error.statusCode = 400;
    throw error;
  }
  const now = Date.now();
  seat.id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  seat.clientId = `${Math.random().toString(36).slice(2, 10)}`;
  seat.isBot = false;
  seat.connected = true;
  seat.lastSeenAt = now;
  seat.name = sanitizeName(name, nextHumanName(room));
  seat.action = "hold";
  seat.lastShot = null;
  seat.lastTrigger = null;
  seat.pos = createSeatPosition(seat.seat);
  if (room.hostSeat === null) room.hostSeat = seat.seat;
  return {
    code: room.code,
    seat: seat.seat,
    hostSeat: room.hostSeat,
    playerId: seat.id,
    name: seat.name
  };
}

async function createRoomAndJoin({ name }) {
  let code = makeCode();
  while (await getRoom(code)) code = makeCode();
  const room = createRoom(code);
  const joined = joinRoomInMemory(room, { name });
  await saveRoom(room);
  return { joined, room: snapshot(room) };
}

async function joinRoom({ code, name }) {
  const room = await getRoom(String(code || "").trim().toUpperCase());
  if (!room) {
    const error = new Error("Oda kodu bulunamadi.");
    error.statusCode = 404;
    throw error;
  }
  advanceRoom(room);
  if (room.phase !== "waiting_host") {
    const error = new Error("Bu oda baslamis. Yeni oda olustur.");
    error.statusCode = 400;
    throw error;
  }
  const joined = joinRoomInMemory(room, { name });
  await saveRoom(room);
  return { joined, room: snapshot(room) };
}

async function getRoomState({ code, playerId }) {
  const room = await getRoom(String(code || "").trim().toUpperCase());
  if (!room) {
    const error = new Error("Oda bulunamadi.");
    error.statusCode = 404;
    throw error;
  }
  const now = Date.now();
  if (playerId) heartbeatPlayer(room, playerId, now);
  advanceRoom(room, now);
  if (!roomHasHumans(room)) {
    await deleteRoom(room.code);
    const error = new Error("Oda kapandi.");
    error.statusCode = 404;
    throw error;
  }
  await saveRoom(room);
  return snapshot(room);
}

async function startRoom({ code, playerId }) {
  const room = await getRoom(String(code || "").trim().toUpperCase());
  if (!room) {
    const error = new Error("Oda bulunamadi.");
    error.statusCode = 404;
    throw error;
  }
  const me = heartbeatPlayer(room, playerId);
  if (!me) {
    const error = new Error("Oyuncu bulunamadi.");
    error.statusCode = 403;
    throw error;
  }
  advanceRoom(room);
  if (me.seat !== room.hostSeat) {
    const error = new Error("Sadece oda sahibi baslatabilir.");
    error.statusCode = 403;
    throw error;
  }
  if (room.phase !== "waiting_host") {
    const error = new Error("Oyun zaten baslamis.");
    error.statusCode = 400;
    throw error;
  }
  room.round = 1;
  setupRound(room, false);
  await saveRoom(room);
  return snapshot(room);
}

async function restartVote({ code, playerId }) {
  const room = await getRoom(String(code || "").trim().toUpperCase());
  if (!room) {
    const error = new Error("Oda bulunamadi.");
    error.statusCode = 404;
    throw error;
  }
  const me = heartbeatPlayer(room, playerId);
  if (!me) {
    const error = new Error("Oyuncu bulunamadi.");
    error.statusCode = 403;
    throw error;
  }
  advanceRoom(room);
  if (room.phase !== "game_over") {
    const error = new Error("Restart oyu icin oyun bitmis olmali.");
    error.statusCode = 400;
    throw error;
  }
  room.restartVotes[me.seat] = true;
  room.log = `Restart oylari: ${room.restartVotes.filter(Boolean).length}/${SEAT_COUNT}`;
  if (room.restartVotes.every(Boolean)) {
    room.round += 1;
    setupRound(room, true);
  }
  await saveRoom(room);
  return snapshot(room);
}

async function setAction({ code, playerId, action, aimDir, pitch }) {
  const room = await getRoom(String(code || "").trim().toUpperCase());
  if (!room) {
    const error = new Error("Oda bulunamadi.");
    error.statusCode = 404;
    throw error;
  }
  const me = heartbeatPlayer(room, playerId);
  if (!me) {
    const error = new Error("Oyuncu bulunamadi.");
    error.statusCode = 403;
    throw error;
  }
  advanceRoom(room);
  if (room.phase !== "planning" || me.hp <= 0) {
    await saveRoom(room);
    return snapshot(room);
  }
  me.action = action === "shoot" ? "shoot" : "hold";
  if (aimDir) {
    const d = normalize({ x: Number(aimDir.x) || 0, z: Number(aimDir.z) || 1 });
    me.aimDir = d;
    me.yaw = Math.atan2(d.x, d.z);
  }
  if (typeof pitch === "number") {
    me.pitch = Math.max(-0.5, Math.min(0.18, Number(pitch) || 0));
  }
  await saveRoom(room);
  return snapshot(room);
}

async function health() {
  const codes = await listRoomCodes();
  return { ok: true, rooms: codes.length, now: Date.now() };
}

module.exports = {
  listOpenRooms,
  createRoomAndJoin,
  joinRoom,
  getRoomState,
  startRoom,
  restartVote,
  setAction,
  health,
  constants: {
    SEAT_COUNT,
    START_HP,
    START_AMMO,
    MAX_AMMO,
    PLANNING_SECONDS,
    RESOLVE_SECONDS,
    PRESENCE_TIMEOUT_MS
  }
};
