/**
 * src/spawner.js
 * ─────────────────────────────────────────────────────────────
 * Safe-spawn algorithm and food spawning.
 * All items are placed on random EMPTY cells that don't overlap
 * the snake, existing food, or other game objects.
 *
 * Reference: game-algorithms-research.md § 5
 */

import { state } from './state.js';
import { GRID_COLS, GRID_ROWS } from './config.js';

/**
 * Build a Set<"x,y"> of all currently occupied cells.
 * Rebuilt fresh before every spawn call so stale positions
 * are never inadvertently excluded.
 * @returns {Set<string>}
 */
function getOccupied() {
  const occupied = new Set();

  // Snake segments
  state.snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`));

  // Current food
  if (state.food) occupied.add(`${state.food.x},${state.food.y}`);

  return occupied;
}

/**
 * Pick a random empty cell from the grid that is NOT in `occupied`.
 * Optional `safeZone` excludes additional cells (e.g., snake-head
 * neighbourhood) — reserved for Modern Mode obstacle spawning.
 *
 * @param {Set<string>} occupied   - Cells that must not be used.
 * @param {Set<string>} [safeZone] - Extra cells to exclude.
 * @returns {{ x: number, y: number } | null} Null if grid is full.
 */
export function safeSpawn(occupied, safeZone = new Set()) {
  const available = [];

  for (let x = 0; x < GRID_COLS; x++) {
    for (let y = 0; y < GRID_ROWS; y++) {
      const key = `${x},${y}`;
      if (!occupied.has(key) && !safeZone.has(key)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    // Grid is full — no space to spawn
    return null;
  }

  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

/**
 * Spawn exactly one food item on a random empty cell.
 * Mutates state.food in place.
 * If the grid is completely full, food is set to null.
 */
export function spawnFood() {
  const occupied = getOccupied();
  state.food = safeSpawn(occupied);
}
