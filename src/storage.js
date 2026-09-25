/**
 * src/storage.js
 * ─────────────────────────────────────────────────────────────
 * localStorage wrapper for persisting the Classic Mode high score.
 * All calls are wrapped in try/catch — localStorage can throw
 * SecurityError in private/restricted browsing environments.
 *
 * Reference: game-algorithms-research.md § 11
 */

import { HIGH_SCORE_KEY } from './config.js';

/**
 * Load the stored high score.
 * Returns 0 if nothing is saved or localStorage is unavailable.
 * @returns {number}
 */
export function loadHighScore() {
  try {
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    // parseInt returns NaN for null / non-numeric strings — default to 0
    return parseInt(stored, 10) || 0;
  } catch (e) {
    console.warn('[NeoSnake] localStorage unavailable — high score will not persist.', e);
    return 0;
  }
}

/**
 * Save the score if it exceeds the current stored high score.
 * @param {number} score - The score to potentially save.
 * @returns {boolean} true if a new record was set, false otherwise.
 */
export function saveHighScore(score) {
  try {
    const current = loadHighScore();
    if (score > current) {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
      return true; // new record
    }
    return false;
  } catch (e) {
    console.warn('[NeoSnake] Could not save high score to localStorage.', e);
    return false;
  }
}
