import * as THREE from 'three';
import { scene } from './scene.js';

// --- Constants ---
export const MAX_TILES = 300;
export const GENERATE_AHEAD = 20;
export const RECYCLE_BEHIND = 3;

// --- Shared Tile Geometry ---
const tileGeom = new THREE.BoxGeometry(1, 0.5, 1);
const ROAD_COLOR = new THREE.Color(0x757575);
const GRASS_COLORS = [
  new THREE.Color(0x58ad4c),
  new THREE.Color(0x63b957),
  new THREE.Color(0x4fa344),
];

const roadDashGeom = new THREE.BoxGeometry(0.62, 0.025, 0.055);
const railGeom = new THREE.BoxGeometry(11.2, 0.1, 0.07);
const sleeperGeom = new THREE.BoxGeometry(0.16, 0.055, 0.78);
const rippleGeom = new THREE.BoxGeometry(0.72, 0.018, 0.045);
const roadDashMat = new THREE.MeshLambertMaterial({ color: 0xf4e6a2 });
const railMat = new THREE.MeshLambertMaterial({ color: 0x3d434a });
const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x6e452a });
const rippleMat = new THREE.MeshLambertMaterial({ color: 0x73c5ef });

function createRowDecoration(type, z) {
  const group = new THREE.Group();

  if (type === 'road') {
    for (let x = -4; x <= 4; x += 2) {
      const dash = new THREE.Mesh(roadDashGeom, roadDashMat);
      dash.position.set(x, 0.515, z + 0.46);
      group.add(dash);
    }
  } else if (type === 'train') {
    for (const railZ of [-0.28, 0.28]) {
      const rail = new THREE.Mesh(railGeom, railMat);
      rail.position.set(0, 0.59, z + railZ);
      rail.castShadow = true;
      group.add(rail);
    }
    for (let x = -5; x <= 5; x += 0.75) {
      const sleeper = new THREE.Mesh(sleeperGeom, sleeperMat);
      sleeper.position.set(x, 0.545, z);
      group.add(sleeper);
    }
  } else if (type === 'river') {
    for (let x = -4.5; x <= 4.5; x += 1.8) {
      const ripple = new THREE.Mesh(rippleGeom, rippleMat);
      ripple.position.set(x + ((z & 1) ? 0.35 : 0), 0.512, z + 0.25);
      group.add(ripple);
    }
  }

  if (group.children.length === 0) return null;
  scene.add(group);
  return group;
}

function grassColorAt(x, z) {
  const index = Math.abs((x * 17 + z * 31) % GRASS_COLORS.length);
  return GRASS_COLORS[index];
}

// --- InstancedMesh Setup ---
export const grassMesh = new THREE.InstancedMesh(
  tileGeom,
  new THREE.MeshLambertMaterial({ color: 0xffffff }),
  MAX_TILES
);
grassMesh.receiveShadow = true;
scene.add(grassMesh);

for (let i = 0; i < MAX_TILES; i++) {
  grassMesh.setColorAt(i, GRASS_COLORS[0]);
}
grassMesh.instanceColor.needsUpdate = true;

export const roadMesh = new THREE.InstancedMesh(
  tileGeom,
  new THREE.MeshLambertMaterial({ color: 0xffffff }),
  MAX_TILES
);
roadMesh.receiveShadow = true;
scene.add(roadMesh);

// Instance colors let train rows flash without turning every other road black.
for (let i = 0; i < MAX_TILES; i++) {
  roadMesh.setColorAt(i, ROAD_COLOR);
}
roadMesh.instanceColor.needsUpdate = true;

export const riverMesh = new THREE.InstancedMesh(
  tileGeom,
  new THREE.MeshPhongMaterial({
    color: 0x2388cf,
    specular: 0x8dd8ff,
    shininess: 75,
  }),
  MAX_TILES
);
riverMesh.receiveShadow = true;
scene.add(riverMesh);

// InstancedMesh slots start as identity matrices. Hide every unused slot until
// it is acquired so unallocated road/river tiles do not appear at the origin.
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -1000, 0);
for (const mesh of [grassMesh, roadMesh, riverMesh]) {
  for (let i = 0; i < MAX_TILES; i++) mesh.setMatrixAt(i, hiddenMatrix);
  mesh.instanceMatrix.needsUpdate = true;
}

// --- Free-List Slot Pools ---
export const freeSlots = {
  grass: Array.from({ length: MAX_TILES }, (_, i) => i),
  road:  Array.from({ length: MAX_TILES }, (_, i) => i),
  river: Array.from({ length: MAX_TILES }, (_, i) => i),
};

// --- Slot Helpers ---

/**
 * Pops a free slot index for the given tile type.
 * Returns -1 (and emits a warning) if the pool is exhausted.
 * @param {'grass'|'road'|'river'} type
 * @returns {number}
 */
export function acquireSlot(type) {
  const pool = freeSlots[type];
  if (pool.length === 0) {
    console.warn(`terrain: free-list exhausted for type "${type}"`);
    return -1;
  }
  return pool.pop();
}

/**
 * Returns a slot index back to the free-list for the given tile type.
 * @param {'grass'|'road'|'river'} type
 * @param {number} index
 */
export function releaseSlot(type, index) {
  freeSlots[type].push(index);
}

// --- Active Rows Map ---
export const rows = new Map(); // Map<number, rowData>

// --- Row lifecycle callbacks (set by game.js to avoid circular imports) ---

/** Called with rowData after a procedural row is generated. Used to spawn obstacles. */
let _onRowGenerated = null;
export function setOnRowGenerated(fn) { _onRowGenerated = fn; }

/** Called with rowZ before a row's obstacles are cleared. Used to despawn obstacles. */
let _onRowRecycled = null;
export function setOnRowRecycled(fn) { _onRowRecycled = fn; }

// Tracks the last generated row for adjacency rules
const genState = {
  lastType: 'grass',
  roadGroupLen: 0, // consecutive road rows generated
};

// --- Shared Dummy for Matrix Placement ---
const dummy = new THREE.Object3D();

// --- Base Weights ---
const BASE_WEIGHTS = {
  grass: 0.40,
  road:  0.35,
  river: 0.15,
  train: 0.10,
};

/**
 * Picks the next row type based on adjacency rules and weighted random selection.
 * @param {'grass'|'road'|'river'|'train'} prevType
 * @param {number} roadGroupLen
 * @returns {'grass'|'road'|'river'|'train'}
 */
export function pickRowType(prevType, roadGroupLen) {
  // Hard rules that force a specific type
  if (prevType === 'train') return 'grass';
  if (roadGroupLen >= 1 && roadGroupLen < 2) return 'road';

  // Build eligible candidate set
  const candidates = { ...BASE_WEIGHTS };

  if (prevType === 'river') {
    delete candidates.river;
  }
  if (roadGroupLen >= 4) {
    delete candidates.road;
  }
  // Train rows must be bordered by grass on both sides —
  // only allow train when the previous row was grass.
  if (prevType !== 'grass') {
    delete candidates.train;
  }

  // Weighted random from eligible candidates
  const total = Object.values(candidates).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, weight] of Object.entries(candidates)) {
    r -= weight;
    if (r <= 0) return type;
  }
  // Fallback (floating-point safety)
  return Object.keys(candidates)[Object.keys(candidates).length - 1];
}

/**
 * Generates a row at world Z coordinate z, picks a type, places 11 tile
 * instances in the correct InstancedMesh, and stores rowData in the rows Map.
 * @param {number} z
 */
export function generateRow(z) {
  if (rows.has(z)) return;

  const type = pickRowType(genState.lastType, genState.roadGroupLen);

  // Update adjacency tracking state
  if (type === 'road') {
    genState.roadGroupLen += 1;
  } else {
    genState.roadGroupLen = 0;
  }
  genState.lastType = type;

  // Resolve which InstancedMesh and pool key to use
  // Train rows are visually road-colored tiles
  const meshType = (type === 'train') ? 'road' : type;
  const mesh = meshType === 'grass' ? grassMesh
             : meshType === 'road'  ? roadMesh
             :                        riverMesh;

  // Place 11 tiles across X: -5 to +5
  const slots = [];
  for (let x = -5; x <= 5; x++) {
    const index = acquireSlot(meshType);
    if (index === -1) continue; // pool exhausted — skip this tile

    dummy.position.set(x, 0.25, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (meshType === 'grass') grassMesh.setColorAt(index, grassColorAt(x, z));
    if (meshType === 'road') roadMesh.setColorAt(index, ROAD_COLOR);

    slots.push({ meshType, index });
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (meshType === 'grass') grassMesh.instanceColor.needsUpdate = true;
  if (meshType === 'road') roadMesh.instanceColor.needsUpdate = true;

  // Build trainState for train rows
  const trainState = type === 'train'
    ? {
        phase: 'idle',
        cooldown: 4 + Math.random() * 4,
        warningTimer: 0,
        flashTimer: 0,
        direction: Math.random() < 0.5 ? 1 : -1,
        halfW: 3.5 + Math.random() * 1.5,
      }
    : null;

  const decoration = createRowDecoration(type, z);
  rows.set(z, { z, type, slots, obstacles: [], trainState, decoration });

  // Notify game.js so it can spawn obstacles for road/river rows
  if (_onRowGenerated) _onRowGenerated(rows.get(z));
}

/**
 * Moves all tile instances for row z offscreen (Y=-1000), returns their slots
 * to the free-list, clears the obstacles array, and removes the row from the map.
 * @param {number} z
 */
export function recycleRow(z) {
  const rowData = rows.get(z);
  if (!rowData) return;

  const dirtyMeshes = new Set();
  for (const { meshType, index } of rowData.slots) {
    const mesh = meshType === 'grass' ? grassMesh
               : meshType === 'road'  ? roadMesh
               :                        riverMesh;
    dummy.position.set(0, -1000, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (meshType === 'road') roadMesh.setColorAt(index, ROAD_COLOR);
    dirtyMeshes.add(mesh);
    releaseSlot(meshType, index);
  }
  for (const mesh of dirtyMeshes) {
    mesh.instanceMatrix.needsUpdate = true;
  }
  if (dirtyMeshes.has(roadMesh)) roadMesh.instanceColor.needsUpdate = true;

  // Despawn obstacles via callback (avoids circular import with obstacles.js)
  if (_onRowRecycled) _onRowRecycled(z);
  if (rowData.decoration) scene.remove(rowData.decoration);

  rows.delete(z);
}

/**
 * Generates a grass row at z without consulting or modifying genState.
 * Used for seeding the safe starting zone (rows 0–2) and for resets.
 * @param {number} z
 */
export function generateGrassRow(z) {
  if (rows.has(z)) return;

  const slots = [];
  for (let x = -5; x <= 5; x++) {
    const index = acquireSlot('grass');
    if (index === -1) continue;

    dummy.position.set(x, 0.25, z);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(index, dummy.matrix);
    grassMesh.setColorAt(index, grassColorAt(x, z));
    slots.push({ meshType: 'grass', index });
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  grassMesh.instanceColor.needsUpdate = true;

  rows.set(z, { z, type: 'grass', slots, obstacles: [], trainState: null, decoration: null });
  // genState is intentionally NOT updated — forced rows are outside the
  // procedural sequence and should not influence subsequent adjacency logic.
}

/**
 * Recycles all active rows and resets genState so the world can be freshly
 * seeded (used by resetGame).
 */
export function resetTerrain() {
  for (const z of [...rows.keys()]) {
    recycleRow(z);
  }
  genState.lastType    = 'grass';
  genState.roadGroupLen = 0;
}

/**
 * Generates rows in the range [playerRowZ-1, playerRowZ+GENERATE_AHEAD] and
 * recycles any row whose Z falls below playerRowZ-RECYCLE_BEHIND.
 * @param {number} playerRowZ
 */
export function updateTerrain(playerRowZ) {
  // Generate rows ahead (and a step behind) the player
  const minGen = Math.max(0, playerRowZ - 1);
  const maxGen = playerRowZ + GENERATE_AHEAD;

  for (let z = minGen; z <= maxGen; z++) {
    if (!rows.has(z)) generateRow(z);
  }

  // Recycle rows that have scrolled too far behind
  for (const z of rows.keys()) {
    if (z < playerRowZ - RECYCLE_BEHIND) {
      recycleRow(z);
    }
  }
}
