export class Scene {
  constructor(game) {
    this.game = game;
  }

  /** Called when the scene becomes active. Receives optional payload from switchScene. */
  enter(_payload) {}

  /** Called just before the scene is replaced by another. */
  exit() {}

  /** Called once per frame with frame-delta in seconds. */
  update(_dt) {}

  /** Called once per frame to draw. ctx is already transformed to virtual-canvas space. */
  render(_ctx) {}
}
