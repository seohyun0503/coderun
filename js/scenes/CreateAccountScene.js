import { Scene }    from './Scene.js';
import { CANVAS }   from '../config/constants.js';
import { Accounts } from '../auth/AccountManager.js';

// ─── 키패드 레이아웃 ──────────────────────────────────────────────────────────

const PAD_KEYS = [[1,2,3],[4,5,6],[7,8,9],['',0,'⌫']];
const PAD_BTN  = 80;
const PAD_GAP  = 12;
const PAD_W    = 3 * PAD_BTN + 2 * PAD_GAP;  // 276
const PAD_H    = 4 * PAD_BTN + 3 * PAD_GAP;  // 356
const PAD_X    = (CANVAS.WIDTH - PAD_W) / 2; // 502
const PAD_Y    = 318;

// 흔들림 오프셋 시퀀스 (x축, px)
const SHAKE_SEQ  = [-8, 8, -6, 6, -3, 3, 0];
const SHAKE_STEP = 57; // ms per step  (0.4s / 7)

// ─── CreateAccountScene ───────────────────────────────────────────────────────

export class CreateAccountScene extends Scene {
  constructor(game) {
    super(game);
    this._step        = 'A';
    this._nickname    = '';
    this._pin         = '';
    this._pinConfirm  = '';
    this._errorMsg    = '';
    this._showDialog  = false;
    this._dialogDupId = '';
    this._shakeOffset = 0;
    this._shakeRafId  = null;
    this._mouseX         = -1;
    this._mouseY         = -1;
    this._pressedKey     = null;
    this._onMouseMove    = null;
    this._onClick        = null;
    this._onMouseDown    = null;
    this._onMouseUp      = null;
    this._onKeyDown      = null;
    this._hiddenInput    = null;
    this._onBeforeInput  = null;
    this._onInput        = null;
    this._onHiddenKey    = null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  enter() {
    this._step       = 'A';
    this._nickname   = '';
    this._pin        = '';
    this._pinConfirm = '';
    this._errorMsg   = '';
    this._showDialog = false;
    this._stopShake();

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

    // 한글 등 IME 입력을 받기 위한 숨겨진 input 엘리먼트
    this._hiddenInput = document.createElement('input');
    this._hiddenInput.type = 'text';
    this._hiddenInput.setAttribute('autocomplete',   'off');
    this._hiddenInput.setAttribute('autocorrect',    'off');
    this._hiddenInput.setAttribute('autocapitalize', 'off');
    this._hiddenInput.setAttribute('spellcheck',     'false');
    this._hiddenInput.style.cssText =
      'position:fixed;opacity:0;pointer-events:none;left:-9999px;top:-9999px;width:1px;height:1px;';
    document.body.appendChild(this._hiddenInput);

    // hiddenInput.value / selection은 input·composition 이벤트 도중 절대 건드리지 않는다.
    // 길이 제한은 beforeinput에서만 처리하고, input은 값을 읽기만 한다.
    this._onBeforeInput = (e) => {
      if (this._step !== 'A') return;
      if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
        const curLen = this._hiddenInput.value.length;
        const addLen = (e.data || '').length;
        const selLen = (this._hiddenInput.selectionEnd ?? 0) - (this._hiddenInput.selectionStart ?? 0);
        if (curLen - selLen + addLen > 12) e.preventDefault();
      }
    };
    let _lastCompData = null;
    this._onInput = (e) => {
      if (this._step !== 'A') return;
      const val = this._hiddenInput.value;
      if (e.inputType === 'insertCompositionText' && e.data) {
        _lastCompData = e.data;
        const cl = e.data.length;
        this._nickname = val.slice(cl) + val.slice(0, cl);
      } else if (e.inputType === 'insertText' && e.data === _lastCompData) {
        // Chrome이 blur로 composition이 종료될 때 마지막 조합 글자를
        // insertText로 한 번 더 삽입해 hiddenInput.value를 오염시킴 → 무시
        _lastCompData = null;
        return;
      } else {
        _lastCompData = null;
        this._nickname = val;
      }
      this._errorMsg = '';
    };
    this._onHiddenKey = (e) => {
      if (this._step !== 'A') return;
      if (e.key === 'Enter' && this._nickname.length >= 1) this._advanceToB();
    };
    this._hiddenInput.addEventListener('beforeinput', this._onBeforeInput);
    this._hiddenInput.addEventListener('input',       this._onInput);
    this._hiddenInput.addEventListener('keydown',     this._onHiddenKey);
    this._hiddenInput.focus();

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
    if (this._hiddenInput) {
      this._hiddenInput.removeEventListener('beforeinput', this._onBeforeInput);
      this._hiddenInput.removeEventListener('input',       this._onInput);
      this._hiddenInput.removeEventListener('keydown',     this._onHiddenKey);
      this._hiddenInput.remove();
      this._hiddenInput = null;
    }
    this._stopShake();
    c.style.cursor = 'default';
  }

  update(_dt) {}

  // ─── 키보드 핸들러 ────────────────────────────────────────────────────────────

  _handleKey(e) {
    if (this._showDialog) {
      if (e.key === 'Escape') this._closeDialog();
      return;
    }

    if (this._step === 'A') return; // Step A 입력은 hiddenInput에서 처리

    if (e.key === 'Escape')    { this._goBack(); return; }
    if (/^[0-9]$/.test(e.key)) { this._inputDigit(e.key); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); this._deleteDigit(); }
  }

  // ─── 클릭 핸들러 ──────────────────────────────────────────────────────────────

  _handleClick(vx, vy) {
    if (this._showDialog) {
      const btn = this._hitDialogBtn(vx, vy);
      if (btn === 'mine') {
        console.log('[CreateAccount] 내 계정이에요 → 로그인:', this._dialogDupId);
        this._closeDialog();
      } else if (btn === 'other') {
        console.log('[CreateAccount] 다른 사람이에요 → 다른 번호로');
        this._closeDialog();
      }
      return;
    }

    if (this._isBackHit(vx, vy)) { this._goBack(); return; }

    if (this._step === 'A') {
      this._hiddenInput?.focus();
      if (this._nickname.length >= 1 && this._isNextHit(vx, vy)) this._advanceToB();
      return;
    }

    const key = this._hitKeypad(vx, vy);
    if (key === null)   return;
    if (key === '⌫')    this._deleteDigit();
    else if (key !== '') this._inputDigit(String(key));
  }

  // ─── 단계 전환 ────────────────────────────────────────────────────────────────

  _advanceToB() {
    this._nickname = this._nickname.slice(0, 12);
    this._step = 'B'; this._pin = ''; this._errorMsg = '';
    this._hiddenInput?.blur();
  }

  _goBack() {
    console.log('[CreateAccount] back to player select');
    // TODO: 단계 5에서 this.game.switchScene('playerSelect')로 교체
  }

  // ─── 숫자 입력 ────────────────────────────────────────────────────────────────

  _inputDigit(d) {
    if (this._shakeRafId !== null) return;

    if (this._step === 'B') {
      if (this._pin.length >= 4) return;
      this._pin += d;
      if (this._pin.length === 4)
        setTimeout(() => { if (this._step === 'B') { this._step = 'C'; this._pinConfirm = ''; } }, 120);
    } else if (this._step === 'C') {
      if (this._pinConfirm.length >= 4) return;
      this._pinConfirm += d;
      if (this._pinConfirm.length === 4)
        setTimeout(() => { if (this._step === 'C') this._confirm(); }, 120);
    }
    this._errorMsg = '';
  }

  _deleteDigit() {
    if (this._step === 'B') {
      this._pin = this._pin.slice(0, -1);
    } else if (this._step === 'C') {
      if (this._pinConfirm.length === 0) {
        // 확인 칸이 비어있으면 Step B로 되돌아가기
        this._step = 'B';
      } else {
        this._pinConfirm = this._pinConfirm.slice(0, -1);
      }
    }
    this._errorMsg = '';
  }

  // ─── PIN 확인 ─────────────────────────────────────────────────────────────────

  _confirm() {
    if (this._pin !== this._pinConfirm) {
      this._errorMsg   = '번호가 일치하지 않아요';
      this._pinConfirm = '';
      this._startShake(() => {
        if (this._step === 'C') { this._step = 'B'; this._pin = ''; }
      });
      return;
    }

    Accounts.createAccount(this._nickname, this._pin)
      .then(account => {
        console.log('[CreateAccount] account created:', account);
        setTimeout(() => console.log('[CreateAccount] would switch to MenuScene'), 500);
        // TODO: 단계 5에서 this.game.switchScene('menu')로 교체
      })
      .catch(err => {
        const msg = err?.message ?? '';
        if (msg.includes('이미 사용 중')) {
          this._dialogDupId = `${this._nickname.trim()}_${this._pin}`;
          this._showDialog  = true;
        } else {
          this._errorMsg = msg || '알 수 없는 오류가 발생했어요';
        }
        this._pinConfirm = '';
      });
  }

  // ─── 흔들림 애니메이션 ────────────────────────────────────────────────────────

  _startShake(onDone) {
    this._stopShake();
    const t0 = performance.now();
    const tick = (now) => {
      const idx = Math.floor((now - t0) / SHAKE_STEP);
      if (idx >= SHAKE_SEQ.length) {
        this._shakeOffset = 0;
        this._shakeRafId  = null;
        if (onDone) onDone();
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

  _closeDialog() {
    this._showDialog  = false;
    this._dialogDupId = '';
    this._pin         = '';
    this._pinConfirm  = '';
    this._step        = 'B';
  }

  // ─── 히트 테스트 ─────────────────────────────────────────────────────────────

  _hitKeypad(vx, vy) {
    if (this._step === 'A') return null;
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

  _isNextHit(vx, vy) {
    const bx = CANVAS.WIDTH / 2 - 80, by = 320, bw = 160, bh = 48;
    return vx >= bx && vx < bx + bw && vy >= by && vy < by + bh;
  }

  _hitDialogBtn(vx, vy) {
    const cx = CANVAS.WIDTH / 2;
    const dlgY = 260, btnY = dlgY + 130, btnW = 180, btnH = 48, gap = 24;
    if (vy < btnY || vy >= btnY + btnH) return null;
    if (vx >= cx - gap / 2 - btnW && vx < cx - gap / 2) return 'mine';
    if (vx >= cx + gap / 2         && vx < cx + gap / 2 + btnW) return 'other';
    return null;
  }

  _isAnyHoverable() {
    if (this._showDialog) return this._hitDialogBtn(this._mouseX, this._mouseY) !== null;
    if (this._isBackHit(this._mouseX, this._mouseY)) return true;
    if (this._step === 'A')
      return this._nickname.length >= 1 && this._isNextHit(this._mouseX, this._mouseY);
    return this._hitKeypad(this._mouseX, this._mouseY) !== null;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    const cx = CANVAS.WIDTH / 2;

    ctx.fillStyle = '#0e0c0a';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // 타이틀
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd060'; ctx.shadowColor = '#ffaa20'; ctx.shadowBlur = 16;
    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.fillText('새 플레이어 등록', cx, 56);
    ctx.shadowBlur = 0;

    // 구분선
    ctx.strokeStyle = 'rgba(255,200,80,0.20)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 260, 84); ctx.lineTo(cx + 260, 84); ctx.stroke();

    // 안내문
    ctx.fillStyle = 'rgba(200,200,200,0.45)';
    ctx.font = '13px "Courier New", monospace'; ctx.textBaseline = 'top';
    ctx.fillText('이 번호는 같은 컴퓨터에서 내 계정을 찾기 위한 것이에요.', cx, 96);
    ctx.fillText('친구가 봐도 괜찮은 숫자로 정해주세요.', cx, 114);

    this._drawStepIndicator(ctx, cx);

    if (this._step === 'A') this._renderStepA(ctx, cx);
    else                    this._renderStepBC(ctx, cx);

    // 뒤로 버튼
    const backHov = this._isBackHit(this._mouseX, this._mouseY);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = backHov ? 'rgba(255,200,80,0.85)' : 'rgba(255,200,80,0.35)';
    ctx.font = '15px "Courier New", monospace';
    ctx.fillText('← 뒤로', 44, CANVAS.HEIGHT - 38);

    this.game.canvas.style.cursor = this._isAnyHoverable() ? 'pointer' : 'default';

    if (this._showDialog) this._renderDialog(ctx, cx);
  }

  _drawStepIndicator(ctx, cx) {
    const labels = ['① 닉네임', '② 번호', '③ 확인'];
    const steps  = ['A', 'B', 'C'];
    const gap = 130, startX = cx - gap;
    for (let i = 0; i < 3; i++) {
      const x = startX + i * gap, active = steps[i] === this._step;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = active ? '#ffd060' : 'rgba(255,200,80,0.28)';
      ctx.font = active ? 'bold 14px "Courier New", monospace' : '13px "Courier New", monospace';
      ctx.fillText(labels[i], x, 148);
      if (active) { ctx.fillStyle = '#ffd060'; ctx.fillRect(x - 36, 158, 72, 2); }
    }
  }

  // ─── Step A — 닉네임 ─────────────────────────────────────────────────────────

  _renderStepA(ctx, cx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('닉네임을 입력해주세요 (1~12자)', cx, 196);

    // 입력 박스
    const bx = cx - 220, by = 222, bw = 440, bh = 60;
    ctx.fillStyle = '#1a1612'; ctx.strokeStyle = 'rgba(255,208,96,0.55)'; ctx.lineWidth = 1.5;
    this._rrect(ctx, bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillText(this._nickname, bx + 18, by + bh / 2);

    // 커서 (530ms 주기 깜빡임)
    if (Math.floor(Date.now() / 530) % 2 === 0) {
      const tw = ctx.measureText(this._nickname).width;
      ctx.fillStyle = '#ffd060';
      ctx.fillRect(bx + 18 + tw + 2, by + 14, 2, bh - 28);
    }

    // 글자수
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this._nickname.length >= 12 ? '#ff9966' : 'rgba(255,255,255,0.35)';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText(`${this._nickname.length} / 12`, bx + bw - 10, by + bh / 2);

    // 에러
    if (this._errorMsg) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ff6666';
      ctx.font = '14px "Courier New", monospace';
      ctx.fillText(this._errorMsg, cx, 305);
    }

    // "다음" 버튼
    const active = this._nickname.length >= 1;
    const nx = cx - 80, ny = 320, nw = 160, nh = 48;
    const hov = active && this._isNextHit(this._mouseX, this._mouseY);

    ctx.fillStyle   = active ? (hov ? 'rgba(255,208,96,0.22)' : 'rgba(255,208,96,0.10)') : 'rgba(80,80,80,0.15)';
    ctx.strokeStyle = active ? (hov ? 'rgba(255,208,96,0.70)' : 'rgba(255,208,96,0.35)') : 'rgba(120,120,120,0.25)';
    ctx.lineWidth = 1.5;
    this._rrect(ctx, nx, ny, nw, nh, 10); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? (hov ? '#ffd060' : 'rgba(255,208,96,0.60)') : 'rgba(150,150,150,0.40)';
    ctx.font = `${active ? 'bold ' : ''}17px "Courier New", monospace`;
    ctx.fillText('다음 →', cx, ny + nh / 2);
  }

  // ─── Step B / C — PIN 입력 ───────────────────────────────────────────────────

  _renderStepBC(ctx, cx) {
    const isC    = this._step === 'C';
    const digits = isC ? this._pinConfirm : this._pin;

    // 안내 (에러 있으면 대체)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this._errorMsg) {
      ctx.fillStyle = '#ff6666'; ctx.font = '14px "Courier New", monospace';
      ctx.fillText(this._errorMsg, cx, 196);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '15px "Courier New", monospace';
      ctx.fillText(
        isC ? '한 번 더 입력해주세요. 잊으면 이 계정을 못 찾아요.' : '4자리 번호를 입력해주세요.',
        cx, 196,
      );
    }

    ctx.fillStyle = 'rgba(255,208,96,0.50)'; ctx.font = '13px "Courier New", monospace';
    ctx.fillText(`「${this._nickname}」`, cx, 216);

    // 4개 슬롯 (쉐이크 오프셋 적용)
    const dotW = 44, dotH = 56, dotGap = 20;
    const dotsW = 4 * dotW + 3 * dotGap;
    const dotX0 = cx - dotsW / 2;
    const dotY  = 248 + this._shakeOffset;

    for (let i = 0; i < 4; i++) {
      const dx = dotX0 + i * (dotW + dotGap);
      const filled = i < digits.length;
      ctx.fillStyle   = filled ? '#1e1a14' : '#161210';
      ctx.strokeStyle = filled ? 'rgba(255,208,96,0.60)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      this._rrect(ctx, dx, dotY, dotW, dotH, 8); ctx.fill(); ctx.stroke();
      if (filled) {
        ctx.fillStyle = '#ffd060'; ctx.font = 'bold 28px "Courier New", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('●', dx + dotW / 2, dotY + dotH / 2);
      }
    }

    this._renderKeypad(ctx);
  }

  _renderKeypad(ctx) {
    const hovKey = this._hitKeypad(this._mouseX, this._mouseY);
    for (let r = 0; r < PAD_KEYS.length; r++) {
      for (let c = 0; c < PAD_KEYS[r].length; c++) {
        const key = PAD_KEYS[r][c];
        if (key === '') continue;
        const bx  = PAD_X + c * (PAD_BTN + PAD_GAP);
        const by  = PAD_Y + r * (PAD_BTN + PAD_GAP) + this._shakeOffset;
        const hov = hovKey === key;
        const prs = this._pressedKey === key;

        ctx.fillStyle   = prs ? '#1a1612' : (hov ? '#3a3128' : '#2a241e');
        ctx.strokeStyle = hov ? 'rgba(255,208,96,0.40)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        this._rrect(ctx, bx, by, PAD_BTN, PAD_BTN, 12); ctx.fill(); ctx.stroke();

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = key === '⌫' ? 'rgba(255,120,100,0.80)' : '#ffffff';
        ctx.font = key === '⌫' ? '22px "Courier New", monospace' : 'bold 26px "Courier New", monospace';
        ctx.fillText(String(key), bx + PAD_BTN / 2, by + PAD_BTN / 2);
      }
    }
  }

  // ─── 중복 계정 다이얼로그 ─────────────────────────────────────────────────────

  _renderDialog(ctx, cx) {
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    const dlgX = cx - 260, dlgY = 260, dlgW = 520, dlgH = 200;
    ctx.fillStyle = '#1a1612'; ctx.strokeStyle = 'rgba(255,208,96,0.50)'; ctx.lineWidth = 1.5;
    this._rrect(ctx, dlgX, dlgY, dlgW, dlgH, 16); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px "Courier New", monospace';
    ctx.fillText('이미 같은 번호로 만든 계정이 있어요', cx, dlgY + 36);

    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '13px "Courier New", monospace';
    ctx.fillText('같은 컴퓨터를 쓰는 사람과 번호가 겹쳤어요.', cx, dlgY + 62);

    const btnW = 180, btnH = 48, gap = 24;
    const btnY = dlgY + 130;
    const lx   = cx - gap / 2 - btnW;
    const rx   = cx + gap / 2;
    const lHov = this._hitDialogBtn(this._mouseX, this._mouseY) === 'mine';
    const rHov = this._hitDialogBtn(this._mouseX, this._mouseY) === 'other';

    ctx.fillStyle   = lHov ? 'rgba(255,208,96,0.18)' : 'rgba(255,208,96,0.07)';
    ctx.strokeStyle = lHov ? 'rgba(255,208,96,0.70)' : 'rgba(255,208,96,0.30)';
    this._rrect(ctx, lx, btnY, btnW, btnH, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lHov ? '#ffd060' : 'rgba(255,208,96,0.65)';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('내 계정이에요 →', lx + btnW / 2, btnY + btnH / 2);

    ctx.fillStyle   = rHov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = rHov ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.18)';
    this._rrect(ctx, rx, btnY, btnW, btnH, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rHov ? '#ffffff' : 'rgba(255,255,255,0.55)';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('다른 번호로 →', rx + btnW / 2, btnY + btnH / 2);
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
 * ▶ 단계 5 이전 임시 확인 (game.js에 적용):
 *
 *   // 상단 import에 추가
 *   + import { CreateAccountScene } from './scenes/CreateAccountScene.js';
 *
 *   // init() 마지막 줄 교체
 *   - this.sceneManager.setImmediate(initialScene ?? new PlayerSelectScene(this));
 *   + this.sceneManager.setImmediate(new CreateAccountScene(this));
 *
 * ▶ 브라우저 콘솔에서 즉시 전환:
 *   const { CreateAccountScene } = await import('./js/scenes/CreateAccountScene.js');
 *   window.__game.sceneManager.setImmediate(new CreateAccountScene(window.__game));
 */
