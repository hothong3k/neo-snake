/**
 * src/effects.js
 * ─────────────────────────────────────────────────────────────
 * Power-up effect management: apply, tick-update, expire.
 *
 * Effect lifecycle:
 *   collect power-up → applyEffect(type) → activeEffects[] gets timer
 *   → updateEffects(tickInterval) decrements → expireEffect(type) on 0
 *
 * Reference: game-algorithms-research.md § 6
 */

import { state } from './state.js';
import {
  SPEED_BOOST_DURATION, SPEED_BOOST_MULTIPLIER, SPEED_BOOST_MIN_INTERVAL,
  SHIELD_DURATION, SHRINK_AMOUNT,
} from './config.js';
import { updateSpeed } from './speed.js';

/**
 * Áp dụng hiệu ứng khi rắn nhặt power-up.
 *
 * SPEED_BOOST:
 *   - Lần đầu: tickInterval *= 0.6
 *   - Nhặt lại khi đang active: chỉ reset timer, KHÔNG giảm thêm speed.
 *   - Ref: research § 6 — "double-collection bug"
 *
 * SHIELD:
 *   - Set hasShield = true; nhặt lại → reset timer.
 *
 * SHRINK:
 *   - Cắt 3 đốt cuối ngay lập tức (instant, không vào activeEffects).
 *   - Tối thiểu giữ 1 đốt (head).
 *
 * @param {'SPEED_BOOST'|'SHIELD'|'SHRINK'} type
 */
export function applyEffect(type) {
  switch (type) {
    case 'SPEED_BOOST': {
      if (!state.speedBoostActive) {
        // Lần đầu — thực sự giảm tickInterval
        state.tickInterval = Math.max(
          SPEED_BOOST_MIN_INTERVAL,
          state.tickInterval * SPEED_BOOST_MULTIPLIER
        );
        state.speedBoostActive = true;
      }
      // Dù lần đầu hay nhặt lại: luôn reset timer
      state.activeEffects = state.activeEffects.filter(e => e.type !== 'SPEED_BOOST');
      state.activeEffects.push({ type: 'SPEED_BOOST', remainingMs: SPEED_BOOST_DURATION });
      break;
    }

    case 'SHIELD': {
      // Reset timer nếu đang active
      state.activeEffects = state.activeEffects.filter(e => e.type !== 'SHIELD');
      state.hasShield = true;
      state.activeEffects.push({ type: 'SHIELD', remainingMs: SHIELD_DURATION });
      break;
    }

    case 'SHRINK': {
      // Instant effect — cắt N đốt cuối, giữ tối thiểu 1
      const removeCount = Math.min(SHRINK_AMOUNT, state.snake.length - 1);
      if (removeCount > 0) {
        state.snake.splice(state.snake.length - removeCount, removeCount);
      }
      // Toast ngắn hạn trên HUD — SHRINK không có timer trong activeEffects
      state.instantToast = { type: 'SHRINK', remainingMs: 2000 };   // ← THÊM
      break;
    }
  }
}

/**
 * Giảm timer của mỗi hiệu ứng đang active.
 * Khi timer về 0 → gọi expireEffect().
 *
 * Gọi trong update() với tickInterval (KHÔNG phải deltaTime).
 * Ref: research § 6 — "Unified Time Base"
 *
 * @param {number} tickInterval — ms/tick, cùng time base với updateObstacles
 */
export function updateEffects(tickInterval) {
  // Decrement instant toast (SHRINK)
  if (state.instantToast) {
    state.instantToast.remainingMs -= tickInterval;
    if (state.instantToast.remainingMs <= 0) {
      state.instantToast = null;
    }
  }

  state.activeEffects.forEach(effect => {
    effect.remainingMs -= tickInterval;
    if (effect.remainingMs <= 0) {
      expireEffect(effect.type);
    }
  });
  state.activeEffects = state.activeEffects.filter(e => e.remainingMs > 0);
}

/**
 * Xử lý khi hiệu ứng hết hạn.
 *
 * SPEED_BOOST:
 *   - Khôi phục tickInterval về baseTickInterval (KHÔNG dùng snapshot).
 *   - Gọi updateSpeed(score) để re-apply difficulty curve hiện tại.
 *   - Ref: research § 6 — "Restore to score-scaled base speed"
 *
 * SHIELD:
 *   - Set hasShield = false.
 *
 * @param {string} type
 */
function expireEffect(type) {
  switch (type) {
    case 'SPEED_BOOST':
      state.tickInterval = state.baseTickInterval;
      state.speedBoostActive = false;
      // Re-apply difficulty curve — updateSpeed() sẽ cập nhật baseTickInterval
      // dựa trên score hiện tại, rồi gán tickInterval = baseTickInterval.
      updateSpeed(state.score);
      break;

    case 'SHIELD':
      state.hasShield = false;
      break;
  }
}
