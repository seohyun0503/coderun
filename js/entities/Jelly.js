import { Entity } from './Entity.js';

export const JELLY_SIZE = 24;

// ─── Type registry ────────────────────────────────────────────────────────────

const TYPES = {
  java:   { score: 1,  weight: 0.55, primary: '#c97a30', accent: '#7a4419' },
  python: { score: 3,  weight: 0.25, primary: '#f7c948', accent: '#4b8bbe' },
  c:      { score: 4,  weight: 0.10, primary: '#1a5ea8', accent: '#5dade2' },
  mysql:  { score: 5,  weight: 0.08, primary: '#00758f', accent: '#00aec7' },
  git:    { score: 10, weight: 0.02, primary: '#40c463', accent: '#216e39' },
};

export const JELLY_TYPE_KEYS = Object.keys(TYPES);

export function randomJellyType() {
  const r = Math.random();
  let acc = 0;
  for (const [key, cfg] of Object.entries(TYPES)) {
    acc += cfg.weight;
    if (r < acc) return key;
  }
  return 'java';
}

// ─── Jelly ────────────────────────────────────────────────────────────────────

export class Jelly extends Entity {
  constructor(x, y, type = 'java') {
    super(x, y, JELLY_SIZE, JELLY_SIZE);
    this.type = type;

    const cfg   = TYPES[type] ?? TYPES.java;
    this.score  = cfg.score;
    this._cfg   = cfg;

    this._baseY    = y;
    this._bobTimer = Math.random() * Math.PI * 2;
    this._bobAmp   = 6;
    this._bobSpeed = 2.4 + Math.random() * 1.6;
  }

  get bounds() { return this.getBounds(); }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  update(dt, worldSpeed) {
    this.x -= worldSpeed * dt;
    if (this.x + JELLY_SIZE < 0) this.active = false;

    this._bobTimer += this._bobSpeed * dt;
    this.y = this._baseY + Math.sin(this._bobTimer) * this._bobAmp;
  }

  collect() {
    this.active = false;
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────────

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    switch (this.type) {
      case 'java':   this._drawJava(ctx);   break;
      case 'python': this._drawPython(ctx); break;
      case 'c':      this._drawC(ctx);      break;
      case 'mysql':  this._drawMysql(ctx);  break;
      case 'git':    this._drawGit(ctx);    break;
    }
    ctx.restore();
  }

  // ── java : 커피컵 ☕ ──────────────────────────────────────────────────────────

  _drawJava(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;

    ctx.fillStyle = '#c97a30';
    ctx.fillRect(x + 3, y + 5, S - 6, S - 7);

    ctx.strokeStyle = '#1d1611';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(x + S - 3, y + S / 2, 5, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 4, y + 3); ctx.quadraticCurveTo(cx - 6, y + 1, cx - 4, y - 1);
    ctx.moveTo(cx + 2, y + 3); ctx.quadraticCurveTo(cx + 4, y + 1, cx + 2, y - 1);
    ctx.stroke();

    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 10px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('J', cx - 1, y + S / 2 + 2);
  }

  // ── python : 곰젤리 🐻 (노랑 상반신 + 파랑 하반신 + 귀) ─────────────────────

  _drawPython(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2;
    const r  = S / 2 - 1;

    // 귀
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.arc(cx - 7, y + 3, 4, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#4b8bbe';
    ctx.beginPath(); ctx.arc(cx + 7, y + 3, 4, Math.PI, 0); ctx.fill();

    // 상반신 (노랑)
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill();

    // 하반신 (파랑)
    ctx.fillStyle = '#4b8bbe';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill();

    // 눈
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - 4, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, cy - 3, 1.5, 0, Math.PI * 2); ctx.fill();

    // 코
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(cx, cy - 1, 1.2, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ── c : C 포인터 *ptr ────────────────────────────────────────────────────────

  _drawC(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2;

    // 배경 원
    ctx.fillStyle  = '#1a5ea8';
    ctx.shadowColor = '#5dade2';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, S / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // "C" 호
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.arc(cx + 1, cy, 7, Math.PI * 0.25, Math.PI * 1.75);
    ctx.stroke();

    // 포인터 "*"
    ctx.fillStyle    = '#9ed8f8';
    ctx.font         = 'bold 8px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('*', cx + 7, cy - 6);
  }

  // ── mysql : MySQL 돌고래 🐬 ─────────────────────────────────────────────────

  _drawMysql(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2 + 2;

    // 몸통 (타원)
    ctx.fillStyle  = '#00758f';
    ctx.shadowColor = '#00aec7';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, S / 2 - 1, S / 2 - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 등지느러미
    ctx.fillStyle = '#005c73';
    ctx.beginPath();
    ctx.moveTo(cx - 2, y + 4);
    ctx.quadraticCurveTo(cx + 2, y,     cx + 8, y + 4);
    ctx.quadraticCurveTo(cx + 4, y + 7, cx - 2, y + 4);
    ctx.closePath();
    ctx.fill();

    // 꼬리
    ctx.fillStyle = '#005c73';
    ctx.beginPath();
    ctx.moveTo(x + 2, cy + 2);
    ctx.lineTo(x - 2, cy - 3);
    ctx.lineTo(x - 2, cy + 7);
    ctx.closePath();
    ctx.fill();

    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#003344';
    ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // ── git : 커밋 잔디 🌿 ────────────────────────────────────────────────────────

  _drawGit(ctx) {
    const { x, y } = this;
    const S    = JELLY_SIZE;
    const cell = Math.floor((S - 4) / 4);

    // 고정 잔디 패턴
    const pattern = [
      '#9be9a8','#40c463','#30a14e','#216e39',
      '#40c463','#216e39','#9be9a8','#30a14e',
      '#216e39','#9be9a8','#40c463','#30a14e',
      '#30a14e','#40c463','#216e39','#9be9a8',
    ];

    ctx.shadowColor = '#40c463';
    ctx.shadowBlur  = 14;

    for (let i = 0; i < 16; i++) {
      const r = Math.floor(i / 4), c = i % 4;
      ctx.fillStyle = pattern[i];
      ctx.fillRect(x + 2 + c * cell, y + 2 + r * cell, cell - 1, cell - 1);
    }
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x + 1, y + 1, S - 2, S - 2);
  }
}
