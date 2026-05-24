import { Scene }           from './Scene.js';
import { CANVAS, SCENES }  from '../config/constants.js';
import { Accounts }        from '../auth/AccountManager.js';

// ─── 카드 레이아웃 상수 ───────────────────────────────────────────────────────
//
// CARD_H = 240 (사양 280에서 축소):
//   280 × 2행 + gap + GRID_Y = 716 → 720px 초과로 게스트 링크가 가려짐.
//   240 × 2행 + 24(gap) + 118(GRID_Y) = 622 → 게스트 링크(y=682)까지 여유 있음.
//
// TODO: 계정이 8개를 초과하면 3행 이상이 되어 화면을 넘어갑니다.
//       이후 스크롤/페이지네이션을 구현하세요.

const CARD_W    = 220;
const CARD_H    = 240;
const CARD_GAP  = 24;
const COLS      = 4;
const GRID_W    = COLS * CARD_W + (COLS - 1) * CARD_GAP;  // 964 px
const GRID_X    = (CANVAS.WIDTH - GRID_W) / 2;             // 158 px
const GRID_Y    = 118;

// ─── PlayerSelectScene ────────────────────────────────────────────────────────

export class PlayerSelectScene extends Scene {
  constructor(game) {
    super(game);
    this._accounts    = [];
    this._mouseX      = -1;
    this._mouseY      = -1;
    this._onMouseMove = null;
    this._onClick     = null;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  enter() {
    this._accounts = Accounts.listAccounts();

    // 캔버스 클라이언트 좌표 → 가상 1280×720 좌표 변환
    const toVirtual = (e) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const dpr  = window.devicePixelRatio ?? 1;
      return {
        vx: ((e.clientX - rect.left) * dpr - this.game._offsetX) / this.game._scale,
        vy: ((e.clientY - rect.top)  * dpr - this.game._offsetY) / this.game._scale,
      };
    };

    this._onMouseMove = (e) => {
      const { vx, vy } = toVirtual(e);
      this._mouseX = vx;
      this._mouseY = vy;
    };

    this._onClick = (e) => {
      const { vx, vy } = toVirtual(e);
      this._handleClick(vx, vy);
    };

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

  update(_dt) {}

  // ─── 히트 테스트 ─────────────────────────────────────────────────────────────

  /** account = null → "새 계정 만들기" 슬롯 */
  _cardRects() {
    return [...this._accounts, null].map((account, i) => ({
      x: GRID_X + (i % COLS) * (CARD_W + CARD_GAP),
      y: GRID_Y + Math.floor(i / COLS) * (CARD_H + CARD_GAP),
      account,
    }));
  }

  _isHit(rx, ry, px, py) {
    return px >= rx && px < rx + CARD_W && py >= ry && py < ry + CARD_H;
  }

  _isHovered(rx, ry) {
    return this._isHit(rx, ry, this._mouseX, this._mouseY);
  }

  _isGuestHovered() {
    const cy = CANVAS.HEIGHT - 38;
    const cx = CANVAS.WIDTH  / 2;
    return (
      this._mouseX >= cx - 90 && this._mouseX <= cx + 90 &&
      this._mouseY >= cy - 16 && this._mouseY <= cy + 16
    );
  }

  _anyCursorHit() {
    for (const { x, y } of this._cardRects()) {
      if (this._isHovered(x, y)) return true;
    }
    return this._isGuestHovered();
  }

  _handleClick(vx, vy) {
    for (const { x, y, account } of this._cardRects()) {
      if (this._isHit(x, y, vx, vy)) {
        if (account === null) {
          this.game.switchScene('createAccount');
        } else {
          this.game.switchScene('pinEntry', { accountId: account.id });
        }
        return;
      }
    }
    if (this._isGuestHovered()) {
      this.game.isGuest = true;
      Accounts.setCurrent(null);
      this.game.switchScene(SCENES.MENU);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    const cx = CANVAS.WIDTH / 2;

    // 배경
    ctx.fillStyle = '#0e0c0a';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // 타이틀
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffd060';
    ctx.shadowColor  = '#ffaa20';
    ctx.shadowBlur   = 18;
    ctx.font         = 'bold 36px "Courier New", monospace';
    ctx.fillText('누가 플레이하나요?', cx, 64);
    ctx.shadowBlur   = 0;

    // 구분선
    ctx.strokeStyle = 'rgba(255,200,80,0.20)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 300, 96); ctx.lineTo(cx + 300, 96);
    ctx.stroke();

    // 계정 0개 안내
    if (this._accounts.length === 0) {
      ctx.fillStyle    = 'rgba(255,220,100,0.38)';
      ctx.font         = '17px "Courier New", monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText('아직 등록된 플레이어가 없어요 👋', cx, GRID_Y - 28);
    }

    // 카드 그리기
    for (const { x, y, account } of this._cardRects()) {
      if (account === null) this._drawNewCard(ctx, x, y);
      else                  this._drawAccountCard(ctx, x, y, account);
    }

    // 게스트 링크
    const gHov = this._isGuestHovered();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = gHov ? 'rgba(255,200,80,0.72)' : 'rgba(255,200,80,0.30)';
    ctx.font         = '14px "Courier New", monospace';
    ctx.fillText('게스트로 플레이', cx, CANVAS.HEIGHT - 38);

    // 커서
    this.game.canvas.style.cursor = this._anyCursorHit() ? 'pointer' : 'default';
  }

  // ─── 계정 카드 (사원증 스타일) ────────────────────────────────────────────────

  _drawAccountCard(ctx, x, y, account) {
    const hov = this._isHovered(x, y);
    const ry  = y + (hov ? -8 : 0);   // 호버 시 위로 살짝 이동
    const cx  = x + CARD_W / 2;

    // 호버 글로우
    if (hov) {
      ctx.save();
      ctx.shadowColor = 'rgba(255,175,55,0.28)';
      ctx.shadowBlur  = 28;
      ctx.fillStyle   = 'rgba(0,0,0,0)';
      ctx.fillRect(x, ry, CARD_W, CARD_H);
      ctx.restore();
    }

    // 카드 배경
    ctx.fillStyle = hov ? '#231f1a' : '#1a1612';
    this._rrect(ctx, x, ry, CARD_W, CARD_H, 16);
    ctx.fill();

    // 카드 테두리
    ctx.strokeStyle = hov ? 'rgba(255,175,55,0.55)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = hov ? 1.5 : 1;
    this._rrect(ctx, x, ry, CARD_W, CARD_H, 16);
    ctx.stroke();

    // 아바타 이모지
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = '52px serif';
    ctx.fillText('👤', cx, ry + 58);

    // 닉네임
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 26px "Courier New", monospace';
    ctx.fillText(account.nickname, cx, ry + 116);

    // PIN 표시 (id = nickname_pin → 마지막 4자리가 PIN)
    const pin = account.id.slice(-4);
    ctx.fillStyle = '#ffaa20';
    ctx.font      = '15px "Courier New", monospace';
    ctx.fillText(`#${pin}`, cx, ry + 143);

    // 구분선
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x + 22, ry + 163); ctx.lineTo(x + CARD_W - 22, ry + 163);
    ctx.stroke();

    // 통계 플레이스홀더 (TODO: coderun_meta_${id}에서 실제 데이터 읽기)
    ctx.fillStyle    = 'rgba(255,255,255,0.28)';
    ctx.font         = '12px "Courier New", monospace';
    ctx.fillText('0판 · 0.0km', cx, ry + 188);
  }

  // ─── "새 계정 만들기" 카드 ────────────────────────────────────────────────────

  _drawNewCard(ctx, x, y) {
    const hov = this._isHovered(x, y);
    const ry  = y + (hov ? -8 : 0);
    const cx  = x + CARD_W / 2;
    const cy  = ry + CARD_H / 2;

    // 점선 테두리
    ctx.save();
    ctx.strokeStyle = hov ? 'rgba(255,175,55,0.72)' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([8, 6]);
    this._rrect(ctx, x, ry, CARD_W, CARD_H, 16);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // "+" 아이콘
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = hov ? 'rgba(255,175,55,0.92)' : 'rgba(255,255,255,0.32)';
    ctx.font         = '56px "Courier New", monospace';
    ctx.fillText('+', cx, cy - 20);

    // 레이블
    ctx.fillStyle = hov ? 'rgba(255,175,55,0.85)' : 'rgba(255,255,255,0.32)';
    ctx.font      = '14px "Courier New", monospace';
    ctx.fillText('새 계정 만들기', cx, cy + 36);
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
 * ─── 단독 테스트 방법 ───────────────────────────────────────────────────────────
 *
 * ▶ 단계 5 이전에 임시 확인 (아래 diff를 game.js에 적용):
 *
 *   // game.js 상단 import에 추가
 *   + import { PlayerSelectScene } from './scenes/PlayerSelectScene.js';
 *
 *   // init() 마지막 줄 교체
 *   - this.sceneManager.setImmediate(initialScene ?? new BlankScene(this));
 *   + this.sceneManager.setImmediate(new PlayerSelectScene(this));
 *
 * ▶ 단계 5 이후 (씬 키 등록 완료 시):
 *   window.__game.switchScene('playerSelect')
 */
