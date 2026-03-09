import * as THREE from "three";

const lobbyPanel = document.getElementById("lobbyPanel");
const nameInput = document.getElementById("nameInput");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeInput = document.getElementById("roomCodeInput");
const lobbyError = document.getElementById("lobbyError");
const openRoomsList = document.getElementById("openRoomsList");
const openRoomsCount = document.getElementById("openRoomsCount");

const hud = document.getElementById("hud");
const scoreboardEl = document.getElementById("scoreboard");
const phaseEl = document.getElementById("phase");
const timerEl = document.getElementById("timer");
const logEl = document.getElementById("log");
const roomCodeBadge = document.getElementById("roomCodeBadge");
const startGameBtn = document.getElementById("startGameBtn");
const restartGameBtn = document.getElementById("restartGameBtn");
const shootBtn = document.getElementById("shootBtn");
const holdBtn = document.getElementById("holdBtn");
const statusPill = document.getElementById("statusPill");
const lockBtn = document.getElementById("lockBtn");
const crosshair = document.getElementById("crosshair");
const bottomHud = document.getElementById("bottomHud");
const bottomHpText = document.getElementById("bottomHpText");
const bottomAmmoText = document.getElementById("bottomAmmoText");
const bottomHpFill = document.getElementById("bottomHpFill");
const configuredServerUrl = window.__GAME_SERVER_URL__ || "";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d1833, 18, 42);

const camera = new THREE.PerspectiveCamera(
  64,
  window.innerWidth / window.innerHeight,
  0.1,
  120
);
camera.rotation.order = "YXZ";
scene.add(camera);

const seatLayout = [
  { x: 0, z: -5.6 },
  { x: 5.6, z: 0 },
  { x: 0, z: 5.6 },
  { x: -5.6, z: 0 }
];

const seatColors = [0xff6b6b, 0x5eead4, 0xfbbf24, 0xa78bfa];

scene.add(new THREE.HemisphereLight(0xd9f3ff, 0x1c2445, 1.25));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(8, 16, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x62d7ff, 28, 32, 2);
rimLight.position.set(0, 8, -10);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(22, 72),
  new THREE.MeshStandardMaterial({
    color: 0x1d2f5d,
    roughness: 0.95,
    metalness: 0.03
  })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const glowRing = new THREE.Mesh(
  new THREE.RingGeometry(4.6, 10.5, 72),
  new THREE.MeshBasicMaterial({
    color: 0x2fd4ff,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide
  })
);
glowRing.rotation.x = -Math.PI / 2;
glowRing.position.y = 0.03;
scene.add(glowRing);

const table = new THREE.Group();
const tableTop = new THREE.Mesh(
  new THREE.CylinderGeometry(2.8, 2.9, 0.34, 64),
  new THREE.MeshStandardMaterial({
    color: 0xffcf70,
    roughness: 0.72,
    metalness: 0.06
  })
);
tableTop.position.y = 1.05;
tableTop.castShadow = true;
tableTop.receiveShadow = true;
table.add(tableTop);

const tableBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.62, 0.9, 1.7, 32),
  new THREE.MeshStandardMaterial({
    color: 0x7c4d2c,
    roughness: 0.82,
    metalness: 0.04
  })
);
tableBase.position.y = 0.38;
tableBase.castShadow = true;
tableBase.receiveShadow = true;
table.add(tableBase);
scene.add(table);

function addChair(seatPos) {
  const chair = new THREE.Group();

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.22, 1.55),
    new THREE.MeshStandardMaterial({ color: 0x25345a, roughness: 0.74, metalness: 0.08 })
  );
  seat.position.y = 0.62;
  chair.add(seat);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 1.45, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x30446f, roughness: 0.7, metalness: 0.08 })
  );
  back.position.set(0, 1.28, -0.68);
  chair.add(back);

  chair.position.set(seatPos.x, 0, seatPos.z);
  chair.lookAt(0, 0.9, 0);
  chair.traverse((obj) => {
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
  scene.add(chair);
}

seatLayout.forEach(addChair);

function addAtmosphere() {
  const pillarGeo = new THREE.CylinderGeometry(0.45, 0.45, 5.6, 20);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1f2746,
    roughness: 0.88,
    metalness: 0.05
  });
  [
    [-12, -12],
    [12, -12],
    [12, 12],
    [-12, 12]
  ].forEach(([x, z]) => {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 2.8, z);
    pillar.castShadow = true;
    scene.add(pillar);
  });
}

addAtmosphere();

function makeTextSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.15, 0.78, 1);
  sprite.userData = { canvas, ctx, tex };
  updateTextSprite(sprite, text, "#eef8ff");
  return sprite;
}

function updateTextSprite(sprite, text, color) {
  const { canvas, ctx, tex } = sprite.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(9, 18, 38, 0.84)";
  ctx.fillRect(18, 26, 284, 76);
  ctx.strokeStyle = "rgba(112, 203, 255, 0.75)";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 26, 284, 76);
  ctx.fillStyle = color;
  ctx.font = "bold 30px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 160, 64);
  tex.needsUpdate = true;
}

function createRevolverModel(scale = 1, tone = 0xc9d1de) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: tone,
    roughness: 0.28,
    metalness: 0.94,
    emissive: 0x101826
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1d2433,
    roughness: 0.42,
    metalness: 0.84
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x442818,
    roughness: 0.8,
    metalness: 0.08
  });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.22), metal);
  frame.castShadow = true;
  group.add(frame);

  const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.16), metal);
  topStrap.position.set(0.12, 0.16, 0);
  topStrap.castShadow = true;
  group.add(topStrap);

  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 20), metal);
  cylinder.rotation.z = Math.PI / 2;
  cylinder.position.set(-0.03, 0.03, 0);
  cylinder.castShadow = true;
  group.add(cylinder);

  for (let i = 0; i < 6; i += 1) {
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10), darkMetal);
    const angle = (Math.PI * 2 * i) / 6;
    chamber.rotation.z = Math.PI / 2;
    chamber.position.set(
      -0.03,
      0.03 + Math.cos(angle) * 0.08,
      Math.sin(angle) * 0.08
    );
    chamber.castShadow = true;
    group.add(chamber);
  }

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.74, 18), metal);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.52, 0.08, 0);
  barrel.castShadow = true;
  group.add(barrel);

  const barrelSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.66, 14), darkMetal);
  barrelSleeve.rotation.z = Math.PI / 2;
  barrelSleeve.position.set(0.56, 0.08, 0);
  barrelSleeve.castShadow = true;
  group.add(barrelSleeve);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.04), darkMetal);
  frontSight.position.set(0.89, 0.16, 0);
  frontSight.castShadow = true;
  group.add(frontSight);

  const gripBack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.18), metal);
  gripBack.position.set(-0.21, -0.33, 0);
  gripBack.rotation.z = -0.42;
  gripBack.castShadow = true;
  group.add(gripBack);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.64, 0.16), gripMat);
  grip.position.set(-0.22, -0.39, 0);
  grip.rotation.z = -0.42;
  grip.castShadow = true;
  group.add(grip);

  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), darkMetal);
  hammer.position.set(-0.25, 0.18, 0);
  hammer.rotation.z = 0.22;
  hammer.castShadow = true;
  group.add(hammer);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 22, Math.PI * 1.2), darkMetal);
  triggerGuard.rotation.y = Math.PI / 2;
  triggerGuard.rotation.z = 0.35;
  triggerGuard.position.set(-0.08, -0.1, 0);
  triggerGuard.castShadow = true;
  group.add(triggerGuard);

  const trigger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), darkMetal);
  trigger.rotation.z = 0.45;
  trigger.position.set(-0.06, -0.08, 0);
  trigger.castShadow = true;
  group.add(trigger);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0.95, 0.08, 0);
  group.add(muzzleAnchor);

  group.scale.setScalar(scale);
  group.userData = { muzzleAnchor };
  return group;
}

function createFirstPersonRig() {
  const root = new THREE.Group();
  root.position.set(0.34, -0.62, -0.72);
  root.rotation.set(-0.12, 0.08, 0.12);
  root.scale.setScalar(0.88);
  root.visible = false;

  const armPivot = new THREE.Group();
  root.add(armPivot);

  const sleeve = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 0.62, 8, 12),
    new THREE.MeshStandardMaterial({
      color: 0x365c9b,
      roughness: 0.56,
      metalness: 0.08
    })
  );
  sleeve.rotation.z = Math.PI / 2;
  sleeve.position.set(-0.12, -0.05, 0.05);
  armPivot.add(sleeve);

  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 14, 14),
    new THREE.MeshStandardMaterial({
      color: 0xffddb9,
      roughness: 0.82,
      metalness: 0.02
    })
  );
  hand.scale.set(1.25, 0.9, 0.9);
  hand.position.set(0.22, -0.03, 0.03);
  armPivot.add(hand);

  const revolver = createRevolverModel(0.78, 0xd5dbe6);
  revolver.position.set(0.34, 0.01, 0.03);
  revolver.rotation.set(0.03, -0.01, -0.02);
  armPivot.add(revolver);

  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffd66b,
      transparent: true,
      opacity: 0.92
    })
  );
  muzzleFlash.position.copy(revolver.userData.muzzleAnchor.position);
  muzzleFlash.scale.set(1.8, 0.8, 0.8);
  muzzleFlash.visible = false;
  revolver.add(muzzleFlash);

  camera.add(root);
  return {
    root,
    armPivot,
    revolver,
    muzzleFlash,
    muzzleUntil: 0
  };
}

const firstPersonRig = createFirstPersonRig();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const tempWorldTarget = new THREE.Vector3();
const tempLocalTarget = new THREE.Vector3();
const tempFrom = new THREE.Vector3();

function getHorizontalAimDirection() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
  return dir.normalize();
}

function getLocalShotOrigin() {
  return firstPersonRig.revolver.userData.muzzleAnchor.getWorldPosition(new THREE.Vector3());
}

function getLocalShotTarget(from) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z).addScaledVector(dir, 40);
}

function makePlayerModel(seat) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: seatColors[seat],
    roughness: 0.4,
    metalness: 0.08,
    emissive: new THREE.Color(seatColors[seat]).multiplyScalar(0.16)
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.35, 10, 18), bodyMat);
  torso.position.y = 1.55;
  torso.castShadow = true;
  group.add(torso);

  const shoulderLine = 0.72;
  const armMaterial = new THREE.MeshStandardMaterial({
    color: seatColors[seat],
    roughness: 0.38,
    metalness: 0.06,
    emissive: new THREE.Color(seatColors[seat]).multiplyScalar(0.12)
  });

  const lowArmPivot = new THREE.Group();
  lowArmPivot.position.set(-shoulderLine, 1.85, 0.12);
  const lowArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 8, 12), armMaterial);
  lowArm.rotation.z = Math.PI / 2;
  lowArm.position.x = -0.5;
  lowArm.rotation.y = -0.25;
  lowArm.castShadow = true;
  lowArmPivot.rotation.z = 0.9;
  lowArmPivot.add(lowArm);
  group.add(lowArmPivot);

  const aimArmPivot = new THREE.Group();
  aimArmPivot.rotation.order = "YZX";
  aimArmPivot.position.set(shoulderLine * 0.92, 2.12, 0.18);
  const aimArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.18, 8, 12), armMaterial);
  aimArm.rotation.z = Math.PI / 2;
  aimArm.position.x = 0.62;
  aimArm.castShadow = true;
  aimArmPivot.add(aimArm);

  const revolver = createRevolverModel(0.74);
  revolver.position.set(1.18, 0.02, 0);
  aimArmPivot.add(revolver);

  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffe27a,
      transparent: true,
      opacity: 0.95
    })
  );
  muzzleFlash.position.copy(revolver.userData.muzzleAnchor.position);
  muzzleFlash.scale.set(1.4, 0.7, 0.7);
  muzzleFlash.visible = false;
  revolver.add(muzzleFlash);
  group.add(aimArmPivot);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xfff0d2,
      roughness: 0.72,
      metalness: 0.02
    })
  );
  head.position.y = 2.72;
  head.castShadow = true;
  group.add(head);

  const hat = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.08, 12, 28),
    new THREE.MeshBasicMaterial({ color: seatColors[seat] })
  );
  hat.rotation.x = Math.PI / 2;
  hat.position.y = 3.18;
  group.add(hat);

  const label = makeTextSprite("Oyuncu");
  label.position.set(0, 4.12, 0);
  group.add(label);

  const hpBarGroup = new THREE.Group();
  hpBarGroup.position.set(0, 3.7, 0);
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.92 })
  );
  hpBarGroup.add(hpBarBg);
  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.76, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x57e39d })
  );
  hpBarFill.position.z = 0.01;
  hpBarGroup.add(hpBarFill);
  group.add(hpBarGroup);

  const revolverGroup = new THREE.Group();
  revolverGroup.position.set(0, 5.05, 0);
  const revolverSlots = [];
  const ringRadius = 0.72;
  for (let i = 0; i < 6; i += 1) {
    const slot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.14, 14),
      new THREE.MeshStandardMaterial({
        color: 0x344765,
        emissive: 0x111827,
        roughness: 0.46,
        metalness: 0.82
      })
    );
    const angle = (Math.PI * 2 * i) / 6;
    slot.position.set(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0);
    slot.rotation.z = Math.PI / 2;
    revolverGroup.add(slot);
    revolverSlots.push(slot);
  }
  const centerHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xd2d9e5,
      roughness: 0.38,
      metalness: 0.9
    })
  );
  centerHub.rotation.z = Math.PI / 2;
  revolverGroup.add(centerHub);
  group.add(revolverGroup);

  scene.add(group);
  return {
    group,
    label,
    torso,
    hpBarFill,
    revolverGroup,
    revolverSlots,
    lowArmPivot,
    aimArmPivot,
    armMaterial,
    revolver,
    muzzleFlash,
    muzzleUntil: 0
  };
}

const playerModels = new Map();
const shotTrails = new THREE.Group();
scene.add(shotTrails);
const processedShotIds = new Map();

const aimPreview = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  new THREE.LineDashedMaterial({
    color: 0x5eead4,
    dashSize: 0.32,
    gapSize: 0.18,
    transparent: true,
    opacity: 0.92
  })
);
aimPreview.visible = false;
scene.add(aimPreview);

function getPlayerModel(seat) {
  if (!playerModels.has(seat)) playerModels.set(seat, makePlayerModel(seat));
  return playerModels.get(seat);
}

let room = null;
let meSeat = null;
let mePlayerId = null;
let availableRooms = [];
let myAction = "shoot";
let lobbyPollTimer = null;
let roomPollTimer = null;
let pointerLocked = false;
let yawOffset = 0;
let pitchOffset = 0;
let baseYaw = 0;
let basePitch = -0.22;
let lastAimSent = 0;
const apiBase = configuredServerUrl.replace(/\/$/, "");

const pitchMin = -0.5;
const pitchMax = 0.18;
const sensitivity = 0.0022;
let audioUnlocked = false;
const audioAssets = {
  music: new Audio("./audio/sfx_A_sea_20260310_005407.mp3"),
  spin: new Audio("./audio/sfx_A_sho_20260310_005349.mp3"),
  click: new Audio("./audio/sfx_A_dry_20260310_005351.mp3"),
  shot: new Audio("./audio/sfx_A_pow_20260310_005353.mp3"),
  hit: new Audio("./audio/sfx_A_sha_20260310_005355.mp3")
};

audioAssets.music.loop = true;
audioAssets.music.volume = 0.22;
audioAssets.spin.volume = 0.5;
audioAssets.click.volume = 0.55;
audioAssets.shot.volume = 0.45;
audioAssets.hit.volume = 0.5;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioAssets.music.play().catch(() => {
    audioUnlocked = false;
  });
}

function playSound(name) {
  const base = audioAssets[name];
  if (!base) return;
  const clone = base.cloneNode();
  clone.volume = base.volume;
  clone.play().catch(() => {});
}

async function apiRequest(url, options = {}) {
  const response = await fetch(`${apiBase}${url}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || "Sunucu istegi basarisiz.");
  }
  return payload;
}

function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem("fps-duel-session") || "null");
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem("fps-duel-session", JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem("fps-duel-session");
}

function applyJoinedState(joined) {
  meSeat = joined.seat;
  mePlayerId = joined.playerId;
  saveSession({
    code: joined.code,
    seat: joined.seat,
    playerId: joined.playerId
  });
  lobbyPanel.classList.add("hidden");
  hud.classList.remove("hidden");
  scoreboardEl.classList.remove("hidden");
  lockBtn.classList.remove("hidden");
  crosshair.classList.remove("hidden");
  roomCodeBadge.textContent = `ODA: ${joined.code}`;
  statusPill.textContent = `Odaya girdin (${joined.code})`;
}

async function fetchLobby() {
  const payload = await apiRequest("/api/lobby");
  renderOpenRooms(payload.rooms || []);
}

async function fetchRoomState() {
  if (!room?.code || !mePlayerId) return;
  const query = new URLSearchParams({
    code: room.code,
    playerId: mePlayerId
  });
  const payload = await apiRequest(`/api/room/state?${query.toString()}`);
  room = payload.room;
  applyRoom(payload.room);
}

async function createRoom() {
  const payload = await apiRequest("/api/room/create", {
    method: "POST",
    body: JSON.stringify({ name: nameInput.value })
  });
  applyJoinedState(payload.joined);
  room = payload.room;
  applyRoom(payload.room);
}

async function joinRoom(code) {
  const payload = await apiRequest("/api/room/join", {
    method: "POST",
    body: JSON.stringify({ name: nameInput.value, code })
  });
  applyJoinedState(payload.joined);
  room = payload.room;
  applyRoom(payload.room);
}

async function sendAction(data) {
  if (!room?.code || !mePlayerId) return;
  const payload = await apiRequest("/api/room/action", {
    method: "POST",
    body: JSON.stringify({
      code: room.code,
      playerId: mePlayerId,
      ...data
    })
  });
  room = payload.room;
}

function setAction(action) {
  myAction = action;
  shootBtn.classList.toggle("selected", action === "shoot");
  holdBtn.classList.toggle("selected", action === "hold");
  if (action === "hold") {
    sendAction({ action: "hold" }).catch((error) => {
      statusPill.textContent = error.message;
    });
  }
}

setAction("shoot");

function renderOpenRooms(rooms) {
  availableRooms = rooms;
  openRoomsCount.textContent = String(rooms.length);
  if (!rooms.length) {
    openRoomsList.innerHTML = '<div class="room-list-empty">Su an katilabilecegin acik oda yok. Yeni oda olusturabilirsin.</div>';
    return;
  }

  openRoomsList.innerHTML = rooms
    .map((entry) => {
      const phase = entry.phase || "waiting_host";
      const canJoin =
        typeof entry.canJoin === "boolean"
          ? entry.canJoin
          : phase === "waiting_host" && Number(entry.openSeats || 0) > 0;
      const statusLabel =
        entry.statusLabel ||
        (phase === "waiting_host"
          ? "Beklemede"
          : phase === "planning"
            ? "Planlama"
            : phase === "resolve"
              ? "Cozumleniyor"
              : phase === "game_over"
                ? "Oyun Bitti"
                : "Beklemede");
      return `<div class="room-list-card">
        <div class="room-list-meta">
          <div class="room-list-title">
            <span class="room-list-code">${entry.code}</span>
            <span>${entry.hostName}</span>
          </div>
          <div class="room-list-sub">${entry.humans}/${entry.totalSeats} oyuncu | Bos koltuk: ${entry.openSeats} | Durum: ${statusLabel}</div>
        </div>
        <button class="room-join-btn" data-room-code="${entry.code}" ${canJoin ? "" : "disabled"}>${canJoin ? "Katil" : "Dolu / Basladi"}</button>
      </div>`;
    })
    .join("");
}

function startLobbyPolling() {
  if (lobbyPollTimer) clearInterval(lobbyPollTimer);
  lobbyPollTimer = setInterval(() => {
    if (lobbyPanel.classList.contains("hidden")) return;
    fetchLobby().catch((error) => {
      statusPill.textContent = error.message;
    });
  }, 1000);
}

function startRoomPolling() {
  if (roomPollTimer) clearInterval(roomPollTimer);
  roomPollTimer = setInterval(() => {
    if (!room?.code || !mePlayerId) return;
    fetchRoomState().catch((error) => {
      statusPill.textContent = "Baglanti koptu. Yeniden deneniyor...";
      if (/bulunamadi|kapandi/i.test(error.message)) {
        clearSession();
        meSeat = null;
        mePlayerId = null;
        room = null;
        lobbyPanel.classList.remove("hidden");
        hud.classList.add("hidden");
        scoreboardEl.classList.add("hidden");
        lockBtn.classList.add("hidden");
        crosshair.classList.add("hidden");
        bottomHud.classList.add("hidden");
      }
    });
  }, 350);
}

createRoomBtn.addEventListener("click", () => {
  lobbyError.textContent = "";
  createRoom().catch((error) => {
    lobbyError.textContent = error.message;
  });
});

joinRoomBtn.addEventListener("click", () => {
  lobbyError.textContent = "";
  joinRoom(roomCodeInput.value).catch((error) => {
    lobbyError.textContent = error.message;
  });
});

openRoomsList.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-room-code]");
  if (!btn) return;
  if (btn.disabled) return;
  const code = btn.dataset.roomCode;
  roomCodeInput.value = code;
  lobbyError.textContent = "";
  joinRoom(code).catch((error) => {
    lobbyError.textContent = error.message;
  });
});

startGameBtn.addEventListener("click", () => {
  apiRequest("/api/room/start", {
    method: "POST",
    body: JSON.stringify({ code: room?.code, playerId: mePlayerId })
  })
    .then((payload) => {
      room = payload.room;
      applyRoom(payload.room);
    })
    .catch((error) => {
      statusPill.textContent = error.message;
    });
});

restartGameBtn.addEventListener("click", () => {
  apiRequest("/api/room/restart-vote", {
    method: "POST",
    body: JSON.stringify({ code: room?.code, playerId: mePlayerId })
  })
    .then((payload) => {
      room = payload.room;
      applyRoom(payload.room);
    })
    .catch((error) => {
      statusPill.textContent = error.message;
    });
});

shootBtn.addEventListener("click", () => {
  if (!room || room.phase !== "planning") return;
  setAction("shoot");
  sendCurrentAim().catch(() => {});
});

holdBtn.addEventListener("click", () => {
  setAction("hold");
});

lockBtn.addEventListener("click", () => {
  unlockAudio();
  renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
  lockBtn.textContent = pointerLocked ? "FPS aktif" : "FPS Baslat (Mouse Kilitle)";
  lockBtn.disabled = pointerLocked;
});

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked) return;
  yawOffset -= event.movementX * sensitivity;
  pitchOffset -= event.movementY * sensitivity;
  pitchOffset = Math.max(pitchMin, Math.min(pitchMax, pitchOffset));
});

window.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  unlockAudio();
  if (!pointerLocked || !room || room.phase !== "planning") return;
  setAction("shoot");
  sendCurrentAim().catch(() => {});
});

async function bootstrapConnection() {
  statusPill.textContent = "Sunucuya baglandi";
  const saved = getSavedSession();
  if (saved?.code && saved?.playerId) {
    meSeat = saved.seat ?? null;
    mePlayerId = saved.playerId;
    room = { code: saved.code };
    try {
      await fetchRoomState();
      lobbyPanel.classList.add("hidden");
      hud.classList.remove("hidden");
      scoreboardEl.classList.remove("hidden");
      lockBtn.classList.remove("hidden");
      crosshair.classList.remove("hidden");
      roomCodeBadge.textContent = `ODA: ${saved.code}`;
      statusPill.textContent = `Odaya girdin (${saved.code})`;
    } catch {
      clearSession();
      meSeat = null;
      mePlayerId = null;
      room = null;
    }
  }
  try {
    await fetchLobby();
  } catch (error) {
    statusPill.textContent = error.message;
  }
  startLobbyPolling();
  startRoomPolling();
}

bootstrapConnection();

function clearTrails() {
  while (shotTrails.children.length) {
    const child = shotTrails.children.pop();
    child.geometry?.dispose();
    child.material?.dispose();
  }
}

function drawTrails(players) {
  clearTrails();
  players.forEach((player) => {
    if (!player.lastShot) return;
    const model = getPlayerModel(player.seat);
    const from =
      player.seat === meSeat
        ? getLocalShotOrigin()
        : model.revolver.userData.muzzleAnchor.getWorldPosition(new THREE.Vector3());
    const to =
      player.seat === meSeat
        ? getLocalShotTarget(from)
        : new THREE.Vector3(player.lastShot.to.x, from.y, player.lastShot.to.z);
    const geom = new THREE.BufferGeometry().setFromPoints([
      from,
      to
    ]);
    const material = new THREE.LineDashedMaterial({
      color: seatColors[player.seat],
      dashSize: 0.42,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.92
    });
    const line = new THREE.Line(geom, material);
    line.computeLineDistances();
    shotTrails.add(line);
  });
}

function seatForwardVector(seat) {
  const p = seatLayout[seat];
  return new THREE.Vector3(-p.x, 0, -p.z).normalize();
}

function applyCamera() {
  if (meSeat === null) return;

  const seat = seatLayout[meSeat];
  const forward = seatForwardVector(meSeat);
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const camPos = new THREE.Vector3(seat.x, 2.7, seat.z)
    .addScaledVector(forward, -2.6)
    .addScaledVector(right, 0.1);

  camera.position.copy(camPos);

  const target = new THREE.Vector3(0, 1.85, 0);
  const dx = target.x - camPos.x;
  const dy = target.y - camPos.y;
  const dz = target.z - camPos.z;
  const horizontal = Math.hypot(dx, dz) || 1;

  baseYaw = Math.atan2(dx, dz);
  baseYaw += Math.PI;
  basePitch = Math.atan2(dy, horizontal);

  camera.rotation.y = baseYaw + yawOffset;
  camera.rotation.x = basePitch + pitchOffset;
  camera.rotation.z = 0;
}

async function sendCurrentAim() {
  const dir = getHorizontalAimDirection();
  await sendAction({
    action: "shoot",
    aimDir: { x: dir.x, z: dir.z },
    pitch: basePitch + pitchOffset
  });
}

function updateAimPreview() {
  if (!room || room.phase !== "planning" || myAction !== "shoot" || meSeat === null) {
    aimPreview.visible = false;
    return;
  }

  const from = getLocalShotOrigin();
  const to = getLocalShotTarget(from);
  aimPreview.material.color.setHex(meSeat !== null ? seatColors[meSeat] : 0x5eead4);
  aimPreview.geometry.setFromPoints([from, to]);
  aimPreview.computeLineDistances();
  aimPreview.visible = true;
}

function getBodyColor(player) {
  if (player.hp <= 0) return 0x6a7183;
  if (player.recentlyHit || player.hp < 3) {
    if (player.hp <= 1) return 0xff3b3b;
    return 0xff735a;
  }
  return seatColors[player.seat];
}

function updateHealthBar(model, hp) {
  const ratio = Math.max(0, Math.min(1, hp / 3));
  model.hpBarFill.scale.x = ratio;
  model.hpBarFill.position.x = -(1.76 * (1 - ratio)) / 2;
  model.hpBarFill.material.color.setHex(
    ratio > 0.66 ? 0x57e39d : ratio > 0.33 ? 0xffb347 : 0xff4d4d
  );
}

function updateRevolver(model, player) {
  model.revolverGroup.rotation.z = -(Math.PI * 2 * (player.chamberIndex || 0)) / 6;
  model.revolverSlots.forEach((slot, index) => {
    const loaded = player.cylinder?.[index] === true;
    const active = index === player.chamberIndex;
    slot.material.color.setHex(active ? 0xf8fbff : loaded ? 0xf4d35e : 0x344765);
    slot.material.emissive.setHex(active ? 0x67e8f9 : loaded ? 0x8a5d00 : 0x111827);
  });
}

function updateArms(model, player) {
  const aimDir = player.aimDir || { x: 0, z: 1 };
  tempWorldTarget.set(
    player.pos.x + aimDir.x * 8,
    model.aimArmPivot.getWorldPosition(new THREE.Vector3()).y,
    player.pos.z + aimDir.z * 8
  );
  tempLocalTarget.copy(tempWorldTarget);
  model.group.worldToLocal(tempLocalTarget);
  tempLocalTarget.sub(model.aimArmPivot.position).normalize();

  const localYaw = Math.atan2(tempLocalTarget.z, tempLocalTarget.x);
  const flatLength = Math.hypot(tempLocalTarget.x, tempLocalTarget.z) || 1;
  const localPitch = Math.atan2(tempLocalTarget.y, flatLength) + (player.pitch || 0);

  model.aimArmPivot.rotation.set(0, localYaw, localPitch);
  model.lowArmPivot.rotation.y = -0.2;
  model.lowArmPivot.rotation.z = 0.9;
}

function processPlayerAudio(player) {
  const trigger = player.lastTrigger;
  if (!trigger?.shotId) return;
  if (processedShotIds.get(player.seat) === trigger.shotId) return;
  processedShotIds.set(player.seat, trigger.shotId);

  const model = getPlayerModel(player.seat);
  if (trigger.fired) {
    model.muzzleUntil = performance.now() + 90;
    if (player.seat === meSeat) {
      firstPersonRig.muzzleUntil = performance.now() + 90;
    }
  }

  playSound("spin");
  if (trigger.fired) {
    setTimeout(() => playSound("shot"), 40);
    if (trigger.hitSeat !== null) setTimeout(() => playSound("hit"), 95);
  } else {
    setTimeout(() => playSound("click"), 40);
  }
}

function applyRoom(snapshot) {
  const timeLeft =
    snapshot.phase === "waiting_host" || !snapshot.phaseEndsAt
      ? "Beklemede"
      : `${Math.max(0, (snapshot.phaseEndsAt - Date.now()) / 1000).toFixed(1)}s`;

  timerEl.textContent = timeLeft;
  phaseEl.textContent = `Round ${snapshot.round} - ${snapshot.phase}`;
  logEl.textContent = snapshot.log || "-";

  const isHost = snapshot.hostSeat === meSeat;
  startGameBtn.classList.toggle("hidden", !isHost || snapshot.phase !== "waiting_host");
  restartGameBtn.classList.toggle("hidden", snapshot.phase !== "game_over");
  shootBtn.disabled = snapshot.phase !== "planning";
  holdBtn.disabled = snapshot.phase !== "planning";

  snapshot.players.forEach((player) => {
    const model = getPlayerModel(player.seat);
    const mine = player.seat === meSeat;
    model.group.visible = !mine;
    model.group.position.set(player.pos.x, 0, player.pos.z);
    model.group.lookAt(0, 1.4, 0);
    const bodyColor = getBodyColor(player);
    model.torso.material.color.setHex(bodyColor);
    model.torso.material.emissive.setHex(bodyColor);
    model.torso.material.emissive.multiplyScalar(player.hp > 0 ? 0.16 : 0.08);
    updateTextSprite(model.label, player.name, player.hp > 0 ? "#eef8ff" : "#c2cad6");
    updateHealthBar(model, player.hp);
    updateRevolver(model, player);
    updateArms(model, player);
    processPlayerAudio(player);
  });

  firstPersonRig.root.visible = meSeat !== null;
  const me = snapshot.players.find((player) => player.seat === meSeat);
  if (me) {
    bottomHud.classList.remove("hidden");
    bottomHpText.textContent = `CAN ${me.hp}/3`;
    bottomAmmoText.textContent = `MERMI ${me.ammo}/6`;
    const ratio = Math.max(0, Math.min(1, me.hp / 3));
    bottomHpFill.style.transform = `scaleX(${ratio})`;
    bottomHpFill.style.filter =
      me.hp > 1 ? "saturate(1)" : "saturate(1.2) brightness(1.1)";
  } else {
    bottomHud.classList.add("hidden");
  }
  drawTrails(snapshot.players);

  scoreboardEl.innerHTML = snapshot.players
    .map((player) => {
      const isMe = player.seat === meSeat ? "you" : "";
      const host = player.seat === snapshot.hostSeat ? " (SAHIP)" : "";
      const state = player.hp > 0 ? "AKTIF" : "ELENDI";
      const restartMark = snapshot.restartVotes?.[player.seat] ? " | Restart: EVET" : "";
      return `<div class="player-card ${isMe}">
        <div class="player-head"><span>${player.name}${player.isBot ? " (BOT)" : ""}${host}</span><span>${state}</span></div>
        <div>Can: ${player.hp} | Mermi: ${player.ammo} | Round Win: ${player.roundsWon}${restartMark}</div>
      </div>`;
    })
    .join("");
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  clock.getDelta();

  applyCamera();
  updateAimPreview();

  if (room && room.phase === "planning" && myAction === "shoot") {
    const now = performance.now();
    if (now - lastAimSent > 100) {
      lastAimSent = now;
      sendCurrentAim().catch(() => {});
    }
  }

  shotTrails.children.forEach((line, index) => {
    line.material.opacity = 0.55 + Math.sin(performance.now() * 0.008 + index) * 0.25;
  });

  const fpActive = performance.now() < firstPersonRig.muzzleUntil;
  firstPersonRig.muzzleFlash.visible = fpActive;
  if (fpActive) {
    const pulse = 1 + Math.sin(performance.now() * 0.05) * 0.25;
    firstPersonRig.muzzleFlash.scale.set(2.1 * pulse, 0.9 * pulse, 0.9 * pulse);
    firstPersonRig.armPivot.rotation.z = -0.08;
  } else {
    firstPersonRig.armPivot.rotation.z += (0 - firstPersonRig.armPivot.rotation.z) * 0.18;
  }

  playerModels.forEach((model) => {
    const active = performance.now() < model.muzzleUntil;
    model.muzzleFlash.visible = active;
    if (active) {
      const pulse = 0.9 + Math.sin(performance.now() * 0.04) * 0.35;
      model.muzzleFlash.scale.set(1.6 * pulse, 0.8 * pulse, 0.8 * pulse);
    }
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
