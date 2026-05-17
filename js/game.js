import { CANVAS, SCENES, DEBUG } from './config/constants.js';
import { InputHandler } from './utils/InputHandler.js';
import { BlankScene } from './scenes/BlankScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { PauseScene } from './scenes/PauseScene.js';

// ─── SceneManager ─────────────────────────────────────────────────────────────

class SceneManager {
  constructor() {
    this._current        = null;
    this._pending        = null;
    this._pendingPayload = null;

    this._transitioning  = false;
    // phases: 'out' → 'hold' → 'in' → 'none'
    this._fadePhase      = 'none';
    this._fadeAlpha      = 0;
    this._fadeTimer      = 0;
    this._activeFade     = 0.25;   // per-direction seconds, set per call
    this._holdDuration   = 0.2;    // seconds of full-black between phases
  }

  get isTransitioning() { return this._transitioning; }

  getCurrentScene() { return this._current; }

  /**
   * Instantly activate a scene — no fade (used on first load and pause resume).
   */
  setImmediate(scene, payload = null) {
    this._current?.exit();
    this._current = scene;
    this._current?.enter(payload);
  }

  /**
   * Crossfade to a new scene: fade-out → 0.2 s black hold → fade-in.
   * @param {Scene} toScene
   * @param {*}     [payload]   Forwarded to scene.enter()
   * @param {number} [duration] Per-direction fade in seconds (default 0.25)
   */
  changeScene(toScene, payload = null, duration = 0.25) {
    if (this._transitioning) return;
    this._pending        = toScene;
    this._pendingPayload = payload;
    this._transitioning  = true;
    this._fadePhase      = 'out';
    this._fadeTimer      = 0;
    this._fadeAlpha      = 0;
    this._activeFade     = duration;
  }

  /**
   * Public method matching spec API.
   * @param {Scene}  _fromScene  Ignored — always transitions from current.
   * @param {Scene}  toScene
   * @param {number} [duration]  Per-direction fade in seconds
   */
  transition(_fromScene, toScene, duration = 0.25) {
    this.changeScene(toScene, null, duration);
  }

  // ─── Per-frame update ────────────────────────────────────────────────────────

  update(dt) {
    if (this._transitioning) {
      this._fadeTimer += dt;

      switch (this._fadePhase) {

        case 'out': {
          const t = Math.min(this._fadeTimer / this._activeFade, 1);
          this._fadeAlpha = t;
          this._current?.update(dt);
          if (t >= 1) {
            // Swap to the new scene
            this._current?.exit();
            this._current        = this._pending;
            this._pending        = null;
            this._current?.enter(this._pendingPayload);
            this._pendingPayload = null;
            this._fadePhase      = 'hold';
            this._fadeTimer      = 0;
            this._fadeAlpha      = 1;
          }
          break;
        }

        case 'hold':
          // Full black; new scene updates quietly underneath
          this._current?.update(dt);
          if (this._fadeTimer >= this._holdDuration) {
            this._fadePhase = 'in';
            this._fadeTimer = 0;
          }
          break;

        case 'in': {
          const t = Math.min(this._fadeTimer / this._activeFade, 1);
          this._fadeAlpha = 1 - t;
          this._current?.update(dt);
          if (t >= 1) {
            this._fadeAlpha     = 0;
            this._transitioning = false;
            this._fadePhase     = 'none';
          }
          break;
        }
      }

    } else {
      this._current?.update(dt);
    }
  }

  render(ctx) {
    this._current?.render(ctx);

    if (this._fadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this._fadeAlpha;
      ctx.fillStyle   = '#000';
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
      ctx.restore();
    }
  }
}

// ─── Game (Singleton) ─────────────────────────────────────────────────────────

let _instance = null;

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    if (_instance) return _instance;
    _instance = this;

    this.canvas       = canvas;
    this.ctx          = canvas.getContext('2d');
    this.input        = new InputHandler();
    this.sceneManager = new SceneManager();

    this._running = false;
    this._lastTime = 0;
    this._rafId   = null;

    // Letterbox transform state
    this._scale   = 1;
    this._offsetX = 0;
    this._offsetY = 0;

    // FPS counter state
    this._fps            = 0;
    this._fpsFrameCount  = 0;
    this._fpsLastMeasure = 0;

    // Named scene registry for string-key switchScene
    this._namedScenes = {};

    this._loop = this._loop.bind(this);
  }

  static getInstance() { return _instance; }

  // ─── Initialisation ─────────────────────────────────────────────────────────

  init(initialScene) {
    this.input.init();
    this._setupResize();

    this._namedScenes = {
      [SCENES.MENU]:      new MenuScene(this),
      [SCENES.GAME]:      new GameScene(this),
      [SCENES.GAME_OVER]: new GameOverScene(this),
      [SCENES.PAUSE]:     new PauseScene(this),
    };

    this.sceneManager.setImmediate(initialScene ?? new BlankScene(this));
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  start() {
    if (this._running) return;
    this._running        = true;
    this._lastTime       = performance.now();
    this._fpsLastMeasure = this._lastTime;
    this._rafId = requestAnimationFrame(this._loop);
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.input.destroy();
  }

  /**
   * Switch to a scene by string key or direct Scene instance.
   * GameScene is always re-instantiated on switch to reset state.
   * @param {string|Scene} keyOrScene
   * @param {*}            [payload]   Forwarded to scene.enter()
   */
  switchScene(keyOrScene, payload) {
    let scene;
    if (typeof keyOrScene === 'string') {
      if (keyOrScene === SCENES.GAME) {
        this._namedScenes[SCENES.GAME] = new GameScene(this);
      }
      scene = this._namedScenes[keyOrScene];
      if (!scene) throw new Error(`Unknown scene key: "${keyOrScene}"`);
    } else {
      scene = keyOrScene;
    }
    this.sceneManager.changeScene(scene, payload);
  }

  /**
   * Activate PauseScene as an instant overlay (no fade) over the given scene.
   * @param {Scene} underlying  The scene to freeze and render underneath.
   */
  pauseGame(underlying) {
    const ps = this._namedScenes[SCENES.PAUSE];
    this.sceneManager.setImmediate(ps, { underlying });
  }

  // ─── Game Loop ────────────────────────────────────────────────────────────────

  _loop(timestamp) {
    this._rafId = requestAnimationFrame(this._loop);

    // Delta-time capped at 100 ms to avoid spiral-of-death after tab focus loss
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    this._measureFPS(timestamp);
    this._update(dt);
    this._render();
  }

  _update(dt) {
    this.sceneManager.update(dt);
    this.input.flush();
  }

  _render() {
    const { ctx } = this;
    ctx.save();
    // Map virtual 1280×720 coords to physical canvas with DPR letterbox
    ctx.setTransform(this._scale, 0, 0, this._scale, this._offsetX, this._offsetY);

    this.sceneManager.render(ctx);
    if (DEBUG.SHOW_FPS) this._renderFPS(ctx);

    ctx.restore();
  }

  // ─── FPS Counter ─────────────────────────────────────────────────────────────

  _measureFPS(timestamp) {
    this._fpsFrameCount++;
    if (timestamp - this._fpsLastMeasure >= 1000) {
      this._fps            = this._fpsFrameCount;
      this._fpsFrameCount  = 0;
      this._fpsLastMeasure = timestamp;
    }
  }

  _renderFPS(ctx) {
    const fps = this._fps;
    ctx.save();
    ctx.font         = 'bold 14px monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(6, 6, 84, 22);

    ctx.fillStyle = fps >= 55 ? '#00ff88' : fps >= 30 ? '#ffaa00' : '#ff4444';
    ctx.fillText(`FPS  ${fps}`, 10, 9);
    ctx.restore();
  }

  // ─── Responsive Scaling ───────────────────────────────────────────────────────

  _setupResize() {
    const resize = () => {
      const { innerWidth: W, innerHeight: H } = window;
      const dpr = window.devicePixelRatio ?? 1;

      this.canvas.width        = W * dpr;
      this.canvas.height       = H * dpr;
      this.canvas.style.width  = `${W}px`;
      this.canvas.style.height = `${H}px`;

      const scaleX  = W / CANVAS.WIDTH;
      const scaleY  = H / CANVAS.HEIGHT;
      this._scale   = Math.min(scaleX, scaleY) * dpr;

      this._offsetX = (W * dpr - CANVAS.WIDTH  * this._scale) / 2;
      this._offsetY = (H * dpr - CANVAS.HEIGHT * this._scale) / 2;
    };

    window.addEventListener('resize', resize);
    resize();
  }
}
