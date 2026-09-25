/**
 * src/snake.js
 * ─────────────────────────────────────────────────────────────
 * Snake data structure, initialisation, and movement.
 *
 * Reference: game-algorithms-research.md § 2
 */

import { state } from './state.js';
import { GRID_COLS, GRID_ROWS, INITIAL_SNAKE_LENGTH } from './config.js';

/** Direction → {x, y} displacement vectors. */
export const DIR_VECTORS = {
  UP:    { x:  0, y: -1 },
  DOWN:  { x:  0, y: +1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: +1, y:  0 },
};

/**
 * Initialise (or re-initialise) the snake at the grid center,
 * laid out horizontally facing RIGHT:
 *   HEAD → BODY → TAIL
 *   (cx, cy), (cx-1, cy), (cx-2, cy), ...
 *
 * Also resets direction buffers.
 */
export function initSnake() {
  const headX = Math.floor(GRID_COLS / 2);
  const headY = Math.floor(GRID_ROWS / 2);

  state.snake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    state.snake.push({ x: headX - i, y: headY });
  }

  state.currentDirection = 'RIGHT';
  state.nextDirection    = 'RIGHT';
}

/**
 * Compute the position the head will occupy NEXT tick,
 * based on the current direction vector.
 *
 * Does NOT mutate state — call moveSnake() to apply.
 * @returns {{ x: number, y: number }}
 */
export function computeNewHead() {
  const head = state.snake[0];
  const vec  = DIR_VECTORS[state.currentDirection];
  return { x: head.x + vec.x, y: head.y + vec.y };
}

/**
 * Apply a move:
 *   - Prepend newHead at index 0.
 *   - If grew === false, remove the tail (normal move).
 *   - If grew === true,  keep the tail (snake grows by 1).
 *
 * @param {{ x: number, y: number }} newHead
 * @param {boolean} grew
 */
export function moveSnake(newHead, grew) {
  state.snake.unshift(newHead);
  if (!grew) {
    state.snake.pop();
  }
}
