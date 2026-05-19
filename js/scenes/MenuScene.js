import { CANVAS, SCENES } from '../config/constants.js';
import { Scene } from './Scene.js';
import { audioManager } from '../utils/AudioManager.js';

const MENU_ITEMS = [
  { label: 'GAME START',       key: 'start',     enabled: true  },
  { label: 'CHARACTER SELECT', key: 'character', enabled: false },
  { label: 'SHOP',             key: 'shop',      enabled: false },
  { label: 'SETTINGS',         key: 'settings',  enabled: true  },
];

export class MenuScene extends Scene {
  constructor(game) {
    super(game);
    this._sel       = 0;
    this._blink     = 0;
    this._blinkShow = true;
    this._t         = 0;

    // Pre-baked twinkling sparkle particles
    this._sparks = Array.from({ length: 28 }, () => ({
      x:    Math.random() * CANVAS.WIDTH,
      y:    Math.random() * CANVAS.HEIGHT * 0.68,
      r:    1.5 + Math.random() * 3.5,
      ph:   Math.random() * Math.PI * 2,
      sp:   0.7 + Math.random() * 1.4,
      warm: Math.random() > 0.5,
    }));
  }

  enter() {
    this._sel = 0;
    audioManager.play();
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    const { input } = this.game;
    this._t     += dt;
    this._blink += dt;
    if (this._blink >= 0.5) { this._blink = 0; this._blinkShow = !this._blinkShow; }
    for (const s of this._sparks) s.ph += s.sp * dt;

    if (input.isKeyJustPressed('ArrowUp'))   this._move(-1);
    if (input.isKeyJustPressed('ArrowDown')) this._move(+1);
    if (input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) this._confirm();
  }

  _move(dir) {
    let i = this._sel;
    for (let n = 0; n < MENU_ITEMS.length; n++) {
      i = (i + dir + MENU_ITEMS.length) % MENU_ITEMS.length;
      if (MENU_ITEMS[i].enabled) { this._sel = i; return; }
    }
  }

  _confirm() {
    const item = MENU_ITEMS[this._sel];
    if (!item.enabled) return;
    if (item.key === 'start') this.game.switchScene(SCENES.GAME);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    const cx = CANVAS.WIDTH / 2;

    // Background — deep warm dark gray
    ctx.fillStyle = '#0e0c0a';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Warm radial glow behind title
    const grd = ctx.createRadialGradient(cx, 195, 0, cx, 195, 540);
    grd.addColorStop(0, 'rgba(255,128,20,0.09)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Twinkling sparkles (replace matrix rain)
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (const s of this._sparks) {
      const a = 0.10 + Math.abs(Math.sin(s.ph)) * 0.50;
      ctx.globalAlpha = a;
      ctx.fillStyle   = s.warm ? '#ffd060' : '#ffaa40';
      ctx.font        = `${Math.floor(s.r * 4)}px "Courier New"`;
      ctx.fillText('✦', s.x, s.y);
    }
    ctx.globalAlpha  = 1;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ── Stars flanking title (pulsating) ────────────────────────────────────
    this._star(ctx, cx - 322, 152, 22, '#ffd700', 0.88 + 0.12 * Math.sin(this._t * 1.8));
    this._star(ctx, cx + 322, 152, 22, '#ffd700', 0.88 + 0.12 * Math.sin(this._t * 1.8 + 1.0));
    this._star(ctx, cx - 266, 116, 14, '#ff9940', 0.65 + 0.25 * Math.sin(this._t * 2.3));
    this._star(ctx, cx + 266, 116, 14, '#ff9940', 0.65 + 0.25 * Math.sin(this._t * 2.3 + 0.8));
    this._star(ctx, cx - 218, 168,  9, '#ffcc40', 0.45 + 0.35 * Math.sin(this._t * 3.1));
    this._star(ctx, cx + 218, 168,  9, '#ffcc40', 0.45 + 0.35 * Math.sin(this._t * 3.1 + 0.5));

    // ── Title ────────────────────────────────────────────────────────────────
    ctx.shadowColor = '#ff9918';
    ctx.shadowBlur  = 44;
    ctx.fillStyle   = '#fff5d0';
    ctx.font        = 'bold 96px "Courier New", monospace';
    ctx.fillText('CODE RUN', cx, 152);
    ctx.shadowBlur  = 0;

    // Subtitle
    ctx.fillStyle = 'rgba(255,200,110,0.60)';
    ctx.font      = '20px "Courier New", monospace';
    ctx.fillText('취업의 지옥에서 탈출하라!', cx, 220);

    // Divider
    ctx.strokeStyle = 'rgba(255,148,28,0.28)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 190, 252); ctx.lineTo(cx + 190, 252);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,148,28,0.55)';
    ctx.beginPath(); ctx.arc(cx, 252, 3.5, 0, Math.PI * 2); ctx.fill();

    // ── Menu panel ───────────────────────────────────────────────────────────
    const px = cx - 260, py = 272, pw = 520, ph = 244;
    ctx.fillStyle   = 'rgba(16,12,7,0.84)';
    ctx.strokeStyle = '#3e2d18';
    ctx.lineWidth   = 1.5;
    this._rrect(ctx, px, py, pw, ph, 20);
    ctx.fill(); ctx.stroke();

    // Corner star decorations on panel
    this._star(ctx, px + 16, py + 14, 6, '#ffaa30', 0.5);
    this._star(ctx, px + pw - 16, py + 14, 6, '#ffaa30', 0.5);

    const iH = 58, iY0 = py + 10;
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const item = MENU_ITEMS[i];
      const iy   = iY0 + i * iH + iH / 2;
      const sel  = i === this._sel && item.enabled;

      if (sel) {
        // Warm amber highlight row
        ctx.fillStyle   = 'rgba(255,152,24,0.16)';
        ctx.strokeStyle = '#ffaa22';
        ctx.lineWidth   = 1.5;
        this._rrect(ctx, px + 12, iY0 + i * iH + 5, pw - 24, iH - 10, 12);
        ctx.fill(); ctx.stroke();
      }

      if (item.enabled) {
        ctx.fillStyle   = sel ? '#ffd060' : 'rgba(255,238,200,0.85)';
        ctx.shadowColor = sel ? '#ffaa20' : 'transparent';
        ctx.shadowBlur  = sel ? 12 : 0;
        ctx.font        = `${sel ? 'bold ' : ''}20px "Courier New", monospace`;

        if (sel && this._blinkShow) {
          ctx.textAlign = 'left';
          ctx.fillText('▶', px + 28, iy);
          ctx.textAlign = 'center';
        }
        ctx.fillText(item.label, cx, iy);
      } else {
        ctx.fillStyle  = 'rgba(200,168,108,0.28)';
        ctx.shadowBlur = 0;
        ctx.font       = '19px "Courier New", monospace';
        ctx.fillText(item.label + '  ·  COMING SOON', cx, iy);
      }
      ctx.shadowBlur = 0;
    }

    // ── Best score chip ──────────────────────────────────────────────────────
    const best  = parseInt(localStorage.getItem('coderun_best') ?? '0', 10);
    const chipW = 238, chipH = 44;
    const chipX = cx - chipW / 2, chipY = py + ph + 16;
    ctx.fillStyle   = 'rgba(16,12,7,0.78)';
    ctx.strokeStyle = 'rgba(255,200,48,0.38)';
    ctx.lineWidth   = 1.5;
    this._rrect(ctx, chipX, chipY, chipW, chipH, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = 'rgba(255,215,0,0.78)';
    ctx.font         = '14px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★  BEST  ${best.toString().padStart(7, '0')}`, cx, chipY + chipH / 2);

    // ── Controls hint ────────────────────────────────────────────────────────
    ctx.fillStyle    = 'rgba(255,215,148,0.20)';
    ctx.font         = '13px "Courier New", monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↑↓  SELECT    ENTER / SPACE  CONFIRM', cx, CANVAS.HEIGHT - 18);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);      ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }

  _star(ctx, cx, cy, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a  = (i * Math.PI) / 5 - Math.PI / 2;
      const ri = i % 2 === 0 ? r : r * 0.42;
      i === 0
        ? ctx.moveTo(cx + ri * Math.cos(a), cy + ri * Math.sin(a))
        : ctx.lineTo(cx + ri * Math.cos(a), cy + ri * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
