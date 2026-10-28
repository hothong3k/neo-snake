/**
 * src/config.js
 * ─────────────────────────────────────────────────────────────
 * All compile-time constants for Neo Snake — Classic Mode.
 * Change values here; they propagate automatically.
 */

/** Number of columns in the grid (width). */
export const GRID_COLS = 30;

/** Number of rows in the grid (height). */
export const GRID_ROWS = 30;

/** Pixel size of each grid cell. */
export const CELL_SIZE = 20;

/** Starting tick interval in ms (controls initial snake speed). */
export const BASE_TICK_INTERVAL = 200;

/** Minimum tick interval in ms (fastest the snake can go). */
export const MIN_TICK_INTERVAL = 60;

/** Score awarded per food item eaten. */
export const POINTS_PER_FOOD = 10;

/** Number of snake segments at the start of each game. */
export const INITIAL_SNAKE_LENGTH = 3;

/** localStorage key for Classic Mode high score. */
export const HIGH_SCORE_KEY = 'neoSnake_highScore_classic';

// ── Modern Mode ───────────────────────────────────────────────

/** Số chướng ngại vật khởi đầu. */
export const OBSTACLE_COUNT = 4;

/** Số chướng ngại tối đa sau khi tăng dần. */
export const MAX_OBSTACLE_COUNT = 10;

/** Số lần tái sinh TRƯỚC KHI bắt đầu tăng số lượng. */
export const OBSTACLE_GROW_AFTER_RELOCATIONS = 3;

/**
 * Khoảng cách tái sinh chướng ngại vật (ms, tính theo tick).
 * Ref: game-algorithms-research.md § 5 — Obstacle Spawning
 */
export const OBSTACLE_RELOCATE_INTERVAL = 15000; // 15 giây

/**
 * Số ô "vùng an toàn" quanh đầu rắn khi spawn chướng ngại.
 * Tránh instant death khi obstacle tái sinh.
 */
export const OBSTACLE_HEAD_SAFE_RADIUS = 2;

/** Số ms cảnh báo trước khi obstacle tái sinh (nhấp nháy). */
export const OBSTACLE_WARN_BEFORE_MS = 3000; // 3 giây

/** localStorage key cho Modern Mode high score. */
export const HIGH_SCORE_KEY_MODERN = 'neoSnake_highScore_modern';

// ── Modern Mode — Power-Ups ──────────────────────────────────

/** Thời gian giữa các lần spawn power-up (ms, tick-based). */
export const POWERUP_SPAWN_INTERVAL = 25000; // 25 giây

/** Thời gian power-up tồn tại trên grid nếu không nhặt (ms). */
export const POWERUP_DESPAWN_DURATION = 10000; // 10 giây

/** Duration hiệu ứng Speed Boost (ms). */
export const SPEED_BOOST_DURATION = 5000;

/** Hệ số tăng tốc Speed Boost (nhân với tickInterval). */
export const SPEED_BOOST_MULTIPLIER = 0.6; // 40% nhanh hơn

/** Duration hiệu ứng Shield (ms). */
export const SHIELD_DURATION = 8000;

/** Số đốt bị cắt khi nhặt Shrink. */
export const SHRINK_AMOUNT = 3;

/** Tốc độ nhanh nhất có thể khi Speed Boost active (floor). */
export const SPEED_BOOST_MIN_INTERVAL = 50;
