import { ITEM, COLORS, GROUND_Y, CANVAS } from '../config/constants.js';

const ITEM_TYPES = {
  coin:   { color: '#f5a623', label: '¢', scoreBonus: 50  },
  boost:  { color: '#7ed321', label: '▶', scoreBonus: 100 },
  shield: { color: '#4a90e2', label: '◈', scoreBonus: 0   },
};

export class Item {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} [type] 'coin' | 'boost' | 'shield'
   */
  constructor(x, y, type = 'coin') {
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = ITEM.WIDTH;
    this.height = ITEM.HEIGHT;
    this.active = true;
    this.collected = false;

    this._config = ITEM_TYPES[type] ?? ITEM_TYPES.coin;
    this._bobTimer = Math.random() * Math.PI * 2; // phase offset
    this._bobAmp = 8;
    this._bobSpeed = 3;
    this._baseY = y;
  }

  get bounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  get scoreBonus() {
    return this._config.scoreBonus;
  }

  update(dt, worldSpeed) {
    this.x -= worldSpeed * dt;
    if (this.x + this.width < 0) this.active = false;

    // Bob up/down
    this._bobTimer += this._bobSpeed * dt;
    this.y = this._baseY + Math.sin(this._bobTimer) * this._bobAmp;
  }

  collect() {
    this.collected = true;
    this.active = false;
  }

  draw(ctx) {
    const { x, y, width, height } = this;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const r = width / 2;

    ctx.shadowColor = this._config.color;
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = this._config.color;
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = `bold ${Math.floor(r)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._config.label, cx, cy + 1);

    ctx.shadowBlur = 0;
  }

  static randomType() {
    const keys = Object.keys(ITEM_TYPES);
    const weights = [0.65, 0.25, 0.10]; // coin, boost, shield
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < keys.length; i++) {
      acc += weights[i];
      if (r < acc) return keys[i];
    }
    return 'coin';
  }
}
