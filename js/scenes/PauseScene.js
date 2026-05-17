import { CANVAS, COLORS, SCENES } from '../config/constants.js';
import { Scene } from './Scene.js';

// ─── Button definitions ───────────────────────────────────────────────────────

const BUTTONS = [
  { label: 'RESUME',    key: 'resume'  },
  { label: 'RESTART',   key: 'restart' },
  { label: 'MAIN MENU', key: 'menu'    },
];

const BTN_W = 270, BTN_H = 52, BTN_GAP = 16;

// ─── PauseScene ───────────────────────────────────────────────────────────────
//
// Overlay drawn on top of the frozen GameScene.
// enter({ underlying }) stores the scene to render underneath.
// RESUME uses sceneManager.setImmediate (no fade) to return instantly.

export class PauseScene extends Scene {
  constructor(game) {
    super(game);
    this._underlying    = null;
    this._selectedIndex = 0;
    this._blinkTimer    = 0;
    this._blinkShow     = true;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  enter({ underlying = null } = {}) {
    this._underlying    = underlying;
    this._selectedIndex = 0;
    this._blinkTimer    = 0;
    this._blinkShow     = true;
  }

  exit() {
    this._underlying = null;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    const { input } = this.game;

    this._blinkTimer += dt;
    if (this._blinkTimer >= 0.5) {
      this._blinkTimer = 0;
      this._blinkShow  = !this._blinkShow;
    }

    if (input.isKeyJustPressed('ArrowUp')) {
      this._selectedIndex = (this._selectedIndex - 1 + BUTTONS.length) % BUTTONS.length;
    }
    if (input.isKeyJustPressed('ArrowDown')) {
      this._selectedIndex = (this._selectedIndex + 1) % BUTTONS.length;
    }

    if (input.isKeyJustPressed('Enter')) {
      this._confirm();
    }

    // ESC / P → resume immediately
    if (input.isKeyJustPressed('Escape') || input.isKeyJustPressed('KeyP')) {
      this._resume();
    }
  }

  _confirm() {
    switch (BUTTONS[this._selectedIndex].key) {
      case 'resume':  this._resume();                         break;
      case 'restart': this.game.switchScene(SCENES.GAME);    break;
      case 'menu':    this.game.switchScene(SCENES.MENU);    break;
    }
  }

  _resume() {
    if (this._underlying) {
      // Instant swap — no fade; game appears as if unpaused
      this.game.sceneManager.setImmediate(this._underlying);
    } else {
      this.game.switchScene(SCENES.GAME);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    // Draw the frozen game scene underneath
    if (this._underlying) {
      this._underlying.render(ctx);
    }

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(2,2,18,0.72)';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    const cx = CANVAS.WIDTH  / 2;
    const cy = CANVAS.HEIGHT / 2;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ── PAUSED title ──────────────────────────────────────────────────────────
    ctx.shadowColor = COLORS.UI_PRIMARY;
    ctx.shadowBlur  = 36;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 76px "Courier New", monospace';
    ctx.fillText('PAUSED', cx, cy - 150);
    ctx.shadowBlur  = 0;

    // ── Separator ─────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,212,255,0.22)';
    ctx.fillRect(cx - 160, cy - 98, 320, 1);

    // ── Buttons ───────────────────────────────────────────────────────────────
    const startY = cy - 52;

    for (let i = 0; i < BUTTONS.length; i++) {
      const bx  = cx - BTN_W / 2;
      const by  = startY + i * (BTN_H + BTN_GAP);
      const sel = i === this._selectedIndex;

      // Box
      ctx.fillStyle   = sel ? 'rgba(0,212,255,0.10)' : 'rgba(255,255,255,0.03)';
      ctx.strokeStyle = sel ? COLORS.UI_PRIMARY : 'rgba(255,255,255,0.14)';
      ctx.lineWidth   = sel ? 2 : 1;
      ctx.fillRect(bx, by, BTN_W, BTN_H);
      ctx.strokeRect(bx, by, BTN_W, BTN_H);

      // Blinking cursor
      if (sel && this._blinkShow) {
        ctx.fillStyle   = COLORS.UI_PRIMARY;
        ctx.shadowColor = COLORS.UI_PRIMARY;
        ctx.shadowBlur  = 6;
        ctx.font        = 'bold 18px "Courier New", monospace';
        ctx.textAlign   = 'left';
        ctx.fillText('▶', bx + 18, by + BTN_H / 2);
        ctx.shadowBlur  = 0;
        ctx.textAlign   = 'center';
      }

      // Label
      ctx.fillStyle    = sel ? COLORS.UI_PRIMARY : 'rgba(255,255,255,0.65)';
      ctx.shadowColor  = sel ? COLORS.UI_PRIMARY : 'transparent';
      ctx.shadowBlur   = sel ? 12 : 0;
      ctx.font         = `${sel ? 'bold ' : ''}21px "Courier New", monospace`;
      ctx.textAlign    = 'center';
      ctx.fillText(BUTTONS[i].label, cx, by + BTN_H / 2);
      ctx.shadowBlur   = 0;
    }

    // ── Controls hint ─────────────────────────────────────────────────────────
    ctx.fillStyle    = 'rgba(255,255,255,0.20)';
    ctx.font         = '13px "Courier New", monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↑↓  SELECT    ENTER  CONFIRM    ESC / P  RESUME', cx, CANVAS.HEIGHT - 18);
  }
}
