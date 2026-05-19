const PREVENT_DEFAULT_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'Enter', 'Escape', 'KeyP']);

export class InputHandler {
  constructor() {
    this._held         = new Set();
    this._justPressed  = new Set();
    this._justReleased = new Set();

    this._onKeyDown      = this._onKeyDown.bind(this);
    this._onKeyUp        = this._onKeyUp.bind(this);
    this._onTouchStart   = this._onTouchStart.bind(this);
    this._onTouchEnd     = this._onTouchEnd.bind(this);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  init() {
    window.addEventListener('keydown',     this._onKeyDown);
    window.addEventListener('keyup',       this._onKeyUp);
    window.addEventListener('touchstart',  this._onTouchStart,  { passive: false });
    window.addEventListener('touchend',    this._onTouchEnd,    { passive: false });
    window.addEventListener('touchcancel', this._onTouchEnd,    { passive: false });
  }

  destroy() {
    window.removeEventListener('keydown',     this._onKeyDown);
    window.removeEventListener('keyup',       this._onKeyUp);
    window.removeEventListener('touchstart',  this._onTouchStart);
    window.removeEventListener('touchend',    this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchEnd);
  }

  // ─── Internal event handlers ─────────────────────────────────────────────────

  _onKeyDown(e) {
    if (!this._held.has(e.code)) {
      this._justPressed.add(e.code);
    }
    this._held.add(e.code);
    if (PREVENT_DEFAULT_KEYS.has(e.code)) e.preventDefault();
  }

  _onKeyUp(e) {
    this._held.delete(e.code);
    this._justReleased.add(e.code);
  }

  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length >= 2) {
      // Two-finger hold → slide (held until touchend drops below 2 fingers)
      this._justPressed.add('ArrowDown');
      this._held.add('ArrowDown');
    } else {
      // Single tap → jump (one-shot: only justPressed, not held)
      this._justPressed.add('Space');
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    // Release slide when fewer than 2 fingers remain on screen
    if (e.touches.length < 2) {
      this._held.delete('ArrowDown');
    }
  }

  // ─── Polling API (new, event-based + poll hybrid) ────────────────────────────

  /** Is the key currently held down? (polling) */
  isKeyPressed(code) {
    return this._held.has(code);
  }

  /** Was the key first pressed this frame? (event-based) */
  isKeyJustPressed(code) {
    return this._justPressed.has(code);
  }

  /** Was the key released this frame? (event-based) */
  isKeyJustReleased(code) {
    return this._justReleased.has(code);
  }

  // ─── Backward-compat aliases (used by MenuScene, GameOverScene, BlankScene) ──

  isDown(code)         { return this._held.has(code); }
  isJustPressed(code)  { return this._justPressed.has(code); }
  isJustReleased(code) { return this._justReleased.has(code); }

  // ─── Semantic convenience getters ─────────────────────────────────────────────

  /** Space / ↑ / W pressed this frame (first jump or double-jump trigger). */
  get jumpJustPressed() {
    return this._justPressed.has('Space') ||
           this._justPressed.has('ArrowUp') ||
           this._justPressed.has('KeyW');
  }

  /** ↓ / S held (slide held check — true every frame while held). */
  get slidePressed() {
    return this._held.has('ArrowDown') || this._held.has('KeyS');
  }

  /** ↓ / S first pressed this frame (slide trigger — fires once per press). */
  get slideJustPressed() {
    return this._justPressed.has('ArrowDown') || this._justPressed.has('KeyS');
  }

  /** ESC pressed this frame (pause trigger). */
  get pauseJustPressed() {
    return this._justPressed.has('Escape');
  }

  /** @deprecated Use jumpJustPressed — kept for InputManager drop-in compat. */
  get jumpPressed() { return this.jumpJustPressed; }

  // ─── Frame boundary ──────────────────────────────────────────────────────────

  /**
   * Clears per-frame state. Call once at the END of each logical update step.
   * _held is NOT touched here — keyup / touchend manage its lifetime.
   */
  flush() {
    this._justPressed.clear();
    this._justReleased.clear();
  }
}
