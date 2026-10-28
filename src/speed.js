/**
 * src/speed.js
 * ─────────────────────────────────────────────────────────────
 * Tách updateSpeed() khỏi game.js để phá vỡ vòng tròn phụ thuộc
 * effects.js ↔ game.js.
 *
 * Cả game.js lẫn effects.js đều import updateSpeed từ đây.
 * Ref: modern_mode_phase2_plan.md § 5 — Circular dependency fix
 */

import { state } from './state.js';
import { MIN_TICK_INTERVAL } from './config.js';

/**
 * Recalculate tick interval based on current score.
 * Uses a logarithmic curve so early-game acceleration is fast
 * while high-score progression is more gradual.
 *
 * Called ONLY on food-eat events and once at game start.
 * NEVER called inside the tick loop (would overwrite Speed Boost).
 *
 * Guard: không ghi đè tickInterval khi Speed Boost đang active.
 * Boost sẽ tự gọi lại updateSpeed() khi expire.
 * Ref: game-algorithms-research.md § 7
 *
 * Formula: interval = max(MIN, 200 - 20·log₂(score + 1))
 *   score=0   → 200 ms  (base speed)
 *   score=100 → ≈ 153 ms
 *   score=500 → ≈ 113 ms
 *   score=∞   → 60 ms   (floor)
 *
 * @param {number} score
 */
export function updateSpeed(score) {
  // Không ghi đè tickInterval khi Speed Boost đang active.
  // Boost sẽ tự gọi lại updateSpeed() khi expire.
  if (state.speedBoostActive) return;

  state.baseTickInterval = Math.max(
    MIN_TICK_INTERVAL,
    200 - 20 * Math.log2(score + 1)
  );
  state.tickInterval = state.baseTickInterval;
}
