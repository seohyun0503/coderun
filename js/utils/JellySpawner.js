import { CANVAS, GROUND_Y } from '../config/constants.js';
import { Jelly, JELLY_SIZE, randomJellyType } from '../entities/Jelly.js';

// ─── Physics constants (mirrored from Player.js for accurate arc) ─────────────
const JUMP_VY  = 900;   // initial upward px/s  (absolute value of JUMP_FORCE)
const GRAVITY  = 1800;  // px/s²

const JELLY_GAP = 10;                    // 젤리 사이 간격 px
const STEP      = JELLY_SIZE + JELLY_GAP; // 58px

// Minimum clearance above an obstacle top so _jellyCollides (Y_MARGIN=8) won't fire
const OBS_CLEAR = JELLY_SIZE + 10;

// ─── Pattern generators ───────────────────────────────────────────────────────

// 일직선 배치
function linePattern(spawnX, y, count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    x: spawnX + i * STEP,
    y,
    type: randomJellyType(),
  }));
}

// 곡선 배치: 점프 궤적을 따라 STEP 간격으로 배치, 장애물 위로 올림
function arcPattern(spawnX, worldSpeed, obstacles = []) {
  const duration = 1.0;
  const span     = worldSpeed * duration;
  const count    = Math.min(12, Math.max(1, Math.floor(span / STEP)));
  const arcEndX  = spawnX + count * STEP;
  const jellies  = [];

  const nearObs = obstacles.filter(o => o.x + o.width > spawnX && o.x < arcEndX);

  for (let i = 0; i < count; i++) {
    const t = 0.05 + (i / Math.max(count - 1, 1)) * 0.9;
    const h = JUMP_VY * t - 0.5 * GRAVITY * t * t;
    const x = spawnX + i * STEP;
    let   y = Math.max(GROUND_Y - 10 - h - JELLY_SIZE, 60);

    for (const obs of nearObs) {
      if (x + JELLY_SIZE > obs.x && x < obs.x + obs.width) {
        y = Math.min(y, obs.y - OBS_CLEAR);
      }
    }

    jellies.push({ x, y: Math.max(y, 60), type: randomJellyType() });
  }
  return jellies;
}

// 클러스터 배치: 8개 젤리가 원형으로 뭉쳐있는 보너스 배치
function clusterPattern(spawnX) {
  const count  = 8;
  const cx     = spawnX + JELLY_SIZE;
  const cy     = GROUND_Y - 160;
  const radius = 65;

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
    this._nextInterval = 2.5;
    this._lastPattern  = null;
  }

  /**
   * @param {number}   dt          Frame delta in seconds
   * @param {number}   worldSpeed  Current scroll speed (px/s)
   * @param {object[]} obstacles   Live obstacle list for arc clearance calculation
   * @returns {Jelly[]}
   */
  update(dt, worldSpeed, obstacles = []) {
    this._timer += dt;
    if (this._timer < this._nextInterval) return [];

    this._timer        = 0;
    this._nextInterval = 2.0 + Math.random() * 2.5;

    return this._spawn(worldSpeed, obstacles);
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _spawn(worldSpeed, obstacles) {
    const type   = this._pickPattern();
    const spawnX = CANVAS.WIDTH + 24;
    let   positions;

    switch (type) {
      case 'line':
        positions = linePattern(spawnX, GROUND_Y - JELLY_SIZE - 20);
        break;
      case 'arc':
        positions = arcPattern(spawnX, worldSpeed, obstacles);
        break;
      case 'cluster':
        positions = clusterPattern(spawnX);
        break;
    }

    return positions.map(p => new Jelly(p.x, p.y, p.type));
  }

  _pickPattern() {
    const pool = PATTERN_NAMES.filter(n => n !== this._lastPattern);
    const pick  = pool[Math.floor(Math.random() * pool.length)];
    this._lastPattern = pick;
    return pick;
  }
}
