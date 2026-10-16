/**
 * src/spawner.js
 * ─────────────────────────────────────────────────────────────
 * Safe-spawn algorithm, food spawning, and obstacle management.
 * All items are placed on random EMPTY cells that don't overlap
 * the snake, existing food, or other game objects.
 *
 * Reference: game-algorithms-research.md § 5
 */

import { state } from './state.js';
import {
  GRID_COLS, GRID_ROWS,
  OBSTACLE_COUNT, OBSTACLE_RELOCATE_INTERVAL,
  OBSTACLE_HEAD_SAFE_RADIUS,
} from './config.js';

/**
 * Build a Set<"x,y"> of all currently occupied cells.
 * Rebuilt fresh before every spawn call so stale positions
 * are never inadvertently excluded.
 * @returns {Set<string>}
 */
export function getOccupiedCells() {
  const cells = new Set(state.snake.map(s => `${s.x},${s.y}`));
  if (state.food) cells.add(`${state.food.x},${state.food.y}`);
  state.obstacles.forEach(o => cells.add(`${o.x},${o.y}`));
  return cells;
}

/**
 * Giống getOccupiedCells() nhưng KHÔNG tính obstacles hiện tại.
 * Dùng làm điểm xuất phát cho updateObstacles() khi tái sinh toàn bộ
 * obstacle: obstacles cũ đang được thay thế nên không cần giữ chỗ,
 * nhưng snake và food vẫn phải là vùng cấm.
 * @returns {Set<string>}
 */
export function getOccupiedCellsWithoutObstacles() {
  const cells = new Set(state.snake.map(s => `${s.x},${s.y}`));
  if (state.food) cells.add(`${state.food.x},${state.food.y}`);
  return cells;
}

/**
 * Pick a random empty cell from the grid that is NOT in `occupied`.
 * Optional `safeZone` excludes additional cells (e.g., snake-head
 * neighbourhood) — used for Modern Mode obstacle spawning.
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
  const occupied = getOccupiedCells();
  state.food = safeSpawn(occupied);
}

/**
 * Vùng an toàn quanh đầu rắn (bán kính OBSTACLE_HEAD_SAFE_RADIUS).
 * Obstacle không được spawn ở đây để tránh instant death.
 * @returns {Set<string>}
 */
export function getHeadSafeZone() {
  const zone = new Set();
  const head = state.snake[0];
  const r = OBSTACLE_HEAD_SAFE_RADIUS;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      zone.add(`${head.x + dx},${head.y + dy}`);
    }
  }
  return zone;
}

/**
 * Spawn N chướng ngại vật ban đầu.
 * Gọi một lần khi startGame() trong Modern Mode.
 */
export function spawnObstacles() {
  state.obstacles = [];
  const occupied = getOccupiedCells();
  const safeZone = getHeadSafeZone();
  for (let i = 0; i < OBSTACLE_COUNT; i++) {
    const pos = safeSpawn(occupied, safeZone);
    if (pos) {
      state.obstacles.push(pos);
      occupied.add(`${pos.x},${pos.y}`);
    }
  }
  state.obstacleTimer = 0;
}

/**
 * Cập nhật bộ đếm tái sinh obstacle.
 * Gọi trong update() với tickInterval.
 * Ref: game-algorithms-research.md § 5 — tick-based timer
 */
export function updateObstacles(tickInterval) {
  state.obstacleTimer += tickInterval;
  if (state.obstacleTimer >= OBSTACLE_RELOCATE_INTERVAL) {
    state.obstacleTimer = 0;
    const safeZone = getHeadSafeZone();

    // BUG FIX: Không dùng Array.map — trong suốt quá trình map,
    // getOccupiedCells() vẫn thấy mảng obstacle CŨ nên 2 obstacle mới
    // có thể cùng spawn vào một ô.
    // Fix: Dùng vòng lặp ghi trực tiếp với một occupied Set tích lũy,
    // mỗi vị trí mới được đánh dấu ngay trước khi sinh obstacle tiếp theo.
    const newObstacles = [];
    // Bắt đầu từ occupied không có obstacle cũ (chúng đang được tái sinh).
    const occupied = getOccupiedCellsWithoutObstacles();
    for (let i = 0; i < state.obstacles.length; i++) {
      const pos = safeSpawn(occupied, safeZone);
      if (pos) {
        newObstacles.push(pos);
        occupied.add(`${pos.x},${pos.y}`); // Đánh dấu ngay để obstacle tiếp không trùng
      }
    }
    state.obstacles = newObstacles;
  }
}
