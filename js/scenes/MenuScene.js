import { CANVAS, COLORS, SCENES } from '../config/constants.js';
import { Scene } from './Scene.js';

// ─── Matrix rain config ────────────────────────────────────────────────────────

const COL_W    = 22;
const NUM_COLS = Math.ceil(CANVAS.WIDTH / COL_W);
const GLYPHS   = '0123456789ABCDEFabcdef{}[]()<>=+-*/%;:#@?!|&^~_\\';
const CHAR_H   = 16;
const TRAIL    = 22;   // max visible chars per column

// ─── Menu items ───────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  { label: 'START GAME',       key: 'start',     enabled: true  },
  { label: 'SELECT CHARACTER', key: 'character', enabled: false },
  { label: 'SHOP',             key: 'shop',      enabled: false },
  { label: 'SETTINGS',         key: 'settings',  enabled: true  },
];

// ─── MenuScene ────────────────────────────────────────────────────────────────

export class MenuScene extends Scene {
  constructor(game) {
    super(game);
    this._selectedIndex = 0;
    this._blinkTimer    = 0;
    this._blinkShow     = true;

    // Pre-generate columns (no per-frame Math.random in render)
    this._cols = Array.from({ length: NUM_COLS }, () => ({
      headY:        Math.random() * CANVAS.HEIGHT,
      speed:        55 + Math.random() * 110,
      chars:        Array.from({ length: TRAIL }, () =>
                      GLYPHS[Math.floor(Math.random() * GLYPHS.length)]),
      shuffleTimer: Math.random() * 0.1,
    }));
  }

  enter() {
    this._selectedIndex = 0;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    const { input } = this.game;

    // Advance matrix rain
    for (const col of this._cols) {
      col.headY += col.speed * dt;
      if (col.headY > CANVAS.HEIGHT + TRAIL * CHAR_H) col.headY = -CHAR_H;

      col.shuffleTimer += dt;
      if (col.shuffleTimer >= 0.09) {
        col.shuffleTimer = 0;
        col.chars[0] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }

    // Cursor blink
    this._blinkTimer += dt;
    if (this._blinkTimer >= 0.5) {
      this._blinkTimer = 0;
      this._blinkShow  = !this._blinkShow;
    }

    // Navigation — skip disabled items
    if (input.isKeyJustPressed('ArrowUp')) {
      this._move(-1);
    }
    if (input.isKeyJustPressed('ArrowDown')) {
      this._move(+1);
    }

    if (input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) {
      this._confirm();
    }
  }

  _move(dir) {
    let idx = this._selectedIndex;
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      idx = (idx + dir + MENU_ITEMS.length) % MENU_ITEMS.length;
      if (MENU_ITEMS[idx].enabled) { this._selectedIndex = idx; return; }
    }
  }

  _confirm() {
    const item = MENU_ITEMS[this._selectedIndex];
    if (!item.enabled) return;
    switch (item.key) {
      case 'start':    this.game.switchScene(SCENES.GAME); break;
      case 'settings': /* placeholder */ break;
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    // Deep dark sky
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    this._renderMatrix(ctx);

    // Gradient vignette so UI text stays readable
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
    grad.addColorStop(0,   'rgba(5,5,16,0.05)');
    grad.addColorStop(0.25,'rgba(5,5,16,0.55)');
    grad.addColorStop(1,   'rgba(5,5,16,0.90)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    const cx = CANVAS.WIDTH  / 2;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ── Title ─────────────────────────────────────────────────────────────────
    ctx.shadowColor = COLORS.UI_PRIMARY;
    ctx.shadowBlur  = 44;
    ctx.fillStyle   = COLORS.UI_PRIMARY;
    ctx.font        = 'bold 100px "Courier New", monospace';
    ctx.fillText('CODE RUN', cx, 178);
    ctx.shadowBlur  = 0;

    // ── Subtitle ──────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.font      = '21px "Courier New", monospace';
    ctx.fillText('취업의 지옥에서 탈출하라', cx, 255);

    // ── Menu items ────────────────────────────────────────────────────────────
    const menuStartY = 358;
    const menuGap    = 60;

    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const item = MENU_ITEMS[i];
      const y    = menuStartY + i * menuGap;
      const sel  = i === this._selectedIndex;

      if (sel && item.enabled) {
        // Selection box
        ctx.fillStyle   = 'rgba(0,212,255,0.07)';
        ctx.strokeStyle = 'rgba(0,212,255,0.35)';
        ctx.lineWidth   = 1;
        ctx.fillRect(cx - 210, y - 22, 420, 44);
        ctx.strokeRect(cx - 210, y - 22, 420, 44);

        // Blinking cursor chevron
        if (this._blinkShow) {
          ctx.shadowColor = COLORS.UI_PRIMARY;
          ctx.shadowBlur  = 8;
          ctx.fillStyle   = COLORS.UI_PRIMARY;
          ctx.font        = 'bold 20px "Courier New", monospace';
          ctx.textAlign   = 'left';
          ctx.fillText('▶', cx - 186, y);
          ctx.textAlign   = 'center';
          ctx.shadowBlur  = 0;
        }
      }

      if (item.enabled) {
        ctx.fillStyle   = sel ? COLORS.UI_PRIMARY : 'rgba(255,255,255,0.72)';
        ctx.shadowColor = sel ? COLORS.UI_PRIMARY : 'transparent';
        ctx.shadowBlur  = sel ? 14 : 0;
        ctx.font        = `${sel ? 'bold ' : ''}21px "Courier New", monospace`;
      } else {
        ctx.fillStyle  = 'rgba(255,255,255,0.22)';
        ctx.shadowBlur = 0;
        ctx.font       = '21px "Courier New", monospace';
      }

      const suffix = !item.enabled ? '  · COMING SOON' : '';
      ctx.fillText(item.label + suffix, cx, y);
      ctx.shadowBlur = 0;
    }

    // ── Controls hint (bottom-center) ─────────────────────────────────────────
    ctx.fillStyle    = 'rgba(255,255,255,0.18)';
    ctx.font         = '13px "Courier New", monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↑↓  SELECT    ENTER / SPACE  CONFIRM', cx, CANVAS.HEIGHT - 18);

    // ── Best score (bottom-right) ─────────────────────────────────────────────
    const best = parseInt(localStorage.getItem('coderun_best') ?? '0', 10);
    ctx.textAlign    = 'right';
    ctx.fillStyle    = 'rgba(255,215,0,0.55)';
    ctx.font         = '15px "Courier New", monospace';
    ctx.fillText(`BEST  ${best.toString().padStart(7, '0')}`, CANVAS.WIDTH - 22, CANVAS.HEIGHT - 18);
  }

  // ─── Matrix rain ─────────────────────────────────────────────────────────────

  _renderMatrix(ctx) {
    ctx.font         = `${CHAR_H - 2}px "Courier New", monospace`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';

    for (let ci = 0; ci < this._cols.length; ci++) {
      const col = this._cols[ci];
      const x   = ci * COL_W;

      for (let row = 0; row < TRAIL; row++) {
        const charY = col.headY - row * CHAR_H;
        if (charY < -CHAR_H || charY > CANVAS.HEIGHT + CHAR_H) continue;

        const fade = 1 - row / TRAIL;
        if (row === 0) {
          // Head — bright white flash
          ctx.fillStyle = `rgba(200,255,220,${fade})`;
        } else if (row < 4) {
          ctx.fillStyle = `rgba(0,220,90,${fade * 0.85})`;
        } else {
          ctx.fillStyle = `rgba(0,170,55,${fade * 0.45})`;
        }

        ctx.fillText(col.chars[row % col.chars.length], x + 2, charY);
      }
    }
  }
}
