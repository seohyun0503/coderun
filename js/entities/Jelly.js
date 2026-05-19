import { Entity } from './Entity.js';
import { AssetLoader } from '../utils/AssetLoader.js';

export const JELLY_SIZE = 48;

// ─── Asset manifest ───────────────────────────────────────────────────────────

export const JELLY_MANIFEST = {
  jelly_java:   './assets/images/Jelly/java.png',
  jelly_python: './assets/images/Jelly/python.png',
  jelly_c:      './assets/images/Jelly/c.png',
  jelly_mysql:  './assets/images/Jelly/mysql.png',
  jelly_git:    './assets/images/Jelly/git.png',
};

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

// 타입별 그리기/히트박스 크기 (python만 32×48, 나머지 48×48)
const DRAW_SIZE = {
  python: { w: 32, h: 48 },
};

export class Jelly extends Entity {
  constructor(x, y, type = 'java') {
    const sz = DRAW_SIZE[type] ?? { w: JELLY_SIZE, h: JELLY_SIZE };
    super(x, y, sz.w, sz.h);
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
    if (this.x + this.width < 0) this.active = false;

    this._bobTimer += this._bobSpeed * dt;
    this.y = this._baseY + Math.sin(this._bobTimer) * this._bobAmp;
  }

  collect() {
    this.active = false;
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────────

  draw(ctx) {
    if (!this.active) return;
    const img = AssetLoader.get('jelly_' + this.type);
    if (img) {
      ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = this._cfg.primary;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}
