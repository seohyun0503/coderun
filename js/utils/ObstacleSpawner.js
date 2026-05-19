import { CANVAS } from '../config/constants.js';
import { Obstacle, OBSTACLE_META } from '../entities/Obstacle.js';

// ─── Minimum Safe Distances (MSD) ────────────────────────────────────────────
//
// Derived from player physics (JUMP_FORCE=-900, GRAVITY=1800, speed 600-1200 px/s):
//
//   S → J   700 px   player can finish slide (0.5 s) then jump at any speed.
//   J → S   900 px   within-pattern only; cross-pattern gap is time-gated below.
//   J → J    80 px   physical clearance only (no timing constraint)
//
// Cross-pattern hint transitions are also enforced by minimum timer checks in
// update(): J→S needs 1.5 s, S→J needs 0.9 s since last commit.

const MSD_SLIDE_TO_JUMP      = 700;
const MSD_JUMP_TO_SLIDE      = 900;
const MSD_JUMP_TO_JUMP       =  80;
const MSD_DOUBLE_TO_DOUBLE   = 200;  // 이단 점프 장애물 연속 시 최소 간격

// 이단 점프로만 회피 가능한 장애물
const DOUBLE_JUMP_OBSTACLES = new Set(['JobPosting', 'TestPaperStack']);

function _minGap(fromKey, toKey) {
  const from = OBSTACLE_META[fromKey].avoidHint;
  const to   = OBSTACLE_META[toKey].avoidHint;
  if (from === 'slide' && to === 'jump') return MSD_SLIDE_TO_JUMP;
  if (from === 'jump'  && to === 'slide') return MSD_JUMP_TO_SLIDE;
  if (DOUBLE_JUMP_OBSTACLES.has(fromKey) && DOUBLE_JUMP_OBSTACLES.has(toKey))
    return MSD_DOUBLE_TO_DOUBLE;
  return MSD_JUMP_TO_JUMP;
}

/**
 * Build a pattern from obstacle type keys.
 * offsetX values are computed automatically so every consecutive pair
 * satisfies the MSD rules above.
 * @param {...string} typeKeys
 */
function pat(...typeKeys) {
  let offset = 0;
  return typeKeys.map((key, i) => {
    const entry = { typeKey: key, offsetX: offset };
    if (i + 1 < typeKeys.length) {
      offset += OBSTACLE_META[key].width + _minGap(key, typeKeys[i + 1]);
    }
    return entry;
  });
}

// ─── Spawn phase definitions ──────────────────────────────────────────────────
//
// J = jump obstacle (TestPaperStack, JobPosting, HeavyTextbook)
// S = slide obstacle (NaggingBubble, DeadlineBanner)
//
// Combo notation in comments reflects the MSD-enforced offsetX computed above.

const PHASES = [
  {
    // Early  0–20 s: single obstacles only
    minInterval: 1.8,
    maxInterval: 2.8,
    patterns: [
      pat('TestPaperStack'),
      pat('JobPosting'),
      pat('HeavyTextbook'),
      pat('NaggingBubble'),
      pat('DeadlineBanner'),
    ],
  },
  {
    // Mid  20–60 s: J+J pairs and S→J combos
    minInterval: 1.2,
    maxInterval: 1.9,
    patterns: [
      pat('TestPaperStack', 'JobPosting'),      // J+J  gap=40
      pat('TestPaperStack', 'HeavyTextbook'),   // J+J  gap=40
      pat('HeavyTextbook',  'JobPosting'),      // J+J  gap=40
      pat('NaggingBubble',  'TestPaperStack'),  // S→J  gap=220
      pat('NaggingBubble',  'HeavyTextbook'),   // S→J  gap=220
      pat('DeadlineBanner', 'JobPosting'),      // S→J  gap=220
    ],
  },
  {
    // Late  60 s+: J+J+J triples and S→J+J combos
    minInterval: 1.0,
    maxInterval: 1.8,
    patterns: [
      pat('TestPaperStack', 'JobPosting',     'HeavyTextbook'),   // J+J+J
      pat('HeavyTextbook',  'TestPaperStack', 'JobPosting'),      // J+J+J
      pat('NaggingBubble',  'TestPaperStack'),                    // S→J
      pat('NaggingBubble',  'HeavyTextbook',  'JobPosting'),      // S→J+J
      pat('DeadlineBanner', 'TestPaperStack'),                    // S→J
      pat('DeadlineBanner', 'HeavyTextbook',  'TestPaperStack'),  // S→J+J
    ],
  },
];

// ─── ObstacleSpawner ──────────────────────────────────────────────────────────

export class ObstacleSpawner {
  /**
   * @param {number} [stageIndex=0]  Which stage entry in stages.json to load
   *                                  (used for optional interval overrides)
   */
  constructor(stageIndex = 0) {
    this._elapsed      = 0;
    this._timer        = 0;
    this._nextInterval = this._rollInterval(PHASES[0]);
    this._lastTypes    = [];   // ring-buffer of last 2 first-obstacle type-keys
    this._lastPatternLastType = null;  // type of final obstacle in previous pattern

    // Non-blocking load of stages.json for optional interval overrides
    this._stageCfg = null;
    fetch('./data/stages.json')
      .then(r => r.json())
      .then(data => { this._stageCfg = data.stages?.[stageIndex] ?? null; })
      .catch(() => { /* stay with built-in defaults */ });
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  /**
   * Call once per frame.
   * @param {number}     dt         Real delta-time in seconds
   * @param {Obstacle[]} obstacles  Active obstacles on screen (for overlap check)
   * @returns {Obstacle[]}  Newly spawned obstacles (may be empty)
   */
  update(dt, obstacles = []) {
    this._elapsed += dt;
    this._timer   += dt;

    if (this._timer < this._nextInterval) return [];

    const phase = this._currentPhase();

    // Pick candidate pattern without committing _lastTypes yet
    const available = phase.patterns.filter(p => !this._isBlocked(p[0].typeKey));
    const pool      = available.length > 0 ? available : phase.patterns;
    const pattern   = pool[Math.floor(Math.random() * pool.length)];

    // Enforce cross-pattern hint transition times (timer keeps running on reject)
    if (this._lastPatternLastType) {
      const prevHint = OBSTACLE_META[this._lastPatternLastType].avoidHint;
      const nextHint = OBSTACLE_META[pattern[0].typeKey].avoidHint;
      if (prevHint === 'jump'  && nextHint === 'slide' && this._timer < 1.5) return [];
      if (prevHint === 'slide' && nextHint === 'jump'  && this._timer < 0.9) return [];
    }

    // Reject if any candidate would overlap an existing obstacle
    const spawnX = CANVAS.WIDTH + 20;
    const overlaps = pattern.some(({ typeKey, offsetX }) => {
      const nx = spawnX + offsetX;
      const nw = OBSTACLE_META[typeKey].width;
      return obstacles.some(o => nx < o.x + o.width && nx + nw > o.x);
    });

    if (overlaps) return [];   // timer keeps running — retry next frame

    // Commit
    this._timer = 0;
    this._nextInterval = this._rollInterval(phase);
    this._lastTypes.push(pattern[0].typeKey);
    if (this._lastTypes.length > 2) this._lastTypes.shift();
    this._lastPatternLastType = pattern[pattern.length - 1].typeKey;

    return pattern.map(({ typeKey, offsetX }) =>
      new Obstacle(spawnX + offsetX, typeKey),
    );
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  _currentPhase() {
    if (this._elapsed < 20) return PHASES[0];
    if (this._elapsed < 60) return PHASES[1];
    return PHASES[2];
  }

  _rollInterval(phase) {
    const min = this._stageCfg?.obstacleIntervalMin ?? phase.minInterval;
    const max = this._stageCfg?.obstacleIntervalMax ?? phase.maxInterval;
    return min + Math.random() * (max - min);
  }

  /**
   * Returns true if spawning typeKey would be the THIRD consecutive time.
   */
  _isBlocked(typeKey) {
    return (
      this._lastTypes.length >= 2 &&
      this._lastTypes[this._lastTypes.length - 1] === typeKey &&
      this._lastTypes[this._lastTypes.length - 2] === typeKey
    );
  }
}
