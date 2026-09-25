/**
 * src/input.js
 * ─────────────────────────────────────────────────────────────
 * Unified keyboard input handler.
 * Single keydown listener → handleInput() → state routing.
 *
 * Implements:
 *   - Arrow key / WASD mapping
 *   - Game-state routing (MENU / PAUSED / GAME_OVER / PLAYING)
 *   - Reversal guard (cannot go directly opposite to current direction)
 *   - Direction buffering into state.nextDirection
 *   - Pause / resume via P or Escape
 *   - Default browser behavior suppression for arrow keys
 *
 * Reference: game-algorithms-research.md § 12
 * NOTE: isStopped / Modern Mode wall logic intentionally omitted here;
 *       reserved for Modern Mode extension.
 */

import { state } from './state.js';
import { startGame, pauseGame, resumeGame, resetToMenu } from './game.js';

/** Keys that must have their default browser action suppressed. */
const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'w', 'W', 'a', 'A', 's', 'S', 'd', 'D',
  ' ',  // Space: prevent page scroll; also blocked from starting game during PLAYING
]);

/** Map every supported key to its logical direction. */
const KEY_TO_DIRECTION = {
  ArrowUp:    'UP',
  ArrowDown:  'DOWN',
  ArrowLeft:  'LEFT',
  ArrowRight: 'RIGHT',
  w: 'UP',   W: 'UP',
  s: 'DOWN', S: 'DOWN',
  a: 'LEFT', A: 'LEFT',
  d: 'RIGHT', D: 'RIGHT',
};

/** Opposite direction map — used to block reversal. */
const OPPOSITES = {
  UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
};

/**
 * Process a single key event.
 * Routes based on current gameState and applies direction buffering.
 *
 * @param {string} key - e.key value from the keydown event.
 */
export function handleInput(key) {
  switch (state.gameState) {

    case 'MENU':
      if (key === ' ' || key === 'Enter') startGame();
      return;

    case 'GAME_OVER':
      if (key === ' ' || key === 'Enter') startGame(); // retry
      return;

    case 'PAUSED':
      if (key === 'Escape' || key === 'p' || key === 'P') resumeGame();
      return;

    case 'PLAYING': {
      // Block Space/Enter while playing — avoid accidental game restart
      if (key === ' ' || key === 'Enter') return;

      // Pause
      if (key === 'Escape' || key === 'p' || key === 'P') {
        pauseGame();
        return;
      }

      const direction = KEY_TO_DIRECTION[key];
      if (!direction) return;

      // Reversal guard: ignore if the pressed direction is exactly opposite
      // to the direction currently being executed.
      // Uses currentDirection (not nextDirection) so that rapid double-press
      // can't slip a reversal through before the tick fires.
      if (direction !== OPPOSITES[state.currentDirection]) {
        state.nextDirection = direction;
      }
      return;
    }

    default:
      return;
  }
}

/**
 * Register the global keydown listener.
 * Call once from main.js during initialisation.
 */
export function setupInput() {
  window.addEventListener('keydown', (e) => {
    // Suppress arrow key scroll and other browser defaults during play
    if (GAME_KEYS.has(e.key)) {
      e.preventDefault();
    }
    handleInput(e.key);
  });
}
