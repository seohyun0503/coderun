export const CANVAS = {
  WIDTH: 1280,
  HEIGHT: 720,
};

export const FPS = 60;
export const FRAME_DURATION = 1000 / FPS;

export const GRAVITY = 1800;       // px/s²
export const GROUND_Y = CANVAS.HEIGHT - 120;

export const PLAYER = {
  WIDTH: 64,
  HEIGHT: 96,
  X: 180,
  JUMP_FORCE: -720,       // px/s (upward)
  RUN_SPEED: 0,           // player stays fixed; world scrolls
  MAX_JUMPS: 2,
};

export const WORLD = {
  INITIAL_SPEED: 400,     // px/s  (legacy reference)
  MAX_SPEED: 1000,
  ACCELERATION: 12,       // px/s per second (legacy; GameScene uses SCROLL_SPEED)
};

export const SCROLL_SPEED = {
  INITIAL:       480,   // px/s  (8 px/frame @ 60fps)
  MAX:          1200,   // px/s  (20 px/frame @ 60fps)
  STEP:           30,   // px/s per difficulty step  (0.5 px/frame)
  STEP_INTERVAL:   5,   // seconds between steps
};

export const ITEM = {
  WIDTH: 40,
  HEIGHT: 40,
};

export const OBSTACLE = {
  WIDTH: 48,
  HEIGHT: 80,
};

export const SCORE = {
  PER_SECOND: 10,   // legacy (unused in GameScene v2)
  ITEM_BONUS: 50,   // legacy
  PER_METRE:   1,   // points per metre of distance
};

export const COMBO = {
  WINDOW:      3.0,                 // seconds before combo resets
  MULTIPLIERS: [1.0, 1.5, 2.0, 3.0], // multiplier at each tier
  THRESHOLDS:  [0,   2,   4,   6],   // minimum combo count for each tier
};

export const SCENES = {
  MENU:      'menu',
  GAME:      'game',
  GAME_OVER: 'gameOver',
  PAUSE:     'pause',
};

export const DEBUG = {
  SHOW_FPS:   true,
  DEBUG_MODE: typeof location !== 'undefined' && location.search.includes('debug'),
};

export const COLORS = {
  SKY: '#0f0c29',
  GROUND: '#1a1a2e',
  GROUND_LINE: '#e94560',
  PLAYER: '#00d4ff',
  OBSTACLE: '#e94560',
  ITEM: '#f5a623',
  UI_PRIMARY: '#00d4ff',
  UI_SECONDARY: '#ffffff',
  UI_DIM: 'rgba(0,0,0,0.55)',
};
