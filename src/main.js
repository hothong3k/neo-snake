/**
 * src/main.js
 * ─────────────────────────────────────────────────────────────
 * Entry point — bootstraps all systems and runs the game loop.
 *
 * Game Loop design (requestAnimationFrame + accumulator):
 *   - render() is called every animation frame (smooth visuals).
 *   - update() is called at a FIXED rate (state.tickInterval ms)
 *     using an accumulator to decouple game speed from frame rate.
 *   - `while` (not `if`) fires multiple ticks on lag frames,
 *     keeping game state consistent.
 *   - lastTimestamp === null guard prevents the massive deltaTime
 *     spike on the first frame (or after a resume).
 *
 * Reference: game-algorithms-research.md § 3
 */

import { state }              from './state.js';
import { initGame, update, setupButtons } from './game.js';
import { setupInput }         from './input.js';
import { initRenderer, render } from './renderer.js';

// ─── Bootstrap ────────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');

initRenderer(canvas);   // Set canvas dimensions, cache ctx
setupInput();           // Register window keydown listener
setupButtons();         // Wire overlay button click handlers
initGame();             // Load high score, show MENU screen

// ─── Game Loop ────────────────────────────────────────────────

/**
 * @param {DOMHighResTimeStamp} timestamp - Provided by requestAnimationFrame.
 */
function gameLoop(timestamp) {

  if (state.gameState === 'PLAYING') {

    // ── First-frame / post-resume guard ───────────────────────
    // On the very first frame after starting or resuming, skip the
    // tick accumulation to avoid a huge deltaTime spike that would
    // fire dozens of phantom ticks instantly.
    if (state.lastTimestamp === null) {
      state.lastTimestamp = timestamp;
      requestAnimationFrame(gameLoop);
      render(timestamp);
      return;
    }

    // ── Accumulate delta time ──────────────────────────────────
    const deltaTime = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;
    state.accumulator  += deltaTime;

    // ── Fixed-rate tick loop ───────────────────────────────────
    // Using `while` ensures lag frames fire multiple ticks so game
    // time stays accurate (at the cost of slight visual hitching on
    // very slow machines — acceptable trade-off).
    while (state.accumulator >= state.tickInterval) {
      update();
      state.accumulator -= state.tickInterval;

      // Stop ticking if a collision ended the game this batch
      if (state.gameState !== 'PLAYING') break;
    }
  }

  // ── Render every frame ─────────────────────────────────────
  // render() is called regardless of gameState so the canvas
  // always shows the last known frame underneath any HTML overlay.
  render(timestamp);

  requestAnimationFrame(gameLoop);
}

// Kick off the loop
requestAnimationFrame(gameLoop);
