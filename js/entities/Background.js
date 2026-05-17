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
    for (const { key } of LAYERS) {
      this._drawLayer(ctx, key, this._offsets[key]);
    }
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
