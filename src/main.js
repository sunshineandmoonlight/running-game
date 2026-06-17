import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./styles.css";
import {
  COIN_RADIUS,
  DESPAWN_Z,
  GROUND_Y,
  HIGH_OBSTACLE_HEIGHT,
  LANES,
  LOW_OBSTACLE_HEIGHT,
  OBSTACLE_SIZE,
  PLAYER_RADIUS,
  PLAYER_Z,
  SPAWN_Z
} from "./game/constants.js";
import {
  collectCoin,
  createGameState,
  endGame,
  jump,
  moveLane,
  startGame,
  togglePause,
  updateJump,
  updateProgress
} from "./game/state.js";
import {
  canClearObstacle,
  hasPlatformUnderPlayer,
  intersectsAabb,
  makeBox,
  nearestLaneIndex,
  shouldCollideInTargetLane,
  shouldCheckCollisionData
} from "./game/collision.js";
import { addVisibilityMarker, hasRenderableMesh } from "./game/model.js";

const canvas = document.querySelector("#game-canvas");
const overlay = document.querySelector("#overlay");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const scoreNode = document.querySelector("#score");
const coinsNode = document.querySelector("#coins");
const bestNode = document.querySelector("#best");
const progressNode = document.querySelector("#progress");

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05070f, 28, 118);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 180);
camera.position.set(0, 6.8, 15.5);
camera.lookAt(0, 1.25, -18);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x05070f);

const clock = new THREE.Clock();
const storageKey = "three-runner-best-score";
const savedBest = Number.parseInt(window.localStorage.getItem(storageKey) || "0", 10);
const initialBest = Number.isFinite(savedBest) && savedBest >= 0 && savedBest <= 99999 ? savedBest : 0;
if (initialBest !== savedBest) {
  window.localStorage.setItem(storageKey, "0");
}
const state = createGameState(initialBest);

const activeObjects = [];
const platforms = [];
const scenery = [];
const particles = [];
const modelCache = new Map();
let modelsReady = false;
let spawnTimer = 0;
let coinTimer = 0;
let patternIndex = 0;
let worldOffset = 0;
let audioContext;
let lastHitTime = 0;
let cameraShake = 0;
const OBSTACLE_SPAWN_Z = SPAWN_Z - 18;
const FIRST_PATTERN_Z = -20;

const materials = {
  track: new THREE.MeshStandardMaterial({
    color: 0x071120,
    metalness: 0.35,
    roughness: 0.34
  }),
  lane: new THREE.MeshBasicMaterial({ color: 0x18e8ff }),
  player: new THREE.MeshStandardMaterial({
    color: 0x56f2ff,
    emissive: 0x116a8a,
    metalness: 0.25,
    roughness: 0.18
  }),
  coin: new THREE.MeshStandardMaterial({
    color: 0xffcf33,
    emissive: 0x9b6100,
    metalness: 0.72,
    roughness: 0.2
  }),
  obstacle: new THREE.MeshStandardMaterial({
    color: 0xff3566,
    emissive: 0x7a0d2b,
    metalness: 0.18,
    roughness: 0.38
  }),
  platform: new THREE.MeshStandardMaterial({
    color: 0x0b1728,
    emissive: 0x03111c,
    metalness: 0.28,
    roughness: 0.42
  }),
  jumpPad: new THREE.MeshStandardMaterial({
    color: 0x8bff5d,
    emissive: 0x2a8b18,
    metalness: 0.25,
    roughness: 0.18
  })
};

const modelPaths = {
  city: [
    "./models/kenney/city/low-detail-building-a.glb",
    "./models/kenney/city/low-detail-building-b.glb",
    "./models/kenney/city/low-detail-building-h.glb",
    "./models/kenney/city/low-detail-building-wide-b.glb",
    "./models/kenney/city/building-skyscraper-a.glb"
  ],
  coin: "./models/kenney/platformer/coin-gold.glb",
  crate: "./models/kenney/platformer/crate.glb",
  fence: "./models/kenney/platformer/fence-low-straight.glb",
  spike: "./models/kenney/platformer/spike-block.glb",
  platform: "./models/kenney/platformer/platform.glb"
};

function prepareModel(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return root;
}

function loadModels() {
  const loader = new GLTFLoader();
  const paths = [...modelPaths.city, modelPaths.coin, modelPaths.crate, modelPaths.fence, modelPaths.spike, modelPaths.platform];
  return Promise.allSettled(
    paths.map(
      (path) =>
        new Promise((resolve, reject) => {
          loader.load(
            path,
            (gltf) => {
              modelCache.set(path, prepareModel(gltf.scene));
              resolve(path);
            },
            undefined,
            reject
          );
        })
    )
  ).then((results) => {
    modelsReady = results.some((result) => result.status === "fulfilled");
  });
}

function cloneModel(path) {
  const source = modelCache.get(path);
  const clone = source ? source.clone(true) : null;
  if (clone && hasRenderableMesh(clone)) {
    clone.userData.isModelClone = true;
  } else {
    return null;
  }
  return clone;
}

function createLights() {
  const ambient = new THREE.AmbientLight(0x8fc9ff, 0.42);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(-6, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);

  const cyan = new THREE.PointLight(0x2eefff, 3.2, 40);
  cyan.position.set(-5, 4, 2);
  scene.add(cyan);

  const pink = new THREE.PointLight(0xff3f9a, 2.5, 34);
  pink.position.set(5, 5, -18);
  scene.add(pink);
}

function createTrack() {
  for (let row = 0; row < 22; row += 1) {
    for (let lane = 0; lane < LANES.length; lane += 1) {
      createPlatform(lane, PLAYER_Z - row * 5.2, true);
    }
  }

  for (let i = 0; i < 24; i += 1) {
    createScenery(-7.8, -i * 7);
    createScenery(7.8, -i * 7 - 3.5);
  }
}

function createPlayer() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(PLAYER_RADIUS, 32, 18), materials.player);
  body.castShadow = true;
  group.add(body);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.045, 10, 42),
    new THREE.MeshBasicMaterial({ color: 0xb9fbff })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const trail = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 1.2, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x42e7ff,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    })
  );
  trail.position.z = 0.95;
  trail.rotation.x = Math.PI / 2;
  group.add(trail);

  group.position.set(0, PLAYER_RADIUS, PLAYER_Z);
  scene.add(group);
  return group;
}

function createStars() {
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 28 + 2;
    positions[i * 3 + 2] = -Math.random() * 150;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x9beeff,
    size: 0.12,
    transparent: true,
    opacity: 0.8
  });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}

const player = createPlayer();
const stars = createStars();
createLights();
createTrack();

function createPlatform(laneIndex, z, initial = false) {
  const group = new THREE.Group();
  const platformDepth = 5.65;
  const model = cloneModel(modelPaths.platform);
  if (model) {
    model.scale.set(2.8, 0.55, 5.35);
    model.position.y = -0.04;
    group.add(model);
  } else {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.34, platformDepth), materials.platform);
    base.receiveShadow = true;
    group.add(base);
  }

  const edge = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.08, 0.08), materials.lane);
  edge.position.z = platformDepth / 2 - 0.12;
  group.add(edge);

  const backEdge = edge.clone();
  backEdge.position.z = -platformDepth / 2 + 0.12;
  group.add(backEdge);

  group.position.set(LANES[laneIndex], -0.18, z);
  group.userData = { laneIndex, depth: platformDepth, initial };
  scene.add(group);
  platforms.push(group);
  return group;
}

function createScenery(x, z) {
  const cityPath = modelPaths.city[Math.floor(Math.random() * modelPaths.city.length)];
  const model = cloneModel(cityPath);
  if (model) {
    const scale = 0.95 + Math.random() * 1.25;
    model.scale.setScalar(scale);
    model.position.set(x + (Math.random() - 0.5) * 2, -0.08, z);
    model.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(model);
    scenery.push(model);
    return;
  }

  const height = 1.6 + Math.random() * 5.5;
  const group = new THREE.Group();
  const width = 1.4 + Math.random() * 1.5;
  const depth = 1.4 + Math.random() * 1.8;
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: 0x102033,
      emissive: Math.random() > 0.5 ? 0x092b48 : 0x290d33,
      metalness: 0.25,
      roughness: 0.5
    })
  );
  building.position.y = height / 2 - 0.1;
  group.add(building);

  const windowMaterial = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x59eaff : 0xff5ed1 });
  const rows = Math.max(2, Math.floor(height / 1.1));
  for (let row = 0; row < rows; row += 1) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.08, 0.04), windowMaterial);
    window.position.set(0, 0.7 + row * 0.9, depth / 2 + 0.025);
    group.add(window);
  }

  if (Math.random() > 0.55) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.85, 0.42, 0.08),
      new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xffd447 : 0x39ff88 })
    );
    sign.position.set(0, Math.max(1, height * 0.48), depth / 2 + 0.08);
    group.add(sign);
  }

  group.position.set(x + (Math.random() - 0.5) * 2, 0, z);
  scene.add(group);
  scenery.push(group);
}

function createCoin(laneIndex, z, y = Math.random() > 0.55 ? 2.45 : 1.15) {
  const model = cloneModel(modelPaths.coin);
  const mesh = model || new THREE.Mesh(new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, 0.18, 36), materials.coin);
  mesh.position.set(LANES[laneIndex], y, z);
  if (model) {
    mesh.scale.setScalar(0.62);
    mesh.rotation.y = Math.PI / 2;
  } else {
    mesh.rotation.x = Math.PI / 2;
  }
  mesh.castShadow = true;
  mesh.userData = {
    type: "coin",
    laneIndex,
    boxSize: { width: 1.1, height: 1.1, depth: 0.72 }
  };
  scene.add(mesh);
  activeObjects.push(mesh);
}

function createJumpGuideCoins(laneIndex, z) {
  createCoin(laneIndex, z + 3.4, 1.35);
  createCoin(laneIndex, z - 2.9, 2.5);
  createCoin(laneIndex, z - 5.0, 2.5);
}

function disposeObject(object) {
  if (object.userData?.isModelClone) {
    scene.remove(object);
    return;
  }
  object.traverse?.((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose?.());
    }
  });
  object.geometry?.dispose();
  scene.remove(object);
}

function setObjectBounds(object, boxSize, centerOffset = { x: 0, y: 0, z: 0 }) {
  object.userData.boxSize = boxSize;
  object.userData.boxCenterOffset = centerOffset;
}

function getObjectBox(object) {
  const offset = object.userData.boxCenterOffset || { x: 0, y: 0, z: 0 };
  return makeBox(
    {
      x: object.position.x + offset.x,
      y: object.position.y + offset.y,
      z: object.position.z + offset.z
    },
    object.userData.boxSize
  );
}

function shouldCheckCollision(object) {
  return shouldCheckCollisionData(object.userData);
}

function createObstacle(laneIndex, z, type = "high-obstacle") {
  const height = type === "low-obstacle" ? LOW_OBSTACLE_HEIGHT : HIGH_OBSTACLE_HEIGHT;
  const width = type === "low-obstacle" ? 2.15 : 1.25;
  const depth = type === "low-obstacle" ? 0.52 : 1.25;
  const modelPath =
    type === "low-obstacle"
      ? modelPaths.fence
      : Math.random() > 0.5
        ? modelPaths.spike
        : modelPaths.crate;
  const model = cloneModel(modelPath);
  const geometry =
    type === "low-obstacle"
      ? new THREE.BoxGeometry(width, height, depth)
      : Math.random() > 0.5
        ? new THREE.ConeGeometry(0.86, height, 5)
        : new THREE.CylinderGeometry(0.62, 0.86, height, 6);
  const mesh = model || new THREE.Mesh(geometry, materials.obstacle);
  mesh.position.set(LANES[laneIndex], type === "low-obstacle" ? height / 2 : 0.04, z);
  if (model) {
    mesh.scale.setScalar(type === "low-obstacle" ? 2.6 : 2.65);
    mesh.rotation.y = Math.PI / 2;
  } else {
    mesh.rotation.set(type === "low-obstacle" ? 0 : 0.15, 0.25, 0.08);
  }
  mesh.castShadow = true;

  if (type === "high-obstacle") {
    addVisibilityMarker(mesh, materials.obstacle);
  }

  if (type === "low-obstacle" && !model) {
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.82, 10), materials.obstacle);
    leftPost.position.set(-0.92, 0.45, 0);
    const rightPost = leftPost.clone();
    rightPost.position.x = 0.92;
    mesh.add(leftPost, rightPost);
  }

  mesh.userData = {
    type,
    laneIndex
  };
  setObjectBounds(
    mesh,
    type === "low-obstacle"
      ? { width: 2.1, height: LOW_OBSTACLE_HEIGHT, depth: 0.46 }
      : { width: 1.55, height: HIGH_OBSTACLE_HEIGHT, depth: 1.55 },
    type === "low-obstacle" ? { x: 0, y: 0, z: 0 } : { x: 0, y: HIGH_OBSTACLE_HEIGHT / 2, z: 0 }
  );
  scene.add(mesh);
  activeObjects.push(mesh);
}

function createLaser(laneIndex, z) {
  const group = new THREE.Group();
  const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.55, 10);
  const beamGeometry = new THREE.BoxGeometry(1.95, 0.12, 0.12);
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xff246e });
  const leftPost = new THREE.Mesh(postGeometry, materials.obstacle);
  const rightPost = leftPost.clone();
  const beam = new THREE.Mesh(beamGeometry, beamMaterial);
  leftPost.position.set(-0.98, 0.78, 0);
  rightPost.position.set(0.98, 0.78, 0);
  beam.position.set(0, 0.92, 0);
  group.add(leftPost, rightPost, beam);
  group.position.set(LANES[laneIndex], 0, z);
  group.userData = {
    type: "low-obstacle",
    laneIndex
  };
  setObjectBounds(group, { width: 2.1, height: 0.62, depth: 0.38 }, { x: 0, y: 0.9, z: 0 });
  scene.add(group);
  activeObjects.push(group);
}

function createJumpBarrier(z) {
  const group = new THREE.Group();
  const blockMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3f9a,
    emissive: 0x5a0f2f,
    metalness: 0.18,
    roughness: 0.32
  });
  const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0x7df6ff });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff9bd4, transparent: true, opacity: 0.32 });
  for (const laneX of LANES) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.72, 0.5), blockMaterial);
    const topStripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 0.54), stripeMaterial);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.58), glowMaterial);
    block.position.set(laneX, 0.36, 0);
    topStripe.position.set(laneX, 0.75, 0);
    glow.position.set(laneX, 0.88, 0);
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block, topStripe, glow);
  }
  group.position.set(0, 0, z);
  group.userData = { type: "jump-obstacle" };
  setObjectBounds(group, { width: 9.2, height: 0.72, depth: 0.5 }, { x: 0, y: 0.36, z: 0 });
  scene.add(group);
  activeObjects.push(group);
}

function createLightGate(laneIndex, z) {
  const group = new THREE.Group();
  const postMaterial = new THREE.MeshBasicMaterial({ color: 0x4defff, transparent: true, opacity: 0.75 });
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xff3f9a });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff9bd4, transparent: true, opacity: 0.42 });
  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.14), postMaterial);
  const rightPost = leftPost.clone();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.18, 0.18), beamMaterial);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.06, 0.3), glowMaterial);
  leftPost.position.set(-1.12, 0.95, 0);
  rightPost.position.set(1.12, 0.95, 0);
  beam.position.set(0, 0.92, 0);
  glow.position.set(0, 1.12, 0);
  group.add(leftPost, rightPost, beam, glow);
  group.position.set(LANES[laneIndex], 0, z);
  group.userData = { type: "decoration" };
  setObjectBounds(group, { width: 0, height: 0, depth: 0 });
  scene.add(group);
  activeObjects.push(group);
}

function createGate(z, safeLane) {
  const arch = new THREE.Group();
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x7df6ff });
  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.1, 0.18), beamMaterial);
  const rightPost = leftPost.clone();
  const top = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.18, 0.18), beamMaterial);
  leftPost.position.set(-4.45, 1.55, 0);
  rightPost.position.set(4.45, 1.55, 0);
  top.position.set(0, 3.05, 0);
  arch.add(leftPost, rightPost, top);
  arch.position.set(0, 0, z + 0.25);
  arch.userData = { type: "decoration", boxSize: { width: 0, height: 0, depth: 0 } };
  scene.add(arch);
  activeObjects.push(arch);
  for (let lane = 0; lane < LANES.length; lane += 1) {
    if (lane !== safeLane) {
      createObstacle(lane, z, "high-obstacle");
    }
  }
}

function createJumpPad(laneIndex, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 1.25), materials.jumpPad);
  mesh.position.set(LANES[laneIndex], 0.1, z);
  mesh.userData = {
    type: "jump-pad",
    laneIndex
  };
  setObjectBounds(mesh, { width: 2.1, height: 0.35, depth: 1.25 });
  scene.add(mesh);
  activeObjects.push(mesh);
}

function createParticleBurst(position, color = 0xffd447, count = 14) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  for (let i = 0; i < count; i += 1) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), material.clone());
    particle.position.copy(position);
    particle.userData = {
      life: 0.42 + Math.random() * 0.22,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4)
    };
    scene.add(particle);
    particles.push(particle);
  }
}

function beep(frequency, duration, type = "sine", volume = 0.06) {
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function resetWorld() {
  for (const object of activeObjects.splice(0)) {
    disposeObject(object);
  }
  for (const particle of particles.splice(0)) {
    disposeObject(particle);
  }
  spawnTimer = 0;
  coinTimer = 0;
  patternIndex = 0;
  worldOffset = 0;
  cameraShake = 0;
  lastHitTime = 0;
  player.position.set(0, GROUND_Y, PLAYER_Z);
  player.rotation.set(0, 0, 0);
}

function beginGame() {
  resetWorld();
  startGame(state);
  overlay.classList.add("hidden");
  pauseButton.textContent = "暂停";
  beep(520, 0.08, "triangle", 0.04);
  beep(820, 0.08, "triangle", 0.035);
}

function pauseGame() {
  togglePause(state);
  if (state.status === "paused") {
    message.textContent = "游戏已暂停。";
    startButton.textContent = "继续游戏";
    pauseButton.textContent = "继续";
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
    pauseButton.textContent = "暂停";
  }
}

function finishGame(reason = "obstacle", hitInfo = null) {
  const now = performance.now();
  if (now - lastHitTime < 500 || state.status !== "running") {
    return;
  }
  lastHitTime = now;
  endGame(state);
  window.localStorage.setItem(storageKey, String(state.bestScore));
  const reasonText = reason === "gap" ? "从断裂平台掉落" : "撞到障碍";
  const hitText = hitInfo
    ? ` 触发：${hitInfo.type}，车道 ${hitInfo.laneText}，距离 ${Math.floor(worldOffset)}m。`
    : "";
  if (hitInfo) {
    console.info("Collision ended game", hitInfo);
  }
  message.textContent = `${reasonText}，最终得分 ${Math.floor(state.score)}，收集 ${state.coins} 枚金币。${hitText}`;
  startButton.textContent = "重新开始";
  pauseButton.textContent = "暂停";
  overlay.classList.remove("hidden");
  camera.position.x += 0.35;
  cameraShake = 0.65;
  beep(120, 0.18, "sawtooth", 0.08);
}

function completeGame() {
  if (state.status !== "running") {
    return;
  }
  endGame(state);
  window.localStorage.setItem(storageKey, String(state.bestScore));
  message.textContent = `通关成功，最终得分 ${Math.floor(state.score)}，收集 ${state.coins} 枚金币。`;
  startButton.textContent = "再玩一次";
  pauseButton.textContent = "暂停";
  overlay.classList.remove("hidden");
  createParticleBurst(player.position, 0x5dff90, 32);
  beep(740, 0.12, "triangle", 0.055);
  beep(980, 0.18, "triangle", 0.045);
}

const levelPatterns = [
  { type: "jump-combo", lane: 1 },
  { type: "coins", lane: 1 },
  { type: "low", lane: 1 },
  { type: "gate", safeLane: 0 },
  { type: "coins", lane: 0 },
  { type: "light-gate", lane: 0 },
  { type: "gate", safeLane: 2 },
  { type: "air-coins", lane: 2 },
  { type: "low", lane: 0 },
  { type: "gate", safeLane: 1 },
  { type: "light-gate", lane: 1 },
  { type: "coins", lane: 1 }
];

function spawnPattern() {
  if (state.elapsed < 0.45) {
    return;
  }
  const pattern = levelPatterns[patternIndex % levelPatterns.length];
  const z = patternIndex < 3 ? FIRST_PATTERN_Z - patternIndex * 10 : SPAWN_Z;
  if (pattern.type === "coins") {
    for (let i = 0; i < 5; i += 1) {
      createCoin(pattern.lane, z - i * 2.1);
    }
  } else if (pattern.type === "air-coins") {
    for (let i = 0; i < 4; i += 1) {
      createCoin(pattern.lane, z - i * 2.3);
      activeObjects.at(-1).position.y = 2.55;
    }
  } else if (pattern.type === "low") {
    createJumpGuideCoins(pattern.lane, z);
    createObstacle(pattern.lane, z, "low-obstacle");
  } else if (pattern.type === "laser") {
    createJumpGuideCoins(pattern.lane, z);
    createLaser(pattern.lane, z);
  } else if (pattern.type === "light-gate") {
    createLightGate(pattern.lane, z);
  } else if (pattern.type === "gate") {
    createGate(z, pattern.safeLane);
  } else if (pattern.type === "jump-pad") {
    createJumpPad(pattern.lane, z);
  } else if (pattern.type === "jump-combo") {
    createJumpPad(pattern.lane, z + 6.5);
    createCoin(pattern.lane, z + 3.2, 1.35);
    createJumpBarrier(z - 1.4);
    for (let i = 0; i < 4; i += 1) {
      createCoin(pattern.lane, z - 3.4 - i * 2.1, 2.55);
    }
  }
  patternIndex += 1;
}

function spawnObjects(delta) {
  spawnTimer -= delta;
  coinTimer -= delta;

  if (spawnTimer <= 0) {
    spawnPattern();
    spawnTimer = Math.max(0.92, 1.7 - state.elapsed * 0.006);
  }

  if (coinTimer <= 0) {
    coinTimer = 2.5;
  }
}

function updateObjects(delta) {
  const visibleLaneIndex = nearestLaneIndex(LANES, player.position.x);
  const playerBox = makeBox(player.position, {
    width: PLAYER_RADIUS * 1.25,
    height: PLAYER_RADIUS * 1.25,
    depth: PLAYER_RADIUS * 1.25
  });

  for (let i = activeObjects.length - 1; i >= 0; i -= 1) {
    const object = activeObjects[i];
    object.position.z += state.speed * delta;
    if (object.userData.type === "coin") {
      object.rotation.x += delta * 1.5;
      object.rotation.y += delta * 2.6;
    }

    if (object.position.z > DESPAWN_Z) {
      disposeObject(object);
      activeObjects.splice(i, 1);
      continue;
    }

    if (!shouldCheckCollision(object)) {
      continue;
    }

    if (!shouldCollideInTargetLane(object.userData, visibleLaneIndex)) {
      continue;
    }

    const box = getObjectBox(object);
    if (intersectsAabb(playerBox, box)) {
      if (object.userData.type === "coin") {
        collectCoin(state);
        createParticleBurst(object.position, 0xffd447, 10);
        beep(920, 0.07, "sine", 0.045);
        disposeObject(object);
        activeObjects.splice(i, 1);
      } else if (object.userData.type === "jump-pad") {
        if (jump(state)) {
          state.verticalVelocity *= 1.25;
          createParticleBurst(object.position, 0x6cff63, 16);
          beep(620, 0.08, "triangle", 0.05);
        }
        disposeObject(object);
        activeObjects.splice(i, 1);
      } else {
        if (canClearObstacle(object.userData, state.playerY)) {
          continue;
        }
        createParticleBurst(player.position, 0xff3566, 28);
        finishGame("obstacle", {
          type: object.userData.type,
          laneIndex: object.userData.laneIndex ?? "all",
          laneText: object.userData.laneIndex === undefined ? "全车道" : String(object.userData.laneIndex + 1),
          visibleLaneIndex: visibleLaneIndex + 1,
          playerX: Number(player.position.x.toFixed(2)),
          objectX: Number(object.position.x.toFixed(2)),
          objectZ: Number(object.position.z.toFixed(2)),
          playerY: Number(state.playerY.toFixed(2)),
          worldOffset: Math.floor(worldOffset)
        });
      }
    }
  }
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.userData.life -= delta;
    particle.userData.velocity.y -= 7 * delta;
    particle.position.addScaledVector(particle.userData.velocity, delta);
    particle.material.opacity = Math.max(0, particle.userData.life * 2.4);
    if (particle.userData.life <= 0) {
      disposeObject(particle);
      particles.splice(i, 1);
    }
  }
}

function updatePlayer(delta) {
  const targetX = LANES[state.targetLaneIndex];
  player.position.x = THREE.MathUtils.damp(player.position.x, targetX, 12, delta);
  player.position.y = THREE.MathUtils.damp(player.position.y, state.playerY, 18, delta);
  player.rotation.z = THREE.MathUtils.damp(player.rotation.z, (targetX - player.position.x) * -0.16, 8, delta);
  player.rotation.x -= delta * state.speed * 1.15;
  player.rotation.y += delta * 0.7;
}

function updateTrack(delta) {
  worldOffset += state.speed * delta;
  for (const platform of platforms) {
    platform.position.z += state.speed * delta;
    if (platform.position.z > DESPAWN_Z + 2) {
      platform.position.z -= 116;
      platform.visible = true;
    }
  }
  for (const item of scenery) {
    item.position.z += state.speed * delta;
    if (item.position.z > 16) {
      item.position.z -= 170;
      item.scale.y = 0.6 + Math.random() * 1.8;
    }
  }
  stars.rotation.y += delta * 0.012;
  stars.position.z = (worldOffset % 18) * 0.18;
}

function checkPlatformFall() {
  return;
  if (!state.isGrounded || state.status !== "running") {
    return;
  }
  const platformData = platforms
    .filter((platform) => platform.visible)
    .map((platform) => ({
      laneIndex: platform.userData.laneIndex,
      z: platform.position.z,
      depth: platform.userData.depth
    }));
  if (!hasPlatformUnderPlayer(platformData, state.targetLaneIndex, PLAYER_Z)) {
    finishGame("gap");
    player.position.y -= 0.5;
  }
}

function updateHud() {
  scoreNode.textContent = String(Math.floor(state.score));
  coinsNode.textContent = String(state.coins);
  bestNode.textContent = String(state.bestScore);
  progressNode.textContent = `${Math.floor(worldOffset)}m`;
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.04);

  if (state.status === "running") {
    updateProgress(state, delta);
    updateJump(state, delta);
    spawnObjects(delta);
    updateObjects(delta);
    updatePlayer(delta);
    updateTrack(delta);
    checkPlatformFall();
  } else {
    player.rotation.y += delta * 0.4;
    stars.rotation.y += delta * 0.006;
  }
  updateParticles(delta);

  const cameraTargetX = player.position.x * 0.22;
  camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTargetX, 3, delta);
  camera.position.y = THREE.MathUtils.damp(camera.position.y, 6.4 + state.playerY * 0.18, 4, delta);
  camera.position.z = THREE.MathUtils.damp(camera.position.z, 15.2, 4, delta);
  if (cameraShake > 0) {
    camera.position.x += (Math.random() - 0.5) * cameraShake;
    camera.position.y += (Math.random() - 0.5) * cameraShake;
    cameraShake = Math.max(0, cameraShake - delta * 2.4);
  }
  camera.lookAt(player.position.x * 0.28, 1.45, -18);
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function handleKeyDown(event) {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    moveLane(state, -1);
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    moveLane(state, 1);
  }
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    event.preventDefault();
    if (jump(state)) {
      beep(480, 0.08, "triangle", 0.045);
    }
  }
  if (event.code === "KeyP") {
    pauseGame();
  }
  if (event.code === "KeyR") {
    beginGame();
  }
}

startButton.addEventListener("click", () => {
  if (state.status === "paused") {
    pauseGame();
  } else {
    beginGame();
  }
});
pauseButton.addEventListener("click", pauseGame);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

message.textContent = "左右换道并跳跃，收集金币，越过矮墙，避开高障碍和断裂平台。";
loadModels().then(() => {
  if (modelsReady) {
    for (let i = 0; i < scenery.length; i += 1) {
      disposeObject(scenery[i]);
    }
    scenery.length = 0;
    for (let i = 0; i < 24; i += 1) {
      createScenery(-7.8, -i * 7);
      createScenery(7.8, -i * 7 - 3.5);
    }
  }
});
updateHud();
animate();
