/**
 * collision.js
 * AABB collision helpers and per-frame/on-land death checks.
 */

// Player half-extents (Requirement 6.2)
const PLAYER_HW = 0.35;
const PLAYER_HD = 0.35;
const WORLD_EDGE = 5.5;

/**
 * Returns true if two axis-aligned boxes overlap on both the X and Z axes.
 *
 * Box A centred at (ax, az) with half-extents (ahw, ahd).
 * Box B centred at (bx, bz) with half-extents (bhw, bhd).
 *
 * Overlap condition (Requirement 6.1):
 *   |ax − bx| < ahw + bhw  AND  |az − bz| < ahd + bhd
 *
 * @param {number} ax
 * @param {number} az
 * @param {number} ahw  half-width (X)
 * @param {number} ahd  half-depth (Z)
 * @param {number} bx
 * @param {number} bz
 * @param {number} bhw
 * @param {number} bhd
 * @returns {boolean}
 */
export function boxesOverlap(ax, az, ahw, ahd, bx, bz, bhw, bhd) {
  return (
    Math.abs(ax - bx) < ahw + bhw &&
    Math.abs(az - bz) < ahd + bhd
  );
}

/**
 * Per-frame collision check (Requirements 6.3, 6.4).
 * Tests the player against every car/train obstacle in the player's current row.
 * Returns 'hit' if any overlap is found, null otherwise.
 *
 * @param {{ row: number, x: number, z: number }} playerState
 * @param {import('./obstacles.js').ObstacleData[]} activeObstacles
 * @returns {'hit'|null}
 */
export function checkCollisions(playerState, activeObstacles) {
  const { row, x, z } = playerState;

  for (const obs of activeObstacles) {
    if (obs.rowZ !== row) continue;
    if (obs.type !== 'car' && obs.type !== 'train') continue;

    if (boxesOverlap(x, z, PLAYER_HW, PLAYER_HD, obs.x, obs.rowZ, obs.halfW, obs.halfD)) {
      return 'hit';
    }
  }

  return null;
}

/**
 * River death check — called once when a hop lands (Requirement 6.5).
 * If the current row is a river and no log's AABB covers the player's position,
 * the player has fallen into the water and should die.
 *
 * @param {{ row: number, x: number, z: number }} playerState
 * @param {Map<number, { type: string }>} rows
 * @param {import('./obstacles.js').ObstacleData[]} activeObstacles
 * @returns {boolean}  true → player should die
 */
export function checkRiverDeath(playerState, rows, activeObstacles) {
  const row = rows.get(playerState.row);
  if (!row || row.type !== 'river') return false;

  const { x, z } = playerState;
  if (x < -WORLD_EDGE || x > WORLD_EDGE) return true;
  const logs = activeObstacles.filter(o => o.type === 'log' && o.rowZ === playerState.row);

  const onLog = logs.some(log =>
    boxesOverlap(x, z, PLAYER_HW, PLAYER_HD, log.x, log.rowZ, log.halfW, log.halfD)
  );

  return !onLog;
}

/**
 * Camera-lag death check — called each frame (Requirement 6.6).
 * Returns true when the player has fallen into the rear edge of the camera view.
 *
 * @param {{ z: number }} playerState
 * @param {{ position: { z: number } }} camera
 * @returns {boolean}
 */
export function checkCameraLag(playerState, camera) {
  return playerState.z < camera.position.z + 8;
}
