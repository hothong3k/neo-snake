/**
 * src/collision.js
 * ─────────────────────────────────────────────────────────────
 * Pure collision-detection functions + Modern Mode wall handler.
 *
 * Reference: game-algorithms-research.md § 4
 */

import { GRID_COLS, GRID_ROWS } from './config.js';
import { state } from './state.js';

/**
 * Self-collision: does the head overlap any body segment?
 *
 * Call this AFTER computing newHead but BEFORE committing the move.
 * Pass the current snake array plus the candidate newHead:
 *   - atFood=true  → tail stays; check newHead against all segments [0..n-1]
 *   - atFood=false → tail leaves; check newHead against [0..n-2]
 *
 * The caller handles the atFood slicing; this function checks
 * newHead against a provided array of segments.
 *
 * @param {{ x: number, y: number }} newHead
 * @param {{ x: number, y: number }[]} segments - Segments to test against.
 * @returns {boolean}
 */
export function checkSelfCollision(newHead, segments) {
  for (let i = 0; i < segments.length; i++) {
    if (newHead.x === segments[i].x && newHead.y === segments[i].y) {
      return true;
    }
  }
  return false;
}

/**
 * Wall collision (Classic Mode): any boundary contact = Game Over.
 *
 * @param {{ x: number, y: number }} head - The candidate new head position.
 * @returns {boolean} true → Game Over.
 */
export function checkWallCollision(head) {
  return (
    head.x < 0 || head.x >= GRID_COLS ||
    head.y < 0 || head.y >= GRID_ROWS
  );
}

/**
 * Food collision: is the head on the food cell?
 *
 * @param {{ x: number, y: number }} head
 * @param {{ x: number, y: number } | null} food
 * @returns {boolean}
 */
export function checkFoodCollision(head, food) {
  if (!food) return false;
  return head.x === food.x && head.y === food.y;
}

/**
 * Modern Mode wall collision.
 * Dừng rắn tại biên, không game over.
 * Cập nhật state.isStopped và state.stoppedAtWall.
 *
 * @param {{ x: number, y: number }} newHead
 * @returns {boolean} true nếu đầu rắn ra ngoài biên.
 */
export function handleModernWallCollision(newHead) {
  if (newHead.x < 0)          { state.isStopped = true; state.stoppedAtWall = 'LEFT';   return true; }
  if (newHead.x >= GRID_COLS) { state.isStopped = true; state.stoppedAtWall = 'RIGHT';  return true; }
  if (newHead.y < 0)          { state.isStopped = true; state.stoppedAtWall = 'UP';     return true; }
  if (newHead.y >= GRID_ROWS) { state.isStopped = true; state.stoppedAtWall = 'BOTTOM'; return true; }
  return false;
}

/**
 * Obstacle collision — va chạm chướng ngại vật = Game Over.
 *
 * @param {{ x: number, y: number }} head
 * @returns {boolean}
 */
export function checkObstacleCollision(head) {
  return state.obstacles.some(obs => obs.x === head.x && obs.y === head.y);
}
