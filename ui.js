// ui.js — Score HUD, game-over overlay, localStorage helpers

const LS_KEY = 'crossyroad-highscore';

// --- Score HUD ---
const scoreDiv = document.createElement('div');
Object.assign(scoreDiv.style, {
  position: 'absolute',
  top: '16px',
  left: '16px',
  color: 'white',
  fontSize: '24px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  letterSpacing: '0.02em',
  padding: '10px 14px',
  borderRadius: '10px',
  background: 'rgba(22, 38, 44, 0.52)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16)',
  pointerEvents: 'none',
  textShadow: '2px 2px 4px black',
  userSelect: 'none',
  zIndex: '10',
});
scoreDiv.textContent = 'Score: 0';
document.body.appendChild(scoreDiv);

const controlsDiv = document.createElement('div');
Object.assign(controlsDiv.style, {
  position: 'absolute',
  right: '16px',
  bottom: '16px',
  padding: '8px 12px',
  borderRadius: '9px',
  background: 'rgba(22, 38, 44, 0.46)',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  color: 'rgba(255, 255, 255, 0.92)',
  font: '600 13px monospace',
  letterSpacing: '0.03em',
  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: '10',
});
controlsDiv.textContent = 'ARROWS / WASD  •  HOP TO CROSS';
document.body.appendChild(controlsDiv);

// --- Game-Over Overlay ---
const overlay = document.createElement('div');
Object.assign(overlay.style, {
  position: 'absolute',
  inset: '0',
  display: 'none',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(12, 22, 28, 0.72)',
  backdropFilter: 'blur(3px)',
  color: 'white',
  fontFamily: 'monospace',
  zIndex: '20',
});
overlay.innerHTML = `
  <h1 style="font-size:48px; margin:0 0 12px 0; letter-spacing:0.04em;">Game Over</h1>
  <p id="go-score" style="font-size:28px; margin:4px 0;">Score: 0</p>
  <p id="go-hi"    style="font-size:20px; margin:4px 0; opacity:0.8;">Best: 0</p>
  <p style="font-size:16px; margin:16px 0 8px 0;">Press <strong>R</strong> to restart</p>
  <button id="restart-btn"
    style="padding:10px 32px; font-size:18px; font-family:monospace;
           cursor:pointer; border:1px solid rgba(255,255,255,0.35); border-radius:8px;
           background:#ef8f32; color:white; margin-top:8px;
           box-shadow:0 5px 16px rgba(0,0,0,0.3);">
    Restart
  </button>
`;
document.body.appendChild(overlay);

// --- localStorage helpers ---

/**
 * Returns the stored high score (0 if none).
 * @returns {number}
 */
export function loadHighScore() {
  const score = Number.parseInt(localStorage.getItem(LS_KEY) || '0', 10);
  return Number.isFinite(score) && score >= 0 ? score : 0;
}

/**
 * Persists a new high score to localStorage.
 * @param {number} score
 */
export function saveHighScore(score) {
  localStorage.setItem(LS_KEY, String(Math.max(0, Math.floor(score))));
}

// --- Score HUD ---

/**
 * Updates the on-screen score display.
 * @param {number} score
 */
export function updateScoreHUD(score) {
  scoreDiv.textContent = `Score: ${score}`;
}

// --- Game-over overlay ---

/**
 * Shows the game-over overlay with the given score and high score.
 * @param {number} score
 * @param {number} hi
 */
export function showGameOver(score, hi) {
  document.getElementById('go-score').textContent = `Score: ${score}`;
  document.getElementById('go-hi').textContent    = `Best: ${hi}`;
  overlay.style.display = 'flex';
}

/**
 * Hides the game-over overlay.
 */
export function hideGameOver() {
  overlay.style.display = 'none';
}

/**
 * Registers the callback invoked when the player clicks Restart or presses R.
 * Called once from game.js during init so ui.js stays free of game.js imports.
 * @param {Function} onRestart
 */
export function setRestartHandler(onRestart) {
  document.getElementById('restart-btn').addEventListener('click', () => onRestart());
}

export { overlay };
