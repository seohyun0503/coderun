/**
 * Base class for all game objects that occupy space and participate in the
 * update / render cycle.
 */
export class Entity {
  /**
   * @param {number} x       Left edge in virtual-canvas pixels
   * @param {number} y       Top edge in virtual-canvas pixels
   * @param {number} width
   * @param {number} height
   */
  constructor(x, y, width, height) {
    this.x      = x;
    this.y      = y;
    this.width  = width;
    this.height = height;
    this.vx     = 0;
    this.vy     = 0;
    this.active = true;
  }

  /**
   * Returns the axis-aligned bounding box used for collision detection.
   * @returns {{ x: number, y: number, width: number, height: number }}
   */
  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  /** @param {number} _dt  Seconds since last frame */
  update(_dt) {}

  /** @param {CanvasRenderingContext2D} _ctx */
  render(_ctx) {}
}
