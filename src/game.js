/**
 * src/game.js
 * ─────────────────────────────────────────────────────────────
 * Core game logic for Classic & Modern Mode:
 *   - Game state machine (MENU / PLAYING / PAUSED / GAME_OVER)
 *   - update() — one game tick (branching Classic / Modern)
 *   - updateSpeed() — logarithmic difficulty curve
 *   - DOM screen management and UI updates
 *   - Button event bindings
 *
 * Reference: game-algorithms-research.md §§ 7, 8, 10
 */

import { state } from './state.js';
import {
  POINTS_PER_FOOD, HIGH_SCORE_KEY_MODERN, HIGH_SCORE_KEY,
} from './config.js';
import { initSnake, computeNewHead, moveSnake } from './snake.js';
import { spawnFood, spawnObstacles, updateObstacles, updatePowerUpTimers } from './spawner.js';
import { checkWallCollision, checkSelfCollision, checkFoodCollision, handleModernWallCollision,
         checkObstacleCollision, checkPowerUpCollision } from './collision.js';
import { loadHighScore, saveHighScore } from './storage.js';
import { applyEffect, updateEffects } from './effects.js';
import { updateSpeed } from './speed.js';

// ─── DOM References ───────────────────────────────────────────
const screenMenu    = document.getElementById('screen-menu');
const screenPause   = document.getElementById('screen-pause');
const screenGameOver = document.getElementById('screen-game-over');

const menuHsValue    = document.getElementById('menu-hs-value');
const goScore        = document.getElementById('go-score');
const goHighScore    = document.getElementById('go-high-score');
const newRecordBadge = document.getElementById('new-record-badge');

const btnStart     = document.getElementById('btn-start');
const btnRetry     = document.getElementById('btn-retry');
const btnMenu      = document.getElementById('btn-menu');
const btnResume    = document.getElementById('btn-resume');
const btnPauseMenu = document.getElementById('btn-pause-menu');

const menuPowerUpGuide  = document.getElementById('menu-powerup-guide');
const pausePowerUpGuide = document.getElementById('pause-powerup-guide');

// ─── HUD DOM References ────────────────────────────────
const hud        = document.getElementById('hud');
const hudScore   = document.getElementById('hud-score');
const hudBest    = document.getElementById('hud-best');
const hudMode    = document.getElementById('hud-mode');
const hudEffects = document.getElementById('hud-effects');

// ─── Screen Helpers ───────────────────────────────────────────

/** Activate exactly one overlay by name; deactivate all others. */
function showScreen(name) {
  const screens = { MENU: screenMenu, PAUSE: screenPause, GAME_OVER: screenGameOver };
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
}

/** Remove the 'active' class from every overlay. */
function hideAllScreens() {
  [screenMenu, screenPause, screenGameOver].forEach(s => s.classList.remove('active'));
}

/** Show or hide the HUD strip above the canvas. */
function showHUD(visible) {
  if (visible) {
    hud.classList.remove('hidden');
  } else {
    hud.classList.add('hidden');
  }
}

/** Sync HUD score, best score, and active effect indicators. */
function updateHUD() {
  hudScore.innerHTML = `Score&ensp;<strong>${state.score}</strong>`;
  hudBest.innerHTML  = `Best&ensp;<strong>${state.highScore}</strong>`;

  if (hudEffects) {
    if (state.gameMode === 'MODERN') {
      const pills = [];

      // Instant toast (SHRINK) — hiển thị rõ ràng
      if (state.instantToast && state.instantToast.type === 'SHRINK') {
        pills.push({
          type: 'SHRINK',
          className: 'effect-pill--shrink',
          icon: '✂️',
          text: 'SHRINK −3',
        });
      }

      // Timed effects
      state.activeEffects.forEach(e => {
        const secs = Math.ceil(e.remainingMs / 1000);
        if (e.type === 'SPEED_BOOST') {
          pills.push({
            type: 'SPEED_BOOST',
            className: 'effect-pill--speed',
            icon: '⚡',
            text: `SPEED BOOST ${secs}s`,
          });
        } else if (e.type === 'SHIELD') {
          pills.push({
            type: 'SHIELD',
            className: 'effect-pill--shield',
            icon: '🛡️',
            text: `SHIELD ${secs}s`,
          });
        }
      });

      // Synchronize DOM elements to prevent animation flicker on every tick
      const existingPills = Array.from(hudEffects.querySelectorAll('.effect-pill'));
      const existingTypes = existingPills.map(p => p.dataset.type).join(',');
      const newTypes = pills.map(p => p.type).join(',');

      if (existingTypes !== newTypes) {
        // Types changed (added or removed) -> render new pill elements
        hudEffects.innerHTML = pills.map(p =>
          `<span class="effect-pill ${p.className}" data-type="${p.type}">` +
          `<span class="pill-icon">${p.icon}</span> <span class="pill-text">${p.text}</span>` +
          `</span>`
        ).join('');
      } else {
        // Same types present -> only update text content without resetting animation
        pills.forEach((p, i) => {
          const textEl = existingPills[i]?.querySelector('.pill-text');
          if (textEl && textEl.textContent !== p.text) {
            textEl.textContent = p.text;
          }
        });
      }
    } else {
      if (hudEffects.innerHTML !== '') {
        hudEffects.innerHTML = '';
      }
    }
  }
}

// updateSpeed has been moved to src/speed.js to break circular dependency
// with effects.js. It is imported above and re-exported here for backward
// compatibility with any external consumers.
export { updateSpeed };

// ─── State Transitions ────────────────────────────────────────

/** Cập nhật ẩn/hiện bảng power-up guide tại Menu theo chế độ đang chọn */
function updateMenuPowerUpGuide() {
  const modeEl = document.querySelector('input[name="game-mode"]:checked');
  const isModern = modeEl?.value?.toUpperCase() === 'MODERN';
  if (menuPowerUpGuide) {
    menuPowerUpGuide.classList.toggle('hidden', !isModern);
  }
}

/**
 * One-time initialisation called from main.js.
 * Loads the stored high score and shows the menu.
 */
export function initGame() {
  state.highScore = loadHighScore();
  menuHsValue.textContent = state.highScore;
  showScreen('MENU');
  state.gameState = 'MENU';

  // Mode selector toggle
  document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.mode-card').classList.add('selected');

      // Update high score display for the selected mode
      const key = radio.value === 'modern' ? HIGH_SCORE_KEY_MODERN : HIGH_SCORE_KEY;
      const hs = loadHighScore(key);
      menuHsValue.textContent = hs;

      updateMenuPowerUpGuide();
    });
  });

  updateMenuPowerUpGuide();
}

/**
 * Start (or restart) a game session.
 * Resets all mutable state and kicks off the first tick.
 */
export function startGame() {
  // Đọc mode từ radio button
  const modeEl = document.querySelector('input[name="game-mode"]:checked');
  state.gameMode = modeEl?.value?.toUpperCase() === 'MODERN' ? 'MODERN' : 'CLASSIC';

  // CSS accent override
  document.body.classList.toggle('mode-modern', state.gameMode === 'MODERN');
  hudMode.textContent = state.gameMode;

  if (state.gameMode === 'MODERN') {
    Object.assign(state, {
      isStopped: false, stoppedAtWall: null, wallStopFlash: false,
      obstacles: [], obstacleTimer: 0,
      obstacleRelocationCount: 0,        // ← THÊM
      activePowerUp: null, powerUpSpawnTimer: 0,
      activeEffects: [], speedBoostActive: false, hasShield: false,
      instantToast: null,                // ← THÊM
    });
  }

  // BUG FIX: Reset snake + food TRƯỚC khi gọi spawnObstacles().
  // spawnObstacles() → getHeadSafeZone() đọc state.snake[0] và
  // getOccupiedCells() đọc state.snake / state.food. Từ ván thứ 2 trở đi,
  // nếu gọi spawnObstacles() trước reset, snake/food ở vị trí cũ →
  // occupied set sai → obstacle có thể spawn đè lên đầu rắn mới (instant death)
  // hoặc lọt vào thân rắn.
  initSnake();       // Reset snake về vị trí ban đầu
  spawnFood();       // Đặt food mới (dùng vị trí snake mới để tính occupied)

  // Reset session state
  state.score       = 0;
  state.food        = state.food; // already set by spawnFood()
  state.gameState   = 'PLAYING';
  state.lastTimestamp = null;  // Trigger first-frame guard in game loop
  state.accumulator   = 0;

  // Set initial speed via the formula (even at score 0, for consistency)
  updateSpeed(0);

  if (state.gameMode === 'MODERN') {
    // Lúc này snake + food đã ở đúng vị trí mới → safeZone và occupied chính xác
    spawnObstacles();
  }

  // Load the correct high score for the selected mode
  const hsKey = state.gameMode === 'MODERN' ? HIGH_SCORE_KEY_MODERN : HIGH_SCORE_KEY;
  state.highScore = loadHighScore(hsKey);

  // Show HUD, hide all overlays → canvas becomes visible
  showHUD(true);
  updateHUD();
  hideAllScreens();
}

/**
 * Pause the game.
 * Resets accumulator so no phantom ticks fire on resume.
 */
export function pauseGame() {
  if (state.gameState !== 'PLAYING') return;
  state.gameState   = 'PAUSED';
  state.accumulator = 0;

  if (pausePowerUpGuide) {
    pausePowerUpGuide.classList.toggle('hidden', state.gameMode !== 'MODERN');
  }

  showScreen('PAUSE');
}

/**
 * Resume from pause.
 * Resets lastTimestamp to prevent a massive deltaTime spike.
 */
export function resumeGame() {
  if (state.gameState !== 'PAUSED') return;
  state.gameState     = 'PLAYING';
  state.lastTimestamp = null;   // First-frame guard will skip one frame
  state.accumulator   = 0;
  hideAllScreens();
}

/**
 * Transition to GAME_OVER.
 * Saves high score (per mode), updates UI, shows overlay.
 */
export function triggerGameOver() {
  state.gameState = 'GAME_OVER';

  const key = state.gameMode === 'MODERN' ? HIGH_SCORE_KEY_MODERN : HIGH_SCORE_KEY;
  const isNewRecord = saveHighScore(state.score, key);
  state.highScore   = loadHighScore(key); // Re-read to guarantee sync

  goScore.textContent     = state.score;
  goHighScore.textContent = state.highScore;

  if (isNewRecord) {
    newRecordBadge.classList.remove('hidden');
  } else {
    newRecordBadge.classList.add('hidden');
  }

  // Sync HUD best score in case a new record was just set
  updateHUD();

  showScreen('GAME_OVER');
}

/**
 * Return to the main menu from GAME_OVER or PAUSED.
 */
export function resetToMenu() {
  state.gameState         = 'MENU';
  state.lastTimestamp     = null;
  state.accumulator       = 0;

  // Cleanup Modern Mode CSS
  document.body.classList.remove('mode-modern');

  // Load high score for the currently selected mode in the menu
  const modeEl = document.querySelector('input[name="game-mode"]:checked');
  const selectedMode = modeEl?.value?.toUpperCase() === 'MODERN' ? 'MODERN' : 'CLASSIC';
  const hsKey = selectedMode === 'MODERN' ? HIGH_SCORE_KEY_MODERN : HIGH_SCORE_KEY;
  state.highScore = loadHighScore(hsKey);
  menuHsValue.textContent = state.highScore;

  showHUD(false);
  updateMenuPowerUpGuide();
  showScreen('MENU');
}

// ─── Button Bindings ──────────────────────────────────────────

/**
 * Wire up click handlers for the overlay buttons.
 * Called once from main.js during setup.
 */
export function setupButtons() {
  btnStart.addEventListener('click', startGame);
  btnRetry.addEventListener('click', startGame);
  btnMenu.addEventListener('click',  resetToMenu);
  btnResume.addEventListener('click', resumeGame);
  btnPauseMenu.addEventListener('click', resetToMenu);
}

// ─── Core Game Tick ───────────────────────────────────────────

/**
 * Execute one game tick.
 * Called by the accumulator loop in main.js whenever
 * enough time has passed (accumulator >= tickInterval).
 *
 * Classic / Modern Mode tick flow (research §10):
 *   1. Apply buffered direction
 *   2. (Modern) If stopped → run obstacle timer, skip move
 *   3. Compute new head position
 *   4. Wall collision
 *      - Classic: → Game Over
 *      - Modern:  → isStopped=true, wallStopFlash=true
 *   5. Self-collision  → Game Over
 *   6. (Modern) Obstacle collision → Game Over
 *   7. Move snake
 *   8. Food collision  → Grow + Score + new speed
 *   9. (Modern) Update obstacle relocation timer
 */
export function update() {
  if (state.gameState !== 'PLAYING') return;

  // Step 1 — Apply the buffered next direction.
  state.currentDirection = state.nextDirection;

  // Step 2 (Modern only) — Rắn đang dừng → chạy timers và return
  if (state.gameMode === 'MODERN' && state.isStopped) {
    updateObstacles(state.tickInterval);
    updatePowerUpTimers(state.tickInterval);    // ← MỚI
    updateEffects(state.tickInterval);          // ← MỚI
    updateHUD();
    return;
  }

  // Step 3 — Compute where the head will be after this move.
  const newHead = computeNewHead();

  // Step 4 — Wall collision
  if (state.gameMode === 'CLASSIC') {
    if (checkWallCollision(newHead)) {
      triggerGameOver();
      return;
    }
  } else {
    if (handleModernWallCollision(newHead)) {
      state.wallStopFlash = true;
      updateObstacles(state.tickInterval);
      updatePowerUpTimers(state.tickInterval);  // ← MỚI
      updateEffects(state.tickInterval);        // ← MỚI
      updateHUD();
      return;
    }
  }

  // Step 5 — Self-collision.
  const atFood   = checkFoodCollision(newHead, state.food);
  const checkEnd = atFood ? state.snake.length : state.snake.length - 1;

  if (checkSelfCollision(newHead, state.snake.slice(0, checkEnd))) {
    triggerGameOver();
    return;
  }

  // Step 6 (Modern only) — Obstacle collision → Game Over
  //   (checkObstacleCollision bây giờ tự skip nếu hasShield)
  if (state.gameMode === 'MODERN' && checkObstacleCollision(newHead)) {
    triggerGameOver();
    return;
  }

  // Step 7 — Move the snake (grow if food was eaten).
  moveSnake(newHead, atFood);

  // Step 8 — Food eaten: update score, speed, spawn new food.
  if (atFood) {
    state.score += POINTS_PER_FOOD;
    updateSpeed(state.score);
    spawnFood();
  }

  // Step 8b (Modern only) — Power-up collision ← MỚI
  if (state.gameMode === 'MODERN' && checkPowerUpCollision(newHead)) {
    applyEffect(state.activePowerUp.type);
    state.activePowerUp = null; // Xóa khỏi grid
    state.powerUpSpawnTimer = 0; // Reset spawn timer
  }

  // Step 9 (Modern only) — Obstacle relocation timer
  if (state.gameMode === 'MODERN') {
    updateObstacles(state.tickInterval);
  }

  // Step 10 (Modern only) — Power-up spawn/despawn timer ← MỚI
  if (state.gameMode === 'MODERN') {
    updatePowerUpTimers(state.tickInterval);
  }

  // Step 11 (Modern only) — Effect timers ← MỚI
  if (state.gameMode === 'MODERN') {
    updateEffects(state.tickInterval);
  }

  updateHUD();
}
