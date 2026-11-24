import { BAAS } from '../data/liedjes.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  type Fault, type Plaatsing, type Soort, type Stuk,
  balans, faults, isSolved, lozeCellen, stars, zwaartepunt,
} from '../puzzles/tuinhuis/model.ts';
import { pasHintToe } from '../puzzles/tuinhuis/solver.ts';
import type { TuinhuisLevel } from '../puzzles/tuinhuis/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * Fourteen pixels to the half metre. Sixteen would fit, just, but it would
 * fill the screen edge to edge with trailer, and the joke needs the house
 * behind it to be visible: the one that is not finished.
 */
const TILE = 14;
const BORD_X = 150;
/** The four metre line: the top of the top row. */
const BORD_Y = 44;
/** Two rows of chassis under the floor. */
const CHASSIS_H = TILE * 2;

const LADE_X = 4;
const LADE_Y = 20;
const LADE_W = 108;
const LADE_H = 130;
const LADE_TILE = 8;

/**
 * Where each piece lies in the tray, by its top-left. Fixed places rather
 * than a row that closes up: a tray where everything shifts when you take
 * one thing out is a tray you have to read again every time.
 */
const LADE_PLEK: Record<Soort, { x: number; y: number }> = {
  vliering: { x: 10, y: 16 },
  keuken: { x: 70, y: 16 },
  douche: { x: 10, y: 44 },
  wc: { x: 32, y: 44 },
  kasttrap: { x: 54, y: 44 },
  techniek: { x: 80, y: 60 },
  bank: { x: 10, y: 96 },
  berging: { x: 46, y: 96 },
};

const METER_Y = 166;
const METER_H = 6;

/** How far the pointer has to travel before a press counts as a drag. */
const SLEEPDREMPEL = 4;

const EIS_TEKST: Record<Stuk['eis'], string> = {
  vloer: 'MOET OP DE VLOER',
  boven: 'MOET ONDER HET DAK',
  raakt: 'OP DE VLOER, ONDER DE VLIERING',
  vrij: 'MAG OVERAL',
};

/**
 * Wiep's trailer, in section, in the garden. Nine pieces in a tray; drag
 * them in until it is a house that stays under four metres and hangs right
 * on its axle. Taking things back out is free: this is the level where you
 * try things.
 */
export class TuinhuisScene implements Scene {
  readonly muziek = BAAS;
  private readonly level: TuinhuisLevel;
  private readonly save: Save;

  private plaatsingen: Plaatsing[] = [];
  /**
   * The piece in hand, and where on it the hand is, in board pixels from its
   * top-left, so a piece lifted by its corner does not jump to its middle.
   */
  private vast: { stuk: number; grijpX: number; grijpY: number } | null = null;
  /** True while the button that picked the piece up is still held. */
  private sleept = false;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;
  /** Wiep says it once. After that the needle says it. */
  private gewaarschuwd = false;

  constructor(level: TuinhuisLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.uitleg = new Dialogue(level.uitleg, 'WIEP');
  }

  private get d() {
    return this.level.doorsnede;
  }

  private get bordW(): number {
    return this.d.width * TILE;
  }

  private get bordH(): number {
    return this.d.height * TILE;
  }

  /** Top-left pixel of a placed piece. Rows count up from the floor; the screen does not. */
  private pixelVan(p: Plaatsing): { x: number; y: number } {
    const stuk = this.d.stukken[p.stuk]!;
    return { x: BORD_X + p.x * TILE, y: BORD_Y + (this.d.height - p.y - stuk.h) * TILE };
  }

  private ladeRect(i: number): { x: number; y: number; w: number; h: number } {
    const stuk = this.d.stukken[i]!;
    const plek = LADE_PLEK[stuk.soort];
    return { x: LADE_X + plek.x, y: LADE_Y + plek.y, w: stuk.w * LADE_TILE, h: stuk.h * LADE_TILE };
  }

  private inLade(i: number): boolean {
    return this.vast?.stuk !== i && !this.plaatsingen.some((p) => p.stuk === i);
  }

  /** Which piece still in the tray is under this point, or -1. */
  private ladeOp(mx: number, my: number): number {
    for (let i = 0; i < this.d.stukken.length; i++) {
      if (!this.inLade(i)) continue;
      const r = this.ladeRect(i);
      // A pixel of slack all round: the small ones are small.
      if (mx >= r.x - 1 && mx <= r.x + r.w && my >= r.y - 1 && my <= r.y + r.h) return i;
    }
    return -1;
  }

  /** Which placed piece is under this point, as an index into the placements, or -1. */
  private bordOp(mx: number, my: number): number {
    return this.plaatsingen.findIndex((p) => {
      const stuk = this.d.stukken[p.stuk]!;
      const px = this.pixelVan(p);
      return mx >= px.x && mx < px.x + stuk.w * TILE && my >= px.y && my < px.y + stuk.h * TILE;
    });
  }

  /**
   * Where the piece in hand would land if let go here, or null when the
   * pointer is nowhere near the trailer. Near counts: the landing is pulled
   * inside the section, so nobody has to aim at the last pixel of the wall.
   */
  private landing(mx: number, my: number): Plaatsing | null {
    if (!this.vast) return null;
    if (mx < BORD_X - TILE || mx >= BORD_X + this.bordW + TILE) return null;
    if (my < BORD_Y - TILE || my >= BORD_Y + this.bordH + TILE) return null;
    const stuk = this.d.stukken[this.vast.stuk]!;
    const kolom = Math.round((mx - this.vast.grijpX - BORD_X) / TILE);
    const rij = Math.round((my - this.vast.grijpY - BORD_Y) / TILE);
    const x = Math.max(0, Math.min(this.d.width - stuk.w, kolom));
    const y = Math.max(0, Math.min(this.d.height - stuk.h, this.d.height - rij - stuk.h));
    return { stuk: this.vast.stuk, x, y };
  }

  /**
   * The scene only refuses what cannot physically be: two things in one
   * place. Everything else — floating, on the wrong floor, off balance — may
   * be put down and is then pointed at, because being wrong for a moment is
   * how this gets solved.
   */
  private past(p: Plaatsing): boolean {
    return !faults(this.d, [...this.plaatsingen, p])
      .some((f) => f.stuk === p.stuk && (f.kind === 'overlap' || f.kind === 'buiten' || f.kind === 'hoogte'));
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.uitleg) {
      if (this.uitleg.update(dt, ctx)) this.uitleg = null;
      return;
    }
    if (this.won) {
      if (this.time - this.wonAt > 0.6 && ctx.input.confirmed()) ctx.pop();
      return;
    }
    const input = ctx.input;
    if (input.justPressed('Escape')) ctx.pop();
    if (input.justPressed('KeyU')) {
      this.uitleg = new Dialogue(this.level.uitleg, 'WIEP');
      return;
    }
    if (input.justPressed('KeyR')) {
      this.plaatsingen = [];
      this.vast = null;
      this.sleept = false;
      return;
    }
    if (input.justPressed('KeyH')) {
      // Whatever is in hand goes back to the tray first, or the hint could
      // want the very piece being held.
      this.vast = null;
      this.sleept = false;
      this.plaatsingen = pasHintToe(this.d, this.level.oplossing, this.plaatsingen);
      this.check();
      return;
    }

    if (input.mouseClicked) {
      if (this.vast) {
        // Second click of click-to-place. Outside the trailer means: never
        // mind, put it back.
        const doel = this.landing(input.mouseX, input.mouseY);
        if (!doel) this.vast = null;
        else if (this.past(doel)) this.zet(doel);
      } else {
        // The grab is read at the press, not at where the pointer has got to
        // since: a quick drag can cover the whole board inside one step.
        this.pak(input.mousePressX, input.mousePressY);
      }
    }

    if (this.sleept && input.mouseReleased) {
      this.sleept = false;
      const ver = Math.abs(input.mouseX - input.mousePressX) > SLEEPDREMPEL
        || Math.abs(input.mouseY - input.mousePressY) > SLEEPDREMPEL;
      // Let go where it was picked up is a click, and the piece stays in
      // hand. Let go somewhere else is a drag, and this is the drop.
      if (ver && this.vast) {
        const doel = this.landing(input.mouseX, input.mouseY);
        if (!doel) this.vast = null;
        else if (this.past(doel)) this.zet(doel);
      }
    } else if (this.sleept && !input.mouseDown) {
      // The release went to another window. Do not wait for it.
      this.sleept = false;
    }
  }

  /** Pick up whatever is under the press: out of the trailer, or out of the tray. */
  private pak(mx: number, my: number): void {
    const opBord = this.bordOp(mx, my);
    if (opBord >= 0) {
      const p = this.plaatsingen[opBord]!;
      const px = this.pixelVan(p);
      this.plaatsingen.splice(opBord, 1);
      this.vast = { stuk: p.stuk, grijpX: mx - px.x, grijpY: my - px.y };
      this.sleept = true;
      return;
    }
    const uitLade = this.ladeOp(mx, my);
    if (uitLade >= 0) {
      // The tray is drawn smaller than the trailer, so there is no honest
      // grab point to keep. Hold it by the middle.
      const stuk = this.d.stukken[uitLade]!;
      this.vast = { stuk: uitLade, grijpX: (stuk.w * TILE) / 2, grijpY: (stuk.h * TILE) / 2 };
      this.sleept = true;
    }
  }

  private zet(p: Plaatsing): void {
    this.plaatsingen.push(p);
    this.vast = null;
    this.check();
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.d, this.plaatsingen)) {
      this.won = true;
      this.wonAt = this.time;
      const loos = lozeCellen(this.d, this.plaatsingen).length;
      this.save.record(this.level.id, loos, this.sterren());
      return;
    }
    // Wiep speaks up once it is clearly a house and clearly not going to
    // tow: all of it in, or most of it. Before that the needle swinging about
    // is just what building looks like.
    const b = balans(this.d, this.plaatsingen);
    const scheef = b === 'neuszwaar' || b === 'staartzwaar';
    if (!this.gewaarschuwd && scheef && this.plaatsingen.length >= 5) {
      this.gewaarschuwd = true;
      this.uitleg = new Dialogue(this.level.uitBalans, 'WIEP');
    }
  }

  private sterren(): number {
    const loos = lozeCellen(this.d, this.plaatsingen).length;
    return stars(loos, this.level.par, balans(this.d, this.plaatsingen) === 'netjes');
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.MOSGROEN);
    this.drawTuin(screen);
    this.drawTrailer(screen);
    this.drawGeplaatst(screen);
    this.drawLijn(screen);
    this.drawMeter(screen);
    this.drawLade(screen, ctx);
    if (!this.won && !this.uitleg) this.drawInHand(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen, ctx);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /**
   * The garden, and behind it the house this game is actually about: one
   * half still brick, the other half down to the studs, a skip in front.
   * It is two years in. The thing in the foreground will take an afternoon.
   */
  private drawTuin(screen: Screen): void {
    // Grass, mown in stripes nobody has kept up.
    for (let y = 64; y < HEIGHT - BOTTOM_H; y += 12) {
      screen.ditherRect(0, y, WIDTH, 3, C.MOSGROEN, C.DONKERSALIE);
    }

    // The standing half: brick, a window, the roof still on.
    const hx = 232;
    const top = TOP_H + 6;
    const voet = 62;
    screen.fillRect(hx, top, WIDTH - hx, voet - top, C.TERRACOTTA);
    for (let y = top + 3; y < voet; y += 4) screen.fillRect(hx, y, WIDTH - hx, 1, C.DONKERROOD);
    screen.fillRect(hx - 4, top - 5, WIDTH - hx + 4, 5, C.STEEN);
    screen.fillRect(hx - 4, top - 1, WIDTH - hx + 4, 1, C.ROET);
    screen.fillRect(354, top + 6, 20, 16, C.KALK);
    screen.fillRect(356, top + 8, 16, 12, C.DIEPBLAUW);
    screen.fillRect(363, top + 8, 1, 12, C.KALK);

    // The other half: no wall, studs, a tarpaulin where the roof was.
    const sx = 160;
    screen.fillRect(sx, top, hx - sx, voet - top, C.ROET);
    for (let x = sx + 3; x < hx; x += 13) {
      screen.fillRect(x, top, 2, voet - top, C.HOUT);
      screen.fillRect(x, top, 1, voet - top, C.LICHTHOUT);
    }
    screen.fillRect(sx, top + 12, hx - sx, 2, C.HOUT);
    screen.ditherRect(sx - 2, top - 4, hx - sx - 2, 4, C.DIEPBLAUW, C.LUCHTBLAUW);
    // Where the brick stops it stops raggedly.
    for (let y = top; y < voet; y += 4) {
      screen.fillRect(hx - ((y >> 2) % 3) * 3 - 3, y, ((y >> 2) % 3) * 3 + 3, 4, C.TERRACOTTA);
    }

    // The skip, full.
    screen.fillRect(350, 60, 34, 12, C.OKER);
    screen.fillRect(350, 60, 34, 1, C.LICHTOKER);
    screen.fillRect(350, 71, 34, 1, C.DONKEROKER);
    screen.ditherRect(352, 56, 30, 4, C.ZANDGRIJS, C.ASGRIJS);
  }

  /**
   * The trailer in section: a wall of whatever was left over, on a chassis.
   * The cladding is art, not rules, but it is what the tuinhuis is made of
   * and that should be visible without anyone saying so: planks that do not
   * match, a patch of plasterboard, a window out of somebody's old kitchen.
   */
  private drawTrailer(screen: Screen): void {
    const w = this.bordW;
    const h = this.bordH;
    const vloer = BORD_Y + h;

    // Planks, each its own width and its own wood.
    const hout = [C.STEEN, C.DONKEROKER, C.STEEN, C.MAHONIE, C.DONKERSALIE, C.STEEN, C.DONKEROKER];
    let x = 0;
    let seed = 7;
    while (x < w) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const breed = Math.min(w - x, 5 + (seed % 6));
      screen.fillRect(BORD_X + x, BORD_Y, breed, h, hout[(seed >> 8) % hout.length]!);
      screen.fillRect(BORD_X + x, BORD_Y, 1, h, C.ROET);
      x += breed;
    }
    // Plasterboard where the planks ran out, screw heads and all.
    screen.fillRect(BORD_X + 60, BORD_Y + 36, 34, 26, C.ASGRIJS);
    screen.ditherRect(BORD_X + 61, BORD_Y + 37, 32, 24, C.ASGRIJS, C.STEEN);
    screen.fillRect(BORD_X + 63, BORD_Y + 39, 1, 1, C.ROET);
    screen.fillRect(BORD_X + 90, BORD_Y + 39, 1, 1, C.ROET);
    screen.fillRect(BORD_X + 63, BORD_Y + 58, 1, 1, C.ROET);
    screen.fillRect(BORD_X + 90, BORD_Y + 58, 1, 1, C.ROET);
    // The window, from somewhere else. It is part of the puzzle: nothing
    // may stand in front of it, so it is drawn where the rules have it.
    const raam = this.d.raam;
    const rx = BORD_X + raam.x * TILE;
    const ry = BORD_Y + (this.d.height - raam.y - raam.h) * TILE;
    const rw = raam.w * TILE;
    const rh = raam.h * TILE;
    screen.fillRect(rx + 1, ry + 1, rw - 2, rh - 2, C.KALK);
    screen.fillRect(rx + 3, ry + 3, rw - 6, rh - 6, C.DIEPBLAUW);
    screen.ditherRect(rx + 3, ry + 3, rw - 6, Math.floor((rh - 6) / 2), C.LUCHTBLAUW, C.DIEPBLAUW);
    screen.fillRect(rx + Math.floor(rw / 2) - 1, ry + 3, 2, rh - 6, C.KALK);
    screen.fillRect(rx + 3, ry + Math.floor(rh / 2), rw - 6, 1, C.KALK);
    // A sill, and a plant on it, because it is Wiep's.
    screen.fillRect(rx - 1, ry + rh - 2, rw + 2, 2, C.WIT);
    screen.fillRect(rx + 6, ry + rh - 7, 4, 5, C.TERRACOTTA);
    screen.fillRect(rx + 5, ry + rh - 11, 6, 4, C.MOSGROEN);
    screen.fillRect(rx + 7, ry + rh - 13, 2, 2, C.DONKERSALIE);

    // A dot on every half metre, so there is something to aim at.
    for (let gy = 1; gy < this.d.height; gy++) {
      for (let gx = 1; gx < this.d.width; gx++) {
        screen.fillRect(BORD_X + gx * TILE, BORD_Y + gy * TILE, 1, 1, C.ZANDGRIJS);
      }
    }

    // Dead air: shown, not forbidden.
    for (const cel of lozeCellen(this.d, this.plaatsingen)) {
      const cx = BORD_X + (cel % this.d.width) * TILE;
      const cy = BORD_Y + (this.d.height - 1 - Math.floor(cel / this.d.width)) * TILE;
      screen.ditherRect(cx + 1, cy + 1, TILE - 2, TILE - 2, C.ROET, C.DONKERROOD);
    }

    // End walls.
    screen.fillRect(BORD_X - 3, BORD_Y, 3, h, C.ROET);
    screen.fillRect(BORD_X + w, BORD_Y, 3, h, C.ROET);
    screen.fillRect(BORD_X - 2, BORD_Y, 1, h, C.ASGRIJS);
    screen.fillRect(BORD_X + w + 1, BORD_Y, 1, h, C.ASGRIJS);

    // Chassis: a steel beam, the towbar out front, the axle where it is.
    screen.fillRect(BORD_X - 4, vloer, w + 8, 7, C.ROET);
    screen.fillRect(BORD_X - 4, vloer, w + 8, 1, C.ASGRIJS);
    screen.fillRect(BORD_X - 4, vloer + 6, w + 8, 1, C.ZWART);
    screen.fillRect(BORD_X - 30, vloer + 2, 26, 3, C.ROET);
    screen.fillRect(BORD_X - 30, vloer + 2, 26, 1, C.ASGRIJS);
    screen.fillEllipse(BORD_X - 31, vloer + 3, 2, 2, C.ZANDGRIJS);
    // Jockey wheel under the towbar, legs under the tail.
    screen.fillRect(BORD_X - 20, vloer + 5, 2, CHASSIS_H - 9, C.ASGRIJS);
    screen.fillEllipse(BORD_X - 19, vloer + CHASSIS_H - 3, 2, 2, C.ZWART);
    screen.fillRect(BORD_X + w - 6, vloer + 7, 2, CHASSIS_H - 8, C.ASGRIJS);
    screen.fillRect(BORD_X + w - 8, vloer + CHASSIS_H - 1, 6, 1, C.ASGRIJS);

    const asX = BORD_X + Math.round(this.d.as * TILE);
    const wielY = vloer + CHASSIS_H - 10;
    screen.fillRect(asX - 13, vloer + 7, 26, 3, C.ROET);
    screen.fillEllipse(asX, wielY, 9, 9, C.ZWART);
    screen.fillEllipse(asX, wielY, 5, 5, C.ASGRIJS);
    screen.fillEllipse(asX, wielY, 2, 2, C.ROET);

    // The ground it stands on.
    screen.fillRect(BORD_X - 36, vloer + CHASSIS_H, w + 48, 1, C.DONKERSALIE);
  }

  private drawGeplaatst(screen: Screen): void {
    const fout = new Set(faults(this.d, this.plaatsingen).map((f) => f.stuk));
    const knipper = Math.floor(this.time * 3) % 2 === 0;
    for (const p of this.plaatsingen) {
      const stuk = this.d.stukken[p.stuk]!;
      const px = this.pixelVan(p);
      drawStuk(screen, stuk, px.x, px.y, TILE);
      if (fout.has(p.stuk) && !this.won) {
        screen.strokeRect(px.x, px.y, stuk.w * TILE, stuk.h * TILE, knipper ? C.ROESTROOD : C.DONKERROOD);
      }
    }
  }

  /** Four metres. Not a rule somebody made up: a viaduct. */
  private drawLijn(screen: Screen): void {
    const y = BORD_Y - 1;
    const x0 = BORD_X - 36;
    const x1 = BORD_X + this.bordW + 10;
    for (let x = x0; x < x1; x += 6) screen.fillRect(x, y, 4, 1, C.ROESTROOD);
    screen.textShadow('4,00 M', x0, y - 9, C.ROESTROOD, C.ZWART);
  }

  /**
   * The kogeldrukmeter: a strip under the trailer at the trailer's own
   * scale, so the needle hangs straight under the centre of mass and the
   * green straight under the axle. Move a piece and you watch your own
   * mistake move.
   */
  private drawMeter(screen: Screen): void {
    const w = this.bordW;
    const asX = BORD_X + Math.round(this.d.as * TILE);
    const band = Math.round(this.d.band * TILE);
    const net = Math.round((this.d.band / 2) * TILE);

    screen.fillRect(BORD_X - 4, METER_Y - 7, w + 8, 26, C.ZWART);
    screen.strokeRect(BORD_X - 4, METER_Y - 7, w + 8, 26, C.STEEN);
    screen.fillRect(BORD_X, METER_Y, w, METER_H, C.DONKERROOD);
    screen.fillRect(asX - band, METER_Y, band * 2 + 1, METER_H, C.DONKERSALIE);
    screen.fillRect(asX - net, METER_Y, net * 2 + 1, METER_H, C.SALIE);
    // A tick every metre.
    for (let m = 0; m <= this.d.width; m += 2) {
      screen.fillRect(Math.min(BORD_X + w - 1, BORD_X + m * TILE), METER_Y + METER_H, 1, 2, C.ASGRIJS);
    }
    screen.textCentered('AS', asX + 1, METER_Y + METER_H + 4, C.SALIE);
    screen.text('NEUS', BORD_X, METER_Y + METER_H + 4, C.STEEN);
    screen.text('STAART', BORD_X + w - 36, METER_Y + METER_H + 4, C.STEEN);

    const b = balans(this.d, this.plaatsingen);
    const z = zwaartepunt(this.d, this.plaatsingen);
    const tekst: Record<typeof b, string> = {
      leeg: 'LEEG',
      netjes: 'NETJES',
      net: 'NET AAN',
      neuszwaar: 'NEUSZWAAR',
      staartzwaar: 'STAARTZWAAR',
    };
    const kleur = b === 'netjes' ? C.SALIE : b === 'net' ? C.BOTERGEEL : b === 'leeg' ? C.ASGRIJS : C.ROESTROOD;
    // The reading in words, in its own box under the tray: text straight on
    // the grass is text nobody reads.
    screen.fillRect(LADE_X, METER_Y - 7, LADE_W, 26, C.ZWART);
    screen.strokeRect(LADE_X, METER_Y - 7, LADE_W, 26, C.STEEN);
    screen.text('KOGELDRUK', LADE_X + 4, METER_Y - 3, C.ASGRIJS);
    screen.text(tekst[b], LADE_X + 4, METER_Y + 8, kleur);

    if (z !== null) {
      const nx = Math.max(BORD_X, Math.min(BORD_X + w - 1, BORD_X + Math.round(z * TILE)));
      const naald = b === 'neuszwaar' || b === 'staartzwaar' ? C.ROESTROOD : C.WIT;
      screen.fillRect(nx, METER_Y - 1, 1, METER_H + 2, naald);
      for (let i = 0; i < 4; i++) screen.fillRect(nx - i, METER_Y - 2 - i, i * 2 + 1, 1, naald);
    }
  }

  private drawLade(screen: Screen, ctx: SceneContext): void {
    screen.fillRect(LADE_X, LADE_Y, LADE_W, LADE_H, C.ZWART);
    screen.strokeRect(LADE_X, LADE_Y, LADE_W, LADE_H, C.STEEN);
    screen.text('LADE', LADE_X + 4, LADE_Y + 4, C.ASGRIJS);
    const over = this.vast || this.won || this.uitleg ? -1 : this.ladeOp(ctx.input.mouseX, ctx.input.mouseY);
    this.d.stukken.forEach((stuk, i) => {
      const r = this.ladeRect(i);
      if (!this.inLade(i)) {
        // The place it came from, kept open.
        screen.ditherRect(r.x, r.y, r.w, r.h, C.ZWART, C.ROET);
        return;
      }
      drawStuk(screen, stuk, r.x, r.y, LADE_TILE);
      if (i === over) screen.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2, C.WIT);
      // What it weighs, under it: the one number this level is about.
      screen.text(String(stuk.kg), r.x, r.y + r.h + 2, i === over ? C.WIT : C.ASGRIJS);
    });
  }

  private drawInHand(screen: Screen, ctx: SceneContext): void {
    if (!this.vast) return;
    const stuk = this.d.stukken[this.vast.stuk]!;
    const doel = this.landing(ctx.input.mouseX, ctx.input.mouseY);
    if (doel) {
      const px = this.pixelVan(doel);
      drawStuk(screen, stuk, px.x, px.y, TILE);
      screen.strokeRect(px.x, px.y, stuk.w * TILE, stuk.h * TILE, this.past(doel) ? C.WIT : C.ROESTROOD);
    } else {
      drawStuk(screen, stuk,
        Math.round(ctx.input.mouseX - this.vast.grijpX), Math.round(ctx.input.mouseY - this.vast.grijpY), TILE);
    }
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, C.BOTERGEEL);
    const loos = lozeCellen(this.d, this.plaatsingen).length;
    const label = `LOOS ${String(loos).padStart(2, '0')}   PAR ${String(this.level.par).padStart(2, '0')}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, loos > this.level.par ? C.ROESTROOD : C.SALIE);
  }

  /** The one thing most worth saying about the section as it stands. */
  private melding(): { tekst: string; kleur: number } {
    const fouten = faults(this.d, this.plaatsingen);
    const naam = (f: Fault) => this.d.stukken[f.stuk]!.naam;
    const eerste = (kind: Fault['kind']) => fouten.find((f) => f.kind === kind);
    const rood = (tekst: string) => ({ tekst, kleur: C.ROESTROOD });

    const zweeft = eerste('zweeft');
    if (zweeft) return rood(`${naam(zweeft)} STAAT NERGENS OP`);
    const vloer = eerste('vloer');
    if (vloer) return rood(`${naam(vloer)} MOET OP DE VLOER`);
    const raam = eerste('raam');
    if (raam) return rood(`${naam(raam)} STAAT VOOR HET RAAM`);
    const erop = eerste('erop');
    if (erop) return rood(`OP DE BANK EN HET AANRECHT ZET JE NIKS`);
    const boven = eerste('boven');
    if (boven) return rood(`${naam(boven)} MOET ONDER HET DAK`);
    const trap = eerste('trap');
    if (trap) return rood(`${naam(trap)} KOMT NIET BIJ DE VLIERING`);
    const badkamer = eerste('badkamer');
    if (badkamer) return rood('DOUCHE EN WC HOREN NAAST ELKAAR');
    const b = balans(this.d, this.plaatsingen);
    if (b === 'neuszwaar') return rood('TE VEEL GEWICHT OP DE NEUS');
    if (b === 'staartzwaar') return rood('TE VEEL GEWICHT ACHTER DE AS');
    const over = this.d.stukken.length - this.plaatsingen.length;
    if (over > 0) return { tekst: `NOG ${over} IN DE LADE`, kleur: C.KALK };
    return { tekst: 'HIJ STAAT', kleur: C.SALIE };
  }

  private drawBottomBar(screen: Screen, ctx: SceneContext): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const melding = this.melding();
    screen.text(melding.tekst, 6, y + 7, melding.kleur);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);

    // Whatever is in hand or under the pointer says what it is and what it
    // wants; otherwise the line is Wiep's brief.
    let wijst = this.vast ? this.vast.stuk : this.ladeOp(ctx.input.mouseX, ctx.input.mouseY);
    if (wijst < 0) {
      const opBord = this.bordOp(ctx.input.mouseX, ctx.input.mouseY);
      if (opBord >= 0) wijst = this.plaatsingen[opBord]!.stuk;
    }
    const stuk = wijst >= 0 ? this.d.stukken[wijst] : undefined;
    screen.text(stuk ? `${stuk.naam}  ${stuk.kg} KG  ${EIS_TEKST[stuk.eis]}` : this.level.praatje,
      6, y + 20, stuk ? C.KALK : C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  /** Finished, in an afternoon. That is the whole joke. */
  private drawWon(screen: Screen): void {
    const got = this.sterren();
    const w = 310;
    const h = 84;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.BOTERGEEL);
    screen.textCentered(this.level.afTitel, WIDTH / 2, y + 9, C.BOTERGEEL);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.fillRect(x + 6, y + 46, w - 12, 11, C.DONKERSALIE);
    screen.textCentered(this.level.afRegel, WIDTH / 2, y + 48, C.WIT);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 66, C.SALIE);
    }
  }
}

/**
 * One piece, in section, drawn as the thing it is. The same drawing serves
 * the tray and the trailer at two sizes, so everything is measured in
 * fractions of a cell: six identical grey rectangles is not a tiny house,
 * and neither is a tray of them that turn into something else when dropped.
 */
function drawStuk(screen: Screen, stuk: Stuk, x: number, y: number, t: number): void {
  const w = stuk.w * t;
  const h = stuk.h * t;
  /** A length in cells, as whole pixels, never less than one. */
  const u = (cellen: number) => Math.max(1, Math.round(cellen * t));
  const vak = (dx: number, dy: number, bw: number, bh: number, kleur: number) =>
    screen.fillRect(x + dx, y + dy, bw, bh, kleur);

  switch (stuk.soort) {
    case 'douche': {
      // A tiled cabin: the tray at the bottom with its drain, because the
      // drain is why this one has to stand on the floor.
      vak(0, 0, w, h, C.DIEPBLAUW);
      vak(1, 1, w - 2, h - 2, C.LUCHTBLAUW);
      for (let ty = u(0.5); ty < h - 2; ty += u(0.5)) vak(1, ty, w - 2, 1, C.LICHTSALIE);
      for (let tx = u(0.5); tx < w - 2; tx += u(0.5)) vak(tx, 1, 1, h - 2, C.LICHTSALIE);
      const bak = u(0.3);
      vak(1, h - 1 - bak, w - 2, bak, C.WIT);
      vak(Math.floor(w / 2) - 1, h - 1 - Math.max(1, bak - 1), 3, Math.max(1, bak - 1), C.DIEPBLAUW);
      // The pipe up the wall and the head over the middle.
      vak(w - 2 - u(0.2), u(0.4), u(0.15), h - u(1.4), C.ASGRIJS);
      vak(Math.floor(w / 2) - 1, u(0.4), w - Math.floor(w / 2) - u(0.2), u(0.15), C.ASGRIJS);
      vak(Math.floor(w / 2) - u(0.25), u(0.4) + u(0.15), u(0.5), u(0.15), C.ROET);
      for (let i = 0; i < 3; i++) {
        vak(Math.floor(w / 2) - u(0.2) + i * u(0.2), u(0.9) + (i % 2) * u(0.3), 1, u(0.2), C.WIT);
      }
      break;
    }
    case 'wc': {
      vak(0, 0, w, h, C.ASGRIJS);
      vak(1, 1, w - 2, h - 2, C.KALK);
      // A small high window, the way they always are.
      vak(u(0.5), u(0.5), w - u(1), u(0.6), C.ZANDGRIJS);
      vak(u(0.5) + 1, u(0.5) + 1, w - u(1) - 2, u(0.6) - 2, C.LUCHTBLAUW);
      // Cistern against the wall, bowl in front of it, both on the floor.
      const voet = h - 1;
      vak(2, voet - u(1.5), u(0.5), u(0.9), C.WIT);
      vak(2, voet - u(1.5), u(0.5), 1, C.ZANDGRIJS);
      vak(2 + u(0.5) - 1, voet - u(1.5), 1, u(0.9), C.ZANDGRIJS);
      vak(2, voet - u(0.75), u(1.3), u(0.25), C.WIT);
      vak(2, voet - u(0.75) - 1, u(1.3), 1, C.ASGRIJS);
      vak(2 + u(0.3), voet - u(0.5), u(0.7), u(0.5), C.WIT);
      vak(2 + u(0.3) + u(0.7), voet - u(0.5), 1, u(0.5), C.ZANDGRIJS);
      // The roll.
      vak(w - 2 - u(0.3), voet - u(1.5), u(0.3), u(0.3), C.WIT);
      vak(w - 2 - u(0.3), voet - u(1.5), 1, 1, C.ASGRIJS);
      break;
    }
    case 'keuken': {
      // Cupboards under a worktop, a strip of tiles behind the tap.
      vak(0, 0, w, h, C.ROET);
      const tegels = u(0.3);
      const blad = u(0.15);
      vak(1, 1, w - 2, tegels, C.KALK);
      vak(1, tegels, w - 2, blad, C.WIT);
      vak(1, tegels + blad, w - 2, h - 1 - tegels - blad, C.HOUT);
      vak(1, tegels + blad, w - 2, 1, C.STEEN);
      for (let deur = 1; deur < stuk.w; deur++) {
        vak(deur * t, tegels + blad + 1, 1, h - 2 - tegels - blad, C.MAHONIE);
        vak(deur * t - u(0.25), tegels + blad + u(0.4), 1, u(0.3), C.LICHTOKER);
      }
      // The sink, let into the worktop, and the tap over it.
      const spoel = 3 * t + u(0.2);
      vak(spoel, tegels, u(0.7), blad + u(0.35), C.ASGRIJS);
      vak(spoel + 1, tegels, u(0.7) - 2, blad + u(0.35) - 1, C.DIEPBLAUW);
      vak(spoel + u(0.3), 1, 1, tegels - 1, C.ASGRIJS);
      vak(spoel + u(0.3), 1, u(0.25), 1, C.ASGRIJS);
      // The hob at the other end, one ring on, and the oven under it.
      vak(u(0.3), tegels - 1, u(1), 1, C.ROET);
      vak(u(0.5), tegels - 1, u(0.2), 1, C.ROESTROOD);
      vak(u(0.2), tegels + blad + u(0.35), u(0.7), h - 2 - tegels - blad - u(0.5), C.ROET);
      vak(u(0.2) + 1, tegels + blad + u(0.35) + 1, u(0.7) - 2, Math.max(1, h - 4 - tegels - blad - u(0.5)), C.STEEN);
      break;
    }
    case 'techniek': {
      // The heaviest metre in the house: a boiler, the batteries, the board.
      vak(0, 0, w, h, C.ROET);
      vak(1, 1, w - 2, h - 2, C.ASGRIJS);
      const half = Math.floor(w / 2);
      vak(2, 2, half - 2, h - 4, C.KALK);
      vak(half - 1, 2, 1, h - 4, C.ZANDGRIJS);
      vak(2, 2, half - 2, 1, C.WIT);
      vak(3, h - 3 - u(0.3), half - 4, 1, C.ZANDGRIJS);
      // Hot out, cold in.
      vak(half, u(0.3), w - half - 2, 1, C.ROESTROOD);
      vak(half, u(0.3) + 2, w - half - 2, 1, C.LUCHTBLAUW);
      // Batteries on the floor, a row of lights.
      vak(half + 1, h - 2 - u(0.8), w - half - 3, u(0.8), C.ROET);
      vak(half + 1, h - 2 - u(0.8), w - half - 3, 1, C.ZWART);
      for (let i = 0; i * 2 + half + 2 < w - 3; i++) {
        vak(half + 2 + i * 2, h - 2 - u(0.5), 1, 1, i === 0 ? C.BOTERGEEL : C.SALIE);
      }
      vak(half + 1, u(0.3) + 4, w - half - 3, Math.max(1, h - 8 - u(0.3) - u(0.8)), C.ZANDGRIJS);
      vak(half + 2, u(0.3) + 5, 1, 1, C.LICHTOKER);
      break;
    }
    case 'bank': {
      // Seen from the front: back cushions, seat, an arm at each end.
      vak(0, 0, w, h, C.DONKERROOD);
      vak(1, 1, w - 2, h - 2, C.TERRACOTTA);
      const arm = u(0.35);
      const zit = Math.floor(h * 0.55);
      vak(1 + arm, 2, w - 2 - arm * 2, zit - 2, C.ROESTROOD);
      for (let i = 1; i < stuk.w; i++) vak(1 + arm + Math.round(((w - 2 - arm * 2) * i) / stuk.w), 2, 1, zit - 2, C.TERRACOTTA);
      vak(1 + arm, zit, w - 2 - arm * 2, 1, C.DONKERROOD);
      vak(1 + arm, zit + 1, w - 2 - arm * 2, 1, C.LICHTOKER);
      vak(1, u(0.6), arm, h - 1 - u(0.6), C.DONKERROOD);
      vak(w - 1 - arm, u(0.6), arm, h - 1 - u(0.6), C.DONKERROOD);
      // Feet, and the dark under it.
      vak(1 + arm, h - 1 - u(0.15), w - 2 - arm * 2, u(0.15), C.ZWART);
      vak(1, h - 1 - u(0.15), u(0.15), u(0.15), C.HOUT);
      vak(w - 1 - u(0.15), h - 1 - u(0.15), u(0.15), u(0.15), C.HOUT);
      break;
    }
    case 'kasttrap': {
      // Three cupboards, each a step higher than the last. Half the stairs
      // of every tiny house ever built.
      vak(0, 0, w, h, C.STEEN);
      screen.ditherRect(x + 1, y + 1, w - 2, h - 2, C.ROET, C.STEEN);
      const trede = Math.floor(h / 3);
      for (let i = 0; i < 3; i++) {
        const links = Math.round(((w - 2) * i) / 3) + 1;
        const boven = h - trede * (i + 1);
        vak(links, boven, w - 1 - links, trede * (i + 1) - 1, C.HOUT);
        vak(links, boven, w - 1 - links, 1, C.LICHTHOUT);
        vak(links, boven + 1, 1, trede * (i + 1) - 2, C.MAHONIE);
        if (i < 2) vak(links + Math.max(1, Math.floor((w - 2) / 6)), boven + Math.floor(trede / 2), u(0.15), 1, C.LICHTOKER);
      }
      vak(w - 1 - Math.max(1, Math.floor((w - 2) / 6)) - 1, h - Math.floor(trede * 1.5), u(0.15), 1, C.LICHTOKER);
      break;
    }
    case 'vliering': {
      // A deck, a mattress, a duvet, and a metre of air to sleep in.
      vak(0, 0, w, h, C.DONKEROKER);
      vak(1, 1, w - 2, h - 2, C.ROET);
      const dek = u(0.25);
      const matras = u(0.3);
      vak(0, h - dek, w, dek, C.HOUT);
      vak(0, h - dek, w, 1, C.LICHTHOUT);
      vak(2, h - dek - matras, w - 4, matras, C.WIT);
      vak(2, h - dek - 1, w - 4, 1, C.KALK);
      const dekbed = u(0.45);
      const start = u(1.3);
      vak(start, h - dek - matras - dekbed, w - 3 - start, dekbed + 1, C.LICHTSALIE);
      screen.ditherRect(x + start + 1, y + h - dek - matras - dekbed + 1, w - 5 - start, dekbed - 1, C.LICHTSALIE, C.SALIE);
      vak(start, h - dek - matras - dekbed, w - 3 - start, 1, C.WIT);
      // The pillow, at the end the duvet does not reach.
      vak(3, h - dek - matras - u(0.3), u(0.9), u(0.3), C.WIT);
      vak(3, h - dek - matras - 1, u(0.9), 1, C.KALK);
      // A reading light.
      vak(2, u(0.3), 1, u(0.3), C.ASGRIJS);
      vak(2, u(0.3), u(0.25), 1, C.BOTERGEEL);
      break;
    }
    case 'berging': {
      // Shelves, and boxes that were never unpacked.
      vak(0, 0, w, h, C.ROET);
      vak(1, 1, w - 2, h - 2, C.MAHONIE);
      const plank = Math.floor(h / 2);
      vak(1, plank, w - 2, 1, C.ROET);
      const dozen = [C.OKER, C.LICHTOKER, C.OKER, C.ZANDGRIJS, C.OKER, C.SALIE];
      for (let rij = 0; rij < 2; rij++) {
        const bodem = rij === 0 ? plank : h - 1;
        for (let i = 0; i < 3; i++) {
          const hoog = plank - 2 - ((i + rij) % 2) * u(0.15);
          const bx = 2 + Math.round(((w - 4) * i) / 3);
          const bw = Math.round((w - 4) / 3) - 1;
          vak(bx, bodem - hoog, bw, hoog, dozen[rij * 3 + i]!);
          vak(bx, bodem - hoog + Math.floor(hoog / 3), bw, 1, C.DONKEROKER);
        }
      }
      break;
    }
  }
}
