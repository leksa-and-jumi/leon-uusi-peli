import { CRAZY, HORROR, SOUND } from '../config';
import { crazyBeat, horrorBeat } from '../logic/music';

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * The sounds of the game, all made with code (no sound files): thumps, clangs,
 * shots and explosions built from tones that slide down and bursts of hiss.
 */
export class Sfx {
  private quiet = false;
  /**
   * The creepy music of horror mode while it plays: its volume knob, the hum that goes
   * on and on, what puts the next notes in, and the next beat and when it is.
   */
  private music: {
    volume: GainNode;
    hum: OscillatorNode[];
    timer: number;
    beat: number;
    nextAt: number;
  } | null = null;
  /** The silly music of crazy mode while it plays: its volume knob, what puts the next notes in, and the next beat and when it is. */
  private silly: { volume: GainNode; timer: number; beat: number; nextAt: number } | null = null;
  private context: AudioContext | null = null;
  private hiss: AudioBuffer | null = null;
  /** When each sound was last played, so the same one isn't piled up many times at once. */
  private readonly lastPlayed = new Map<string, number>();

  /** Are the sounds off? The music goes quiet too, and comes back when they are on again. */
  get muted(): boolean {
    return this.quiet;
  }

  set muted(quiet: boolean) {
    this.quiet = quiet;
    const music = this.music;
    if (music && this.context) {
      music.volume.gain.setTargetAtTime(quiet ? 0 : 1, this.context.currentTime, 0.05);
    }
    if (this.silly && this.context) {
      this.silly.volume.gain.setTargetAtTime(quiet ? 0 : 1, this.context.currentTime, 0.05);
    }
  }

  /** Start the silly music of crazy mode: the beats of its tune put in a little ahead, one after the other. */
  startSillyMusic(): void {
    const context = this.context;
    if (this.silly || !context) return;
    const now = context.currentTime;
    const volume = context.createGain();
    volume.gain.setValueAtTime(this.quiet ? 0 : 1, now);
    volume.connect(context.destination);
    const timer = window.setInterval(() => {
      this.putInSillyBeats();
    }, CRAZY.music.everyMs);
    this.silly = { volume, timer, beat: 0, nextAt: now + 0.1 };
    this.putInSillyBeats();
  }

  /** Stop the silly music: it fades out. */
  stopSillyMusic(): void {
    const silly = this.silly;
    const context = this.context;
    if (!silly || !context) return;
    this.silly = null;
    window.clearInterval(silly.timer);
    const { fadeSeconds } = CRAZY.music;
    const now = context.currentTime;
    silly.volume.gain.cancelScheduledValues(now);
    silly.volume.gain.setTargetAtTime(0, now, fadeSeconds / 4);
    window.setTimeout(
      () => {
        silly.volume.disconnect();
      },
      fadeSeconds * 1000 + 200,
    );
  }

  /** Put in the beats of the silly tune that come in the next moment. */
  private putInSillyBeats(): void {
    const silly = this.silly;
    const context = this.context;
    if (!silly || !context) return;
    const { beatSeconds, tune, aheadSeconds } = CRAZY.music;
    silly.nextAt = Math.max(silly.nextAt, context.currentTime);
    while (silly.nextAt < context.currentTime + aheadSeconds) {
      const beat = crazyBeat(silly.beat, tune);
      const at = silly.nextAt;
      if (beat.note !== null) this.tootle(beat.note, at, silly.volume);
      if (beat.bass !== null) this.bounce(beat.bass, at, silly.volume);
      if (beat.slide) this.slideWhistle(beat.slide === 'up', at, silly.volume);
      if (beat.honk) this.clownHorn(at, silly.volume);
      silly.beat += 1;
      silly.nextAt += beatSeconds;
    }
  }

  /** A short squeaky note of the silly tune. */
  private tootle(frequency: number, at: number, out: AudioNode): void {
    const { lead } = CRAZY.music;
    const oscillator = this.oscillator(lead.wave, frequency, at);
    oscillator.connect(this.fadingAt(lead.volume, at, lead.seconds, out));
    oscillator.stop(at + lead.seconds);
  }

  /** A bouncy low note: it boings up into its pitch. */
  private bounce(frequency: number, at: number, out: AudioNode): void {
    const { bass } = CRAZY.music;
    const oscillator = this.oscillator('sine', frequency * bass.bend, at);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, at + bass.bendSeconds);
    oscillator.connect(this.fadingAt(bass.volume, at, bass.seconds, out));
    oscillator.stop(at + bass.seconds);
  }

  /** A slide whistle: a whistling note sliding all the way up, or all the way down. */
  private slideWhistle(up: boolean, at: number, out: AudioNode): void {
    const { slide } = CRAZY.music;
    const [from, to] = up ? [slide.low, slide.high] : [slide.high, slide.low];
    const oscillator = this.oscillator('sine', from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + slide.seconds);
    oscillator.connect(this.fadingAt(slide.volume, at, slide.seconds, out));
    oscillator.stop(at + slide.seconds);
  }

  /** A clown horn: two quick, nasal honks. */
  private clownHorn(at: number, out: AudioNode): void {
    const context = this.context;
    if (!context) return;
    const { honk } = CRAZY.music;
    for (const start of [at, at + honk.gap]) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = honk.filter;
      filter.connect(this.fadingAt(honk.volume, start, honk.seconds, out));
      const oscillator = this.oscillator('sawtooth', honk.from, start);
      oscillator.frequency.exponentialRampToValueAtTime(honk.to, start + honk.seconds);
      oscillator.connect(filter);
      oscillator.stop(start + honk.seconds);
    }
  }

  /**
   * Start the creepy music of horror mode: a low hum that swells and fades all the
   * time, and the beats of the tune put in a little ahead, one after the other.
   */
  startMusic(): void {
    const context = this.context;
    if (this.music || !context) return;
    const { drone, everyMs } = HORROR.music;
    const now = context.currentTime;
    const volume = context.createGain();
    volume.gain.setValueAtTime(0, now);
    volume.gain.setTargetAtTime(this.quiet ? 0 : 1, now, 0.3);
    volume.connect(context.destination);
    // Two deep notes, a little apart, rub against each other into a dark hum
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = drone.filter;
    const loudness = context.createGain();
    loudness.gain.value = drone.volume * SOUND.volume;
    filter.connect(loudness);
    loudness.connect(volume);
    const hum = [drone.low, drone.high].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'sawtooth';
      oscillator.frequency.value = frequency;
      oscillator.connect(filter);
      return oscillator;
    });
    // And it swells up and dies down, slowly
    const swell = context.createOscillator();
    swell.frequency.value = drone.swellHz;
    const depth = context.createGain();
    depth.gain.value = drone.volume * SOUND.volume * 0.6;
    swell.connect(depth);
    depth.connect(loudness.gain);
    hum.push(swell);
    hum.forEach((oscillator) => {
      oscillator.start(now);
    });
    const timer = window.setInterval(() => {
      this.putInBeats();
    }, everyMs);
    this.music = { volume, hum, timer, beat: 0, nextAt: now + 0.1 };
    this.putInBeats();
  }

  /** Stop the music: it fades out. */
  stopMusic(): void {
    const music = this.music;
    const context = this.context;
    if (!music || !context) return;
    this.music = null;
    window.clearInterval(music.timer);
    const { fadeSeconds } = HORROR.music;
    const now = context.currentTime;
    music.volume.gain.cancelScheduledValues(now);
    music.volume.gain.setTargetAtTime(0, now, fadeSeconds / 4);
    music.hum.forEach((oscillator) => {
      oscillator.stop(now + fadeSeconds);
    });
    window.setTimeout(
      () => {
        music.volume.disconnect();
      },
      fadeSeconds * 1000 + 200,
    );
  }

  /** Put in the beats of the tune that come in the next moment. */
  private putInBeats(): void {
    const music = this.music;
    const context = this.context;
    if (!music || !context) return;
    const { beatSeconds, tune, aheadSeconds } = HORROR.music;
    // After a long pause (a hidden tab), it doesn't try to catch up
    music.nextAt = Math.max(music.nextAt, context.currentTime);
    while (music.nextAt < context.currentTime + aheadSeconds) {
      const beat = horrorBeat(music.beat, tune);
      if (beat.heart) this.heartbeat(music.nextAt, music.volume);
      if (beat.note !== null) this.musicBox(beat.note, music.nextAt, music.volume);
      if (beat.whisper) this.whisper(music.nextAt, music.volume);
      music.beat += 1;
      music.nextAt += beatSeconds;
    }
  }

  /** Two low thumps, one right after the other. */
  private heartbeat(at: number, out: AudioNode): void {
    const { heart } = HORROR.music;
    for (const [delay, strength] of [
      [0, 1],
      [heart.second, 0.7],
    ] as const) {
      const start = at + delay;
      const oscillator = this.oscillator('sine', heart.from, start);
      oscillator.frequency.exponentialRampToValueAtTime(heart.to, start + heart.seconds);
      oscillator.connect(this.fadingAt(heart.volume * strength, start, heart.seconds, out));
      oscillator.stop(start + heart.seconds);
    }
  }

  /** One note of a music box, a little out of tune: two tones that ring and fade. */
  private musicBox(frequency: number, at: number, out: AudioNode): void {
    const { box } = HORROR.music;
    for (const tuning of [1, box.detune]) {
      const oscillator = this.oscillator(box.wave, frequency * tuning, at);
      oscillator.connect(this.fadingAt(box.volume, at, box.seconds, out));
      oscillator.stop(at + box.seconds);
    }
  }

  /** A breath of wind: hiss through a narrow filter that sweeps up and back, swelling and dying away. */
  private whisper(at: number, out: AudioNode): void {
    const context = this.context;
    if (!context) return;
    const { whisper } = HORROR.music;
    const source = context.createBufferSource();
    source.buffer = this.hissBuffer(context);
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 8;
    filter.frequency.setValueAtTime(whisper.low, at);
    filter.frequency.exponentialRampToValueAtTime(whisper.high, at + whisper.seconds / 2);
    filter.frequency.exponentialRampToValueAtTime(whisper.low, at + whisper.seconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(whisper.volume * SOUND.volume, at + whisper.seconds / 2);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + whisper.seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(at);
    source.stop(at + whisper.seconds);
  }

  private oscillator(wave: OscillatorType, frequency: number, at: number): OscillatorNode {
    const context = this.context as AudioContext;
    const oscillator = context.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.start(at);
    return oscillator;
  }

  /** A volume knob that starts at `volume` at the time `at` and fades to silence, into `out`. */
  private fadingAt(volume: number, at: number, seconds: number, out: AudioNode): GainNode {
    const context = this.context as AudioContext;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume * SOUND.volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    gain.connect(out);
    return gain;
  }

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

  /** One note of the skibidis' tune. A pitch of 0 is a rest. */
  note(pitch: number): void {
    if (pitch <= 0 || !this.ready('note')) return;
    const { wave, seconds, volume } = SOUND.chant;
    this.tone({ wave, from: pitch, to: pitch * 0.97, seconds, volume });
  }

  /** A doll being swallowed. */
  gulp(): void {
    if (!this.ready('gulp')) return;
    this.tone(SOUND.gulp.tone);
    this.burst(SOUND.gulp.hiss);
  }

  /** A unicorn on a rainbow lets a poop drop. */
  plop(): void {
    if (!this.ready('plop')) return;
    this.tone(SOUND.plop.tone);
  }

  /** A doll leaping at somebody in horror mode. */
  screech(): void {
    if (!this.ready('screech')) return;
    this.tone(SOUND.screech.tone);
    this.burst(SOUND.screech.hiss);
  }

  /** A ghost scaring a doll. */
  spook(): void {
    if (!this.ready('spook')) return;
    this.tone(SOUND.spook.tone);
  }

  /** A rubber chicken hits something. */
  squeak(): void {
    if (!this.ready('squeak')) return;
    this.tone(SOUND.squeak.tone);
  }

  /** Something falls into water. */
  splash(): void {
    if (!this.ready('splash')) return;
    this.burst(SOUND.splash.hiss);
  }

  /** Something bounces off a trampoline. */
  boing(): void {
    if (!this.ready('boing')) return;
    this.tone(SOUND.boing.tone);
  }

  /** Lightning strikes. */
  thunder(): void {
    if (!this.ready('thunder')) return;
    this.tone(SOUND.thunder.tone);
    this.burst(SOUND.thunder.hiss);
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

  wind(): void {
    if (!this.ready('wind')) return;
    this.burst(SOUND.wind.hiss);
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
