import { SOUND } from '../config';

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * The sounds of the game, all made with code (no sound files): thumps, clangs,
 * shots and explosions built from tones that slide down and bursts of hiss.
 */
export class Sfx {
  muted = false;
  private context: AudioContext | null = null;
  private hiss: AudioBuffer | null = null;
  /** When each sound was last played, so the same one isn't piled up many times at once. */
  private readonly lastPlayed = new Map<string, number>();

  /** Browsers only let a page make sound after the first click or tap. Call this then. */
  unlock(): void {
    if (!this.context) {
      const Context = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  /** A fist landing: a short, low thump. */
  punch(): void {
    if (!this.ready('punch')) return;
    this.tone(SOUND.punch.tone);
    this.burst(SOUND.punch.hiss);
  }

  /** A sword, axe, spear or bat landing: a thump with a sharp ring to it. */
  clang(): void {
    if (!this.ready('clang')) return;
    this.tone(SOUND.clang.tone);
    this.tone(SOUND.clang.ring);
    this.burst(SOUND.clang.hiss);
  }

  shot(): void {
    if (!this.ready('shot')) return;
    this.tone(SOUND.shot.tone);
    this.burst(SOUND.shot.hiss);
  }

  blast(): void {
    if (!this.ready('blast')) return;
    this.tone(SOUND.blast.tone);
    this.burst(SOUND.blast.hiss);
  }

  /** A doll hitting the ground. `strength` goes from 0 to 1. */
  thud(strength: number): void {
    if (strength <= 0 || !this.ready('thud')) return;
    this.tone({ ...SOUND.thud.tone, volume: SOUND.thud.tone.volume * Math.min(strength, 1) });
  }

  /** A doll losing its last life: a sad slide down. */
  out(): void {
    if (!this.ready('out')) return;
    this.tone(SOUND.out.tone);
  }

  /** A laser going off. */
  zap(): void {
    if (!this.ready('zap')) return;
    this.tone(SOUND.zap.tone);
    this.burst(SOUND.zap.hiss);
  }

  /** Glass breaking. */
  shatter(): void {
    if (!this.ready('shatter')) return;
    this.tone(SOUND.shatter.tone);
    this.burst(SOUND.shatter.hiss);
  }

  /** Something breaking into pieces. */
  crumble(): void {
    if (!this.ready('crumble')) return;
    this.burst(SOUND.crumble.hiss);
  }

  /** Can this sound be played right now? Also notes that it is being played. */
  private ready(name: string): boolean {
    const context = this.context;
    if (this.muted || !context || context.state !== 'running') return false;
    const last = this.lastPlayed.get(name) ?? -Infinity;
    if (context.currentTime - last < SOUND.gapSeconds) return false;
    this.lastPlayed.set(name, context.currentTime);
    return true;
  }

  /** A tone that slides from one pitch to another and fades out. */
  private tone(tone: {
    wave: OscillatorType;
    from: number;
    to: number;
    seconds: number;
    volume: number;
  }): void {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    oscillator.type = tone.wave;
    oscillator.frequency.setValueAtTime(tone.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(tone.to, now + tone.seconds);
    oscillator.connect(this.fading(tone.volume, tone.seconds));
    oscillator.start(now);
    oscillator.stop(now + tone.seconds);
  }

  /** A burst of hiss through a filter that closes, like a bang or a slap. */
  private burst(hiss: { from: number; to: number; seconds: number; volume: number }): void {
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = this.hissBuffer(context);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(hiss.from, now);
    filter.frequency.exponentialRampToValueAtTime(hiss.to, now + hiss.seconds);
    source.connect(filter);
    filter.connect(this.fading(hiss.volume, hiss.seconds));
    source.start(now);
    source.stop(now + hiss.seconds);
  }

  /** A volume knob that starts at `volume` and fades to silence. */
  private fading(volume: number, seconds: number): GainNode {
    const context = this.context as AudioContext;
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume * SOUND.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    gain.connect(context.destination);
    return gain;
  }

  private hissBuffer(context: AudioContext): AudioBuffer {
    if (!this.hiss) {
      const length = Math.floor(context.sampleRate * SOUND.hissSeconds);
      this.hiss = context.createBuffer(1, length, context.sampleRate);
      const samples = this.hiss.getChannelData(0);
      for (let i = 0; i < length; i++) {
        samples[i] = Math.random() * 2 - 1;
      }
    }
    return this.hiss;
  }
}
