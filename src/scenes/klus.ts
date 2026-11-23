import { PECH, WENK, type Pech } from '../data/praatjes.ts';
import type { Muziekkeuze } from '../engine/muziek.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { Dialogue } from './dialogue.ts';

/**
 * A level, with everything around it that every level should have and none
 * of them should have to know about.
 *
 * Nine mechanics each own their board and their win panel. What they share
 * is the furniture: confetti when it is done, Pim offering a hint when it is
 * not, a way past a wall that will not come right, and a Zwart & Dekker
 * tool giving up halfway. Putting that in nine scenes would be nine copies
 * to keep in step, so it wraps them instead — this is the thing on the scene
 * stack, the level sits inside it, and a level that pops itself pops this.
 *
 * It learns that the level was won by watching the save's counter, which is
 * the one thing all nine do in the same way at the same moment.
 */

const HINT_NA = 60;
const HINT_WEER = 90;
const HINT_TOON = 7;
/** Resets before the way past is offered. The plan says three. */
const POGINGEN = 3;
/** Or this long on one wall, for the player who never presses R. */
const OVERSLAAN_NA = 300;
const ZEKER_DUUR = 3;
/** How far into a wall the tool gives up. Long enough to be mid-thought. */
const PECH_NA = 22;
const KRAK_DUUR = 1.1;

export type KlusOpties = {
  readonly id: string;
  readonly save: Save;
  /** The stage's id, which picks the tool that breaks here, if one does. */
  readonly pech?: string;
  /** The last level gets the long fanfare, and no way to skip it. */
  readonly baas?: boolean;
};

type Snipper = { x: number; y: number; vx: number; vy: number; kleur: number; hamer: boolean; draai: number };

const KLEUREN = [C.BOTERGEEL, C.ROESTROOD, C.SALIE, C.LUCHTBLAUW, C.MAGENTA, C.LICHTOKER, C.WIT];

/** A hammer, five pixels, in four attitudes: it tumbles as it falls. */
const HAMER = [
  ['###..', '###..', '.#...', '.#...', '.#...'],
  ['...##', '#####', '...##', '.....', '.....'],
  ['...#.', '...#.', '...#.', '..###', '..###'],
  ['##...', '#####', '##...', '.....', '.....'],
];

export class Klus implements Scene {
  private readonly inner: Scene;
  private readonly opties: KlusOpties;
  private readonly tellerBijStart: number;
  private readonly pech: Pech | null;

  private time = 0;
  /** Seconds actually spent on the wall: stops while anything is in the way. */
  private gewerkt = 0;
  private klaar = false;
  private klaarSinds = 0;
  private pogingen = 0;
  private hintGebruikt = false;
  private hintTot = -1;
  private volgendeHint = HINT_NA;
  private zekerTot = -1;
  private krak = -1;
  /** Broken once already on this wall. The save's flag says the same thing for next time. */
  private pechGehad = false;
  private praatje: Dialogue | null = null;
  private snippers: Snipper[] = [];
  private zaad = 7;

  constructor(inner: Scene, opties: KlusOpties) {
    this.inner = inner;
    this.opties = opties;
    this.tellerBijStart = opties.save.teller;
    opties.save.plafond = 3;
    const pech = opties.pech ? PECH[opties.pech] : undefined;
    // Once per phase, ever. The second time it is not a joke, it is a bug.
    this.pech = pech && !opties.save.vlag(`pech-${opties.pech}`) ? pech : null;
  }

  get muziek(): Muziekkeuze | null | undefined {
    return this.inner.muziek;
  }

  enter(ctx: SceneContext): void {
    this.inner.enter?.(ctx);
  }

  exit(ctx: SceneContext): void {
    this.opties.save.plafond = 3;
    this.inner.exit?.(ctx);
  }

  private get magOverslaan(): boolean {
    if (this.opties.baas || this.klaar) return false;
    // Already through once: there is nothing left to be let past.
    if (this.opties.save.isDone(this.opties.id)) return false;
    return this.pogingen >= POGINGEN || this.gewerkt >= OVERSLAAN_NA;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;

    // The tool, mid-break: nothing underneath moves until Pim has handed
    // over a new one. It costs reading time and nothing else.
    if (this.krak >= 0) {
      this.krak += dt;
      if (this.krak >= KRAK_DUUR && !this.praatje) {
        this.praatje = new Dialogue(this.pech!.tekst);
      }
      if (this.praatje?.update(dt, ctx)) {
        this.praatje = null;
        this.krak = -1;
      }
      return;
    }

    if (!this.klaar) {
      if (ctx.input.justPressed('KeyR')) this.pogingen++;
      if (ctx.input.justPressed('KeyH')) {
        this.hintGebruikt = true;
        this.hintTot = -1;
        this.opties.save.plafond = 2;
      }
      if (ctx.input.justPressed('KeyO') && this.magOverslaan) {
        if (this.time < this.zekerTot) {
          this.opties.save.slaOver(this.opties.id);
          ctx.pop();
          return;
        }
        this.zekerTot = this.time + ZEKER_DUUR;
      }
    }

    this.inner.update(dt, ctx);

    if (!this.klaar && this.opties.save.teller !== this.tellerBijStart) {
      this.klaar = true;
      this.klaarSinds = this.time;
      this.strooi();
      ctx.geluid?.(this.opties.baas ? 'fanfare' : 'klaar');
      return;
    }
    if (this.klaar) {
      this.val(dt);
      return;
    }

    // Only counts once the player is at it, so the explanation at the start
    // of a level does not eat into the minute.
    if (ctx.input.mouseClicked || this.gewerkt > 0) this.gewerkt += dt;

    if (!this.hintGebruikt && this.gewerkt >= this.volgendeHint) {
      this.hintTot = this.time + HINT_TOON;
      this.volgendeHint = this.gewerkt + HINT_WEER;
    }

    // Once. This used to look only at whether the wall had a tool to break,
    // which it still did after the break, so the tool broke again the moment
    // Pim had finished handing over a new one, and again, for ever.
    if (this.pech && !this.pechGehad && this.gewerkt >= PECH_NA && !ctx.input.mouseDown) {
      this.pechGehad = true;
      this.opties.save.zetVlag(`pech-${this.opties.pech}`);
      this.krak = 0;
      ctx.geluid?.('kapot');
    }
  }

  private willekeur(): number {
    this.zaad = (this.zaad * 1103515245 + 12345) & 0x7fffffff;
    return this.zaad / 0x7fffffff;
  }

  /** Hammer-confetti: a burst from the top, one piece in six a hammer. */
  private strooi(): void {
    const aantal = this.opties.baas ? 150 : 70;
    for (let i = 0; i < aantal; i++) {
      this.snippers.push({
        x: this.willekeur() * WIDTH,
        y: -4 - this.willekeur() * 60,
        vx: (this.willekeur() - 0.5) * 50,
        vy: 20 + this.willekeur() * 50,
        kleur: KLEUREN[Math.floor(this.willekeur() * KLEUREN.length)]!,
        hamer: i % 6 === 0,
        draai: Math.floor(this.willekeur() * 4),
      });
    }
  }

  private val(dt: number): void {
    for (const s of this.snippers) {
      s.vy += 90 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.snippers = this.snippers.filter((s) => s.y < HEIGHT + 6);
  }

  render(screen: Screen, ctx: SceneContext): void {
    this.inner.render(screen, ctx);

    if (this.klaar) {
      this.drawSnippers(screen);
      // The level's own panel counts three; say why the card will show two.
      if (this.hintGebruikt) this.drawRegel(screen, WENK.metHint, C.ZANDGRIJS);
    }
    else if (this.krak >= 0) this.drawPech(screen);
    else this.drawWenk(screen);
  }

  private drawSnippers(screen: Screen): void {
    const tuimel = Math.floor((this.time - this.klaarSinds) * 8);
    for (const s of this.snippers) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      if (!s.hamer) {
        // Flutters: wide one frame, narrow the next.
        const breed = (tuimel + s.draai) % 2 === 0;
        screen.fillRect(x, y, breed ? 3 : 1, breed ? 1 : 3, s.kleur);
        continue;
      }
      const art = HAMER[(tuimel + s.draai) % 4]!;
      for (let gy = 0; gy < art.length; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (art[gy]![gx] === '#') screen.set(x + gx, y + gy, gy < 2 || art[gy]![gx + 1] === '#' ? C.ASGRIJS : C.HOUT);
        }
      }
    }
  }

  /** One line, in a box, just under the top bar where nothing else lives. */
  private drawWenk(screen: Screen): void {
    let tekst: string | null = null;
    let kleur: number = C.LICHTOKER;
    if (this.time < this.zekerTot) {
      tekst = WENK.zeker;
      kleur = C.ROESTROOD;
    } else if (this.magOverslaan) {
      tekst = WENK.overslaan;
      kleur = C.ZANDGRIJS;
    } else if (this.time < this.hintTot) {
      tekst = WENK.hint;
    }
    if (!tekst) return;
    this.drawRegel(screen, tekst, kleur);
  }

  private drawRegel(screen: Screen, tekst: string, kleur: number): void {
    const w = tekst.length * 6 + 9;
    const x = Math.round((WIDTH - w) / 2);
    screen.fillRect(x, 17, w, 11, C.ZWART);
    screen.strokeRect(x, 17, w, 11, kleur === C.LICHTOKER ? C.DONKEROKER : C.STEEN);
    screen.text(tekst, x + 5, 19, kleur);
  }

  /**
   * The break itself: the screen jolts, the tool is named, and it is in two
   * pieces. Then Pim, with the slogan and a new one.
   */
  private drawPech(screen: Screen): void {
    if (this.praatje) {
      this.praatje.render(screen, this.time);
      return;
    }
    const pech = this.pech!;
    const t = this.krak;
    const schok = t < 0.35 ? (Math.floor(t * 40) % 2 === 0 ? 2 : -2) : 0;
    const w = 190;
    const h = 62;
    const x = Math.round((WIDTH - w) / 2) + schok;
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.ROESTROOD);
    screen.strokeRect(x + 2, y + 2, w - 4, h - 4, C.DONKERROOD);

    const titel = 'KRAK!';
    const tw = screen.textScaledWidth(titel, 2);
    screen.textScaled(titel, Math.round(WIDTH / 2 - tw / 2) + schok, y + 8, C.BOTERGEEL, 2);

    // The tool as a bar in the brand's colours, coming apart in the middle.
    const uiteen = Math.min(10, Math.round(t * 14));
    const by = y + 31;
    const midden = Math.round(WIDTH / 2) + schok;
    screen.fillRect(midden - 34 - uiteen, by, 34, 7, C.ROESTROOD);
    screen.fillRect(midden - 34 - uiteen, by, 34, 2, C.ROET);
    screen.fillRect(midden + uiteen, by + (uiteen > 4 ? 2 : 0), 34, 7, C.ASGRIJS);
    screen.fillRect(midden + uiteen, by + (uiteen > 4 ? 2 : 0), 34, 1, C.KALK);
    for (let i = 0; i < 3; i++) {
      screen.set(midden - 1 + i * 2 - uiteen, by + 1 + i * 2, C.BOTERGEEL);
      screen.set(midden + uiteen - i, by + 5 - i * 2, C.BOTERGEEL);
    }
    screen.textCentered(`DE ${pech.gereedschap}`, WIDTH / 2 + schok, y + 47, C.KALK);
  }
}
