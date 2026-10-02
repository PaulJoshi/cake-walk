import type { GameEvent, Outcome, World } from '../game/World';
import { T } from '../game/tuning';
import type { WorldId } from '../level/worlds';

const MUTE_KEY = 'cakewalk:muted';
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** "Here Comes the Bride", chiptune style: [midi note, beats]. 16 beats. */
const MELODY: [number, number][] = [
  [67, 1],
  [72, 0.75],
  [72, 0.25],
  [72, 2],
  [67, 1],
  [74, 0.75],
  [71, 0.25],
  [72, 2],
  [67, 1],
  [72, 0.75],
  [77, 0.25],
  [77, 1],
  [76, 0.75],
  [74, 0.25],
  [72, 0.75],
  [71, 0.25],
  [72, 0.5],
  [74, 0.5],
  [72, 2],
];
/** One bass note per beat. */
const BASS = [48, 43, 48, 43, 43, 50, 43, 48, 41, 48, 41, 48, 43, 43, 48, 48];

/** "What Shall We Do with the Drunken Sailor" (traditional sea shanty). 16 beats. */
const SHANTY: [number, number][] = [
  [69, 0.5],
  [69, 0.25],
  [69, 0.25],
  [69, 0.5],
  [69, 0.25],
  [69, 0.25],
  [69, 0.5],
  [62, 0.5],
  [65, 0.5],
  [69, 0.5],
  [67, 0.5],
  [67, 0.25],
  [67, 0.25],
  [67, 0.5],
  [67, 0.25],
  [67, 0.25],
  [67, 0.5],
  [60, 0.5],
  [64, 0.5],
  [67, 0.5],
  [69, 0.5],
  [69, 0.25],
  [69, 0.25],
  [69, 0.5],
  [69, 0.25],
  [69, 0.25],
  [69, 0.5],
  [71, 0.5],
  [73, 0.5],
  [74, 0.5],
  [72, 0.5],
  [69, 0.5],
  [67, 0.5],
  [64, 0.5],
  [62, 1],
  [62, 1],
];
const SHANTY_BASS = [50, 45, 50, 45, 48, 43, 48, 43, 50, 45, 50, 45, 48, 43, 50, 50];

const SONGS: Record<WorldId, { melody: [number, number][]; bass: number[] }> = {
  wedding: { melody: MELODY, bass: BASS },
  pirate: { melody: SHANTY, bass: SHANTY_BASS },
};

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * All sound is synthesized at runtime with the Web Audio API. The AudioContext is created
 * lazily on the first user gesture.
 */
export class Audio {
  muted = loadMuted();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private noise!: AudioBuffer;
  private square25!: PeriodicWave;
  private creakOsc: OscillatorNode | null = null;
  private creakGain: GainNode | null = null;
  private creakFilter: BiquadFilterNode | null = null;
  private playing = false;
  private nextNote = 0;
  private melodyIdx = 0;
  private beat = 0;
  private bpm = 140;
  private song = SONGS.wedding;

  constructor() {
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  /** Create/resume the AudioContext (must be called from a user gesture). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const c = this.ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(comp);
    this.sfx = c.createGain();
    this.sfx.connect(this.master);
    this.music = c.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const real = new Float32Array(16);
    const imag = new Float32Array(16);
    for (let n = 1; n < 16; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
    this.square25 = c.createPeriodicWave(real, imag);
    // The cake's creak: a detuned sawtooth through a narrow band-pass, silent until it leans.
    this.creakOsc = c.createOscillator();
    this.creakOsc.type = 'sawtooth';
    this.creakFilter = c.createBiquadFilter();
    this.creakFilter.type = 'bandpass';
    this.creakFilter.Q.value = 9;
    this.creakGain = c.createGain();
    this.creakGain.gain.value = 0;
    this.creakOsc.connect(this.creakFilter).connect(this.creakGain).connect(this.sfx);
    this.creakOsc.start();
    if (c.state === 'suspended') void c.resume().catch(() => undefined);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* private mode */
    }
    if (this.ctx)
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  // ---------------------------------------------------------------- primitives
  private tone(
    freq: number,
    t0: number,
    dur: number,
    vol: number,
    type: OscillatorType | 'square25' = 'square',
    toFreq?: number,
    dest?: AudioNode,
  ): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    if (type === 'square25') o.setPeriodicWave(this.square25);
    else o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest ?? this.sfx);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private burst(
    t0: number,
    dur: number,
    vol: number,
    type: BiquadFilterType,
    freq: number,
    toFreq?: number,
    q = 1,
    dest?: AudioNode,
  ): void {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f)
      .connect(g)
      .connect(dest ?? this.sfx);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.05);
  }

  private get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ---------------------------------------------------------------- sfx
  countdown(go: boolean): void {
    if (!this.ctx) return;
    const t = this.now;
    if (go) {
      this.tone(midi(84), t, 0.35, 0.18, 'square25');
      this.tone(midi(79), t, 0.35, 0.1, 'triangle');
    } else this.tone(midi(72), t, 0.12, 0.15, 'square25');
  }

  private step(speed: number): void {
    const t = this.now;
    const v = 0.05 + (speed / T.WALK_MAX) * 0.08;
    this.burst(t, 0.06, v, 'bandpass', 1800, 900, 1.5);
    this.tone(95, t, 0.06, v * 0.8, 'sine', 60);
  }

  private thump(strength: number): void {
    const t = this.now;
    this.tone(140, t, 0.25, 0.35 * (0.5 + strength), 'sine', 40);
    this.burst(t, 0.12, 0.25 * (0.5 + strength), 'lowpass', 1200, 200);
  }

  private splat(delay: number): void {
    const t = this.now + delay;
    this.burst(t, 0.35, 0.5, 'lowpass', 2200, 150, 2);
    this.tone(320, t, 0.22, 0.25, 'sine', 70);
  }

  private gasp(): void {
    const t = this.now;
    // Crowd "ooOOh": band-passed noise swelling, with a hummed glide under it.
    this.burst(t, 0.7, 0.12, 'bandpass', 500, 900, 3);
    this.burst(t + 0.05, 0.6, 0.08, 'bandpass', 1100, 700, 4);
    this.tone(220, t, 0.6, 0.04, 'triangle', 330);
  }

  private bassDrop(): void {
    const t = this.now;
    this.tone(120, t, 1.3, 0.6, 'sine', 32);
    this.tone(60, t, 1.0, 0.25, 'sawtooth', 30);
    this.burst(t, 0.5, 0.35, 'lowpass', 3000, 100);
  }

  private fanfare(): void {
    const t = this.now;
    [72, 76, 79, 84, 88].forEach((n, i) => {
      this.tone(midi(n), t + i * 0.09, 0.3, 0.14, 'square25');
      this.tone(midi(n - 12), t + i * 0.09, 0.3, 0.08, 'triangle');
    });
    this.tone(midi(84), t + 0.5, 0.9, 0.12, 'square25');
    this.tone(midi(88), t + 0.5, 0.9, 0.08, 'square25');
    this.tone(midi(91), t + 0.5, 0.9, 0.06, 'triangle');
  }

  /** The sad trombone: descending "wah-wah-wah-waaah" with a wobbling filter. */
  private wahWah(): void {
    const c = this.ctx!;
    const t = this.now + 0.1;
    const notes = [55, 54, 53, 52];
    notes.forEach((n, i) => {
      const t0 = t + i * 0.42;
      const dur = i === 3 ? 1.1 : 0.38;
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(midi(n), t0);
      if (i === 3) {
        const lfo = c.createOscillator();
        const lg = c.createGain();
        lfo.frequency.value = 6;
        lg.gain.value = 4;
        lfo.connect(lg).connect(o.frequency);
        lfo.start(t0);
        lfo.stop(t0 + dur);
      }
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 6;
      f.frequency.setValueAtTime(300, t0);
      f.frequency.linearRampToValueAtTime(1400, t0 + dur * 0.3);
      f.frequency.linearRampToValueAtTime(400, t0 + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.04);
      g.gain.setValueAtTime(0.22, t0 + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(f).connect(g).connect(this.sfx);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    });
  }

  private clink(): void {
    const t = this.now;
    for (let i = 0; i < 3; i++) {
      this.tone(2637, t + i * 0.18, 0.4, 0.08, 'sine');
      this.tone(3520, t + i * 0.18, 0.25, 0.04, 'sine');
    }
  }

  event(e: GameEvent): void {
    if (!this.ctx) return;
    switch (e.type) {
      case 'step':
        this.step(e.speed);
        break;
      case 'hit':
        this.thump(e.strength);
        break;
      case 'tierLost':
        this.splat(0.45);
        break;
      case 'topple':
        this.splat(0.5);
        this.splat(0.62);
        break;
      case 'gasp':
        this.gasp();
        break;
      case 'clutch':
        [79, 84, 88, 91].forEach((n, i) =>
          this.tone(midi(n), this.now + i * 0.06, 0.18, 0.12, 'square25'),
        );
        break;
      case 'dust':
        this.burst(this.now, 0.15, 0.08, 'highpass', 2500, 1200);
        break;
      case 'placed':
        this.fanfare();
        break;
      case 'bassCount':
        this.tone(midi(69 + (3 - e.n) * 5), this.now, 0.15, 0.18, 'square25');
        break;
      case 'bassDrop':
        this.bassDrop();
        break;
      case 'bouquetThrow':
        this.burst(this.now, 0.6, 0.12, 'bandpass', 400, 2400, 2);
        break;
      case 'bouquetLand':
        this.tone(midi(84), this.now, 0.2, 0.1, 'triangle');
        this.tone(midi(88), this.now + 0.08, 0.25, 0.08, 'triangle');
        break;
      case 'hop':
        this.tone(180, this.now, 0.3, 0.18, 'sine', 520);
        break;
      case 'slip':
        this.tone(1300, this.now, 0.12, 0.06, 'sine', 1900);
        break;
      case 'timeout':
        this.clink();
        break;
      case 'bell':
        this.tone(midi(84), this.now, 0.7, 0.14, 'sine');
        this.tone(midi(91), this.now, 0.4, 0.06, 'triangle');
        break;
      case 'wave':
        this.burst(this.now, 1.4, 0.5, 'lowpass', 4000, 200, 1);
        this.burst(this.now + 0.1, 1.0, 0.25, 'highpass', 2500, 6000, 1);
        this.tone(90, this.now, 0.8, 0.3, 'sine', 40);
        break;
      case 'boing':
        this.tone(160, this.now, 0.22, 0.08 + e.strength * 0.12, 'sine', 330);
        break;
      case 'squawk':
        this.tone(1500, this.now, 0.12, 0.08, 'square25', 900);
        this.tone(1300, this.now + 0.13, 0.16, 0.07, 'square25', 700);
        break;
      case 'flap':
        this.burst(this.now, 0.1, 0.08, 'bandpass', 900, 1600, 2);
        break;
      case 'tentacle':
        this.tone(55, this.now, 0.9, 0.3, 'sawtooth', 90);
        this.burst(this.now, 0.4, 0.2, 'lowpass', 900, 200);
        break;
      case 'slam':
        this.thump(1);
        this.burst(this.now, 0.5, 0.3, 'lowpass', 1500, 120, 2);
        break;
      default:
        break;
    }
  }

  /** Called when the result screen opens. */
  result(outcome: Outcome): void {
    if (!this.ctx || outcome === 'won') return;
    this.wahWah();
  }

  // ---------------------------------------------------------------- music + continuous
  startMusic(): void {
    if (!this.ctx) return;
    if (!this.playing) {
      this.playing = true;
      this.nextNote = this.now + 0.05;
      this.melodyIdx = 0;
      this.beat = 0;
    }
    this.music.gain.setTargetAtTime(1, this.now, 0.05);
  }

  stopMusic(): void {
    this.playing = false;
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(0, this.now, 0.1);
    this.creakGain?.gain.setTargetAtTime(0, this.now, 0.05);
  }

  pauseMusic(paused: boolean): void {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend().catch(() => undefined);
    else void this.ctx.resume().catch(() => undefined);
  }

  /** Per-frame: creak follows the lean, music tempo follows the clock. */
  track(w: World): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.now;
    const lean = Math.abs(w.cake.theta);
    const k = w.finished ? 0 : Math.max(0, Math.min(1, (lean - 0.12) / 0.45));
    this.creakGain!.gain.setTargetAtTime(k * k * 0.22, t, 0.05);
    const f = 140 + lean * 700 + Math.sin(t * 23) * 12;
    this.creakOsc!.frequency.setTargetAtTime(f, t, 0.03);
    this.creakFilter!.frequency.setTargetAtTime(f * 3, t, 0.05);

    this.bpm = w.timeLeft < 10 && !w.finished ? 196 : 140;
    const song = SONGS[w.worldId];
    if (song !== this.song) {
      this.song = song;
      this.melodyIdx = 0;
      this.beat = 0;
    }
    if (!this.playing) return;
    const spb = 60 / this.bpm;
    while (this.nextNote < t + 0.2) {
      const [note, beats] = this.song.melody[this.melodyIdx];
      const dur = beats * spb;
      this.tone(
        midi(note),
        this.nextNote,
        Math.max(0.08, dur * 0.9),
        0.07,
        'square25',
        undefined,
        this.music,
      );
      // Bass + hats on every beat and off-beat that falls inside this note.
      for (let b = 0; b < beats; b += 0.5) {
        const tb = this.nextNote + b * spb;
        const whole = Math.round((this.beat + b) * 2) / 2;
        if (Number.isInteger(whole)) {
          this.tone(
            midi(this.song.bass[whole % 16]),
            tb,
            spb * 0.8,
            0.13,
            'triangle',
            undefined,
            this.music,
          );
          if (whole % 2 === 0) this.tone(70, tb, 0.08, 0.12, 'sine', 40, this.music);
        } else this.burst(tb, 0.04, 0.03, 'highpass', 7000, undefined, 1, this.music);
      }
      this.beat = (this.beat + beats) % 16;
      this.nextNote += dur;
      this.melodyIdx = (this.melodyIdx + 1) % this.song.melody.length;
    }
  }
}
