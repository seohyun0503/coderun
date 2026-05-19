// ─── Base frequencies (C major pentatonic) — 젤리 타입별 기본 음정 ──────────────
const JELLY_BASE_FREQ = {
  java:   523.25,  // C5
  python: 659.25,  // E5
  c:      783.99,  // G5
  mysql:  987.77,  // B5
  git:   1046.50,  // C6  (희귀 → 가장 높은 음)
};

class SoundManager {
  constructor() {
    this._ac     = null;
    this._master = null;
    this._setupUnlock();
  }

  // ─── 첫 사용자 입력 시 AudioContext를 user-gesture 컨텍스트에서 생성 ──────────
  // rAF 콜백 안에서 생성하면 Chrome이 suspended로 만들어 소리가 나지 않으므로,
  // keydown/pointerdown 핸들러 안에서 미리 unlock 해 둔다.

  _setupUnlock() {
    const unlock = () => { this._getAC(); };
    document.addEventListener('keydown',     unlock, { once: true });
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('touchstart',  unlock, { once: true });
  }

  // ─── AudioContext getter ───────────────────────────────────────────────────────

  _getAC() {
    if (!this._ac) {
      this._ac = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ac.createGain();
      this._master.gain.value = 0.35;
      this._master.connect(this._ac.destination);
    }
    if (this._ac.state === 'suspended') this._ac.resume();
    return this._ac;
  }

  // ─── White noise buffer helper ────────────────────────────────────────────────

  _makeNoise(ac, sec) {
    const len    = Math.max(1, Math.ceil(ac.sampleRate * sec));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  // ─── 점프 — 가벼운 "휙" (주파수 상승 스윕) ───────────────────────────────────

  jump() {
    const ac   = this._getAC();
    const now  = ac.currentTime;
    const osc  = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // ─── 이중 점프 — 더 높은 톤 + 트라이앵글 오버톤 스파클 ──────────────────────

  doubleJump() {
    const ac  = this._getAC();
    const now = ac.currentTime;

    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.1);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.13);

    // 스파클 오버톤
    const osc2  = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(720, now);
    osc2.frequency.exponentialRampToValueAtTime(1440, now + 0.1);
    gain2.gain.setValueAtTime(0.11, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc2.connect(gain2);
    gain2.connect(this._master);
    osc2.start(now);
    osc2.stop(now + 0.13);
  }

  // ─── 슬라이드 시작 — 노이즈 하이 → 로우 스윕 (스윽) ────────────────────────

  slide() {
    const ac   = this._getAC();
    const now  = ac.currentTime;
    const dur  = 0.18;
    const src  = this._makeNoise(ac, dur);
    const filt = ac.createBiquadFilter();
    const gain = ac.createGain();

    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(2400, now);
    filt.frequency.exponentialRampToValueAtTime(550, now + dur);
    filt.Q.value = 1.8;

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(this._master);
    src.start(now);
  }

  // ─── 착지 — 저주파 툭 (주파수 급강하) ───────────────────────────────────────

  land() {
    const ac   = this._getAC();
    const now  = ac.currentTime;
    const osc  = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // ─── 젤리 수집 — 타입별 기본 음정 + 콤보마다 반음씩 상승 ────────────────────
  //   combo=1 → 기본 음정, combo=2 → +1 반음, ..., combo=13+ → +12 반음(옥타브)

  collectJelly(type, combo) {
    const ac    = this._getAC();
    const now   = ac.currentTime;
    const base  = JELLY_BASE_FREQ[type] ?? JELLY_BASE_FREQ.java;
    const semis = Math.min(Math.max(combo - 1, 0), 12);
    const freq  = base * Math.pow(2, semis / 12);

    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.22);

    // git 젤리 전용: 옥타브 위 트라이앵글 오버톤
    if (type === 'git') {
      const osc2  = ac.createOscillator();
      const gain2 = ac.createGain();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(this._master);
      osc2.start(now);
      osc2.stop(now + 0.18);
    }
  }

  // ─── 충돌 — 로우패스 노이즈 버스트 + 서브 오실레이터 (둔탁한 임팩트) ────────

  hit() {
    const ac  = this._getAC();
    const now = ac.currentTime;

    // 저주파 필터링된 노이즈
    const noise   = this._makeNoise(ac, 0.22);
    const lp      = ac.createBiquadFilter();
    const nGain   = ac.createGain();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    nGain.gain.setValueAtTime(0.55, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(lp);
    lp.connect(nGain);
    nGain.connect(this._master);
    noise.start(now);

    // 서브 베이스 thud
    const osc  = ac.createOscillator();
    const oGain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);
    oGain.gain.setValueAtTime(0.65, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(oGain);
    oGain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // ─── 콤보 끊김 — 트라이앵글 하강 글리산도 (아쉬운 음) ──────────────────────

  comboBreak() {
    const ac   = this._getAC();
    const now  = ac.currentTime;
    const osc  = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.38);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  setVolume(v) {
    if (this._master) this._master.gain.value = Math.max(0, Math.min(1, v));
  }
}

export const soundManager = new SoundManager();
