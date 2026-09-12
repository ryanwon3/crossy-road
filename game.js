import * as THREE from 'three';
import { scene, camera, renderer, updateCamera, resetCamera } from './scene.js';
import { startHop, updatePlayer, playerState, inputBuffer, hopState, setOnHopLanded, setSurfaceHeightResolver, getWorldPosition, group, reset, PLAYER_BASE_Y } from './player.js';
import { updateTerrain, generateRow, generateGrassRow, resetTerrain, rows, roadMesh, setOnRowGenerated, setOnRowRecycled } from './terrain.js';
import { updateObstacles, updateLogRiding, spawnObstaclesForRow, despawnRow, updateTrains, activeObstacles, LOG_SURFACE_Y } from './obstacles.js';
import { checkCollisions, checkRiverDeath, checkCameraLag } from './collision.js';
import { updateScoreHUD, showGameOver, hideGameOver, loadHighScore, saveHighScore, setRestartHandler } from './ui.js';

// --- Clock ---
const clock = new THREE.Clock();

// --- Game State ---
export let gameRunning = false;

/** Allow other modules (death/restart) to toggle the running flag. */
export function setGameRunning(value) {
  gameRunning = value;
}

// --- Score ---
export let maxRow = 0;
let highScore = loadHighScore();

// --- Obstacle lifecycle hooks ---
setOnRowGenerated((rowData) => spawnObstaclesForRow(rowData));
setOnRowRecycled((rowZ) => despawnRow(rowZ));
setSurfaceHeightResolver((row) => rows.get(row)?.type === 'river' ? LOG_SURFACE_Y : PLAYER_BASE_Y);

// --- Hop-land callback: river death check (Task 7.2) ---
setOnHopLanded(() => {
  if (checkRiverDeath(playerState, rows, activeObstacles)) {
    onPlayerDeath();
    return false;
  }
  return true;
});

// --- Input ---
function keyToDirection(key) {
  switch (key) {
    case 'ArrowUp':    case 'w': case 'W': return 'up';
    case 'ArrowDown':  case 's': case 'S': return 'down';
    case 'ArrowLeft':  case 'a': case 'A': return 'left';
    case 'ArrowRight': case 'd': case 'D': return 'right';
    default: return null;
  }
}

window.addEventListener('keydown', (e) => {
  // R key restarts the game when the game-over screen is visible
  if ((e.key === 'r' || e.key === 'R') && !gameRunning) {
    resetGame();
    return;
  }

  if (!gameRunning) return;
  const dir = keyToDirection(e.key);
  if (!dir) return;
  e.preventDefault(); // prevent arrow keys scrolling the page
  if (!hopState.isHopping) {
    startHop(dir);
  } else {
    inputBuffer.direction = dir;
  }
});

// --- Terrain Seeding ---
/**
 * Seeds the initial world. Rows 0–2 are forced grass so the player always
 * starts on safe ground; the rest are procedurally generated up to GENERATE_AHEAD.
 */
function seedWorld() {
  // Safe starting zone — always grass
  generateGrassRow(0);
  generateGrassRow(1);
  generateGrassRow(2);
  // Procedural rows beyond the safe zone
  for (let z = 3; z <= 20; z++) {
    generateRow(z);
  }
}

// --- Player Death (Task 7.4) ---
/**
 * Triggered when the player dies (car/train hit, river fall, or camera-lag).
 * Freezes the game loop and shows the game-over UI.
 * Guard against double-trigger since per-frame and on-land checks can both fire.
 */
export function onPlayerDeath() {
  if (!gameRunning) return; // already dead — don't re-trigger

  gameRunning = false; // freeze the game loop (Requirement 6.7)

  showGameOver(maxRow, highScore);
}

// --- Game Loop ---
function gameLoop() {
  if (!gameRunning) return;

  requestAnimationFrame(gameLoop);

  let dt = clock.getDelta();
  dt = Math.min(dt, 0.05); // cap at 50 ms to prevent tunneling on frame spikes

  updatePlayer(dt);
  if (!gameRunning) return;
  updateObstacles(dt);
  updateTrains(dt, rows, roadMesh);
  if (!hopState.isHopping) {
    updateLogRiding(playerState, group, rows, dt);
  }

  // Per-frame death checks (Tasks 7.1 / 7.3)
  if (checkCollisions(playerState, activeObstacles) === 'hit') {
    onPlayerDeath();
    return;
  }
  // Logs can wrap or carry a grounded player beyond the world edge.
  if (!hopState.isHopping && checkRiverDeath(playerState, rows, activeObstacles)) {
    onPlayerDeath();
    return;
  }
  if (checkCameraLag(playerState, camera)) {
    onPlayerDeath();
    return;
  }

  // Track max row for score (Requirement 7.1)
  if (playerState.row > maxRow) maxRow = playerState.row;
  if (maxRow > highScore) {
    highScore = maxRow;
    saveHighScore(highScore);
  }
  updateScoreHUD(maxRow);

  updateCamera(getWorldPosition());
  updateTerrain(playerState.row);

  renderer.render(scene, camera);
}

// --- Start ---
export function startGame() {
  seedWorld();
  resetCamera(getWorldPosition());
  gameRunning = true;
  clock.start();
  requestAnimationFrame(gameLoop);
}

// --- Reset / Restart ---
/**
 * Resets all game state to initial values and resumes play without reloading the page.
 * Called when the player presses R or clicks the Restart button (Requirement 8.2, 8.3, 8.4).
 */
function resetGame() {
  // 1. Reset player position, hop state, and input buffer
  reset();

  // 2. Recycle all terrain rows and reset genState.
  //    recycleRow fires _onRowRecycled → despawnRow for each row, clearing activeObstacles.
  resetTerrain();

  // 3. Reset score
  maxRow = 0;
  updateScoreHUD(0);

  // 4. Hide the game-over overlay
  hideGameOver();

  // 5. Seed the world fresh (rows 0-2 grass + procedural rows 3-20)
  seedWorld();
  resetCamera(getWorldPosition());

  // 6. Resume the game loop
  gameRunning = true;
  clock.start();
  requestAnimationFrame(gameLoop);
}

// Auto-start when the module loads
// Wire the restart button in ui.js to resetGame
setRestartHandler(resetGame);
startGame();
