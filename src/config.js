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
