import { CANVAS, GROUND_Y } from '../config/constants.js';
import { Jelly, JELLY_SIZE, randomJellyType } from '../entities/Jelly.js';

// ─── Physics constants (mirrored from Player.js for accurate arc) ─────────────
const JUMP_VY  = 900;   // initial upward px/s  (absolute value of JUMP_FORCE)
const GRAVITY  = 1800;  // px/s²

// ─── Pattern generators ───────────────────────────────────────────────────────

// 일직선 배치: 10개 젤리를 수평으로 늘어놓음
function linePattern(spawnX, y, count = 10, spacing = 26) {
  return Array.from({ length: count }, (_, i) => ({
    x: spawnX + i * spacing,
    y,
    type: randomJellyType(),
  }));
}

// 곡선 배치: 플레이어 1회 점프 궤적을 따라 젤리 배치 (8개)
function arcPattern(spawnX, worldSpeed) {
  const count    = 8;
  const duration = 1.0;   // one full jump cycle takes ≈ 1 s
  const jellies  = [];

  for (let i = 0; i < count; i++) {
    // t in [0.05, 0.95] so first/last are just above ground
    const t    = 0.05 + (i / (count - 1)) * 0.9;
    // parabolic height: h(t) = JUMP_VY·t – ½·g·t²
    const h    = JUMP_VY * t - 0.5 * GRAVITY * t * t;
    const x    = spawnX + (i / (count - 1)) * (worldSpeed * duration);
    const y    = Math.max(GROUND_Y - 10 - h - JELLY_SIZE, 60);
    jellies.push({ x, y, type: randomJellyType() });
  }
  return jellies;
}

// 클러스터 배치: 6개 젤리가 원형으로 뭉쳐있는 보너스 배치
function clusterPattern(spawnX) {
  const count  = 6;
  const cx     = spawnX + 40;
  const cy     = GROUND_Y - 130;
  const radius = 30;

  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return {
      x:    cx + Math.cos(angle) * radius,
      y:    cy + Math.sin(angle) * radius,
      type: randomJellyType(),
    };
  });
}

// ─── JellySpawner ─────────────────────────────────────────────────────────────

const PATTERN_NAMES = ['line', 'arc', 'cluster'];

export class JellySpawner {
  constructor() {
    this._timer        = 0;
    this._nextInterval = 4.0;
    this._lastPattern  = null;
  }

  /**
   * Call once per frame.
   * @param {number} dt          Frame delta in seconds
   * @param {number} worldSpeed  Current scroll speed (px/s) — used for arc calc
   * @returns {Jelly[]}          New jelly instances (may be empty)
   */
  update(dt, worldSpeed) {
    this._timer += dt;
    if (this._timer < this._nextInterval) return [];

    this._timer        = 0;
    this._nextInterval = 3.5 + Math.random() * 3.0;   // 3.5 – 6.5 s between patterns

    return this._spawn(worldSpeed);
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _spawn(worldSpeed) {
    const type     = this._pickPattern();
    const spawnX   = CANVAS.WIDTH + 24;
    let   positions;

    switch (type) {
      case 'line':
        positions = linePattern(spawnX, GROUND_Y - 90);
        break;
      case 'arc':
        positions = arcPattern(spawnX, worldSpeed);
        break;
      case 'cluster':
        positions = clusterPattern(spawnX);
        break;
    }

    return positions.map(p => new Jelly(p.x, p.y, p.type));
  }

  _pickPattern() {
    // Avoid repeating the same pattern twice in a row
    const pool = PATTERN_NAMES.filter(n => n !== this._lastPattern);
    const pick  = pool[Math.floor(Math.random() * pool.length)];
    this._lastPattern = pick;
    return pick;
  }
}
