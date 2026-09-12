import * as THREE from 'three';
import { scene } from './scene.js';

// --- Shared Voxel Geometry and Materials ---
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const wheelGeom = new THREE.CylinderGeometry(0.17, 0.17, 0.14, 10);
const LOG_RADIUS = 0.32;
const LOG_CENTER_Y = 0.82;
export const LOG_SURFACE_Y = LOG_CENTER_Y + LOG_RADIUS + 0.02;
const logBodyGeom = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 1, 8);
const logEndGeom = new THREE.CylinderGeometry(LOG_RADIUS + 0.005, LOG_RADIUS + 0.005, 0.04, 8);
const barkBandGeom = new THREE.TorusGeometry(LOG_RADIUS, 0.025, 6, 8);

const vehicleMats = [
  0xe64b3c,
  0xf2c94c,
  0x3c82e6,
  0x66b85a,
  0x9b66d7,
].map(color => new THREE.MeshLambertMaterial({ color }));
const windowMat = new THREE.MeshLambertMaterial({ color: 0x9fd8ed });
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x20242a });
const lightMat = new THREE.MeshLambertMaterial({ color: 0xffe58a });
const logMatBrown = new THREE.MeshLambertMaterial({ color: 0x8a4f27 });
const logEndMat = new THREE.MeshLambertMaterial({ color: 0xc88a4a });
const barkBandMat = new THREE.MeshLambertMaterial({ color: 0x5c3019 });
const trainBodyMat = new THREE.MeshLambertMaterial({ color: 0x39495a });
const trainAccentMat = new THREE.MeshLambertMaterial({ color: 0xc94b40 });

function boxPart(group, size, position, material) {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addWheel(group, x, z, radiusScale = 1) {
  const wheel = new THREE.Mesh(wheelGeom, wheelMat);
  wheel.scale.setScalar(radiusScale);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(x, 0.66, z);
  wheel.castShadow = true;
  group.add(wheel);
}

function createVehicle(length, direction, variant, material) {
  const group = new THREE.Group();
  boxPart(group, [length, 0.4, 0.76], [0, 0.75, 0], material);

  if (variant === 'truck') {
    boxPart(group, [length * 0.58, 0.68, 0.7], [-direction * length * 0.13, 1.08, 0], material);
    boxPart(group, [length * 0.25, 0.55, 0.68], [direction * length * 0.34, 1.02, 0], material);
    boxPart(group, [length * 0.12, 0.27, 0.035], [direction * length * 0.34, 1.08, 0.36], windowMat);
    boxPart(group, [length * 0.12, 0.27, 0.035], [direction * length * 0.34, 1.08, -0.36], windowMat);
  } else {
    const cabinLength = length * (variant === 'compact' ? 0.48 : 0.55);
    boxPart(group, [cabinLength, 0.38, 0.66], [-direction * length * 0.05, 1.05, 0], material);
    boxPart(group, [cabinLength * 0.68, 0.23, 0.035], [-direction * length * 0.05, 1.07, 0.345], windowMat);
    boxPart(group, [cabinLength * 0.68, 0.23, 0.035], [-direction * length * 0.05, 1.07, -0.345], windowMat);
  }

  const axleX = length * 0.3;
  for (const x of [-axleX, axleX]) {
    addWheel(group, x, -0.43);
    addWheel(group, x, 0.43);
  }
  boxPart(group, [0.05, 0.13, 0.16], [direction * (length / 2 + 0.025), 0.78, -0.23], lightMat);
  boxPart(group, [0.05, 0.13, 0.16], [direction * (length / 2 + 0.025), 0.78, 0.23], lightMat);
  return group;
}

function createLog(length) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(logBodyGeom, logMatBrown);
  body.scale.y = length;
  body.rotation.z = Math.PI / 2;
  body.position.y = LOG_CENTER_Y;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  for (const side of [-1, 1]) {
    const end = new THREE.Mesh(logEndGeom, logEndMat);
    end.rotation.z = Math.PI / 2;
    end.position.set(side * length / 2, LOG_CENTER_Y, 0);
    end.castShadow = true;
    group.add(end);
  }
  for (const offset of [-0.22, 0.22]) {
    const band = new THREE.Mesh(barkBandGeom, barkBandMat);
    band.rotation.y = Math.PI / 2;
    band.position.set(length * offset, LOG_CENTER_Y, 0);
    group.add(band);
  }
  return group;
}

function createTrain(length, direction) {
  const group = new THREE.Group();
  boxPart(group, [length, 0.25, 0.9], [0, 0.68, 0], trainBodyMat);
  boxPart(group, [length * 0.72, 0.72, 0.8], [-direction * length * 0.08, 1.08, 0], trainAccentMat);
  boxPart(group, [length * 0.25, 0.88, 0.82], [direction * length * 0.34, 1.15, 0], trainBodyMat);
  boxPart(group, [length * 0.5, 0.12, 0.94], [direction * length * 0.08, 1.5, 0], trainBodyMat);

  for (const x of [-length * 0.3, -length * 0.08, length * 0.16, length * 0.34]) {
    boxPart(group, [Math.min(0.55, length * 0.08), 0.27, 0.035], [x, 1.16, 0.415], windowMat);
    boxPart(group, [Math.min(0.55, length * 0.08), 0.27, 0.035], [x, 1.16, -0.415], windowMat);
  }
  for (const x of [-length * 0.34, -length * 0.12, length * 0.12, length * 0.34]) {
    addWheel(group, x, -0.48, 1.12);
    addWheel(group, x, 0.48, 1.12);
  }
  boxPart(group, [0.06, 0.2, 0.22], [direction * (length / 2 + 0.03), 1.02, 0], lightMat);
  return group;
}

// --- Active Obstacles ---
/** @type {Array<ObstacleData>} */
export const activeObstacles = [];

// --- Helpers ---

/**
 * @typedef {{
 *   type: 'car'|'log'|'train',
 *   rowZ: number,
 *   x: number,
 *   speed: number,
 *   direction: 1|-1,
 *   halfW: number,
 *   halfD: number,
 *   mesh: THREE.Object3D,
 * }} ObstacleData
 */

/**
 * Spawns 2–3 car obstacles for a road row and 2–4 log obstacles for a river
 * row. Each obstacle is added to the scene and pushed to both activeObstacles
 * and rowData.obstacles.
 *
 * @param {{ z: number, type: string, obstacles: ObstacleData[] }} rowData
 */
export function spawnObstaclesForRow(rowData) {
  const { z: rowZ, type } = rowData;

  if (type === 'road') {
    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
    const direction = Math.random() < 0.5 ? 1 : -1;
    const speed = 2 + Math.random() * 3; // one coherent speed per lane
    const spacing = 18 / count;
    const phase = Math.random() * spacing;
    const vehicleProfiles = [
      { variant: 'compact', length: 1.35 },
      { variant: 'car', length: 1.8 },
      { variant: 'truck', length: 2.7 },
    ];

    for (let i = 0; i < count; i++) {
      const profile = vehicleProfiles[Math.floor(Math.random() * vehicleProfiles.length)];
      const halfW     = profile.length / 2;
      const halfD     = 0.4;

      // Even spacing keeps traffic readable and prevents vehicle bunching.
      const x = -9 + phase + i * spacing;

      const material = vehicleMats[(rowZ + i + vehicleMats.length) % vehicleMats.length];
      const mesh = createVehicle(profile.length, direction, profile.variant, material);
      mesh.position.set(x, 0, rowZ);
      scene.add(mesh);

      /** @type {ObstacleData} */
      const obs = { type: 'car', rowZ, x, speed, direction, halfW, halfD, mesh };
      activeObstacles.push(obs);
      rowData.obstacles.push(obs);
    }
  } else if (type === 'river') {
    const count = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
    const direction = Math.random() < 0.5 ? 1 : -1;
    const speed = 1 + Math.random() * 2; // one coherent current per river row
    const spacing = 18 / count;
    const phase = Math.random() * spacing;

    for (let i = 0; i < count; i++) {
      const maxHalfW = Math.min(2.5, (spacing - 0.45) / 2);
      const halfW = 1.5 + Math.random() * Math.max(0, maxHalfW - 1.5);
      const halfD     = 0.4;

      // Logs share a current and remain evenly spaced like a real lane.
      const x = -9 + phase + i * spacing;

      const mesh = createLog(halfW * 2);
      mesh.position.set(x, 0, rowZ);
      scene.add(mesh);

      /** @type {ObstacleData} */
      const obs = { type: 'log', rowZ, x, speed, direction, halfW, halfD, mesh };
      activeObstacles.push(obs);
      rowData.obstacles.push(obs);
    }
  }
}

/**
 * Removes all obstacles belonging to the given row Z from the scene and from
 * the activeObstacles array. Visual geometries are shared module-wide.
 *
 * @param {number} rowZ
 */
export function despawnRow(rowZ) {
  const toRemove = activeObstacles.filter(obs => obs.rowZ === rowZ);
  for (const obs of toRemove) {
    scene.remove(obs.mesh);
  }
  // Mutate in-place so existing references to activeObstacles stay valid
  const remaining = activeObstacles.filter(obs => obs.rowZ !== rowZ);
  activeObstacles.length = 0;
  activeObstacles.push(...remaining);
  trainMeshes.delete(rowZ);
}

/**
 * Moves each active obstacle's X position by speed * direction * dt and
 * wraps at ±9 so obstacles loop across the row endlessly. Syncs the mesh.
 *
 * @param {number} dt  Delta time in seconds
 */
export function updateObstacles(dt) {
  for (const obs of activeObstacles) {
    obs.x += obs.speed * obs.direction * dt;
    // Trains travel offscreen (cleared by updateTrains) — skip the wrap
    if (obs.type === 'train') {
      obs.mesh.position.x = obs.x;
      continue;
    }
    // Wrap cars and logs: keep within (-9, 9]
    if (obs.x > 9)  obs.x -= 18;
    if (obs.x < -9) obs.x += 18;
    obs.mesh.position.x = obs.x;
  }
}

// --- Train State ---

/** Individual train meshes keyed by rowZ. @type {Map<number, THREE.Object3D>} */
const trainMeshes = new Map();

const warningColor = new THREE.Color(0xff6600); // orange warning flash
const roadColor    = new THREE.Color(0x757575); // normal road grey

/**
 * Updates all active train rows each frame: manages idle→warning→sweeping state,
 * flashes tile colors during the warning phase, spawns/removes train meshes, and
 * resets the cycle after each sweep.
 *
 * Train movement (X position update) is handled by the existing updateObstacles()
 * since train obstacles are pushed into activeObstacles as normal entries.
 *
 * @param {number} dt - Delta time in seconds
 * @param {Map<number, object>} rows - Active terrain rows (from terrain.js)
 * @param {import('three').InstancedMesh} roadMesh - Road InstancedMesh for color flashing
 */
export function updateTrains(dt, rows, roadMesh) {
  for (const [rowZ, rowData] of rows) {
    if (rowData.type !== 'train' || !rowData.trainState) continue;

    const ts = rowData.trainState;

    // ── Idle: count down until warning time ──────────────────────────────────
    if (ts.phase === 'idle') {
      ts.cooldown -= dt;
      if (ts.cooldown <= 1.0) {
        ts.phase = 'warning';
        ts.warningTimer = 0;
        ts.flashTimer   = 0;
      }
    }

    // ── Warning: flash tiles for 1 second ────────────────────────────────────
    if (ts.phase === 'warning') {
      ts.warningTimer += dt;
      ts.flashTimer   += dt;

      // Toggle tile color every 0.1 s
      if (ts.flashTimer >= 0.1) {
        ts.flashTimer = 0;
        const useWarning = Math.floor(ts.warningTimer / 0.1) % 2 === 0;
        const color = useWarning ? warningColor : roadColor;
        for (const { meshType, index } of rowData.slots) {
          if (meshType === 'road') {
            roadMesh.setColorAt(index, color);
          }
        }
        if (roadMesh.instanceColor) roadMesh.instanceColor.needsUpdate = true;
      }

      if (ts.warningTimer >= 1.0) {
        // Restore normal tile color
        for (const { meshType, index } of rowData.slots) {
          if (meshType === 'road') {
            roadMesh.setColorAt(index, roadColor);
          }
        }
        if (roadMesh.instanceColor) roadMesh.instanceColor.needsUpdate = true;

        // Each track keeps a stable direction across repeated sweeps.
        const direction = ts.direction;
        const halfW = ts.halfW;
        const startX = direction === 1 ? -15 - halfW : 15 + halfW;

        const trainMesh = createTrain(halfW * 2, direction);
        trainMesh.position.set(startX, 0, rowZ);
        scene.add(trainMesh);
        trainMeshes.set(rowZ, trainMesh);

        /** @type {import('./obstacles.js').ObstacleData} */
        const obs = {
          type: 'train',
          rowZ,
          x:         startX,
          speed:     15,
          direction,
          halfW,
          halfD:     0.4,
          mesh:      trainMesh,
        };
        activeObstacles.push(obs);
        rowData.obstacles.push(obs);

        ts.phase     = 'sweeping';
        // Pre-load next cooldown so it's ready when sweeping ends
        ts.cooldown  = 4 + Math.random() * 4;
      }
    }

    // ── Sweeping: wait for train to exit the far side ────────────────────────
    if (ts.phase === 'sweeping') {
      const trainObs = activeObstacles.find(o => o.type === 'train' && o.rowZ === rowZ);
      if (!trainObs) {
        // Cleared already (e.g. by despawnRow), reset to idle
        ts.phase = 'idle';
        continue;
      }

      const clearX = 15 + trainObs.halfW;
      const cleared = ts.direction === 1 ? trainObs.x > clearX : trainObs.x < -clearX;
      if (cleared) {
        // Remove train mesh from scene and obstacle lists
        scene.remove(trainObs.mesh);
        const ai = activeObstacles.indexOf(trainObs);
        if (ai !== -1) activeObstacles.splice(ai, 1);
        const ri = rowData.obstacles.indexOf(trainObs);
        if (ri !== -1) rowData.obstacles.splice(ri, 1);
        trainMeshes.delete(rowZ);

        ts.phase = 'idle';
      }
    }
  }
}

/**
 * Log riding: if the player is on a river row and overlapping a log (AABB on
 * the X axis), carry the player's world X by the log's lateral velocity.
 *
 * Only the first overlapping log is applied (player can only ride one at a
 * time). playerState.col is intentionally not updated here — that integer snap
 * happens on the next hop land so it doesn't interfere with hop logic.
 *
 * @param {{ row: number, x: number }} playerState - canonical grid state
 * @param {THREE.Group} group - the player's Three.js group (position updated directly)
 * @param {Map<number, object>} rows - terrain rows map from terrain.js
 * @param {number} dt  Delta time in seconds
 */
export function updateLogRiding(playerState, group, rows, dt) {
  const currentRow = rows.get(playerState.row);
  if (!currentRow || currentRow.type !== 'river') return;

  const logs = activeObstacles.filter(obs => obs.type === 'log' && obs.rowZ === playerState.row);

  for (const log of logs) {
    if (Math.abs(playerState.x - log.x) < 0.35 + log.halfW) {
      // Carry player with the log
      const dx = log.speed * log.direction * dt;
      playerState.x += dx;
      group.position.x = playerState.x;
      // Keep the chicken's feet above the cylindrical log instead of clipping
      // through it at the normal terrain height.
      group.position.y = LOG_SURFACE_Y;
      break;
    }
  }
}
