import {
  boeken, hertz, stapDuur, toon as toonhoogte, zelfdeKeuze,
  type Effect, type Lied, type Muziekkeuze, type Noot, type Slag, type StemNaam,
} from './muziek.ts';

/**
 * A small synth, and the clock that feeds it.
 *
 * Nothing is sampled and nothing is downloaded: seven voices built out of
 * oscillators and one buffer of noise, which is the whole point — the music
 * is a few kilobytes of text in liedjes.ts and the chip makes the sound.
 *
 * Timing does not come off the game loop. A note scheduled on a frame
 * boundary lands wherever the frame landed, and at 112bpm that is audible as
 * a limp. So the loop only ever says "it is now about this time, look ahead",
 * and every note is booked against the audio clock, which is driven by the
 * sound card and does not care how long a render took.
 */

/** How far ahead notes are booked. Long enough to survive a slow frame. */
const VOORUIT = 0.18;

/** Crossfade when the music changes. A hard cut between stages is a jolt. */
const OVERVLOEI = 0.45;

/**
 * Master level, kept low on purpose: a square wave is all odd harmonics and
 * reads much louder than its amplitude suggests.
 */
const VOLUME = 0.3;

/** Unaccented notes sit back, so an accent is a shape and not just volume. */
const ZACHT = 0.72;

type Aanslag = {
  readonly ctx: AudioContext;
  /** The bus for the song being played, so a crossfade can take it away. */
  readonly uit: AudioNode;
  /** The delay send. Voices that would muddy it do not connect. */
  readonly echo: AudioNode;
  readonly t: number;
  readonly duur: number;
  readonly hz: number;
  readonly vol: number;
};

/**
 * Attack, decay to a sustain, hold for the length of the note, release.
 * Clamped so a sixteenth does not spend its whole life in the attack.
 */
function omhullende(
  param: AudioParam, t: number, duur: number, piek: number,
  aanzet: number, verval: number, houd: number, los: number,
): void {
  const aan = Math.min(aanzet, duur * 0.4);
  const ver = Math.min(verval, duur * 0.5);
  const einde = t + Math.max(duur, aan + ver);
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(piek, t + aan);
  param.linearRampToValueAtTime(piek * houd, t + aan + ver);
  param.setValueAtTime(piek * houd, einde);
  param.linearRampToValueAtTime(0, einde + los);
}

/**
 * Struck, not held: straight up and then an exponential fall. The envelope
 * above clamps its decay to the length of the note, which is right for a
 * sixteenth and useless for a cymbal that rings for a second.
 */
function pets(param: AudioParam, t: number, piek: number, verval: number): void {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(piek, t + 0.001);
  param.exponentialRampToValueAtTime(0.0001, t + 0.001 + verval);
  param.setValueAtTime(0, t + 0.002 + verval);
}

function toon(ctx: AudioContext, type: OscillatorType, hz: number, cent: number, t: number, tot: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.detune.value = cent;
  o.start(t);
  o.stop(tot);
  return o;
}

function zeef(ctx: AudioContext, type: BiquadFilterType, hz: number, q = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = Math.min(hz, ctx.sampleRate / 2 - 1000);
  f.Q.value = q;
  return f;
}

/**
 * A pulse a quarter of the cycle wide, the way the home computers of the
 * eighties did their leads: thinner and brighter than a square, the sound of
 * every game tune of the decade. Built once per context.
 */
const PULSEN = new WeakMap<AudioContext, PeriodicWave>();

function pulsgolf(ctx: AudioContext): PeriodicWave {
  let golf = PULSEN.get(ctx);
  if (!golf) {
    const n = 48;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    const breedte = 0.25;
    // A pulse centred on zero is all cosines: 2/(k pi) sin(k pi d) each.
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * breedte);
    golf = ctx.createPeriodicWave(re, im);
    PULSEN.set(ctx, golf);
  }
  return golf;
}

/**
 * The lead: two quarter-width pulses a few cents apart, so they beat against
 * each other the way a chip's channels did, and a vibrato that comes in
 * late on the long notes, as every eighties game tune did.
 */
function puls(a: Aanslag): void {
  const { ctx, t, duur, hz } = a;
  const tot = t + duur + 0.2;
  const g = ctx.createGain();
  omhullende(g.gain, t, duur, a.vol * 0.55, 0.004, 0.06, 0.75, 0.06);

  const oscs = [-6, 6].map((cent) => {
    const o = ctx.createOscillator();
    o.setPeriodicWave(pulsgolf(ctx));
    o.frequency.value = hz;
    o.detune.value = cent;
    o.start(t);
    o.stop(tot);
    o.connect(g);
    return o;
  });

  if (duur > 0.25) {
    const lfo = toon(ctx, 'sine', 6, 0, t, tot);
    const diepte = ctx.createGain();
    diepte.gain.setValueAtTime(0, t);
    diepte.gain.linearRampToValueAtTime(0, t + 0.15);
    diepte.gain.linearRampToValueAtTime(14, t + 0.35);
    lfo.connect(diepte);
    for (const o of oscs) diepte.connect(o.detune);
  }

  const lp = zeef(ctx, 'lowpass', hz * 10 + 2400, 0.7);
  g.connect(lp);
  lp.connect(a.uit);
  lp.connect(a.echo);
}

/** Sawtooth, with the filter closing as the note decays. Licks and stabs. */
function zaag(a: Aanslag): void {
  const { ctx, t, duur, hz } = a;
  const tot = t + duur + 0.2;
  const g = ctx.createGain();
  omhullende(g.gain, t, duur, a.vol * 0.34, 0.005, 0.09, 0.6, 0.08);
  toon(ctx, 'sawtooth', hz, -4, t, tot).connect(g);
  toon(ctx, 'sawtooth', hz, 5, t, tot).connect(g);

  const lp = zeef(ctx, 'lowpass', 1, 1.4);
  lp.frequency.setValueAtTime(Math.min(hz * 9 + 1200, ctx.sampleRate / 2 - 1000), t);
  lp.frequency.linearRampToValueAtTime(Math.min(hz * 3 + 500, ctx.sampleRate / 2 - 1000), t + duur + 0.05);
  g.connect(lp);
  lp.connect(a.uit);
  lp.connect(a.echo);
}

/** Triangle: soft, slow on, holds as long as you ask. Pads and the ballad. */
function driehoek(a: Aanslag): void {
  const { ctx, t, duur, hz } = a;
  const tot = t + duur + 0.5;
  const g = ctx.createGain();
  omhullende(g.gain, t, duur, a.vol * 0.75, 0.06, 0.25, 0.75, 0.35);
  toon(ctx, 'triangle', hz, -3, t, tot).connect(g);
  toon(ctx, 'triangle', hz, 4, t, tot).connect(g);
  const lp = zeef(ctx, 'lowpass', hz * 8 + 500, 0.7);
  g.connect(lp);
  lp.connect(a.uit);
  lp.connect(a.echo);
}

/** Square with a sine under it for the weight. Never echoed: it would blur. */
function bas(a: Aanslag): void {
  const { ctx, t, duur, hz } = a;
  const tot = t + duur + 0.1;
  const g = ctx.createGain();
  omhullende(g.gain, t, duur, a.vol * 0.42, 0.004, 0.06, 0.78, 0.04);
  toon(ctx, 'square', hz, 0, t, tot).connect(g);

  const sub = ctx.createGain();
  omhullende(sub.gain, t, duur, a.vol * 0.5, 0.004, 0.05, 0.8, 0.04);
  toon(ctx, 'sine', hz, 0, t, tot).connect(sub);

  const lp = zeef(ctx, 'lowpass', 900, 1.1);
  g.connect(lp);
  sub.connect(lp);
  lp.connect(a.uit);
}

/**
 * The curve an overdriven valve amp puts a string through: straight in the
 * middle, flat at the ends. One table for everybody, it does not depend on
 * the note.
 */
const KROMME = (() => {
  const n = 1024;
  const k = new Float32Array(n);
  for (let i = 0; i < n; i++) k[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * 3.2);
  return k;
})();

/**
 * Electric guitar with the amp turned up. The squares and saws above are a
 * chip playing a tune; the two records this game is after are a guitar
 * playing a riff, and no choice of notes gets from the one to the other.
 *
 * So: the envelope goes in front of the distortion rather than after it. A
 * string that is dying away into a clipping amp does not get quieter, it
 * gets cleaner, which is the sustain. Then the cabinet: no bottom, no top.
 */
function gitaar(a: Aanslag): void {
  const { ctx, t, duur, hz } = a;
  const tot = t + duur + 0.3;
  const snaar = ctx.createGain();
  omhullende(snaar.gain, t, duur, 0.9, 0.003, 0.22, 0.45, 0.07);
  toon(ctx, 'sawtooth', hz, -5, t, tot).connect(snaar);
  toon(ctx, 'sawtooth', hz, 5, t, tot).connect(snaar);

  // The pick: the string is brightest in the first few hundredths.
  const pluk = zeef(ctx, 'lowpass', 1, 0.8);
  const top = Math.min(hz * 10 + 2500, ctx.sampleRate / 2 - 1000);
  pluk.frequency.setValueAtTime(top, t);
  pluk.frequency.exponentialRampToValueAtTime(Math.min(hz * 4 + 900, top), t + 0.12);

  const versterker = ctx.createWaveShaper();
  versterker.curve = KROMME;
  versterker.oversample = '2x';

  const kast = zeef(ctx, 'lowpass', 3600, 0.8);
  const onder = zeef(ctx, 'highpass', 110, 0.7);
  const uit = ctx.createGain();
  uit.gain.value = a.vol * 0.42;
  // The shaper turns silence into silence, so the level needs no envelope of
  // its own; the gate is only there for the click at the very end.
  uit.gain.setValueAtTime(a.vol * 0.42, t + Math.max(duur, 0.05) + 0.05);
  uit.gain.linearRampToValueAtTime(0, t + Math.max(duur, 0.05) + 0.09);

  snaar.connect(pluk).connect(versterker).connect(onder).connect(kast).connect(uit);
  uit.connect(a.uit);
  uit.connect(a.echo);
}

/**
 * The same guitar with the amp turned down: a plucked string that falls away
 * by itself. Chords, under a lead, where six clipped strings would be mud.
 */
function schoon(a: Aanslag): void {
  const { ctx, t, duur, hz } = a;
  const tot = t + duur + 0.4;
  const g = ctx.createGain();
  omhullende(g.gain, t, duur, a.vol * 0.5, 0.003, 0.4, 0.3, 0.14);
  toon(ctx, 'triangle', hz, -3, t, tot).connect(g);
  const rand = ctx.createGain();
  rand.gain.value = 0.35;
  toon(ctx, 'sawtooth', hz, 3, t, tot).connect(rand).connect(g);

  const lp = zeef(ctx, 'lowpass', 1, 0.9);
  const top = Math.min(hz * 8 + 1800, ctx.sampleRate / 2 - 1000);
  lp.frequency.setValueAtTime(top, t);
  lp.frequency.exponentialRampToValueAtTime(Math.min(hz * 3 + 600, top), t + 0.25);
  g.connect(lp);
  lp.connect(a.uit);
  lp.connect(a.echo);
}

export const STEMMEN: Record<Exclude<StemNaam, 'slagwerk'>, (a: Aanslag) => void> = {
  puls, zaag, driehoek, bas, gitaar, schoon,
};

/**
 * One buffer of white noise per context, sliced from a random offset. Making
 * a fresh one per hi-hat would allocate a few hundred kilobytes a second for
 * no audible gain.
 */
const RUIS = new WeakMap<AudioContext, AudioBuffer>();

function ruis(ctx: AudioContext): AudioBufferSourceNode {
  let buffer = RUIS.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    RUIS.set(ctx, buffer);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

/** Noise through a filter, which is every drum here except the kick. */
function klap(a: Aanslag, type: BiquadFilterType, hz: number, q: number, duur: number, piek: number): void {
  const { ctx, t } = a;
  const g = ctx.createGain();
  pets(g.gain, t, a.vol * piek, duur);
  const src = ruis(ctx);
  src.start(t, Math.random() * 1.5, duur + 0.1);
  src.connect(zeef(ctx, type, hz, q)).connect(g);
  g.connect(a.uit);
}

function slagwerk(a: Aanslag, slag: Slag): void {
  const { ctx, t } = a;
  switch (slag) {
    case 'kick': {
      // Pitch falling from a thump to a floor: a kick drum is a sine that
      // loses its nerve.
      const g = ctx.createGain();
      pets(g.gain, t, a.vol * 0.9, 0.16);
      const o = toon(ctx, 'sine', 160, 0, t, t + 0.3);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
      o.connect(g);
      g.connect(a.uit);
      klap(a, 'highpass', 1800, 0.7, 0.012, 0.25);
      return;
    }
    case 'snare':
      klap(a, 'bandpass', 1900, 1.1, 0.12, 0.5);
      klap(a, 'lowpass', 320, 1.6, 0.06, 0.35);
      return;
    case 'hat':
      klap(a, 'highpass', 7600, 0.8, 0.028, 0.3);
      return;
    case 'open':
      klap(a, 'highpass', 6200, 0.8, 0.22, 0.3);
      return;
    case 'crash':
      klap(a, 'highpass', 4200, 0.7, 0.9, 0.3);
      return;
  }
}

/**
 * The game's one way of making a noise. Owns the context, the master chain,
 * and the step clock; everything above it just names a song.
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private echo: GainNode | null = null;
  private vertraging: DelayNode | null = null;
  /** The bus the current song plays through, so it can be faded out whole. */
  private bus: GainNode | null = null;

  private keuze: Muziekkeuze | null = null;
  private lied: Lied | null = null;
  private halveTonen = 0;
  private duur = 0;
  private stap = 0;
  private volgende = 0;

  gedempt = false;

  /**
   * No context until there is a song to play: constructing one before the
   * player has touched anything only earns a warning in the console.
   */
  private open(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.gedempt ? 0 : VOLUME;
    // Takes the fizz off the squares without making them sound like a radio.
    const lp = zeef(ctx, 'lowpass', 9500, 0.6);
    master.connect(lp);
    lp.connect(ctx.destination);
    this.master = master;

    // A short feedback delay, set to the song's tempo when it starts. Cheap
    // and it stops three voices sounding like three voices in a cupboard.
    const vertraging = ctx.createDelay(1);
    const terug = ctx.createGain();
    terug.gain.value = 0.26;
    const echo = ctx.createGain();
    echo.gain.value = 0.2;
    echo.connect(vertraging);
    vertraging.connect(terug);
    terug.connect(vertraging);
    vertraging.connect(master);
    this.echo = echo;
    this.vertraging = vertraging;

    return ctx;
  }

  /**
   * Browsers will not make a sound until the player has done something, so
   * the first key or click resumes the context. Sticky activation outlives
   * the event, which is why this can be called from the game loop.
   */
  aan(): void {
    const ctx = this.open();
    if (!ctx || ctx.state === 'running') return;
    void ctx.resume();
  }

  /**
   * Name the music. Called every frame by whichever scene is on top, so the
   * same song arriving twice has to be free: asking for what is already
   * playing does nothing, which is what keeps the riff running across the
   * six levels of a stage instead of restarting on every wall.
   */
  speel(keuze: Muziekkeuze | null): void {
    if (zelfdeKeuze(keuze, this.keuze)) return;

    const ctx = this.open();
    if (!ctx) return;

    this.vervaagBus(ctx);
    this.keuze = keuze;
    this.lied = keuze?.lied ?? null;

    if (!keuze) return;

    this.halveTonen = keuze.halveTonen ?? 0;
    this.duur = stapDuur(keuze.lied.bpm * (keuze.tempo ?? 1), keuze.lied.stappenPerMaat);
    this.stap = 0;
    this.volgende = ctx.currentTime + 0.06;

    const bus = ctx.createGain();
    bus.gain.value = 1;
    if (this.master) bus.connect(this.master);
    this.bus = bus;

    // A dotted echo off the grid, so it answers the riff rather than doubling
    // it. Capped: the delay line is a second long.
    if (this.vertraging) {
      this.vertraging.delayTime.value = Math.min(0.99, this.duur * 3);
    }
  }

  /** Fade the outgoing song out from under its already-booked notes. */
  private vervaagBus(ctx: AudioContext): void {
    const oud = this.bus;
    this.bus = null;
    if (!oud) return;
    const nu = ctx.currentTime;
    oud.gain.setValueAtTime(oud.gain.value, nu);
    oud.gain.linearRampToValueAtTime(0, nu + OVERVLOEI);
    window.setTimeout(() => oud.disconnect(), (OVERVLOEI + VOORUIT + 0.5) * 1000);
  }

  /**
   * A one-off, over whatever is playing. Goes straight to the master rather
   * than through the song's bus, so a level theme fading out does not take
   * the fanfare with it.
   */
  effect(naam: Effect): void {
    const ctx = this.ctx;
    const master = this.master;
    const echo = this.echo;
    if (!ctx || !master || !echo || ctx.state !== 'running') return;
    const nu = ctx.currentTime + 0.01;
    const noot = (stem: Exclude<StemNaam, 'slagwerk'>, naam: string, na: number, duur: number, vol = 0.5): void => {
      STEMMEN[stem]({ ctx, uit: master, echo, t: nu + na, duur, hz: hertz(toonhoogte(naam)), vol });
    };
    const slag = (welke: Slag, na: number, vol = 0.6): void => {
      slagwerk({ ctx, uit: master, echo, t: nu + na, duur: 0.1, hz: 0, vol }, welke);
    };

    switch (naam) {
      case 'klaar':
        // Up the chord and a crash on top: done, in under a second.
        ['c5', 'e5', 'g5', 'c6'].forEach((n, i) => noot('puls', n, i * 0.09, 0.12));
        noot('driehoek', 'c4', 0, 0.5, 0.6);
        slag('crash', 0.27, 0.5);
        break;
      case 'kapot':
        // Something giving way, then the bits landing.
        ['a3', 'eb3', 'a2', 'eb2'].forEach((n, i) => noot('zaag', n, i * 0.07, 0.08, 0.6));
        slag('snare', 0.3);
        slag('open', 0.36, 0.5);
        slag('kick', 0.5);
        break;
      case 'fout':
        noot('zaag', 'e2', 0, 0.16, 0.5);
        noot('zaag', 'eb2', 0.02, 0.16, 0.5);
        break;
      case 'tik':
        slag('hat', 0, 0.7);
        break;
      case 'fanfare':
        // The one at the very end. Longer, and it resolves.
        ['g4', 'c5', 'e5', 'g5', 'e5', 'g5', 'c6'].forEach((n, i) => noot('puls', n, i * 0.13, i === 6 ? 0.7 : 0.14));
        ['c3', 'c3', 'g3', 'c4'].forEach((n, i) => noot('bas', n, i * 0.26, 0.24, 0.7));
        slag('crash', 0.78, 0.6);
        break;
    }
  }

  /** M, on the keyboard. Keeps playing underneath, so it comes back in time. */
  demp(): boolean {
    this.gedempt = !this.gedempt;
    const ctx = this.ctx;
    if (ctx && this.master) {
      const nu = ctx.currentTime;
      this.master.gain.setValueAtTime(this.master.gain.value, nu);
      this.master.gain.linearRampToValueAtTime(this.gedempt ? 0 : VOLUME, nu + 0.12);
    }
    return this.gedempt;
  }

  /** Once a frame. Books whatever falls inside the lookahead window. */
  tik(): void {
    const ctx = this.ctx;
    if (!ctx || !this.lied || !this.bus || ctx.state !== 'running') return;

    const boeking = boeken(this.stap, this.volgende, ctx.currentTime, this.duur, VOORUIT);
    for (const { stap, t } of boeking.stappen) this.plan(stap, t);
    this.volgende = boeking.volgende;
    this.stap = boeking.stap;
  }

  private plan(stap: number, t: number): void {
    const lied = this.lied;
    if (!lied) return;

    // The off-beat lands late by a fraction of a step. Pushed per step rather
    // than built into the clock, so the grid itself stays honest.
    const zwaai = stap % 2 === 1 ? lied.swing * this.duur * 0.5 : 0;

    for (const partij of lied.partijen) {
      const noten = partij.perStap[stap % partij.stappen];
      if (!noten) continue;
      for (const noot of noten) {
        this.speelNoot(noot, partij.stem, partij.volume, t + zwaai);
      }
    }
  }

  private speelNoot(noot: Noot, stem: StemNaam, volume: number, t: number): void {
    const ctx = this.ctx;
    const bus = this.bus;
    if (!ctx || !bus || !this.echo) return;

    const vol = volume * (noot.accent ? 1 : ZACHT);
    const aanslag: Aanslag = {
      ctx,
      uit: bus,
      echo: this.echo,
      t,
      // A hair short of its written length, so two of the same note in a row
      // articulate instead of smearing into one long one.
      duur: Math.max(0.04, noot.lengte * this.duur - 0.03),
      hz: noot.toon < 0 ? 0 : hertz(noot.toon + this.halveTonen),
      vol,
    };

    if (stem === 'slagwerk') {
      if (noot.slag) slagwerk(aanslag, noot.slag);
      return;
    }
    STEMMEN[stem](aanslag);
  }
}
