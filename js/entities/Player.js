import { Entity } from './Entity.js';
import { GRAVITY, DEBUG } from '../config/constants.js';
import { AssetLoader } from '../utils/AssetLoader.js';

// ─── State enum ───────────────────────────────────────────────────────────────

export const PlayerState = Object.freeze({
  IDLE:           'idle',
  RUNNING:        'running',
  JUMPING:        'jumping',
  DOUBLE_JUMPING: 'doubleJumping',
  SLIDING:        'sliding',
  HIT:            'hit',
});

// ─── Tuning constants ─────────────────────────────────────────────────────────

const NORMAL_W  = 80;
const NORMAL_H  = 130;
const SLIDE_H   = 70;

const JUMP_FORCE        = -900;
const DOUBLE_JUMP_FORCE = -720;

const MAX_JUMPS         = 2;
const SLIDE_DURATION    = 0.5;
const INVINCIBLE_DUR    = 1.0;
const BLINK_INTERVAL    = 0.1;

const DEFAULT_HP = 1;
const MAX_HP     = 3;

// ─── Sprite asset manifest ────────────────────────────────────────────────────

export const PLAYER_MANIFEST = {
  player_run:      './assets/images/Player/run.png',
  player_jump:     './assets/images/Player/jump.png',
  player_slide:    './assets/images/Player/slide.png',
  player_gameover: './assets/images/Player/gameover.png',
};

// ─── Sprite frame data (source rects in each PNG) ────────────────────────────

const FRAMES = {
  run: [
    { x:  52, y:  28, width: 144, height: 234 },
    { x: 331, y:  26, width: 125, height: 237 },
    { x: 574, y:  29, width: 133, height: 232 },
    { x: 824, y:  27, width: 151, height: 227 },
    { x:  60, y: 298, width: 143, height: 232 },
    { x: 323, y: 298, width: 144, height: 234 },
    { x: 575, y: 314, width: 132, height: 216 },
    { x: 832, y: 298, width: 134, height: 221 },
  ],
  jump: [
    { x:  84, y:  28, width: 105, height: 237 },
    { x: 333, y:  56, width: 121, height: 209 },
    { x: 592, y:  28, width: 113, height: 224 },
    { x: 845, y:  27, width: 110, height: 215 },
    { x: 592, y:  28, width: 113, height: 224 },
    { x: 333, y:  56, width: 121, height: 209 },
    { x:  84, y:  28, width: 105, height: 237 },
  ],
  slide: [
    { x: 771, y: 114, width: 246, height: 136 },  // deepest crouch
    { x:  20, y: 376, width: 250, height: 132 },  // deepest crouch
  ],
  gameover: [
    { x:  81, y:  25, width: 113, height: 234 },
    { x: 570, y:  40, width: 162, height: 217 },
    { x: 321, y:  56, width: 134, height: 198 },
    { x: 808, y:  73, width: 162, height: 184 },
  ],
};

// fps and loop behaviour per animation key
const ANIM_CFG = {
  run:      { fps: 6, loop: true  },
  jump:     { fps: 6, loop: true  },
  slide:    { fps: 4, loop: true  },
  gameover: { fps: 6, loop: false },
};

// Pixel dimensions used when drawing (hitbox stays at NORMAL_W × NORMAL_H)
const DRAW_STAND = { w: 80, h: 130 };  // run / jump / gameover
const DRAW_SLIDE = { w: 145, h: 75 };  // slide

// ─── Player ───────────────────────────────────────────────────────────────────

export class Player extends Entity {
  constructor(x, groundY) {
    super(x, groundY - NORMAL_H, NORMAL_W, NORMAL_H);

    this.groundY = groundY;
    this.state   = PlayerState.RUNNING;

    this._jumpsLeft  = MAX_JUMPS;
    this._onGround   = true;

    this.hp    = DEFAULT_HP;
    this.maxHp = MAX_HP;

    this._invincible      = false;
    this._invincibleTimer = 0;
    this._blinkVisible    = true;

    this._slideActive = false;
    this._slideTimer  = 0;

    this._animKey  = 'run';
    this._animTime = 0;
  }

  // ─── Derived state ──────────────────────────────────────────────────────────

  get isDead()       { return this.hp <= 0; }
  get isInvincible() { return this._invincible; }

  // ─── Actions ────────────────────────────────────────────────────────────────

  jump() {
    if (this._jumpsLeft <= 0) return;
    if (this._slideActive) this._endSlide();

    const isFirst = this._jumpsLeft === MAX_JUMPS;
    this.vy      = isFirst ? JUMP_FORCE : DOUBLE_JUMP_FORCE;
    this.state   = isFirst ? PlayerState.JUMPING : PlayerState.DOUBLE_JUMPING;
    this._jumpsLeft--;
    this._onGround = false;
  }

  slide() {
    if (this._slideActive || !this._onGround) return;
    this._slideActive = true;
    this._slideTimer  = 0;
    this.height       = SLIDE_H;
    this.y           += NORMAL_H - SLIDE_H;
    this.state        = PlayerState.SLIDING;
  }

  takeDamage() {
    if (this._invincible || this.isDead) return;
    this.hp--;
    this._invincible      = true;
    this._invincibleTimer = 0;
    this.state            = PlayerState.HIT;
  }

  heal() {
    if (this.hp >= this.maxHp) return false;
    this.hp++;
    return true;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  update(dt, slideHeld = false) {
    // Physics
    this.vy += GRAVITY * dt;
    this.y  += this.vy * dt;

    // Ground collision
    const groundTop = this.groundY - this.height;
    if (this.y >= groundTop) {
      this.y  = groundTop;
      this.vy = 0;
      if (!this._onGround) {
        this._onGround  = true;
        this._jumpsLeft = MAX_JUMPS;
        if (this.state === PlayerState.JUMPING ||
            this.state === PlayerState.DOUBLE_JUMPING) {
          this.state = PlayerState.RUNNING;
        }
      }
    } else {
      this._onGround = false;
    }

    // Slide timer
    if (this._slideActive) {
      this._slideTimer += dt;
      if (this._slideTimer >= SLIDE_DURATION) {
        if (slideHeld) {
          this._slideTimer = SLIDE_DURATION;
        } else {
          this._endSlide();
        }
      }
    }

    // Invincibility blink
    if (this._invincible) {
      this._invincibleTimer += dt;
      this._blinkVisible = Math.floor(this._invincibleTimer / BLINK_INTERVAL) % 2 === 0;
      if (this._invincibleTimer >= INVINCIBLE_DUR) {
        this._invincible   = false;
        this._blinkVisible = true;
        if (this.state === PlayerState.HIT) {
          this.state = this._onGround ? PlayerState.RUNNING : PlayerState.JUMPING;
        }
      }
    }

    // Animation key tracking — reset timer on animation change
    const nextKey = this._getAnimKey();
    if (nextKey !== this._animKey) {
      this._animKey  = nextKey;
      this._animTime = 0;
    }
    this._animTime += dt;
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  render(ctx) {
    if (!this._blinkVisible) return;

    const animKey = this._getAnimKey();
    const cfg     = ANIM_CFG[animKey];
    const frames  = FRAMES[animKey];
    const img     = AssetLoader.get('player_' + animKey);

    // Frame index
    const rawIdx = Math.floor(this._animTime * cfg.fps);
    const fi = cfg.loop
      ? rawIdx % frames.length
      : Math.min(rawIdx, frames.length - 1);
    const frame = frames[fi];

    // Draw size and position — bottom-center aligned to hitbox bottom-center
    const drawCfg = (animKey === 'slide') ? DRAW_SLIDE : DRAW_STAND;
    const dw = drawCfg.w;
    const dh = drawCfg.h;
    const dx = this.x + this.width  / 2 - dw / 2;
    const dy = this.y + this.height - dh;

    if (img) {
      ctx.drawImage(img, frame.x, frame.y, frame.width, frame.height, dx, dy, dw, dh);
    } else {
      // Fallback rect while images load
      ctx.fillStyle = this.state === PlayerState.HIT ? '#cc2222' : '#7b4f2e';
      ctx.fillRect(dx, dy, dw, dh);
    }

    // State label — debug mode only
    if (DEBUG.DEBUG_MODE) {
      ctx.save();
      ctx.fillStyle    = 'rgba(255,255,255,0.75)';
      ctx.font         = 'bold 11px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.state, this.x + this.width / 2, this.y - 4);
      ctx.restore();
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  _getAnimKey() {
    if (this.isDead)       return 'gameover';
    if (this._slideActive) return 'slide';
    if (!this._onGround)   return 'jump';
    return 'run';
  }

  _endSlide() {
    if (!this._slideActive) return;
    this._slideActive = false;
    this.y           -= NORMAL_H - SLIDE_H;
    this.height       = NORMAL_H;
    this.state        = this._onGround ? PlayerState.RUNNING : PlayerState.JUMPING;
  }
}
