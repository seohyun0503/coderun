import { CANVAS, COLORS, GROUND_Y, SCENES, SCORE, COMBO, SCROLL_SPEED, DEBUG } from '../config/constants.js';
import { Scene } from './Scene.js';
import { Player } from '../entities/Player.js';
import { Jelly, JELLY_SIZE } from '../entities/Jelly.js';
import { Background } from '../entities/Background.js';
import { Ground } from '../entities/Ground.js';
import { Collision } from '../utils/collision.js';
import { ObstacleSpawner } from '../utils/ObstacleSpawner.js';
import { JellySpawner } from '../utils/JellySpawner.js';

const PLAYER_X      = Math.floor(CANVAS.WIDTH / 4);
const SLOW_FACTOR   = 0.2;
const SLOW_DURATION = 0.5;

// ─── ScorePopup ───────────────────────────────────────────────────────────────
// Floating "+N" text that fades upward on jelly collection.

class ScorePopup {
  constructor(x, y, text, color) {
    this.x    = x;
    this.y    = y;
    this.vy   = -90;    // px/s upward
    this.text = text;
    this.color = color;
    this.life  = 0.85;  // seconds
  }

  update(dt) {
    this.y    += this.vy * dt;
    this.life -= dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha  = Math.max(0, this.life / 0.85);
    ctx.fillStyle    = this.color;
    ctx.shadowColor  = this.color;
    ctx.shadowBlur   = 8;
    ctx.font         = 'bold 15px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }

  get alive() { return this.life > 0; }
}

// ─── GameScene ────────────────────────────────────────────────────────────────

export class GameScene extends Scene {
  constructor(game) {
    super(game);

    this.player    = new Player(PLAYER_X, GROUND_Y);
    this.obstacles = [];
    this.jellies   = [];
    this.score     = 0;
    this.worldSpeed = SCROLL_SPEED.INITIAL;

    // Spawners
    this._obstacleSpawner = new ObstacleSpawner(0);
    this._jellySpawner    = new JellySpawner();

    // Death transition
    this._deathDelay  = 0;
    this._deathLogged = false;

    // Slow-motion
    this._slowTimer = 0;

    // Difficulty
    this._difficultyTimer     = 0;
    this.difficultyMultiplier = 1.0;

    // Combo system
    this._comboCount      = 0;
    this._comboTimer      = 0;   // seconds since last collect
    this._comboMultiplier = 1.0;

    // Score components (tracked separately for HUD)
    this._distanceScore = 0;
    this._jellyScore    = 0;

    // Stats for debug
    this._elapsedTime = 0;
    this._distance    = 0;   // px scrolled

    // Score popups
    this._popups = [];

    // Jelly collection count (passed to GameOverScene)
    this._jellyCount = 0;

    this._bg     = new Background();
    this._ground = new Ground();
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  update(realDt) {
    const { input } = this.game;

    if (input.isKeyJustPressed('Backquote') || input.isKeyJustPressed('KeyB')) DEBUG.DEBUG_MODE = !DEBUG.DEBUG_MODE;

    // Pause (P or ESC) — not during death animation or active transition
    if ((input.isKeyJustPressed('KeyP') || input.isKeyJustPressed('Escape')) &&
        !this.player.isDead && !this.game.sceneManager.isTransitioning) {
      this.game.pauseGame(this);
      return;
    }

    // Slow-motion
    if (this._slowTimer > 0) this._slowTimer -= realDt;
    const dt = this._slowTimer > 0 ? realDt * SLOW_FACTOR : realDt;

    // ── Death cooldown ────────────────────────────────────────────────────────
    if (this.player.isDead) {
      if (!this._deathLogged) { console.log('GAME OVER'); this._deathLogged = true; }
      this._deathDelay += realDt;
      this.player.update(dt);
      if (this._deathDelay > 1.4) {
        this._deathDelay  = 0;
        this._deathLogged = false;
        this.game.switchScene(SCENES.GAME_OVER, { score: Math.floor(this.score), jellyCount: this._jellyCount });
      }
      return;
    }

    // ── Input — jump takes priority over slide on the same frame ─────────────
    if (input.jumpJustPressed) this.player.jump();
    if (input.slideJustPressed && !input.jumpJustPressed) this.player.slide();

    // ── Timers & stats ────────────────────────────────────────────────────────
    this._elapsedTime += realDt;
    this._distance    += this.worldSpeed * dt;

    // ── Difficulty ────────────────────────────────────────────────────────────
    this._difficultyTimer += realDt;
    if (this._difficultyTimer >= SCROLL_SPEED.STEP_INTERVAL) {
      this._difficultyTimer -= SCROLL_SPEED.STEP_INTERVAL;
      this.worldSpeed = Math.min(SCROLL_SPEED.MAX, this.worldSpeed + SCROLL_SPEED.STEP);
      this.difficultyMultiplier = this.worldSpeed / SCROLL_SPEED.INITIAL;
    }

    // ── Distance score ────────────────────────────────────────────────────────
    const dm = this.worldSpeed / 100 * dt;   // metres this frame
    this._distanceScore += dm * SCORE.PER_METRE;

    // ── Combo timer: reset after COMBO.WINDOW idle seconds ────────────────────
    if (this._comboCount > 0) {
      this._comboTimer += realDt;
      if (this._comboTimer > COMBO.WINDOW) {
        this._comboCount      = 0;
        this._comboTimer      = 0;
        this._comboMultiplier = 1.0;
      }
    }

    // ── Spawning ──────────────────────────────────────────────────────────────
    const newObstacles = this._obstacleSpawner.update(realDt, this.obstacles);

    // Case 1: new obstacle spawned → evict any existing jelly it overlaps
    if (newObstacles.length > 0) {
      this.jellies = this.jellies.filter(j =>
        newObstacles.every(o => !this._jellyCollides(j, o)),
      );
      this.obstacles.push(...newObstacles);
    }

    // Case 2: new jellies spawned → arc jellies are pre-raised above obstacles,
    //         line/cluster jellies are still filtered if they overlap
    const newJellies = this._jellySpawner.update(dt, this.worldSpeed, this.obstacles);
    for (const j of newJellies) {
      if (this.obstacles.every(o => !this._jellyCollides(j, o))) {
        this.jellies.push(j);
      }
    }

    // ── Entity updates ────────────────────────────────────────────────────────
    this.player.update(dt, input.slidePressed);
    for (const o of this.obstacles) o.update(dt, this.worldSpeed);
    for (const j of this.jellies)   j.update(dt, this.worldSpeed);

    this.obstacles = this.obstacles.filter(o => o.active);
    this.jellies   = this.jellies.filter(j => j.active);

    // ── Collisions: obstacles ─────────────────────────────────────────────────
    for (const obs of this.obstacles) {
      if (Collision.checkCollision(this.player, obs, 8)) {
        this.player.takeDamage();
        this._slowTimer   = SLOW_DURATION;
        this._comboCount  = 0;
        this._comboTimer  = 0;
        this._comboMultiplier = 1.0;
        break;
      }
    }

    // ── Collisions: jellies ───────────────────────────────────────────────────
    for (const j of this.jellies) {
      if (!j.active) continue;
      if (Collision.checkCollision(this.player, j, 2)) {
        this._collectJelly(j);
      }
    }

    // ── Score accumulation ────────────────────────────────────────────────────
    this.score = this._distanceScore + this._jellyScore;

    // ── Popups ────────────────────────────────────────────────────────────────
    for (const p of this._popups) p.update(realDt);
    this._popups = this._popups.filter(p => p.alive);

    // ── Background ────────────────────────────────────────────────────────────
    this._bg.update(dt, this.worldSpeed);
    this._ground.update(dt, this.worldSpeed);
  }

  // ─── Jelly collection helper ─────────────────────────────────────────────────

  _collectJelly(jelly) {
    jelly.collect();

    // Combo progression
    this._comboCount++;
    this._jellyCount++;
    this._comboTimer = 0;
    this._comboMultiplier = this._calcMultiplier(this._comboCount);

    // Award score
    const points = Math.round(jelly.score * this._comboMultiplier);
    this._jellyScore += points;

    // Spawn popup
    const label = `+${points}${this._comboCount >= 2 ? ` ×${this._comboMultiplier.toFixed(1)}` : ''}`;
    this._popups.push(new ScorePopup(
      jelly.x + 12, jelly.y - 4, label, jelly._cfg.primary,
    ));
  }

  /**
   * Returns true when a jelly's bounding box (+ bob margin) overlaps an obstacle.
   * Used for both spawn-time filtering and obstacle-spawn eviction.
   */
  _jellyCollides(jelly, obstacle) {
    const X_MARGIN = 8;
    const Y_MARGIN = 8;   // covers ±6 px bob animation + 2 px buffer
    return (
      jelly.x - X_MARGIN            < obstacle.x + obstacle.width  &&
      jelly.x + JELLY_SIZE + X_MARGIN > obstacle.x                  &&
      jelly.y - Y_MARGIN            < obstacle.y + obstacle.height  &&
      jelly.y + JELLY_SIZE + Y_MARGIN > obstacle.y
    );
  }

  _calcMultiplier(count) {
    const thresholds    = COMBO.THRESHOLDS;
    const multipliers   = COMBO.MULTIPLIERS;
    let tier = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (count >= thresholds[i]) { tier = i; break; }
    }
    return multipliers[tier];
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  render(ctx) {
    this._bg.render(ctx);
    this._ground.render(ctx);
    this._bg.renderForeground(ctx);

    for (const o of this.obstacles) o.draw(ctx);
    for (const j of this.jellies)   j.draw(ctx);
    this.player.render(ctx);

    for (const p of this._popups) p.draw(ctx);

    // Debug hitboxes — margin values must match checkCollision() call sites
    if (DEBUG.DEBUG_MODE) {
      Collision.drawDebugBoxes(ctx, [this.player],  '#00ff88', 6);
      Collision.drawDebugBoxes(ctx, this.obstacles, '#ff3333', 6);
      Collision.drawDebugBoxes(ctx, this.jellies,   '#f7df1e', 2);
    }

    this._drawHUD(ctx);
    if (DEBUG.DEBUG_MODE) this._drawDebugOverlay(ctx);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  _drawHUD(ctx) {
    ctx.save();
    const FONT = '"Courier New", monospace';

    // ── HP documents (left-top) ──────────────────────────────────────────────
    for (let i = 0; i < this.player.maxHp; i++) {
      this._drawDoc(ctx, 20 + i * 38, 16, i < this.player.hp);
    }

    // ── Score 6자리 (right-top) ──────────────────────────────────────────────
    const scoreStr = Math.min(Math.floor(this.score), 999999)
                       .toString().padStart(6, '0');
    ctx.fillStyle    = '#00ff88';
    ctx.shadowColor  = '#00ff88';
    ctx.shadowBlur   = 10;
    ctx.font         = `bold 28px ${FONT}`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(scoreStr, CANVAS.WIDTH - 22, 14);
    ctx.shadowBlur   = 0;

    // ── Distance (right, second row) ─────────────────────────────────────────
    const distM = Math.floor(this._distance / 100);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font      = `14px ${FONT}`;
    ctx.fillText(`${distM} m`, CANVAS.WIDTH - 22, 52);

    // ── Combo (right, third row) — only show when active ─────────────────────
    if (this._comboCount >= 2) {
      const pct = Math.max(0, 1 - this._comboTimer / COMBO.WINDOW);
      ctx.fillStyle = '#f7df1e';
      ctx.shadowColor = '#f7df1e';
      ctx.shadowBlur  = 8;
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`COMBO ×${this._comboMultiplier.toFixed(1)}`, CANVAS.WIDTH - 22, 72);
      ctx.shadowBlur = 0;

      // Combo timer bar
      const barW = 120;
      const barX = CANVAS.WIDTH - 22 - barW;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(barX, 90, barW, 4);
      ctx.fillStyle = `hsl(${40 + pct * 40}, 95%, 60%)`;
      ctx.fillRect(barX, 90, barW * pct, 4);
    }

    // ── Controls hint (bottom-left) ──────────────────────────────────────────
    ctx.fillStyle    = 'rgba(255,255,255,0.2)';
    ctx.font         = `12px ${FONT}`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('SPC/↑ jump  ↓ slide  P pause  F1 debug', 20, CANVAS.HEIGHT - 14);

    // ── Slow-motion colour tint ───────────────────────────────────────────────
    if (this._slowTimer > 0) {
      ctx.fillStyle = `rgba(0,212,255,${(this._slowTimer / SLOW_DURATION * 0.28).toFixed(3)})`;
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    }

    ctx.restore();
  }

  // HP 문서 아이콘 (자소서 모양)
  _drawDoc(ctx, x, y, active) {
    const w = 28, h = 34;

    ctx.fillStyle = active ? '#dde8ff' : 'rgba(80,100,180,0.18)';
    ctx.fillRect(x, y, w, h);

    // Folded corner
    ctx.fillStyle = active ? '#aabcdd' : 'rgba(60,80,140,0.14)';
    ctx.beginPath();
    ctx.moveTo(x + w - 9, y);
    ctx.lineTo(x + w,     y + 9);
    ctx.lineTo(x + w - 9, y + 9);
    ctx.closePath();
    ctx.fill();

    // Text lines
    if (active) {
      ctx.fillStyle = 'rgba(50,80,170,0.55)';
      for (let ly = y + 13; ly < y + h - 4; ly += 6) {
        ctx.fillRect(x + 4, ly, ly < y + h - 10 ? w - 10 : w - 16, 2);
      }
    }

    // Border
    ctx.strokeStyle = active ? '#6880cc' : 'rgba(60,80,140,0.25)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, w, h);
  }

  // ─── Debug overlay (F1) ───────────────────────────────────────────────────────

  _drawDebugOverlay(ctx) {
    const phase = this._elapsedTime < 20 ? 'early'
                : this._elapsedTime < 60 ? 'mid'
                : 'late';

    const lines = [
      `scroll : ${this.worldSpeed.toFixed(1)} px/s  (${(this.worldSpeed / 60).toFixed(2)} px/f)`,
      `time   : ${this._elapsedTime.toFixed(1)} s  [${phase}]`,
      `dist   : ${Math.floor(this._distance / 100)} m`,
      `diff×  : ${this.difficultyMultiplier.toFixed(2)}`,
      `slow   : ${this._slowTimer > 0 ? this._slowTimer.toFixed(2) + 's' : 'off'}`,
      `combo  : ${this._comboCount} × ${this._comboMultiplier.toFixed(1)}  (${this._comboTimer.toFixed(1)}s)`,
      `obs    : ${this.obstacles.length}   jellies : ${this.jellies.length}`,
    ];

    const lineH = 18;
    const padX  = 12, padY = 10;
    const boxW  = 390;
    const boxH  = lines.length * lineH + padY * 2;
    const boxX  = CANVAS.WIDTH / 2 - boxW / 2;
    const boxY  = 8;

    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.72)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = COLORS.UI_PRIMARY;
    ctx.lineWidth   = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.font         = '13px "Courier New", monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#00ff88';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], boxX + padX, boxY + padY + i * lineH);
    }
    ctx.restore();
  }
}
