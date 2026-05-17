import { Scene } from './Scene.js';
import { CANVAS, COLORS, SCENES } from '../config/constants.js';

export class BlankScene extends Scene {
  constructor(game) {
    super(game);
    this._blinkTimer = 0;
    this._showBlink = true;
  }

  enter() {
    console.log('[BlankScene] entered');
  }

  exit() {
    console.log('[BlankScene] exited');
  }

  update(dt) {
    this._blinkTimer += dt;
    if (this._blinkTimer >= 0.55) {
      this._blinkTimer = 0;
      this._showBlink = !this._showBlink;
    }

    if (this.game.input.isJustPressed('Space')) {
      this.game.switchScene(SCENES.MENU);
    }
  }

  render(ctx) {
    ctx.fillStyle = COLORS.SKY;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    ctx.shadowColor = COLORS.UI_PRIMARY;
    ctx.shadowBlur = 24;
    ctx.fillStyle = COLORS.UI_PRIMARY;
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CodeRun — Press SPACE to start', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2);
    ctx.shadowBlur = 0;

    if (this._showBlink) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '20px monospace';
      ctx.fillText('[ BlankScene — test mode ]', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 70);
    }
  }
}
