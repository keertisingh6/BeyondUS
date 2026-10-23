// Authentic 8-bit Synthesizer Sound Engine using Web Audio API
// 100% self-contained chiptune audio - zero external audio assets required.

class SoundEngine {
  private ctx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public musicEnabled: boolean = false;
  private musicInterval: number | null = null;
  private musicStep: number = 0;

  constructor() {
    try {
      this.soundEnabled = localStorage.getItem('pixel-quest-sound') !== 'false';
      this.musicEnabled = localStorage.getItem('pixel-quest-music') === 'true';
    } catch {
      this.soundEnabled = true;
      this.musicEnabled = false;
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Ensure AudioContext is ready after user interaction
  public unlockAudio() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (this.musicEnabled && !this.musicInterval) {
      this.startMusic();
    }
  }

  public setSoundEnabled(val: boolean) {
    this.soundEnabled = val;
    try {
      localStorage.setItem('pixel-quest-sound', String(val));
    } catch {}
    if (val) this.playClick();
  }

  public setMusicEnabled(val: boolean) {
    this.musicEnabled = val;
    try {
      localStorage.setItem('pixel-quest-music', String(val));
    } catch {}
    if (val) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  // Helper: Play a synthetic chiptune note
  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    gainStart: number = 0.15,
    gainEnd: number = 0.001,
    detune: number = 0
  ) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (detune) osc.detune.setValueAtTime(detune, ctx.currentTime);

      gain.gain.setValueAtTime(gainStart, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  // 1. Move Step sound (crisp subtle retro click)
  public playStep() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }

  // 2. Safe Tile Discovered sound (ascending pleasant chime that scales with progress!)
  public playSafeStep(progressStep: number = 0) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const baseFreqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
      const noteFreq = baseFreqs[progressStep % baseFreqs.length];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(noteFreq, ctx.currentTime);
      osc.frequency.setValueAtTime(noteFreq * 1.25, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {}
  }

  // 3. Wrong Step / Error bump (retro low thud/buzz)
  public playWrong() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(45, ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }

  // 4. Bonus Coin Collected (classic 8-bit coin ding B5 -> E6)
  public playCoin() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch {}
  }

  // 5. Golden Key Acquired (triumphant 4-note chime with sparkle)
  public playKey() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);

        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.25);
      });
    } catch {}
  }

  // 6. Portal Unlock (ethereal harmonic shimmer)
  public playPortalUnlock() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);

        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.4);
      });
    } catch {}
  }

  // 7. Animal Trap Attack & Death (dramatic chiptune crunch & strike)
  public playTrap(animal: string) {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Noise burst for bite/strike
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = animal === '🐍' ? 'highpass' : animal === '🐊' ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(animal === '🐍' ? 1800 : 400, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();

      // Downward death siren
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.55);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.55);
    } catch {}
  }

  // 8. Shield Deflection (saved by Extra Life)
  public playShieldDeflect() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  // 9. Extra Life Armed
  public playShieldArm() {
    this.playTone(330, 'square', 0.1, 0.12);
    setTimeout(() => this.playTone(494, 'square', 0.16, 0.14), 100);
  }

  // 10. Reveal Lifeline (magic twinkle)
  public playReveal() {
    if (!this.soundEnabled) return;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.12, 0.15), i * 60);
    });
  }

  // 11. Scanner Lifeline (high-tech radar ping)
  public playScan() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  // 12. Level Victory Fanfare!
  public playWin() {
    if (!this.soundEnabled) return;
    // Classic 8-bit victory arpeggio: C4, E4, G4, C5, G4, C5!
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.25 },
      { f: 783.99, d: 0.12 },
      { f: 1046.5, d: 0.45 },
    ];
    let offset = 0;
    melody.forEach(note => {
      setTimeout(() => {
        this.playTone(note.f, 'square', note.d, 0.18);
      }, offset * 1000);
      offset += note.d + 0.03;
    });
  }

  // 13. UI Click
  public playClick() {
    this.playTone(440, 'triangle', 0.04, 0.08);
  }

  // 14. Pause Toggle
  public playPause() {
    this.playTone(392, 'square', 0.06, 0.1);
    setTimeout(() => this.playTone(330, 'square', 0.09, 0.09), 70);
  }

  // Optional: Ambient 8-bit Chiptune Background Music Loop
  public startMusic() {
    if (this.musicInterval) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // A subtle, groovy 16-step bassline loop in A minor
    const bassline = [
      220, 0, 220, 0, 261.63, 0, 220, 0,
      196, 0, 196, 0, 164.81, 0, 196, 220
    ];

    this.musicStep = 0;
    this.musicInterval = window.setInterval(() => {
      if (!this.musicEnabled) return;
      const freq = bassline[this.musicStep % bassline.length];
      if (freq > 0) {
        this.playTone(freq, 'triangle', 0.14, 0.04, 0.001);
      }
      this.musicStep++;
    }, 180);
  }

  public stopMusic() {
    if (this.musicInterval) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const sound = new SoundEngine();
