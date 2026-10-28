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
  MAX_OBSTACLE_COUNT, OBSTACLE_GROW_AFTER_RELOCATIONS,
  POWERUP_SPAWN_INTERVAL, POWERUP_DESPAWN_DURATION,
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
  if (state.activePowerUp) {
    cells.add(`${state.activePowerUp.position.x},${state.activePowerUp.position.y}`);
  }
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
  if (state.activePowerUp) {
    cells.add(`${state.activePowerUp.position.x},${state.activePowerUp.position.y}`);
  }
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
 * Tính số obstacle mong muốn dựa trên số lần tái sinh.
 * - Trước & trong OBSTACLE_GROW_AFTER_RELOCATIONS lần đầu:
 *   giữ nguyên OBSTACLE_COUNT.
 * - Từ lần kế tiếp trở đi: +1 mỗi lần, cap ở MAX_OBSTACLE_COUNT.
 *
 * @param {number} relocationCount
 * @returns {number}
 */
function computeDesiredObstacleCount(relocationCount) {
  if (relocationCount <= OBSTACLE_GROW_AFTER_RELOCATIONS) {
    return OBSTACLE_COUNT;
  }
  const growth = relocationCount - OBSTACLE_GROW_AFTER_RELOCATIONS;
  return Math.min(MAX_OBSTACLE_COUNT, OBSTACLE_COUNT + growth);
}

/**
 * Cập nhật bộ đếm tái sinh obstacle.
 * Gọi trong update() với tickInterval.
 * Ref: game-algorithms-research.md § 5 — tick-based timer
 */
export function updateObstacles(tickInterval) {
  state.obstacleTimer += tickInterval;
  if (state.obstacleTimer < OBSTACLE_RELOCATE_INTERVAL) return;

  state.obstacleTimer = 0;
  state.obstacleRelocationCount += 1;

  const desiredCount = computeDesiredObstacleCount(state.obstacleRelocationCount);
  const safeZone = getHeadSafeZone();

  // Tái sinh toàn bộ — dùng occupied set tích lũy để tránh trùng ô.
  const newObstacles = [];
  const occupied = getOccupiedCellsWithoutObstacles();
  for (let i = 0; i < desiredCount; i++) {
    const pos = safeSpawn(occupied, safeZone);
    if (!pos) break; // Grid gần đầy — dừng sớm
    newObstacles.push(pos);
    occupied.add(`${pos.x},${pos.y}`);
  }
  state.obstacles = newObstacles;
}

/** Danh sách loại power-up, chọn ngẫu nhiên. */
const POWERUP_TYPES = ['SPEED_BOOST', 'SHIELD', 'SHRINK'];

/**
 * Spawn một power-up ngẫu nhiên lên grid.
 * Chỉ spawn nếu chưa có power-up nào trên grid.
 */
export function spawnRandomPowerUp() {
  if (state.activePowerUp) return; // Chỉ 1 power-up cùng lúc

  const occupied = getOccupiedCells();
  const position = safeSpawn(occupied);
  if (!position) return; // Grid đầy

  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  state.activePowerUp = {
    type,
    position,
    despawnTimer: POWERUP_DESPAWN_DURATION,
  };
}

/**
 * Quản lý spawn/despawn timer cho power-up.
 * Gọi trong update() với tickInterval (tick-based, KHÔNG phải deltaTime).
 *
 * Ref: game-algorithms-research.md § 5 — Power-Up Spawning
 */
export function updatePowerUpTimers(tickInterval) {
  if (!state.activePowerUp) {
    // Không có power-up trên grid → đếm thời gian để spawn
    state.powerUpSpawnTimer += tickInterval;
    if (state.powerUpSpawnTimer >= POWERUP_SPAWN_INTERVAL) {
      state.powerUpSpawnTimer = 0;
      spawnRandomPowerUp();
    }
  } else {
    // Có power-up trên grid → đếm thời gian despawn
    state.activePowerUp.despawnTimer -= tickInterval;
    if (state.activePowerUp.despawnTimer <= 0) {
      state.activePowerUp = null; // Biến mất nếu không nhặt kịp
      state.powerUpSpawnTimer = 0; // Reset spawn timer
    }
  }
}
