// =====================================================================
//  SOUND: original moody chiptune made live with WebAudio (no files)
// =====================================================================
const Sound = {
  ctx: null, musicTimer: null, step: 0, muted: false, mode: '',
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } },
  beep(type, f1, f2, len, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(f2, 20), t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + len);
  },
  shoot()   { this.beep('square', 880, 220, 0.07, 0.07); },
  hit()     { this.beep('sawtooth', 200, 50, 0.1, 0.15); },
  hurt()    { this.beep('square', 160, 60, 0.18, 0.18); },
  jump()    { this.beep('triangle', 300, 600, 0.08, 0.08); },
  slide()   { this.beep('sawtooth', 500, 120, 0.15, 0.05); },
  dash()    { this.beep('sawtooth', 200, 1200, 0.12, 0.08); },
  tele()    { this.beep('square', 1400, 1400, 0.05, 0.08); },
  counter() { this.beep('square', 1800, 300, 0.25, 0.2); setTimeout(() => this.beep('triangle', 220, 40, 0.3, 0.25), 40); },
  whiff()   { this.beep('triangle', 600, 300, 0.05, 0.06); },
  alarm()   { for (let i = 0; i < 3; i++) setTimeout(() => this.beep('sawtooth', 900, 500, 0.18, 0.12), i * 200); },
  item()    { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep('square', f, f, 0.12, 0.1), i * 90)); },
  select()  { this.beep('square', 660, 880, 0.08, 0.1); },
  music(mode) {
    this.init(); if (this.mode === mode) return; this.stopMusic(); this.mode = mode;
    if (!this.ctx || !SETTINGS.MUSIC_ON || !mode) return;
    const chase = mode === 'chase';
    const bass = chase ? [55, 55, 58, 55, 62, 55, 58, 52] : [55, 0, 65, 0, 49, 0, 58, 0];
    const mel = chase ? [880, 0, 831, 0, 880, 0, 932, 0, 880, 831, 0, 784, 0, 0, 740, 0] : [440, 0, 0, 523, 0, 0, 494, 0, 0, 0, 392, 0, 0, 0, 0, 0];
    this.musicTimer = setInterval(() => {
      if (this.muted) return; const s = this.step++;
      const b = bass[(s >> 1) % 8]; if (s % 2 === 0 && b) this.beep(chase ? 'sawtooth' : 'triangle', b * 2, b * 2, chase ? 0.12 : 0.4, chase ? 0.07 : 0.1);
      const m = mel[s % 16]; if (m) this.beep(chase ? 'square' : 'triangle', m, m, chase ? 0.06 : 0.3, chase ? 0.03 : 0.04);
    }, chase ? 105 : 200);
  },
  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; this.mode = ''; }
};
