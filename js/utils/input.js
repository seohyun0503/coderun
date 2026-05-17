export class InputManager {
  constructor() {
    this._keys = new Set();
    this._justPressed = new Set();
    this._justReleased = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
  }

  init() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('touchstart', this._onTouchStart);
  }

  _onKeyDown(e) {
    if (!this._keys.has(e.code)) {
      this._justPressed.add(e.code);
    }
    this._keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    this._keys.delete(e.code);
    this._justReleased.add(e.code);
  }

  _onTouchStart() {
    this._justPressed.add('Space');
    this._keys.add('Space');
  }

  /** Call once per frame at the END of the update step. */
  flush() {
    this._justPressed.clear();
    this._justReleased.clear();
    // Remove touch-simulated Space so it acts as a single-frame press
    this._keys.delete('Space');
  }

  isDown(code) {
    return this._keys.has(code);
  }

  isJustPressed(code) {
    return this._justPressed.has(code);
  }

  isJustReleased(code) {
    return this._justReleased.has(code);
  }

  /** Returns true on jump intent (Space / ArrowUp / W). */
  get jumpPressed() {
    return (
      this.isJustPressed('Space') ||
      this.isJustPressed('ArrowUp') ||
      this.isJustPressed('KeyW')
    );
  }
}
