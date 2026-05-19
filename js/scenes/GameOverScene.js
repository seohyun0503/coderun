import { CANVAS, SCENES } from '../config/constants.js';
import { Scene } from './Scene.js';

// ─── Text pools ───────────────────────────────────────────────────────────────

const FAIL_HEADLINES = [
  '★  GAME OVER  ★',
  '★  BUILD FAILED  ★',
  '★  취업 실패!  ★',
  '★  내년에 다시 도전!  ★',
  '★  서류 탈락 (404 Not Found)  ★',
  '★  면접 탈락 (Exit Code 1)  ★',
];

const CAUSE_MSGS = [
  '당신의 인생에서 1개의 컴파일 에러가 발생했습니다',
  'Segmentation Fault (core dumped)',
  'NullPointerException at life.java:42',
  'SyntaxError: Unexpected token "꿈"',
  'Error: Uncaught TypeError: 인생 is not a function',
  'NullPointerException: 이력서에 \'경력(Experience)\' 객체가 비어있습니다.',
  '자기소개서 무한 검토 중 StackOverflowError가 발생했습니다.',
  '면접관의 압박 질문으로 인해 Segmentation Fault가 발생했습니다.'
];

const ENCOURAGE_MSGS = [
  '"괜찮아, git reset --hard 하면 돼"',
  '"다음 학기엔 잘 될 거야"',
  '"스택오버플로우 뒤지면 답 나와"',
  '"이번엔 n+1번째 시도야, 화이팅"',
  '"커밋 메시지: fix: fix the previous fix"',
  '"버그는 성장의 증거야, 계속 도전해!"',
  '"스펙 리팩토링하고 다시 Push해보자. 잔디는 배신하지 않아."',
  '"커밋 메시지: fix: fix the previous resume and try again"',
  '"취업 시장이라는 무한 루프도 언젠가는 탈출(return)하게 되어 있어. 화이팅!"',
];

// ─── Button definitions ───────────────────────────────────────────────────────

const BUTTONS = [
  { label: '▶  RETRY',     key: 'retry' },
  { label: '◀  MAIN MENU', key: 'menu'  },
];

const BTN_W = 222, BTN_H = 56, BTN_GAP = 32;

// ─── GameOverScene ────────────────────────────────────────────────────────────

export class GameOverScene extends Scene {
  constructor(game) {
    super(game);
    this._score        = 0;
    this._bestScore    = 0;
    this._jellyCount   = 0;
    this._newBest      = false;
    this._headline     = FAIL_HEADLINES[0];
    this._causeMsg     = CAUSE_MSGS[0];
    this._encourageMsg = ENCOURAGE_MSGS[0];
    this._selBtn       = 0;
    this._blink        = 0;
    this._blinkShow    = true;
    this._particles    = [];
    this._enterTimer   = 0;
    this._t            = 0;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  enter({ score = 0, jellyCount = 0 } = {}) {
    this._score      = Math.floor(score);
    this._jellyCount = jellyCount;
    this._bestScore  = parseInt(localStorage.getItem('coderun_best') ?? '0', 10);
    this._selBtn     = 0;
    this._enterTimer = 0.6;
    this._t          = 0;

    this._headline     = FAIL_HEADLINES[Math.floor(Math.random() * FAIL_HEADLINES.length)];
    this._causeMsg     = CAUSE_MSGS[Math.floor(Math.random() * CAUSE_MSGS.length)];
    this._encourageMsg = ENCOURAGE_MSGS[Math.floor(Math.random() * ENCOURAGE_MSGS.length)];

    if (this._score > this._bestScore) {
      this._bestScore = this._score;
      localStorage.setItem('coderun_best', this._bestScore);
      this._newBest = true;
      this._spawnParticles();
    } else {
      this._newBest   = false;
      this._particles = [];
    }
  }

  _spawnParticles() {
    const cx = CANVAS.WIDTH / 2;
    this._particles = Array.from({ length: 70 }, () => ({
      x:       cx, y: 108,
      vx:      (Math.random() - 0.5) * 720,
      vy:      (Math.random() - 0.85) * 560,
      life:    1.6 + Math.random() * 0.4,
      maxLife: 2.0,
      color:   `hsl(${Math.random() * 80 + 195}, 65%, 65%)`,  // mist blue → purple
      r:       2 + Math.random() * 5,
    }));
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    const { input } = this.game;
    this._t     += dt;
    this._blink += dt;
    if (this._blink >= 0.55) { this._blink = 0; this._blinkShow = !this._blinkShow; }

    for (const p of this._particles) {
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += 860 * dt;
      p.life -= dt;
    }
    this._particles = this._particles.filter(p => p.life > 0);

    if (this._enterTimer > 0) { this._enterTimer -= dt; return; }

    if (input.isKeyJustPressed('ArrowUp'))
      this._selBtn = (this._selBtn - 1 + BUTTONS.length) % BUTTONS.length;
    if (input.isKeyJustPressed('ArrowDown'))
      this._selBtn = (this._selBtn + 1) % BUTTONS.length;
    if (input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) this._confirm();
    if (input.isKeyJustPressed('Escape')) this.game.switchScene(SCENES.MENU);
  }

  _confirm() {
    if (BUTTONS[this._selBtn].key === 'retry') this.game.switchScene(SCENES.GAME);
    else this.game.switchScene(SCENES.MENU);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    const cx = CANVAS.WIDTH / 2;

    // Background — deep indigo-black
    ctx.fillStyle = '#0b0916';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Purple vignette
    const vign = ctx.createRadialGradient(cx, CANVAS.HEIGHT / 2, 200, cx, CANVAS.HEIGHT / 2, 700);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(75,55,140,0.22)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Confetti
    for (const p of this._particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle   = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha  = 1;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ── Headline box ─────────────────────────────────────────────────────────
    const pulse  = 0.75 + 0.25 * Math.abs(Math.sin(this._t * 1.4));
    const hdrX = cx - 326, hdrY = 44, hdrW = 652, hdrH = 78;
    ctx.fillStyle   = 'rgba(55,45,115,0.30)';
    ctx.strokeStyle = `rgba(120,140,220,${pulse})`;
    ctx.lineWidth   = 2;
    this._rrect(ctx, hdrX, hdrY, hdrW, hdrH, 18);
    ctx.fill(); ctx.stroke();

    // Corner stars on headline box
    this._star(ctx, hdrX + 20,        hdrY + hdrH / 2, 9, '#8898c8', 0.7);
    this._star(ctx, hdrX + hdrW - 20, hdrY + hdrH / 2, 9, '#8898c8', 0.7);

    ctx.shadowColor = '#6878c8';
    ctx.shadowBlur  = 28;
    ctx.fillStyle   = '#c0ccf0';
    ctx.font        = 'bold 50px "Courier New", monospace';
    ctx.fillText(this._headline, cx, hdrY + hdrH / 2);
    ctx.shadowBlur  = 0;

    // Cause message
    ctx.fillStyle    = 'rgba(155,185,220,0.55)';
    ctx.font         = '14px "Courier New", monospace';
    ctx.textBaseline = 'top';
    ctx.fillText(this._causeMsg, cx, hdrY + hdrH + 14);

    // ── Stats card ───────────────────────────────────────────────────────────
    const cardX = cx - 292, cardY = 178, cardW = 584, cardH = 198;
    ctx.fillStyle = 'rgba(10,8,24,0.90)';
    if (this._newBest) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 14 + 8 * Math.abs(Math.sin(this._t * 2));
    } else {
      ctx.strokeStyle = '#2e2858';
      ctx.lineWidth   = 1.5;
    }
    this._rrect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Corner stars on card
    this._star(ctx, cardX + 18,         cardY + 18, 7, '#7888b8', 0.45);
    this._star(ctx, cardX + cardW - 18, cardY + 18, 7, '#7888b8', 0.45);

    const rows = [
      { label: 'SCORE',  value: this._score.toString().padStart(7, '0'),     color: '#00ff88' },
      { label: 'BEST',   value: this._bestScore.toString().padStart(7, '0'), color: '#ffd700' },
      { label: 'JELLY',  value: this._jellyCount.toString(),                  color: '#9ab0e8' },
    ];

    const rowH = cardH / rows.length;
    for (let i = 0; i < rows.length; i++) {
      const ry = cardY + i * rowH + rowH / 2;

      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = 'rgba(175,200,230,0.52)';
      ctx.font         = '16px "Courier New", monospace';
      ctx.fillText(rows[i].label, cardX + 40, ry);

      ctx.textAlign   = 'right';
      ctx.fillStyle   = rows[i].color;
      ctx.shadowColor = rows[i].color;
      ctx.shadowBlur  = 8;
      ctx.font        = 'bold 26px "Courier New", monospace';
      ctx.fillText(rows[i].value, cardX + cardW - 40, ry);
      ctx.shadowBlur  = 0;

      if (i < rows.length - 1) {
        ctx.fillStyle = 'rgba(110,140,200,0.12)';
        ctx.fillRect(cardX + 40, cardY + (i + 1) * rowH - 0.5, cardW - 80, 1);
      }
    }

    // ── New record badge ──────────────────────────────────────────────────────
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (this._newBest) {
      const badgeY = cardY + cardH + 20;
      this._star(ctx, cx - 148, badgeY, 10, '#ffd700', 0.9);
      this._star(ctx, cx + 148, badgeY, 10, '#ffd700', 0.9);
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 20 + 8 * Math.abs(Math.sin(this._t * 2.5));
      ctx.fillStyle   = '#ffd700';
      ctx.font        = 'bold 22px "Courier New", monospace';
      ctx.fillText('★★  신규 최고기록!  ★★', cx, badgeY);
      ctx.shadowBlur  = 0;
    }

    // ── Encouragement ────────────────────────────────────────────────────────
    const msgY = cardY + cardH + (this._newBest ? 52 : 24);
    ctx.fillStyle = 'rgba(175,200,230,0.38)';
    ctx.font      = '15px "Courier New", monospace';
    ctx.fillText(this._encourageMsg, cx, msgY);

    // ── Buttons ──────────────────────────────────────────────────────────────
    const totalW = 2 * BTN_W + BTN_GAP;
    const btnX0  = cx - totalW / 2;
    const btnY   = 508;

    for (let i = 0; i < BUTTONS.length; i++) {
      const bx  = btnX0 + i * (BTN_W + BTN_GAP);
      const sel = i === this._selBtn;

      if (i === 0) {
        // RETRY — mist blue
        ctx.fillStyle   = sel ? 'rgba(75,110,200,0.52)' : 'rgba(40,50,110,0.25)';
        ctx.strokeStyle = sel ? '#7888d0' : 'rgba(70,85,155,0.55)';
      } else {
        // MAIN MENU — purple-gray
        ctx.fillStyle   = sel ? 'rgba(60,85,165,0.22)' : 'rgba(12,10,28,0.80)';
        ctx.strokeStyle = sel ? '#8898c8' : 'rgba(55,60,115,0.55)';
      }
      ctx.lineWidth = sel ? 2 : 1.5;
      this._rrect(ctx, bx, btnY, BTN_W, BTN_H, 14);
      ctx.fill();
      if (sel) { ctx.shadowColor = i === 0 ? '#7080c8' : '#8898c8'; ctx.shadowBlur = 14; }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle    = sel ? '#c0ccf0' : 'rgba(182,205,235,0.75)';
      ctx.shadowColor  = sel ? (i === 0 ? '#7080c8' : '#8898c8') : 'transparent';
      ctx.shadowBlur   = sel ? 10 : 0;
      ctx.font         = `${sel ? 'bold ' : ''}19px "Courier New", monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillText(BUTTONS[i].label, bx + BTN_W / 2, btnY + BTN_H / 2);
      ctx.shadowBlur = 0;
    }

    // ── Controls hint ────────────────────────────────────────────────────────
    ctx.fillStyle    = 'rgba(158,185,220,0.20)';
    ctx.font         = '12px "Courier New", monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↑↓  SELECT    ENTER  CONFIRM    ESC  MENU', cx, CANVAS.HEIGHT - 18);
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
    ctx.shadowBlur  = 12;
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
