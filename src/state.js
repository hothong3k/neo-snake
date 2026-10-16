/**
 * src/state.js
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all mutable game state.
 * All modules import and mutate this object in-place.
 * No module should create a local copy — always reference `state.*`.
 */

import { BASE_TICK_INTERVAL } from './config.js';

export const state = {
  // ── State Machine ─────────────────────────────────────────
  /** 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' */
  gameState: 'MENU',

  // ── Snake ─────────────────────────────────────────────────
  /** Array of {x, y} cells; index 0 = head, last index = tail. */
  snake: [],

  /** The direction currently being executed each tick. */
  currentDirection: 'RIGHT',

  /**
   * The next direction, buffered on keypress and applied at the
   * start of the next tick. Prevents instant reversal even if
   * multiple keys are pressed between ticks.
   */
  nextDirection: 'RIGHT',

  // ── Food ──────────────────────────────────────────────────
  /** {x, y} of the current food item. null if none exists. */
  food: null,

  // ── Score & Speed ─────────────────────────────────────────
  score: 0,
  highScore: 0,

  /**
   * Base tick interval (ms) at the current score, without any
   * power-up modification. Updated by updateSpeed() on food-eat.
   * Reserved for Modern Mode Speed Boost compatibility.
   */
  baseTickInterval: BASE_TICK_INTERVAL,

  /**
   * Active tick interval (ms) used by the game loop.
   * Equals baseTickInterval in Classic Mode.
   */
  tickInterval: BASE_TICK_INTERVAL,

  // ── Game Loop ─────────────────────────────────────────────
  /**
   * Timestamp of the last RAF frame.
   * null = first frame (or just after resume) — skip to avoid spike.
   */
  lastTimestamp: null,

  /**
   * Accumulated milliseconds since the last tick.
   * When >= tickInterval, one tick fires.
   */
  accumulator: 0,

  // ── Mode Selection ────────────────────────────────────────────
  /** 'CLASSIC' | 'MODERN' — chọn từ menu, không thay đổi trong game. */
  gameMode: 'CLASSIC',

  // ── Modern Mode — Wall Stop ───────────────────────────────────
  /**
   * true khi rắn đang bị chặn tại tường (Modern Mode only).
   * Game loop bỏ qua bước di chuyển khi isStopped === true.
   * Ref: game-algorithms-research.md § 4.3
   */
  isStopped: false,

  /**
   * Tường mà rắn đang chạm vào.
   * 'LEFT' | 'RIGHT' | 'UP' | 'BOTTOM' | null
   */
  stoppedAtWall: null,

  // ── Modern Mode — Wall Flash ──────────────────────────────────
  /** true để renderer vẽ flash overlay 1 frame rồi tự reset. */
  wallStopFlash: false,

  // ── Modern Mode — Obstacles ───────────────────────────────────
  /** Mảng {x, y} các ô chướng ngại vật. */
  obstacles: [],

  /** Bộ đếm thời gian tái sinh obstacle (ms). */
  obstacleTimer: 0,
};
