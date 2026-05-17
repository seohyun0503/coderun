import { CANVAS } from '../config/constants.js';
import { AssetLoader } from '../utils/AssetLoader.js';

export const BACKGROUND_MANIFEST = {
  bg_far: './assets/images/Background/Far_Background.png',
  bg_mid: './assets/images/Background/Midground.png',
  bg_fg:  './assets/images/Background/Foreground.png',
};

// Parallax multipliers (relative to worldSpeed). Far = slowest, Fg = fastest.
const LAYERS = [
  { key: 'bg_far', speed: 0.1 },
  { key: 'bg_mid', speed: 0.4 },
  { key: 'bg_fg',  speed: 0.7 },
];

export class Background {
  constructor() {
    this._offsets = {};
    for (const { key } of LAYERS) this._offsets[key] = 0;
  }

  update(dt, worldSpeed) {
    for (const { key, speed } of LAYERS) {
      this._offsets[key] -= worldSpeed * speed * dt;
    }
  }

  render(ctx) {
    // Sky gradient — top matches gray city tone, bottom fades to ground color
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
    sky.addColorStop(0,    '#6a7888');
    sky.addColorStop(0.65, '#3a4858');
    sky.addColorStop(1,    '#04040e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    this._drawLayer(ctx, 'bg_far', this._offsets['bg_far']);
    this._drawLayer(ctx, 'bg_mid', this._offsets['bg_mid']);
  }

  renderForeground(ctx) {
    this._drawLayer(ctx, 'bg_fg', this._offsets['bg_fg']);
  }

  _drawLayer(ctx, key, rawOffset) {
    const img = AssetLoader.get(key);
    if (!img) return;

    // Scale image to canvas height, preserve aspect ratio for tile width
    const scale = CANVAS.HEIGHT / img.naturalHeight;
    const tileW = img.naturalWidth * scale;

    // Normalise rawOffset to [0, tileW) so we always draw from a clean phase
    const phase = ((rawOffset % tileW) + tileW) % tileW;

    // Two copies cover the canvas when tileW ≥ CANVAS.WIDTH.
    // A third copy handles narrow images.
    const x0 = phase - tileW;
    ctx.drawImage(img, x0,         0, tileW, CANVAS.HEIGHT);
    ctx.drawImage(img, x0 + tileW, 0, tileW, CANVAS.HEIGHT);
    if (x0 + tileW * 2 < CANVAS.WIDTH) {
      ctx.drawImage(img, x0 + tileW * 2, 0, tileW, CANVAS.HEIGHT);
    }
  }
}
