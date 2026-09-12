import * as THREE from 'three';
import { scene } from './scene.js';

// --- Voxel Chicken ---
const featherMat = new THREE.MeshLambertMaterial({ color: 0xf7f3e8 });
const wingMat = new THREE.MeshLambertMaterial({ color: 0xded8ca });
const beakMat = new THREE.MeshLambertMaterial({ color: 0xf4a62a });
const combMat = new THREE.MeshLambertMaterial({ color: 0xd93636 });
const eyeMat = new THREE.MeshLambertMaterial({ color: 0x171717 });

function voxel(size, material, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const body = voxel([0.7, 0.7, 0.72], featherMat, [0, 0.42, 0]);
const head = voxel([0.5, 0.5, 0.5], featherMat, [0, 0.96, 0.1]);
const leftWing = voxel([0.16, 0.42, 0.48], wingMat, [-0.4, 0.45, 0]);
const rightWing = voxel([0.16, 0.42, 0.48], wingMat, [0.4, 0.45, 0]);
const beak = voxel([0.24, 0.17, 0.22], beakMat, [0, 0.94, 0.43]);
const leftEye = voxel([0.075, 0.075, 0.04], eyeMat, [-0.14, 1.05, 0.365]);
const rightEye = voxel([0.075, 0.075, 0.04], eyeMat, [0.14, 1.05, 0.365]);
const combFront = voxel([0.14, 0.18, 0.16], combMat, [0, 1.29, 0.18]);
const combBack = voxel([0.14, 0.15, 0.16], combMat, [0, 1.27, -0.01]);
const leftFoot = voxel([0.13, 0.12, 0.28], beakMat, [-0.19, 0.06, 0.08]);
const rightFoot = voxel([0.13, 0.12, 0.28], beakMat, [0.19, 0.06, 0.08]);
const tail = voxel([0.34, 0.38, 0.2], wingMat, [0, 0.55, -0.43]);

export const group = new THREE.Group();
group.add(
  body,
  head,
  leftWing,
  rightWing,
  beak,
  leftEye,
  rightEye,
  combFront,
  combBack,
  leftFoot,
  rightFoot,
  tail
);
export const PLAYER_BASE_Y = 0.5; // terrain tiles have their top surface at y=0.5
const MIN_COL = -5;
const MAX_COL = 5;
group.position.set(0, PLAYER_BASE_Y, 0);
scene.add(group);

// --- Grid State ---
// Tracks the player's canonical integer-grid position.
export const playerState = {
  row: 0,   // Z grid index (increases as player moves forward / presses up)
  col: 0,   // X grid index
  x: 0,     // world X (mirrors col during idle, interpolated during hop)
  z: 0,     // world Z (mirrors row during idle, interpolated during hop)
};

// --- Hop Constants ---
const HOP_DURATION = 0.2;   // seconds for a full hop
const HOP_HEIGHT   = 0.8;   // peak arc height in world units

// --- Hop State Machine ---
// Direction mapping:
//   'up'    → dz = +1 (forward, increasing Z, away from start)
//   'down'  → dz = -1 (backward, toward start)
//   'left'  → dx = +1 (camera faces +Z, so screen X is mirrored)
//   'right' → dx = -1
// Boundary: toRow must be >= 0 (can't retreat past starting row).

export const hopState = {
  isHopping: false,
  progress: 0,                    // 0 → 1 over HOP_DURATION seconds
  fromPos: new THREE.Vector3(),   // world position at hop start
  toPos:   new THREE.Vector3(),   // target world position (integer grid)
};

// --- Input Buffer ---
// Holds at most one queued direction; consumed when the current hop lands.
export const inputBuffer = { direction: null }; // 'up'|'down'|'left'|'right'|null

// --- onHopLanded Callback ---
let _onHopLandedCallback = null;
let _surfaceHeightResolver = () => PLAYER_BASE_Y;

/**
 * Register a function to be called each time a hop completes and the player
 * snaps to the grid. game.js uses this to check river/collision on land.
 * @param {Function} fn
 */
export function setOnHopLanded(fn) {
  _onHopLandedCallback = fn;
}

/**
 * Resolve the visual standing height of a destination row before a hop starts.
 * game.js supplies terrain-aware heights while player.js remains decoupled.
 * @param {(row: number, col: number) => number} fn
 */
export function setSurfaceHeightResolver(fn) {
  _surfaceHeightResolver = typeof fn === 'function' ? fn : () => PLAYER_BASE_Y;
}

function onHopLanded() {
  return _onHopLandedCallback ? _onHopLandedCallback() : true;
}

// --- startHop ---
/**
 * Begin a new hop in the given direction.
 * Silently rejected if a hop is already in progress or the target row < 0.
 *
 * Direction mapping:
 *   'up'    → Z + 1 (forward)
 *   'down'  → Z − 1 (backward)
 *   'left'  → X + 1 (screen-left from the gameplay camera)
 *   'right' → X − 1 (screen-right from the gameplay camera)
 *
 * @param {'up'|'down'|'left'|'right'} direction
 */
export function startHop(direction) {
  if (hopState.isHopping) return;

  const directionDeltas = {
    up:    { dRow:  1, dCol:  0 },
    down:  { dRow: -1, dCol:  0 },
    left:  { dRow:  0, dCol:  1 },
    right: { dRow:  0, dCol: -1 },
  };

  const delta = directionDeltas[direction];
  if (!delta) return;  // unknown direction — ignore

  const facingRotations = {
    up: 0,
    down: Math.PI,
    left: Math.PI / 2,
    right: -Math.PI / 2,
  };
  group.rotation.y = facingRotations[direction];

  const currentCol = Math.round(group.position.x);
  const toRow = playerState.row + delta.dRow;
  const toCol = currentCol + delta.dCol;

  // Requirement 2.7: cannot hop to a row < 0 (can't retreat past start)
  if (toRow < 0) return;
  // The generated world is eleven tiles wide, so do not allow void hops.
  if (toCol < MIN_COL || toCol > MAX_COL) return;

  const resolvedHeight = _surfaceHeightResolver(toRow, toCol);
  const targetY = Number.isFinite(resolvedHeight) ? resolvedHeight : PLAYER_BASE_Y;

  hopState.fromPos.copy(group.position);
  hopState.toPos.set(toCol, targetY, toRow);
  hopState.isHopping = true;
  hopState.progress  = 0;
}

// --- updatePlayer ---
/**
 * Advance the hop animation by dt seconds.
 * Must be called every frame from the game loop.
 * @param {number} dt  Delta time in seconds (should be capped at 0.05 by caller)
 */
export function updatePlayer(dt) {
  if (!hopState.isHopping) return;

  // Advance progress, clamped to 1
  hopState.progress = Math.min(hopState.progress + dt / HOP_DURATION, 1);
  const t = hopState.progress;

  // Interpolated XZ position along the hop arc
  const lerped = new THREE.Vector3().lerpVectors(hopState.fromPos, hopState.toPos, t);
  group.position.x = lerped.x;
  group.position.z = lerped.z;

  // Interpolate between terrain/log surface heights, then add the hop arc.
  // This avoids clipping and vertical snapping when entering or leaving a log.
  group.position.y = lerped.y + Math.sin(t * Math.PI) * HOP_HEIGHT;
  playerState.x = group.position.x;
  playerState.z = group.position.z;

  // On landing (progress reached 1): snap to integer grid and fire callback
  if (t >= 1) {
    // Snap world position to exact integer grid coordinates
    group.position.x = Math.round(hopState.toPos.x);
    group.position.z = Math.round(hopState.toPos.z);
    group.position.y = hopState.toPos.y;

    // Update canonical grid state
    playerState.row = Math.round(hopState.toPos.z);
    playerState.col = Math.round(hopState.toPos.x);
    playerState.x   = playerState.col;
    playerState.z   = playerState.row;

    hopState.isHopping = false;

    // Fire landing callback (river/collision checks happen here in game.js)
    const canContinue = onHopLanded();
    if (canContinue === false) {
      inputBuffer.direction = null;
      return;
    }

    // Consume the input buffer — start the next hop if one is queued
    const buffered = inputBuffer.direction;
    if (buffered !== null) {
      inputBuffer.direction = null;
      startHop(buffered);
    }
  }
}

// --- getWorldPosition ---
/**
 * Returns a THREE.Vector3 of the group's current world position.
 * During a hop, this reflects the interpolated in-flight position.
 */
export function getWorldPosition() {
  return group.position.clone();
}

// --- reset ---
/**
 * Reset all player state to initial values.
 * Called by game.js when the player restarts.
 */
export function reset() {
  playerState.row = 0;
  playerState.col = 0;
  playerState.x   = 0;
  playerState.z   = 0;

  hopState.isHopping = false;
  hopState.progress  = 0;
  hopState.fromPos.set(0, PLAYER_BASE_Y, 0);
  hopState.toPos.set(0, PLAYER_BASE_Y, 0);

  inputBuffer.direction = null;

  group.position.set(0, PLAYER_BASE_Y, 0);
  group.rotation.set(0, 0, 0);
}
