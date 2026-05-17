import { CANVAS, COLORS, SCENES } from '../config/constants.js';
import { Scene } from './Scene.js';

// ─── Message pools ────────────────────────────────────────────────────────────

const FAIL_HEADLINES = [
  'STACK OVERFLOW :(',
  'BUILD FAILED',
  'SEGMENTATION FAULT',
];

const CAUSE_MSGS = [
  '당신의 인생에서 1개의 컴파일 에러가 발생했습니다',
  'Segmentation Fault (core dumped)',
  'NullPointerException at life.java:42',
];

const ENCOURAGE_MSGS = [
  '"괜찮아, git reset --hard 하면 돼"',
  '"다음 학기엔 잘 될 거야"',
  '"스택오버플로우 뒤지면 답 나와"',
  '"이번엔 n+1번째 시도야, 화이팅"',
  '"커밋 메시지: fix: fix the previous fix"',
];

// ─── Button definitions ───────────────────────────────────────────────────────

const BUTTONS = [
  { label: 'RETRY',     key: 'retry' },
  { label: 'MAIN MENU', key: 'menu'  },
];

const BTN_W = 210, BTN_H = 50, BTN_GAP = 28;

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
    this._selectedBtn  = 0;
    this._blinkTimer   = 0;
    this._blinkShow    = true;
    this._particles    = [];
    this._enterTimer   = 0;   // delay before input is accepted
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  enter({ score = 0, jellyCount = 0 } = {}) {
    this._score      = Math.floor(score);
    this._jellyCount = jellyCount;
    this._bestScore  = parseInt(localStorage.getItem('coderun_best') ?? '0', 10);
    this._selectedBtn = 0;
    this._enterTimer  = 0.6;  // 0.6 s input lock so accidental key presses don't skip

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
    const cy = 120;
    this._particles = Array.from({ length: 70 }, () => ({
      x: cx, y: cy,
      vx: (Math.random() - 0.5) * 700,
      vy: (Math.random() - 0.85) * 550,
      life: 1.6 + Math.random() * 0.4,
      maxLife: 2.0,
      color: `hsl(${Math.random() * 60 + 30}, 95%, 62%)`,
      r: 2 + Math.random() * 5,
    }));
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    const { input } = this.game;

    this._blinkTimer += dt;
    if (this._blinkTimer >= 0.55) {
      this._blinkTimer = 0;
      this._blinkShow  = !this._blinkShow;
    }

    for (const p of this._particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 860 * dt;
      p.life -= dt;
    }
    this._particles = this._particles.filter(p => p.life > 0);

    if (this._enterTimer > 0) {
      this._enterTimer -= dt;
      return;
    }

    if (input.isKeyJustPressed('ArrowUp')) {
      this._selectedBtn = (this._selectedBtn - 1 + BUTTONS.length) % BUTTONS.length;
    }
    if (input.isKeyJustPressed('ArrowDown')) {
      this._selectedBtn = (this._selectedBtn + 1) % BUTTONS.length;
    }

    if (input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) {
      this._confirm();
    }
    if (input.isKeyJustPressed('Escape')) {
      this.game.switchScene(SCENES.MENU);
    }
  }

  _confirm() {
    if (BUTTONS[this._selectedBtn].key === 'retry') {
      this.game.switchScene(SCENES.GAME);
    } else {
      this.game.switchScene(SCENES.MENU);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    ctx.fillStyle = 'rgba(4,4,20,0.94)';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Confetti particles
    for (const p of this._particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const cx = CANVAS.WIDTH  / 2;
    const cy = CANVAS.HEIGHT / 2;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // ── Fail headline ─────────────────────────────────────────────────────────
    ctx.shadowColor = COLORS.OBSTACLE;
    ctx.shadowBlur  = 34;
    ctx.fillStyle   = COLORS.OBSTACLE;
    ctx.font        = 'bold 64px "Courier New", monospace';
    ctx.fillText(this._headline, cx, 112);
    ctx.shadowBlur  = 0;

    // ── Cause meme ────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,90,90,0.60)';
    ctx.font      = '15px "Courier New", monospace';
    ctx.fillText(this._causeMsg, cx, 168);

    // ── Stats panel ───────────────────────────────────────────────────────────
    const panelX = cx - 290, panelY = 205, panelW = 580, panelH = 178;
    ctx.fillStyle   = 'rgba(255,255,255,0.03)';
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth   = 1;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    const rowLeft  = panelX + 36;
    const rowRight = panelX + panelW - 36;
    const rows = [
      { label: 'SCORE',   value: this._score.toString().padStart(7, '0'),       color: '#00ff88' },
      { label: 'BEST',    value: this._bestScore.toString().padStart(7, '0'),   color: 'rgba(255,215,0,0.85)' },
      { label: 'JELLIES', value: this._jellyCount.toString(),                    color: '#f7df1e' },
    ];

    ctx.font         = '18px "Courier New", monospace';
    ctx.textBaseline = 'top';

    for (let i = 0; i < rows.length; i++) {
      const ry = panelY + 20 + i * 46;

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.fillText(rows[i].label, rowLeft, ry);

      ctx.textAlign = 'right';
      ctx.fillStyle = rows[i].color;
      ctx.fillText(rows[i].value, rowRight, ry);

      // Row divider (except after last)
      if (i < rows.length - 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(rowLeft, ry + 38, panelW - 72, 1);
      }
    }

    // ── New record badge ──────────────────────────────────────────────────────
    if (this._newBest) {
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = '#f5a623';
      ctx.shadowBlur   = 22;
      ctx.fillStyle    = '#f5a623';
      ctx.font         = 'bold 22px "Courier New", monospace';
      ctx.fillText('★  신규 최고기록!  ★', cx, panelY + panelH + 24);
      ctx.shadowBlur   = 0;
    }

    // ── Encouragement ─────────────────────────────────────────────────────────
    const msgY = panelY + panelH + (this._newBest ? 62 : 26);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'rgba(255,255,255,0.30)';
    ctx.font         = '15px "Courier New", monospace';
    ctx.fillText(this._encourageMsg, cx, msgY);

    // ── Buttons ───────────────────────────────────────────────────────────────
    const totalBtnW = BUTTONS.length * BTN_W + (BUTTONS.length - 1) * BTN_GAP;
    const btnStartX = cx - totalBtnW / 2;
    const btnY      = 560;

    for (let i = 0; i < BUTTONS.length; i++) {
      const bx  = btnStartX + i * (BTN_W + BTN_GAP);
      const sel = i === this._selectedBtn;

      ctx.fillStyle   = sel ? 'rgba(0,212,255,0.13)' : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = sel ? COLORS.UI_PRIMARY : 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = sel ? 2 : 1;
      ctx.fillRect(bx, btnY, BTN_W, BTN_H);
      ctx.strokeRect(bx, btnY, BTN_W, BTN_H);

      ctx.fillStyle    = sel ? COLORS.UI_PRIMARY : 'rgba(255,255,255,0.60)';
      ctx.shadowColor  = sel ? COLORS.UI_PRIMARY : 'transparent';
      ctx.shadowBlur   = sel ? 12 : 0;
      ctx.font         = `${sel ? 'bold ' : ''}19px "Courier New", monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(BUTTONS[i].label, bx + BTN_W / 2, btnY + BTN_H / 2);
      ctx.shadowBlur   = 0;
    }

    // ── Controls hint ─────────────────────────────────────────────────────────
    ctx.fillStyle    = 'rgba(255,255,255,0.18)';
    ctx.font         = '12px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('↑↓  SELECT    ENTER  CONFIRM    ESC  MENU', cx, CANVAS.HEIGHT - 18);
  }
}
