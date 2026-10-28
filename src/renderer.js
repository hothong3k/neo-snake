/**
 * src/renderer.js
 * ─────────────────────────────────────────────────────────────
 * Canvas rendering pipeline for Neo Snake — Classic & Modern Mode.
 *
 * Render order (back → front):
 *   1. Dark background
 *   2. Subtle grid lines
 *   3. Obstacles (Modern only)
 *   4. Food (pulsing glow circle)
 *   5. Snake body (segments with gradient fade tail→head)
 *   6. Snake head (bright neon + glow)
 *   7. Snake eyes (directional indicator)
 *   8. Wall-stop flash overlay (Modern only)
 *
 * NOTE: HUD (score, best, mode) is rendered in HTML above the canvas.
 *       See #hud in index.html. drawHUD() has been removed from this file.
 * Reference: game-algorithms-research.md § 9
 */

import { state } from './state.js';
import {
  GRID_COLS, GRID_ROWS, CELL_SIZE,
  OBSTACLE_RELOCATE_INTERVAL, OBSTACLE_WARN_BEFORE_MS,
} from './config.js';

/** Cached canvas and context, set by initRenderer(). */
let canvas = null;
let ctx    = null;

// ─── Init ─────────────────────────────────────────────────────

/**
 * Store canvas reference and set its pixel dimensions.
 * Must be called once before any render() call.
 * @param {HTMLCanvasElement} canvasEl
 */
export function initRenderer(canvasEl) {
  canvas        = canvasEl;
  ctx           = canvas.getContext('2d');
  canvas.width  = GRID_COLS * CELL_SIZE;
  canvas.height = GRID_ROWS * CELL_SIZE;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Draw a filled rounded rectangle.
 * Falls back to a regular rect if roundRect isn't supported.
 */
function fillRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    // Polyfill via arcTo
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x,     y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }
  ctx.fill();
}

// ─── Sub-renderers ────────────────────────────────────────────

/** Fill the entire canvas with the game background colour. */
function drawBackground() {
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Draw a faint grid to give a retro-tiled feel. */
function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.033)';
  ctx.lineWidth   = 0.5;

  for (let x = 0; x <= GRID_COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= GRID_ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0,            y * CELL_SIZE);
    ctx.lineTo(canvas.width, y * CELL_SIZE);
    ctx.stroke();
  }
}

/**
 * Draw the food as a pulsing neon circle.
 * @param {number} now - performance.now() for the pulse animation.
 */
function drawFood(now) {
  if (!state.food) return;

  const pulse  = Math.sin(now / 380) * 0.5 + 0.5;   // 0..1, ~1.3 Hz
  const cx     = state.food.x * CELL_SIZE + CELL_SIZE / 2;
  const cy     = state.food.y * CELL_SIZE + CELL_SIZE / 2;
  const radius = CELL_SIZE * (0.27 + 0.07 * pulse);

  ctx.save();
  // Outer glow ring
  ctx.shadowColor = '#ff4d6d';
  ctx.shadowBlur  = 10 + 10 * pulse;
  ctx.fillStyle   = '#ff4d6d';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // Inner bright highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle  = `rgba(255, 180, 195, ${0.55 + 0.3 * pulse})`;
  ctx.beginPath();
  ctx.arc(cx - radius * 0.22, cy - radius * 0.25, radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw snake body segments from tail toward head.
 * Segments fade from dim green (tail) to bright green (near head).
 * In Modern Mode, uses CSS variable --snake-color (cyan) via body class.
 */
function drawSnakeBody() {
  const n = state.snake.length;
  if (n < 2) return;

  // Pick color based on mode
  const isModern = state.gameMode === 'MODERN';

  for (let i = n - 1; i >= 1; i--) {
    const seg = state.snake[i];
    // t: 0 at tail, 1 just before head
    const t     = 1 - i / (n - 1);
    const alpha = 0.25 + 0.55 * t;
    const r     = 3 + Math.round(2 * t); // rounder near head

    ctx.fillStyle = isModern
      ? `rgba(0, 229, 255, ${alpha.toFixed(2)})`
      : `rgba(57, 255, 20, ${alpha.toFixed(2)})`;
    fillRoundRect(
      seg.x * CELL_SIZE + 2,
      seg.y * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4,
      r
    );
  }
}

/** Draw the snake head with a bright neon glow. */
function drawSnakeHead() {
  if (state.snake.length === 0) return;
  const head = state.snake[0];

  const isModern = state.gameMode === 'MODERN';
  const headColor = isModern ? '#00e5ff' : '#39ff14';

  ctx.save();
  ctx.shadowColor = headColor;
  ctx.shadowBlur  = 18;
  ctx.fillStyle   = headColor;
  fillRoundRect(
    head.x * CELL_SIZE + 1,
    head.y * CELL_SIZE + 1,
    CELL_SIZE - 2,
    CELL_SIZE - 2,
    4
  );
  ctx.restore();

  // Eyes — two dark circles whose position depends on direction
  drawSnakeEyes(head);
}

/**
 * Draw directional snake eyes on the head segment.
 * @param {{ x: number, y: number }} head
 */
function drawSnakeEyes(head) {
  const cx = head.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = head.y * CELL_SIZE + CELL_SIZE / 2;
  const spread = CELL_SIZE * 0.22;
  const eyeR   = CELL_SIZE * 0.10;

  let e1, e2;
  switch (state.currentDirection) {
    case 'RIGHT': e1 = { x: cx + 3, y: cy - spread }; e2 = { x: cx + 3, y: cy + spread }; break;
    case 'LEFT':  e1 = { x: cx - 3, y: cy - spread }; e2 = { x: cx - 3, y: cy + spread }; break;
    case 'UP':    e1 = { x: cx - spread, y: cy - 3 }; e2 = { x: cx + spread, y: cy - 3 }; break;
    case 'DOWN':  e1 = { x: cx - spread, y: cy + 3 }; e2 = { x: cx + spread, y: cy + 3 }; break;
    default: return;
  }

  ctx.fillStyle = '#030f01';
  ctx.beginPath(); ctx.arc(e1.x, e1.y, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x, e2.y, eyeR, 0, Math.PI * 2); ctx.fill();
}

// ─── Modern Mode — Obstacles ──────────────────────────────────

/**
 * Draw obstacles as red-orange blocks with glow.
 * Warning blink (sin-wave alpha) in the last 3 seconds before relocation.
 * @param {number} now - performance.now()
 */
function drawObstacles(now) {
  if (!state.obstacles.length) return;

  // Cảnh báo nhấp nháy khi sắp tái sinh (3 giây cuối)
  const timeUntilReloc = OBSTACLE_RELOCATE_INTERVAL - state.obstacleTimer;
  const isWarning = timeUntilReloc <= OBSTACLE_WARN_BEFORE_MS;
  const warnAlpha = isWarning
    ? 0.4 + 0.6 * Math.abs(Math.sin(now / 200))
    : 1;

  state.obstacles.forEach(obs => {
    ctx.save();
    ctx.globalAlpha = warnAlpha;
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = '#cc3300';
    fillRoundRect(obs.x * CELL_SIZE + 2, obs.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);
    // Highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(255,120,60,0.5)';
    fillRoundRect(obs.x * CELL_SIZE + 3, obs.y * CELL_SIZE + 3, (CELL_SIZE-6)*0.4, (CELL_SIZE-6)*0.4, 2);
    ctx.restore();
  });
}

/**
 * Draw a full-canvas orange flash for 1 frame when the snake
 * hits a wall in Modern Mode (visual feedback for wall-stop).
 */
function drawWallStopFlash() {
  if (!state.wallStopFlash) return;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 80, 0, 0.12)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  state.wallStopFlash = false; // Reset sau 1 frame
}

// ─── Modern Mode — Power-Up ───────────────────────────────────

/**
 * Vẽ power-up đang nằm trên grid.
 * Mỗi loại có biểu tượng và màu riêng.
 * Nhấp nháy khi sắp despawn (3 giây cuối).
 *
 * @param {number} now — performance.now()
 */
function drawPowerUp(now) {
  if (!state.activePowerUp) return;

  const { type, position, despawnTimer } = state.activePowerUp;
  const cx = position.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = position.y * CELL_SIZE + CELL_SIZE / 2;

  // Nhấp nháy khi sắp despawn (3 giây cuối)
  const isBlinking = despawnTimer <= 3000;
  const blinkAlpha = isBlinking
    ? 0.3 + 0.7 * Math.abs(Math.sin(now / 150))
    : 1;

  // Pulse animation
  const pulse = Math.sin(now / 400) * 0.5 + 0.5;
  const radius = CELL_SIZE * (0.35 + 0.05 * pulse);

  // Màu theo loại
  const colors = {
    SPEED_BOOST: { fill: '#ffdd00', glow: '#ffaa00', icon: '⚡' },
    SHIELD:      { fill: '#00bfff', glow: '#0080ff', icon: '🛡️' },
    SHRINK:      { fill: '#ff69b4', glow: '#ff1493', icon: '✂️' },
  };
  const color = colors[type];

  ctx.save();
  ctx.globalAlpha = blinkAlpha;

  // Outer glow
  ctx.shadowColor = color.glow;
  ctx.shadowBlur = 12 + 6 * pulse;
  ctx.fillStyle = color.fill;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner bright core
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.2 * pulse})`;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Icon text
  ctx.globalAlpha = blinkAlpha * 0.9;
  ctx.font = `${CELL_SIZE * 0.55}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(color.icon, cx, cy + 1);

  ctx.restore();
}

/**
 * Vẽ trail (vệt sáng) phía sau rắn khi Speed Boost đang active.
 * Gọi TRƯỚC drawSnakeBody().
 */
function drawSpeedTrail() {
  if (!state.speedBoostActive) return;
  if (state.snake.length < 2) return;

  // Vẽ 3 đốt "ma" phía sau đuôi
  const tail = state.snake[state.snake.length - 1];
  const preTail = state.snake[state.snake.length - 2];
  const dx = tail.x - preTail.x;
  const dy = tail.y - preTail.y;

  for (let i = 1; i <= 3; i++) {
    const alpha = 0.15 - i * 0.04;
    if (alpha <= 0) break;
    ctx.save();
    ctx.fillStyle = `rgba(255, 221, 0, ${alpha})`;
    fillRoundRect(
      (tail.x + dx * i) * CELL_SIZE + 3,
      (tail.y + dy * i) * CELL_SIZE + 3,
      CELL_SIZE - 6, CELL_SIZE - 6, 3
    );
    ctx.restore();
  }
}

/**
 * Vẽ viền Shield phát sáng xung quanh toàn bộ rắn khi hasShield === true.
 * Gọi SAU drawSnakeBody(), TRƯỚC drawSnakeHead().
 *
 * @param {number} now — performance.now()
 */
function drawShieldGlow(now) {
  if (!state.hasShield) return;

  const pulse = Math.sin(now / 300) * 0.3 + 0.7;

  state.snake.forEach(seg => {
    ctx.save();
    ctx.strokeStyle = `rgba(0, 191, 255, ${0.35 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 10 * pulse;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(
        seg.x * CELL_SIZE, seg.y * CELL_SIZE,
        CELL_SIZE, CELL_SIZE, 5
      );
    } else {
      ctx.rect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    ctx.stroke();
    ctx.restore();
  });
}


// ─── Public API ───────────────────────────────────────────────

/**
 * Main render function — called every animation frame from main.js.
 * Draws the complete frame for the current game state.
 *
 * Render order (back → front):
 *   1. Background
 *   2. Grid lines
 *   3. Obstacles (Modern only)
 *   4. Food
 *   5. Power-up on grid (Modern only)
 *   6. Speed trail (Modern only)
 *   7. Snake body
 *   8. Shield glow (Modern only)
 *   9. Snake head + eyes
 *   10. Wall-stop flash overlay (Modern only)
 *
 * @param {number} now - performance.now() timestamp for animations.
 */
export function render(now) {
  if (!ctx) return;

  // Always paint background
  drawBackground();

  // Show a decorative grid on MENU but skip game objects
  if (state.gameState === 'MENU') {
    drawGrid();
    return;
  }

  // Game objects (PLAYING, PAUSED, GAME_OVER all show the last game frame)
  drawGrid();
  if (state.gameMode === 'MODERN') drawObstacles(now);
  drawFood(now);
  if (state.gameMode === 'MODERN') drawPowerUp(now);
  if (state.gameMode === 'MODERN') drawSpeedTrail();
  drawSnakeBody();
  if (state.gameMode === 'MODERN') drawShieldGlow(now);
  drawSnakeHead();
  if (state.gameMode === 'MODERN') drawWallStopFlash();
}

