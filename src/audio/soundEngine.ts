const PENTATONIC_FREQS = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0,  // A5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private steamGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private active = false;
  private lastChimeTime = 0;
  private lastCrunchTime = 0;
  private lastBumpTime = 0;
  private lastSaltTime = 0;

  public unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.65;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Reusable 1.0s pink-ish noise buffer
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 1.0);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 0.55;
    }
    this.noiseBuffer = buffer;

    // Continuous cozy truck engine purr
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 180;
    engineFilter.Q.value = 1.4;

    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 58;

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 29;

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.35;

    osc1.connect(engineFilter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);

    osc1.start();
    osc2.start();

    this.engineFilter = engineFilter;
    this.engineGain = engineGain;
    this.engineOsc1 = osc1;
    this.engineOsc2 = osc2;

    // Looping wind / blizzard ambience
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buffer;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 1.8;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();
    this.windGain = windGain;
    this.windFilter = windFilter;

    // Looping hot-water steam jet hiss
    const steamSrc = ctx.createBufferSource();
    steamSrc.buffer = buffer;
    steamSrc.loop = true;
    const steamFilter = ctx.createBiquadFilter();
    steamFilter.type = 'highpass';
    steamFilter.frequency.value = 1800;
    const steamGain = ctx.createGain();
    steamGain.gain.value = 0;
    steamSrc.connect(steamFilter);
    steamFilter.connect(steamGain);
    steamGain.connect(master);
    steamSrc.start();
    this.steamGain = steamGain;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.65, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active && this.ctx) {
      this.engineGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
      this.steamGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.windGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  public updateEngine(
    speedRatio: number,
    isBoosting: boolean,
    vehiclePitchMult = 1.0,
  ): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) {
      return;
    }
    if (!this.active || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
      return;
    }

    const now = this.ctx.currentTime;
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    const baseFreq = (52 + clamped * 44 + (isBoosting ? 18 : 0)) * vehiclePitchMult;
    const filterFreq = 160 + clamped * 260 + (isBoosting ? 180 : 0);
    const targetVol = 0.045 + Math.min(1, clamped) * 0.075 + (isBoosting ? 0.03 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.08);
  }

  public updateWeatherAndSystems(
    windStrength: number,
    hotWaterActive: boolean,
    saltActive: boolean,
  ): void {
    if (!this.ctx || !this.active || this.muted) {
      if (this.ctx) {
        this.steamGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        this.windGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
      return;
    }
    const now = this.ctx.currentTime;
    if (this.windGain && this.windFilter) {
      const targetWind = Math.max(0, Math.min(0.11, (windStrength - 0.3) * 0.045));
      this.windGain.gain.setTargetAtTime(targetWind, now, 0.25);
      this.windFilter.frequency.setTargetAtTime(280 + windStrength * 140, now, 0.25);
    }
    if (this.steamGain) {
      this.steamGain.gain.setTargetAtTime(hotWaterActive ? 0.12 : 0, now, 0.04);
    }
    if (saltActive && now - this.lastSaltTime > 0.16 && this.noiseBuffer && this.masterGain) {
      this.lastSaltTime = now;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.playbackRate.value = 1.6 + Math.random() * 0.4;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 3400;
      hp.Q.value = 2.0;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.035, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      src.connect(hp);
      hp.connect(g);
      g.connect(this.masterGain);
      src.start(now, 0, 0.07);
    }
  }

  public playSnowClear(multiplier: number, comboCount: number, isDeep: boolean): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    if (this.noiseBuffer && now - this.lastCrunchTime > 0.055) {
      this.lastCrunchTime = now;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.playbackRate.value = (isDeep ? 0.85 : 1.05) + (Math.random() - 0.5) * 0.16;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isDeep ? 750 : 1250, now);
      filter.Q.value = 1.1;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isDeep ? 0.18 : 0.12, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(now, 0, 0.16);
    }

    if (now - this.lastChimeTime > 0.075) {
      this.lastChimeTime = now;
      const noteIdx = Math.min(
        PENTATONIC_FREQS.length - 1,
        Math.floor(comboCount / 2) + (multiplier > 2 ? 1 : 0),
      );
      const freq = PENTATONIC_FREQS[noteIdx % PENTATONIC_FREQS.length];

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const harmonic = this.ctx.createOscillator();
      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(freq * 2, now);

      const harmGain = this.ctx.createGain();
      harmGain.gain.value = 0.18;

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(0.11, now + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);

      osc.connect(env);
      harmonic.connect(harmGain);
      harmGain.connect(env);
      env.connect(this.masterGain);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + 0.36);
      harmonic.stop(now + 0.36);
    }
  }

  public playBoostStart(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.22);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playUpgrade(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playBump(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBumpTime < 0.22) return;
    this.lastBumpTime = now;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playVictory(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  public dispose(): void {
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.ctx = null;
  }
}
