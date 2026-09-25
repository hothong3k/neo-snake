/**
 * src/game.js
 * ─────────────────────────────────────────────────────────────
 * Core game logic for Classic Mode:
 *   - Game state machine (MENU / PLAYING / PAUSED / GAME_OVER)
 *   - update() — one game tick
 *   - updateSpeed() — logarithmic difficulty curve
 *   - DOM screen management and UI updates
 *   - Button event bindings
 *
 * Reference: game-algorithms-research.md §§ 7, 8, 10
 */

import { state } from './state.js';
import {
  GRID_COLS, GRID_ROWS,
  BASE_TICK_INTERVAL, MIN_TICK_INTERVAL,
  POINTS_PER_FOOD,
} from './config.js';
import { initSnake, computeNewHead, moveSnake } from './snake.js';
import { spawnFood } from './spawner.js';
import { checkWallCollision, checkSelfCollision, checkFoodCollision } from './collision.js';
import { loadHighScore, saveHighScore } from './storage.js';

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

// ─── HUD DOM References ────────────────────────────────
const hud      = document.getElementById('hud');
const hudScore = document.getElementById('hud-score');
const hudBest  = document.getElementById('hud-best');

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

/** Sync HUD score and best score displays. */
function updateHUD() {
  hudScore.innerHTML = `Score&ensp;<strong>${state.score}</strong>`;
  hudBest.innerHTML  = `Best&ensp;<strong>${state.highScore}</strong>`;
}

// ─── Speed (Progressive Difficulty) ──────────────────────────

/**
 * Recalculate tick interval based on current score.
 * Uses a logarithmic curve so early-game acceleration is fast
 * while high-score progression is more gradual.
 *
 * Called ONLY on food-eat events and once at game start.
 * NEVER called inside the tick loop (would overwrite Speed Boost).
 *
 * Formula: interval = max(MIN, 200 - 20·log₂(score + 1))
 *   score=0   → 200 ms  (base speed)
 *   score=100 → ≈ 153 ms
 *   score=500 → ≈ 113 ms
 *   score=∞   → 60 ms   (floor)
 *
 * Reference: game-algorithms-research.md § 7
 *
 * @param {number} score
 */
export function updateSpeed(score) {
  state.baseTickInterval = Math.max(
    MIN_TICK_INTERVAL,
    200 - 20 * Math.log2(score + 1)
  );
  state.tickInterval = state.baseTickInterval;
}

// ─── State Transitions ────────────────────────────────────────

/**
 * One-time initialisation called from main.js.
 * Loads the stored high score and shows the menu.
 */
export function initGame() {
  state.highScore = loadHighScore();
  menuHsValue.textContent = state.highScore;
  showScreen('MENU');
  state.gameState = 'MENU';
}

/**
 * Start (or restart) a game session.
 * Resets all mutable state and kicks off the first tick.
 */
export function startGame() {
  // Reset snake, direction buffers
  initSnake();

  // Reset session state
  state.score       = 0;
  state.food        = null;
  state.gameState   = 'PLAYING';
  state.lastTimestamp = null;  // Trigger first-frame guard in game loop
  state.accumulator   = 0;

  // Set initial speed via the formula (even at score 0, for consistency)
  updateSpeed(0);

  // Place food
  spawnFood();

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
 * Saves high score, updates UI, shows overlay.
 */
export function triggerGameOver() {
  state.gameState = 'GAME_OVER';

  const isNewRecord = saveHighScore(state.score);
  state.highScore   = loadHighScore(); // Re-read to guarantee sync

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
  menuHsValue.textContent = state.highScore;
  showHUD(false);
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
 * Classic Mode tick flow (research §10):
 *   1. Apply buffered direction
 *   2. Compute new head position
 *   3. Wall collision  → Game Over
 *   4. Self-collision  → Game Over
 *   5. Food collision  → Grow + Score + new speed
 *   6. Move snake
 */
export function update() {
  if (state.gameState !== 'PLAYING') return;

  // Step 1 — Apply the buffered next direction.
  //   currentDirection is the direction BEING executed this tick.
  //   nextDirection was set (possibly multiple times) since the last tick.
  state.currentDirection = state.nextDirection;

  // Step 2 — Compute where the head will be after this move.
  const newHead = computeNewHead();

  // Step 3 — Wall collision (Classic Mode: instant Game Over).
  if (checkWallCollision(newHead)) {
    triggerGameOver();
    return;
  }

  // Step 4 — Self-collision.
  //   Correct approach: check newHead against the segments that will
  //   REMAIN after the move.
  //   - Without food: tail is removed → check [0 .. n-2]
  //   - With food:    tail stays      → check [0 .. n-1]
  //   This correctly allows the snake to "chase its own tail" into the
  //   cell that the tail just vacated.
  const atFood   = checkFoodCollision(newHead, state.food);
  const checkEnd = atFood ? state.snake.length : state.snake.length - 1;

  if (checkSelfCollision(newHead, state.snake.slice(0, checkEnd))) {
    triggerGameOver();
    return;
  }

  // Step 5 — Move the snake (grow if food was eaten).
  moveSnake(newHead, atFood);

  // Step 6 — Food eaten: update score, speed, spawn new food.
  if (atFood) {
    state.score += POINTS_PER_FOOD;
    updateSpeed(state.score);   // Only called here (and at game start)
    updateHUD();                // Sync HUD score display
    spawnFood();
  }
}
