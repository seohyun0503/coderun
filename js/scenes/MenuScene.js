import { CANVAS, SCENES } from '../config/constants.js';
import { Scene }          from './Scene.js';
import { audioManager }   from '../utils/AudioManager.js';
import { Accounts }       from '../auth/AccountManager.js';

// ─── User chip / dropdown ────────────────────────────────────────────────────
const CHIP_X      = 1100;
const CHIP_Y      = 12;
const CHIP_W      = 160;
const CHIP_H      = 32;
const DD_Y        = CHIP_Y + CHIP_H + 4;
const DD_ITEM_H   = 40;

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

    // User chip / dropdown state
    this._dropdownOpen   = false;
    this._cachedAccount  = null;
    this._mouseX         = -1;
    this._mouseY         = -1;
    this._onMouseMove    = null;
    this._onClick        = null;
  }

  enter() {
    this._sel           = 0;
    this._dropdownOpen  = false;
    this._cachedAccount = Accounts.getCurrent();
    audioManager.play();

    const toV = (e) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const dpr  = window.devicePixelRatio ?? 1;
      return {
        vx: ((e.clientX - rect.left) * dpr - this.game._offsetX) / this.game._scale,
        vy: ((e.clientY - rect.top)  * dpr - this.game._offsetY) / this.game._scale,
      };
    };

    this._onMouseMove = (e) => { const { vx, vy } = toV(e); this._mouseX = vx; this._mouseY = vy; };
    this._onClick     = (e) => { const { vx, vy } = toV(e); this._handleMenuClick(vx, vy); };

    this.game.canvas.addEventListener('mousemove', this._onMouseMove);
    this.game.canvas.addEventListener('click',     this._onClick);
  }

  exit() {
    this.game.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.game.canvas.removeEventListener('click',     this._onClick);
    this._onMouseMove = null;
    this._onClick     = null;
    this.game.canvas.style.cursor = 'default';
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    const { input } = this.game;
    this._t     += dt;
    this._blink += dt;
    if (this._blink >= 0.5) { this._blink = 0; this._blinkShow = !this._blinkShow; }
    for (const s of this._sparks) s.ph += s.sp * dt;

    if (input.isKeyJustPressed('Escape')) { this._dropdownOpen = false; return; }
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

    // Background — deep indigo-black
    ctx.fillStyle = '#0c0a18';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Purple-gray radial glow behind title
    const grd = ctx.createRadialGradient(cx, 195, 0, cx, 195, 540);
    grd.addColorStop(0, 'rgba(100,90,180,0.10)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Twinkling sparkles — mist blue palette
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (const s of this._sparks) {
      const a = 0.10 + Math.abs(Math.sin(s.ph)) * 0.50;
      ctx.globalAlpha = a;
      ctx.fillStyle   = s.warm ? '#9ab8d8' : '#7898c0';
      ctx.font        = `${Math.floor(s.r * 4)}px "Courier New"`;
      ctx.fillText('✦', s.x, s.y);
    }
    ctx.globalAlpha  = 1;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ── Stars flanking title (pulsating) ────────────────────────────────────
    this._star(ctx, cx - 322, 152, 22, '#8090c8', 0.88 + 0.12 * Math.sin(this._t * 1.8));
    this._star(ctx, cx + 322, 152, 22, '#8090c8', 0.88 + 0.12 * Math.sin(this._t * 1.8 + 1.0));
    this._star(ctx, cx - 266, 116, 14, '#6888b8', 0.65 + 0.25 * Math.sin(this._t * 2.3));
    this._star(ctx, cx + 266, 116, 14, '#6888b8', 0.65 + 0.25 * Math.sin(this._t * 2.3 + 0.8));
    this._star(ctx, cx - 218, 168,  9, '#9898c8', 0.45 + 0.35 * Math.sin(this._t * 3.1));
    this._star(ctx, cx + 218, 168,  9, '#9898c8', 0.45 + 0.35 * Math.sin(this._t * 3.1 + 0.5));

    // ── Title ────────────────────────────────────────────────────────────────
    ctx.shadowColor = '#6878c0';
    ctx.shadowBlur  = 44;
    ctx.fillStyle   = '#e0e8f8';
    ctx.font        = 'bold 96px "Courier New", monospace';
    ctx.fillText('CODE RUN', cx, 152);
    ctx.shadowBlur  = 0;

    // Subtitle
    ctx.fillStyle = 'rgba(155,185,215,0.70)';
    ctx.font      = '20px "Courier New", monospace';
    ctx.fillText('취업의 지옥에서 탈출하라!', cx, 220);

    // Divider
    ctx.strokeStyle = 'rgba(110,140,200,0.32)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 190, 252); ctx.lineTo(cx + 190, 252);
    ctx.stroke();
    ctx.fillStyle = 'rgba(110,140,200,0.60)';
    ctx.beginPath(); ctx.arc(cx, 252, 3.5, 0, Math.PI * 2); ctx.fill();

    // ── Menu panel ───────────────────────────────────────────────────────────
    const px = cx - 260, py = 272, pw = 520, ph = 244;
    ctx.fillStyle   = 'rgba(10,8,24,0.88)';
    ctx.strokeStyle = '#2e2858';
    ctx.lineWidth   = 1.5;
    this._rrect(ctx, px, py, pw, ph, 20);
    ctx.fill(); ctx.stroke();

    // Corner star decorations on panel
    this._star(ctx, px + 16,       py + 14, 6, '#7888b8', 0.5);
    this._star(ctx, px + pw - 16,  py + 14, 6, '#7888b8', 0.5);

    const iH = 58, iY0 = py + 10;
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const item = MENU_ITEMS[i];
      const iy   = iY0 + i * iH + iH / 2;
      const sel  = i === this._sel && item.enabled;

      if (sel) {
        // Mist blue highlight row
        ctx.fillStyle   = 'rgba(90,110,200,0.18)';
        ctx.strokeStyle = '#8898c8';
        ctx.lineWidth   = 1.5;
        this._rrect(ctx, px + 12, iY0 + i * iH + 5, pw - 24, iH - 10, 12);
        ctx.fill(); ctx.stroke();
      }

      if (item.enabled) {
        ctx.fillStyle   = sel ? '#c0ccf0' : 'rgba(185,205,235,0.85)';
        ctx.shadowColor = sel ? '#8090c8' : 'transparent';
        ctx.shadowBlur  = sel ? 12 : 0;
        ctx.font        = `${sel ? 'bold ' : ''}20px "Courier New", monospace`;

        if (sel && this._blinkShow) {
          ctx.textAlign = 'left';
          ctx.fillText('▶', px + 28, iy);
          ctx.textAlign = 'center';
        }
        ctx.fillText(item.label, cx, iy);
      } else {
        ctx.fillStyle  = 'rgba(140,165,205,0.35)';
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
    ctx.fillStyle   = 'rgba(10,8,24,0.82)';
    ctx.strokeStyle = 'rgba(130,155,210,0.42)';
    ctx.lineWidth   = 1.5;
    this._rrect(ctx, chipX, chipY, chipW, chipH, 12);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = 'rgba(178,200,235,0.85)';
    ctx.font         = '14px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★  BEST  ${best.toString().padStart(7, '0')}`, cx, chipY + chipH / 2);

    // ── Controls hint ────────────────────────────────────────────────────────
    ctx.fillStyle    = 'rgba(158,185,220,0.22)';
    ctx.font         = '13px "Courier New", monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↑↓  SELECT    ENTER / SPACE  CONFIRM', cx, CANVAS.HEIGHT - 18);

    // ── User chip + dropdown ─────────────────────────────────────────────────
    this._renderUserChip(ctx);
    this._renderDropdown(ctx);
  }

  // ─── User chip / dropdown ────────────────────────────────────────────────────

  _dropdownItems() {
    return [{ label: '플레이어 변경', key: 'switch' }];
  }

  _isChipHit(vx, vy) {
    return vx >= CHIP_X && vx < CHIP_X + CHIP_W && vy >= CHIP_Y && vy < CHIP_Y + CHIP_H;
  }

  _dropdownItemAt(vx, vy) {
    if (!this._dropdownOpen) return -1;
    const items = this._dropdownItems();
    for (let i = 0; i < items.length; i++) {
      const iy = DD_Y + i * DD_ITEM_H;
      if (vx >= CHIP_X && vx < CHIP_X + CHIP_W && vy >= iy && vy < iy + DD_ITEM_H) return i;
    }
    return -1;
  }

  _handleMenuClick(vx, vy) {
    if (this._dropdownOpen) {
      const idx = this._dropdownItemAt(vx, vy);
      if (idx === 0) {
        // 플레이어 변경
        Accounts.switchPlayer();
        this.game.isGuest = false;
        this.game.switchScene('playerSelect');
        return;
      }
      // click outside dropdown → close
      this._dropdownOpen = false;
      return;
    }
    if (this._isChipHit(vx, vy)) {
      this._dropdownOpen = true;
    }
  }

  _renderUserChip(ctx) {
    const account = this._cachedAccount;
    const label   = this.game.isGuest || !account ? '게스트' : account.nickname;
    const hov     = this._isChipHit(this._mouseX, this._mouseY);

    ctx.fillStyle   = hov ? 'rgba(30,26,48,0.95)' : 'rgba(20,18,38,0.88)';
    ctx.strokeStyle = hov ? 'rgba(140,160,220,0.70)' : 'rgba(110,130,200,0.35)';
    ctx.lineWidth   = 1.5;
    this._rrect(ctx, CHIP_X, CHIP_Y, CHIP_W, CHIP_H, 8);
    ctx.fill(); ctx.stroke();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = hov ? '#c8d8f8' : 'rgba(185,205,235,0.80)';
    ctx.font         = '13px "Courier New", monospace';
    const display = label.length > 10 ? label.slice(0, 10) + '…' : label;
    ctx.fillText('👤 ' + display + '  ▾', CHIP_X + CHIP_W / 2, CHIP_Y + CHIP_H / 2);
  }

  _renderDropdown(ctx) {
    if (!this._dropdownOpen) return;
    const items = this._dropdownItems();
    const ddH   = items.length * DD_ITEM_H;

    ctx.fillStyle   = 'rgba(14,12,28,0.97)';
    ctx.strokeStyle = 'rgba(110,130,200,0.45)';
    ctx.lineWidth   = 1.5;
    this._rrect(ctx, CHIP_X, DD_Y, CHIP_W, ddH, 8);
    ctx.fill(); ctx.stroke();

    for (let i = 0; i < items.length; i++) {
      const iy  = DD_Y + i * DD_ITEM_H;
      const hov = this._dropdownItemAt(this._mouseX, this._mouseY) === i;
      if (hov) {
        ctx.fillStyle = 'rgba(90,110,200,0.22)';
        ctx.fillRect(CHIP_X + 1, iy + 1, CHIP_W - 2, DD_ITEM_H - 2);
      }
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = hov ? '#c0ccf0' : 'rgba(185,205,235,0.80)';
      ctx.font         = '13px "Courier New", monospace';
      ctx.fillText(items[i].label, CHIP_X + CHIP_W / 2, iy + DD_ITEM_H / 2);
    }
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
