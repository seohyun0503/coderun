import { Entity } from './Entity.js';

export const JELLY_SIZE = 24;

// ─── Type registry ────────────────────────────────────────────────────────────

const TYPES = {
  java:          { score: 1,  weight: 0.600, primary: '#c97a30', accent: '#7a4419' },
  python:        { score: 3,  weight: 0.250, primary: '#f7c948', accent: '#4b8bbe' },
  cpp:           { score: 4,  weight: 0.080, primary: '#044f88', accent: '#6699cc' },
  javascript:    { score: 5,  weight: 0.050, primary: '#f7df1e', accent: '#323330' },
  git:           { score: 10, weight: 0.015, primary: '#f05033', accent: '#3e2c41' },
  stackoverflow: { score: 7,  weight: 0.005, primary: '#f48024', accent: '#fff'    },
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
  /**
   * @param {number} x
   * @param {number} y     Base vertical position (bob oscillates around this)
   * @param {string} type  One of JELLY_TYPE_KEYS
   */
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

  // ─── Draw ────────────────────────────────────────────────────────────────────

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    switch (this.type) {
      case 'java':          this._drawJava(ctx);          break;
      case 'python':        this._drawPython(ctx);        break;
      case 'cpp':           this._drawCpp(ctx);           break;
      case 'javascript':    this._drawJavascript(ctx);    break;
      case 'git':           this._drawGit(ctx);           break;
      case 'stackoverflow': this._drawStackoverflow(ctx); break;
    }
    ctx.restore();
  }

  // ── java : 커피컵 ☕ ─────────────────────────────────────────────────────────

  _drawJava(ctx) {
    const { x, y } = this;
    const S = JELLY_SIZE;
    const cx = x + S / 2;

    // Cup body
    ctx.fillStyle = '#c97a30';
    ctx.fillRect(x + 3, y + 5, S - 6, S - 7);

    // Handle
    ctx.strokeStyle = '#7a4419';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(x + S - 3, y + S / 2, 5, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    // Steam (two short wavy lines above cup)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 4, y + 3); ctx.quadraticCurveTo(cx - 6, y + 1, cx - 4, y - 1);
    ctx.moveTo(cx + 2, y + 3); ctx.quadraticCurveTo(cx + 4, y + 1, cx + 2, y - 1);
    ctx.stroke();

    // "J" label
    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 10px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('J', cx - 1, y + S / 2 + 2);
  }

  // ── python : 반반 원 🐍 ─────────────────────────────────────────────────────

  _drawPython(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2;
    const r  = S / 2 - 1;

    // Top half – yellow (sun)
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0);
    ctx.fill();

    // Bottom half – blue (ocean)
    ctx.fillStyle = '#4b8bbe';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI);
    ctx.fill();

    // Python logo dots
    ctx.fillStyle = '#4b8bbe';
    ctx.beginPath(); ctx.arc(cx - 4, cy - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath(); ctx.arc(cx + 4, cy + 3, 2.2, 0, Math.PI * 2); ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ── cpp : 쌍둥이 다이아몬드 ─────────────────────────────────────────────────

  _drawCpp(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cy = y + S / 2;

    const diamond = (ox, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + ox,      cy - 9);
      ctx.lineTo(x + ox + 8,  cy);
      ctx.lineTo(x + ox,      cy + 9);
      ctx.lineTo(x + ox - 8,  cy);
      ctx.closePath();
      ctx.fill();
    };

    diamond(8,      '#044f88');  // left  – "C"
    diamond(S - 8,  '#6699cc');  // right – "++"

    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 7px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C',  x + 8,     cy);
    ctx.fillText('+',  x + S - 8, cy);
  }

  // ── javascript : JS 크리스탈 💛 ────────────────────────────────────────────

  _drawJavascript(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2;
    const r  = S / 2 - 1;

    // Hexagonal crystal
    ctx.fillStyle  = '#f7df1e';
    ctx.shadowColor = '#f7df1e';
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy - 4, 4, 3, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // "JS" label
    ctx.fillStyle    = '#323330';
    ctx.font         = 'bold 9px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JS', cx, cy + 1);
  }

  // ── git : 레인보우 원 🌈 ────────────────────────────────────────────────────

  _drawGit(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2;
    const r  = S / 2 - 1;

    // 6 rainbow wedges
    const hues = [0, 40, 80, 155, 215, 270];
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = `hsl(${hues[i]}, 80%, 55%)`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fill();
    }

    // White centre + "G" label
    ctx.fillStyle  = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur  = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle    = '#f05033';
    ctx.font         = 'bold 8px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', cx, cy + 0.5);
  }

  // ── stackoverflow : 번개 ⚡ ─────────────────────────────────────────────────

  _drawStackoverflow(ctx) {
    const { x, y } = this;
    const S  = JELLY_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2;

    // Orange rounded background
    ctx.fillStyle   = '#f48024';
    ctx.shadowColor = '#f48024';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, S - 2, S - 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Lightning bolt polygon
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(cx + 4,  y + 2);      // top-right corner
    ctx.lineTo(cx - 3,  cy - 1);     // mid-left
    ctx.lineTo(cx + 2,  cy - 1);     // mid-right notch
    ctx.lineTo(cx - 4,  y + S - 2);  // bottom-left corner
    ctx.lineTo(cx + 3,  cy + 1);     // mid-right (lower)
    ctx.lineTo(cx - 2,  cy + 1);     // mid-left notch (lower)
    ctx.closePath();
    ctx.fill();
  }

  // ─── Static factory ──────────────────────────────────────────────────────────

  static randomType() { return randomJellyType(); }
}
