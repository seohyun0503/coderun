const BGM_PATH = './assets/sounds/Midnight_Keyboard_Rush.mp3';

class AudioManager {
  constructor() {
    this._bgm     = new Audio(BGM_PATH);
    this._bgm.loop   = true;
    this._bgm.volume = 0.5;
    this._started = false;
  }

  // BGM 시작 (최초 1회, 브라우저 자동재생 정책 대응)
  play() {
    if (this._started) return;
    this._bgm.play().then(() => {
      this._started = true;
    }).catch(() => {
      // 자동재생 차단 시 첫 사용자 입력에서 재시도
      const tryPlay = () => {
        this._bgm.play().then(() => { this._started = true; }).catch(() => {});
      };
      document.addEventListener('keydown',     tryPlay, { once: true });
      document.addEventListener('pointerdown', tryPlay, { once: true });
    });
  }

  pause() {
    if (!this._bgm.paused) this._bgm.pause();
  }

  resume() {
    if (this._bgm.paused && this._started) {
      this._bgm.play().catch(() => {});
    }
  }

  setVolume(v) {
    this._bgm.volume = Math.max(0, Math.min(1, v));
  }
}

export const audioManager = new AudioManager();
