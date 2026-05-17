import { CANVAS, GROUND_Y, COLORS } from '../config/constants.js';

const GROUND_H  = CANVAS.HEIGHT - GROUND_Y;   // 120px
const BELT_H    = 20;                          // conveyor belt strip height
const MATRIX_Y  = GROUND_Y + BELT_H + 4;      // top of matrix rain area
const MATRIX_H  = CANVAS.HEIGHT - MATRIX_Y;   // remaining height

const COL_W    = 16;
const NUM_COLS = Math.ceil(CANVAS.WIDTH / COL_W);

// ─── Ground ───────────────────────────────────────────────────────────────────

export class Ground {
  constructor() {
    this._scrollOffset = 0;

    // Matrix rain columns — each tracks a falling glyph position
    this._cols = Array.from({ length: NUM_COLS }, () => ({
      y:     Math.random() * MATRIX_H,        // current head y within MATRIX_H
      speed: 22 + Math.random() * 48,          // px/s
      char:  Math.random() > 0.5 ? '1' : '0',
      trail: Math.random() > 0.5 ? '1' : '0', // one character above head
    }));
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  /** @param {number} dt  @param {number} worldSpeed px/s */
  update(dt, worldSpeed) {
    this._scrollOffset -= worldSpeed * dt;

    for (const col of this._cols) {
      col.y += col.speed * dt;
      if (col.y > MATRIX_H + 14) {
        col.y     = -(8 + Math.random() * 24);
        col.char  = Math.random() > 0.5 ? '1' : '0';
        col.trail = Math.random() > 0.5 ? '1' : '0';
        col.speed = 22 + Math.random() * 48;
      }
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {
    ctx.save();

    // ── Dark ground background ────────────────────────────────────────────────
    ctx.fillStyle = '#04040e';
    ctx.fillRect(0, GROUND_Y, CANVAS.WIDTH, GROUND_H);

    // ── Neon top edge ────────────────────────────────────────────────────────
    ctx.shadowColor = COLORS.GROUND_LINE;
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = COLORS.GROUND_LINE;
    ctx.fillRect(0, GROUND_Y, CANVAS.WIDTH, 3);
    ctx.shadowBlur  = 0;

    // ── Conveyor belt strip ──────────────────────────────────────────────────
    this._drawBelt(ctx);

    // ── Matrix rain (clipped to matrix area) ────────────────────────────────
    ctx.beginPath();
    ctx.rect(0, MATRIX_Y, CANVAS.WIDTH, MATRIX_H);
    ctx.clip();

    ctx.font         = '12px monospace';
    ctx.textBaseline = 'top';

    for (let i = 0; i < NUM_COLS; i++) {
      const col = this._cols[i];
      const cx  = i * COL_W + 2;

      // Trail character (dimmer, one row above)
      if (col.y - 14 >= 0) {
        ctx.fillStyle = 'rgba(0,255,80,0.2)';
        ctx.fillText(col.trail, cx, MATRIX_Y + col.y - 14);
      }

      // Head character (bright green glow)
      if (col.y >= 0 && col.y <= MATRIX_H) {
        ctx.shadowColor = '#00ff50';
        ctx.shadowBlur  = 4;
        ctx.fillStyle   = 'rgba(0,255,80,0.85)';
        ctx.fillText(col.char, cx, MATRIX_Y + col.y);
        ctx.shadowBlur  = 0;
      }
    }

    ctx.restore();
  }

  // ─── Belt drawing ────────────────────────────────────────────────────────────

  _drawBelt(ctx) {
    const beltY = GROUND_Y + 3;

    // Belt surface
    ctx.fillStyle = '#0c1824';
    ctx.fillRect(0, beltY, CANVAS.WIDTH, BELT_H);

    // Moving notches (scroll left at world speed)
    const notchW   = 8;
    const notchGap = 36;
    const phase    = ((this._scrollOffset % notchGap) + notchGap) % notchGap;
    ctx.fillStyle  = '#1c3550';
    for (let nx = phase - notchGap; nx < CANVAS.WIDTH + notchGap; nx += notchGap) {
      ctx.fillRect(nx, beltY + 4, notchW, BELT_H - 8);
    }

    // Scrolling binary text on the belt surface
    const charW     = 20;
    const textPhase = ((this._scrollOffset % charW) + charW) % charW;
    const beltChars = ['0','1','0','0','1','1','0','1','0','1','1','0'];
    const startIdx  = Math.floor(-this._scrollOffset / charW);
    ctx.font         = '10px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'rgba(0,200,80,0.3)';
    let ci = 0;
    for (let tx = textPhase - charW; tx < CANVAS.WIDTH + charW; tx += charW) {
      const idx = ((startIdx + ci) % beltChars.length + beltChars.length) % beltChars.length;
      ctx.fillText(beltChars[idx], tx + 2, beltY + BELT_H / 2);
      ci++;
    }

    // Lower edge of belt
    ctx.fillStyle = 'rgba(233,69,96,0.25)';
    ctx.fillRect(0, beltY + BELT_H, CANVAS.WIDTH, 1);
  }
}
