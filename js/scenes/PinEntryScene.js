import { Scene }    from './Scene.js';
import { CANVAS }   from '../config/constants.js';
import { Accounts } from '../auth/AccountManager.js';

// ─── 키패드 레이아웃 (CreateAccountScene과 동일) ─────────────────────────────

const PAD_KEYS = [[1,2,3],[4,5,6],[7,8,9],['',0,'⌫']];
const PAD_BTN  = 80;
const PAD_GAP  = 12;
const PAD_W    = 3 * PAD_BTN + 2 * PAD_GAP;  // 276
const PAD_H    = 4 * PAD_BTN + 3 * PAD_GAP;  // 356
const PAD_X    = (CANVAS.WIDTH - PAD_W) / 2;
const PAD_Y    = 292;

const SHAKE_SEQ  = [-8, 8, -6, 6, -3, 3, 0];
const SHAKE_STEP = 57; // ms per step

const LOCK_FAIL_COUNT = 5;
const LOCK_MS         = 3000;

// ─── PinEntryScene ────────────────────────────────────────────────────────────

export class PinEntryScene extends Scene {
  constructor(game) {
    super(game);
    this._account      = null;
    this._pin          = '';
    this._errorMsg     = '';
    this._failCount    = 0;
    this._lockUntil    = 0;    // epoch ms; 0 = not locked
    this._isLoggingIn  = false;
    this._shakeOffset  = 0;
    this._shakeRafId   = null;
    this._mouseX       = -1;
    this._mouseY       = -1;
    this._pressedKey   = null;
    this._onMouseMove  = null;
    this._onClick      = null;
    this._onMouseDown  = null;
    this._onMouseUp    = null;
    this._onKeyDown    = null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  enter(payload) {
    this._account     = null;
    this._pin         = '';
    this._errorMsg    = '';
    this._failCount   = 0;
    this._lockUntil   = 0;
    this._isLoggingIn = false;
    this._pressedKey  = null;
    this._stopShake();

    if (!payload?.accountId) {
      console.error('[PinEntry] no accountId in payload');
      // TODO: 단계 5에서 this.game.switchScene('playerSelect')로 교체
      return;
    }

    const found = Accounts.listAccounts().find(a => a.id === payload.accountId);
    if (!found) {
      console.error('[PinEntry] account not found:', payload.accountId);
      // TODO: 단계 5에서 this.game.switchScene('playerSelect')로 교체
      return;
    }
    this._account = found;

    const toV = (e) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const dpr  = window.devicePixelRatio ?? 1;
      return {
        vx: ((e.clientX - rect.left) * dpr - this.game._offsetX) / this.game._scale,
        vy: ((e.clientY - rect.top)  * dpr - this.game._offsetY) / this.game._scale,
      };
    };

    this._onMouseMove = (e) => { const { vx, vy } = toV(e); this._mouseX = vx; this._mouseY = vy; };
    this._onMouseDown = (e) => { const { vx, vy } = toV(e); this._pressedKey = this._hitKeypad(vx, vy); };
    this._onMouseUp   = ()  => { this._pressedKey = null; };
    this._onClick     = (e) => { const { vx, vy } = toV(e); this._handleClick(vx, vy); };
    this._onKeyDown   = (e) => this._handleKey(e);

    const c = this.game.canvas;
    c.addEventListener('mousemove', this._onMouseMove);
    c.addEventListener('mousedown', this._onMouseDown);
    c.addEventListener('mouseup',   this._onMouseUp);
    c.addEventListener('click',     this._onClick);
    window.addEventListener('keydown', this._onKeyDown);
  }

  exit() {
    const c = this.game.canvas;
    c.removeEventListener('mousemove', this._onMouseMove);
    c.removeEventListener('mousedown', this._onMouseDown);
    c.removeEventListener('mouseup',   this._onMouseUp);
    c.removeEventListener('click',     this._onClick);
    window.removeEventListener('keydown', this._onKeyDown);
    this._stopShake();
    c.style.cursor = 'default';
  }

  update(_dt) {
    // 잠금 해제 시 상태 리셋
    if (this._lockUntil > 0 && Date.now() >= this._lockUntil) {
      this._lockUntil = 0;
      this._failCount = 0;
      this._errorMsg  = '';
    }
  }

  // ─── 입력 처리 ────────────────────────────────────────────────────────────────

  _handleKey(e) {
    if (e.key === 'Escape') { this._goBack(); return; }
    if (this._isLocked) return;
    if (/^[0-9]$/.test(e.key)) { this._inputDigit(e.key); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); this._deleteDigit(); }
  }

  _handleClick(vx, vy) {
    if (this._isBackHit(vx, vy)) { this._goBack(); return; }
    if (this._isLocked) return;
    const key = this._hitKeypad(vx, vy);
    if (key === null)    return;
    if (key === '⌫')     this._deleteDigit();
    else if (key !== '') this._inputDigit(String(key));
  }

  _inputDigit(d) {
    if (this._shakeRafId !== null || this._isLoggingIn) return;
    if (this._pin.length >= 4) return;
    this._pin += d;
    if (this._pin.length === 4)
      setTimeout(() => { if (this._pin.length === 4) this._tryLogin(); }, 120);
  }

  _deleteDigit() {
    if (this._pin.length > 0) {
      this._pin      = this._pin.slice(0, -1);
      this._errorMsg = '';
    }
  }

  // ─── 로그인 시도 ─────────────────────────────────────────────────────────────

  async _tryLogin() {
    if (!this._account || this._isLoggingIn) return;
    this._isLoggingIn = true;
    try {
      const account = await Accounts.login(this._account.id, this._pin);
      console.log('[PinEntry] login success:', account);
      setTimeout(() => console.log('[PinEntry] would switch to MenuScene'), 300);
      // TODO: 단계 5에서 this.game.switchScene('menu')로 교체
    } catch {
      this._pin = '';
      this._failCount++;
      this._errorMsg = '번호가 일치하지 않아요';
      if (this._failCount >= LOCK_FAIL_COUNT) {
        this._lockUntil = Date.now() + LOCK_MS;
        this._errorMsg  = '';
      }
      this._startShake();
    } finally {
      this._isLoggingIn = false;
    }
  }

  _goBack() {
    console.log('[PinEntry] back to player select');
    // TODO: 단계 5에서 this.game.switchScene('playerSelect')로 교체
  }

  // ─── 잠금 상태 ────────────────────────────────────────────────────────────────

  get _isLocked() {
    return Date.now() < this._lockUntil;
  }

  // ─── 흔들림 애니메이션 ────────────────────────────────────────────────────────

  _startShake() {
    this._stopShake();
    const t0 = performance.now();
    const tick = (now) => {
      const idx = Math.floor((now - t0) / SHAKE_STEP);
      if (idx >= SHAKE_SEQ.length) {
        this._shakeOffset = 0;
        this._shakeRafId  = null;
        return;
      }
      this._shakeOffset = SHAKE_SEQ[idx];
      this._shakeRafId  = requestAnimationFrame(tick);
    };
    this._shakeRafId = requestAnimationFrame(tick);
  }

  _stopShake() {
    if (this._shakeRafId !== null) { cancelAnimationFrame(this._shakeRafId); this._shakeRafId = null; }
    this._shakeOffset = 0;
  }

  // ─── 히트 테스트 ─────────────────────────────────────────────────────────────

  _hitKeypad(vx, vy) {
    for (let r = 0; r < PAD_KEYS.length; r++) {
      for (let c = 0; c < PAD_KEYS[r].length; c++) {
        const key = PAD_KEYS[r][c];
        if (key === '') continue;
        const bx = PAD_X + c * (PAD_BTN + PAD_GAP);
        const by = PAD_Y + r * (PAD_BTN + PAD_GAP) + this._shakeOffset;
        if (vx >= bx && vx < bx + PAD_BTN && vy >= by && vy < by + PAD_BTN) return key;
      }
    }
    return null;
  }

  _isBackHit(vx, vy) {
    return vx >= 40 && vx <= 160 && vy >= CANVAS.HEIGHT - 58 && vy <= CANVAS.HEIGHT - 20;
  }

  _isAnyHoverable() {
    if (this._isBackHit(this._mouseX, this._mouseY)) return true;
    if (this._isLocked) return false;
    return this._hitKeypad(this._mouseX, this._mouseY) !== null;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    const cx = CANVAS.WIDTH / 2;

    ctx.fillStyle = '#0e0c0a';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    this._renderCard(ctx, cx);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font      = '15px "Courier New", monospace';
    ctx.fillText('PIN 번호를 입력해주세요', cx, 154);

    this._renderDots(ctx, cx);
    this._renderStatus(ctx, cx);
    this._renderKeypad(ctx);
    this._renderBack(ctx);

    this.game.canvas.style.cursor = this._isAnyHoverable() ? 'pointer' : 'default';
  }

  _renderCard(ctx, cx) {
    if (!this._account) return;
    const cw = 220, ch = 80;
    const cardX = cx - cw / 2;
    const cardY = 48;

    ctx.fillStyle   = '#1a1612';
    ctx.strokeStyle = 'rgba(255,208,96,0.35)';
    ctx.lineWidth   = 1.5;
    this._rrect(ctx, cardX, cardY, cw, ch, 12); ctx.fill(); ctx.stroke();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffd060';
    ctx.shadowColor  = '#ffaa20';
    ctx.shadowBlur   = 8;
    ctx.font         = 'bold 20px "Courier New", monospace';
    ctx.fillText('👤 ' + this._account.nickname, cx, cardY + ch / 2 - 10);
    ctx.shadowBlur   = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font      = '12px "Courier New", monospace';
    ctx.fillText('#●●●●', cx, cardY + ch / 2 + 14);
  }

  _renderDots(ctx, cx) {
    const dotW = 44, dotH = 56, dotGap = 20;
    const dotsW = 4 * dotW + 3 * dotGap;
    const dotX0 = cx - dotsW / 2;
    const dotY  = 176 + this._shakeOffset;

    for (let i = 0; i < 4; i++) {
      const dx     = dotX0 + i * (dotW + dotGap);
      const filled = i < this._pin.length;
      ctx.fillStyle   = filled ? '#1e1a14' : '#161210';
      ctx.strokeStyle = filled ? 'rgba(255,208,96,0.60)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = 1.5;
      this._rrect(ctx, dx, dotY, dotW, dotH, 8); ctx.fill(); ctx.stroke();
      if (filled) {
        ctx.fillStyle    = '#ffd060';
        ctx.font         = 'bold 28px "Courier New", monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('●', dx + dotW / 2, dotY + dotH / 2);
      }
    }
  }

  _renderStatus(ctx, cx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    if (this._isLocked) {
      const secs = Math.ceil((this._lockUntil - Date.now()) / 1000);
      ctx.fillStyle = 'rgba(255,160,60,0.90)';
      ctx.font      = '14px "Courier New", monospace';
      ctx.fillText(`${secs}초 후 다시 시도할 수 있어요...`, cx, 252);
      return;
    }

    if (this._errorMsg) {
      ctx.fillStyle = '#ff6666';
      ctx.font      = '14px "Courier New", monospace';
      ctx.fillText(this._errorMsg, cx, 252 + this._shakeOffset);
    }

    if (this._failCount > 0) {
      ctx.fillStyle = 'rgba(255,120,60,0.60)';
      ctx.font      = '12px "Courier New", monospace';
      ctx.fillText(`${this._failCount} / ${LOCK_FAIL_COUNT}회 실패`, cx, 272);
    }
  }

  _renderKeypad(ctx) {
    const locked = this._isLocked;
    const hovKey = locked ? null : this._hitKeypad(this._mouseX, this._mouseY);

    for (let r = 0; r < PAD_KEYS.length; r++) {
      for (let c = 0; c < PAD_KEYS[r].length; c++) {
        const key = PAD_KEYS[r][c];
        if (key === '') continue;
        const bx  = PAD_X + c * (PAD_BTN + PAD_GAP);
        const by  = PAD_Y + r * (PAD_BTN + PAD_GAP) + this._shakeOffset;
        const hov = hovKey === key;
        const prs = !locked && this._pressedKey === key;

        ctx.fillStyle   = locked ? '#1c1814' : (prs ? '#1a1612' : (hov ? '#3a3128' : '#2a241e'));
        ctx.strokeStyle = locked ? 'rgba(255,255,255,0.04)' : (hov ? 'rgba(255,208,96,0.40)' : 'rgba(255,255,255,0.08)');
        ctx.lineWidth   = 1;
        this._rrect(ctx, bx, by, PAD_BTN, PAD_BTN, 12); ctx.fill(); ctx.stroke();

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = locked ? 'rgba(255,255,255,0.18)'
          : (key === '⌫' ? 'rgba(255,120,100,0.80)' : '#ffffff');
        ctx.font = key === '⌫' ? '22px "Courier New", monospace' : 'bold 26px "Courier New", monospace';
        ctx.fillText(String(key), bx + PAD_BTN / 2, by + PAD_BTN / 2);
      }
    }
  }

  _renderBack(ctx) {
    const hov = this._isBackHit(this._mouseX, this._mouseY);
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = hov ? 'rgba(255,200,80,0.85)' : 'rgba(255,200,80,0.35)';
    ctx.font         = '15px "Courier New", monospace';
    ctx.fillText('← 뒤로', 44, CANVAS.HEIGHT - 38);
  }

  // ─── 헬퍼: 둥근 직사각형 ──────────────────────────────────────────────────────

  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);     ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);     ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);         ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }
}

/*
 * ─── 임시 테스트 방법 ────────────────────────────────────────────────────────────
 *
 * ▶ 단계 1에서 만든 계정의 id 확인:
 *   JSON.parse(localStorage.getItem('coderun_accounts')).accounts
 *   → id 예: "민수_1234"
 *
 * ▶ 브라우저 콘솔에서 즉시 전환:
 *   const { PinEntryScene } = await import('./js/scenes/PinEntryScene.js');
 *   window.__game.sceneManager.setImmediate(new PinEntryScene(window.__game));
 *   // (enter에 payload가 필요하므로 setImmediate 직후 수동 enter 호출)
 *   window.__game.sceneManager._current.enter({ accountId: '민수_1234' });
 *
 * ▶ 또는 game.js에서 임시 초기 씬으로 설정:
 *   import { PinEntryScene } from './scenes/PinEntryScene.js';
 *   // init() 마지막 줄:
 *   const s = new PinEntryScene(this);
 *   this.sceneManager.setImmediate(s);
 *   s.enter({ accountId: '민수_1234' });
 *
 * ▶ 시나리오별 확인:
 *   [정상]    올바른 PIN 4자리 입력 → 콘솔 [PinEntry] login success:
 *   [실패]    틀린 PIN 입력 → 흔들림 + "번호가 일치하지 않아요" + "1 / 5회 실패"
 *   [5회 실패] 5회 연속 실패 → "N초 후 다시 시도할 수 있어요..." 3초 카운트다운
 *             키패드 회색화 + 클릭 무시 확인
 *   [잠금 해제] 3초 후 자동 활성화 + failCount 초기화 확인
 *   [뒤로]    ESC 또는 뒤로 버튼 → 콘솔 [PinEntry] back to player select
 */
