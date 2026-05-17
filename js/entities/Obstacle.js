import { Entity } from './Entity.js';
import { GROUND_Y } from '../config/constants.js';
import { AssetLoader } from '../utils/AssetLoader.js';

// ─── Obstacle type registry ───────────────────────────────────────────────────
//
// Jump obstacles: bottom edge = GROUND_Y (sits on ground)
//
// Slide obstacles: bottom = GROUND_Y − 90 = 510
//   Standing player top = GROUND_Y−130 = 470 → 470+6 margin = 476 < 510 → HIT  ✓
//   Sliding  player top = GROUND_Y−50  = 550 → 550+6 margin = 556 > 510 → SAFE ✓
//
// Slide obstacles are IMPOSSIBLE to jump over:
//   Player double-jump max top ≈ GROUND_Y−130−225−144 = 101 px
//   NaggingBubble  top = GROUND_Y−560 =  40 < 101 → impossible ✓
//   DeadlineBanner top = GROUND_Y−540 =  60 < 101 → impossible ✓

const CONFIGS = {
  // ── Jump obstacles (120 % of original size) ──────────────────────────────
  TestPaperStack: {
    width: 105, height: 155,
    getY: () => GROUND_Y - 155,
    avoidHint: 'jump',
    damage: 1,
  },
  JobPosting: {
    width: 83, height: 195,
    getY: () => GROUND_Y - 195,
    avoidHint: 'jump',
    damage: 1,
  },
  HeavyTextbook: {
    width: 129, height: 111,
    getY: () => GROUND_Y - 111,
    avoidHint: 'jump',
    damage: 1,
  },
  // ── Slide-only obstacles (must duck under, cannot jump over) ─────────────
  NaggingBubble: {
    width: 440, height: 470,
    getY: () => GROUND_Y - 570,   // top=30, bottom=GROUND_Y-100=500
    avoidHint: 'slide',
    damage: 1,
  },
  DeadlineBanner: {
    width: 1082, height: 450,
    getY: () => GROUND_Y - 550,   // top=50, bottom=GROUND_Y-100=500
    avoidHint: 'slide',
    damage: 1,
    // Hitboxes are relative to obstacle origin (0,0 = top-left of bounding box).
    // Shape: wide banner face across the top + two side pillars going down.
    // The open arch underneath (x 90–992, y 160–450) is collision-free.
    hitboxes: [
      { x:   0, y:   0, width: 1082, height: 330 },  // banner face (full width)
      { x:   100, y: 330, width:   850, height: 110 }  // center pillar
    ],
  },
};

export const OBSTACLE_TYPES = Object.keys(CONFIGS);

// Width + avoidHint per type — used by ObstacleSpawner to compute safe gaps.
export const OBSTACLE_META = Object.fromEntries(
  OBSTACLE_TYPES.map(k => [k, { width: CONFIGS[k].width, avoidHint: CONFIGS[k].avoidHint }]),
);

// ─── Obstacle asset manifest (mirrors OBSTACLE_TYPES) ────────────────────────

export const OBSTACLE_MANIFEST = Object.fromEntries(
  OBSTACLE_TYPES.map(k => [k, `./assets/images/Obstacle/${k}.png`]),
);

// ─── Obstacle ─────────────────────────────────────────────────────────────────

export class Obstacle extends Entity {
  constructor(x, type = 'TestPaperStack') {
    const cfg = CONFIGS[type] ?? CONFIGS.TestPaperStack;
    super(x, cfg.getY(), cfg.width, cfg.height);
    this.type      = type;
    this.damage    = cfg.damage;
    this.avoidHint = cfg.avoidHint;

    // Oscillation phase — used for NaggingBubble wobble and DeadlineBanner sway
    this._phase = Math.random() * Math.PI * 2;
  }

  get bounds() { return this.getBounds(); }

  /**
   * Returns world-space hitboxes for this obstacle.
   * Falls back to the entity bounding box for types with no hitboxes defined.
   * @returns {{ x: number, y: number, width: number, height: number }[]}
   */
  getHitboxes() {
    const defs = CONFIGS[this.type]?.hitboxes;
    if (!defs) return [this.getBounds()];
    return defs.map(h => ({
      x:      this.x + h.x,
      y:      this.y + h.y,
      width:  h.width,
      height: h.height,
    }));
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(dt, worldSpeed) {
    this.x -= worldSpeed * dt;
    if (this.x + this.width < 0) this.active = false;

    if (this.type === 'NaggingBubble')  this._phase += dt * 5.5;
    if (this.type === 'DeadlineBanner') this._phase += dt * 1.4;
  }

  // ─── Draw ────────────────────────────────────────────────────────────────────

  draw(ctx) {
    const { x, y, width, height } = this;
    const img = AssetLoader.get(this.type);

    ctx.save();

    if (this.type === 'NaggingBubble') {
      // Gentle wobble — translate the whole image
      ctx.translate(
        Math.sin(this._phase) * 3,
        Math.sin(this._phase * 0.7) * 2,
      );
    }

    if (this.type === 'DeadlineBanner') {
      // Subtle sway — rotate around the banner's top-centre
      const pivotX = x + width / 2;
      ctx.translate(pivotX, y);
      ctx.rotate(Math.sin(this._phase) * 0.025);
      ctx.translate(-pivotX, -y);
    }

    if (img) {
      ctx.drawImage(img, x, y, width, height);
    } else {
      // Fallback: solid block so the obstacle remains visible if image fails
      ctx.fillStyle = '#e94560';
      ctx.fillRect(x, y, width, height);
    }

    ctx.restore();

    // ── Slide hint drawn after transform restore so it stays level ────────────
    if (this.avoidHint === 'slide') {
      ctx.fillStyle    = this.type === 'NaggingBubble'
        ? 'rgba(249,168,37,0.80)'
        : 'rgba(211,47,47,0.85)';
      ctx.font         = '10px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('↓ slide', x + width / 2, y + height + 8);
    }
  }

  // ─── Static helpers ───────────────────────────────────────────────────────────

  static randomType() {
    return OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  }
}
