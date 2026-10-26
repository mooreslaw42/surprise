import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  MERK, type MerkWaarde, type DingSoort,
  DING_NAMEN, aanwijzen, dingOp, geplaatst, index, isKlos, isSolved,
  scheveLijnen, stars, watMist, xy,
} from '../puzzles/klossen/model.ts';
import { volgende } from '../puzzles/klossen/solver.ts';
import type { KlosLevel } from '../puzzles/klossen/levels.ts';
import { openingCells } from '../puzzles/sloop/generate.ts';
import {
  layout, drawCeiling, drawFloor, drawWallGround, drawWindow, drawProps,
  type RoomLayout,
} from './room.ts';

const TOP_H = 16;
const BOTTOM_H = 30;
/** The masking tape Wouter wrote the detector readings on. */
const TAPE_H = 9;
const TAPE_W = 13;

/**
 * The wall, boarded over, with everything that has to hang on it already
 * pencilled in place. The klossen are behind the board and stay behind it:
 * all you ever see is a cross where you have ruled a square out and a hole
 * where you have drilled. A hole is a hole, so it does not come back out.
 */
export class KlosScene implements Scene {
  private readonly level: KlosLevel;
  private readonly save: Save;
  private readonly room: RoomLayout;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private merken: MerkWaarde[];
  /**
   * Every square drilled into thin air, counted once however often it is
   * patched and drilled again. The wall remembers; the puzzle forgives.
   */
  private readonly geboord = new Set<number>();
  private time = 0;
  /** When the last pointless click was, so the bar can say why. */
  private geweigerd = -9;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: KlosLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.merken = new Array(level.wand.width * level.wand.height).fill(MERK.ONBEKEND);
    this.uitleg = new Dialogue(level.uitleg);

    const w = level.wand;
    this.room = layout(TOP_H, BOTTOM_H, HEIGHT);
    this.tile = Math.max(8, Math.min(
      Math.floor((this.room.wallH - TAPE_H) / w.height),
      Math.floor((WIDTH - 24 - TAPE_W) / w.width),
    ));
    this.originX = Math.max(TAPE_W + 2, Math.round((WIDTH - w.width * this.tile) / 2));
    this.originY = this.room.floorY - w.height * this.tile;
  }

  private celAt(ctx: SceneContext): number {
    const w = this.level.wand;
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver || x < 0 || y < 0 || x >= w.width || y >= w.height) return -1;
    return index(w, x, y);
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.uitleg) {
      if (this.uitleg.update(dt, ctx)) this.uitleg = null;
      return;
    }
    if (this.won) {
      if (this.time - this.wonAt > 0.5 && ctx.input.confirmed()) ctx.pop();
      return;
    }
    if (ctx.input.justPressed('Escape')) ctx.pop();
    if (ctx.input.justPressed('KeyU')) { this.uitleg = new Dialogue(this.level.uitleg); return; }
    if (ctx.input.justPressed('KeyR')) {
      this.merken = new Array(this.level.wand.width * this.level.wand.height).fill(MERK.ONBEKEND);
      this.geboord.clear();
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      const hint = volgende(this.level.wand, this.merken);
      if (hint) this.merken[hint.at] = hint.merk;
      this.check();
      return;
    }

    const i = this.celAt(ctx);
    if (i < 0 || !ctx.input.mouseClicked) return;
    // No drilling into a window or into the thing you are trying to hang:
    // there is nothing there to find, so the click is a slip, not a move.
    if (this.level.wand.blok[i] || dingOp(this.level.wand, i)) {
      this.geweigerd = this.time;
      return;
    }
    // Kruis, dan boren, dan weer dicht. A hole in the wrong place still
    // counts against you, but it may be filled: one misclick used to leave
    // the wall permanently wrong with nothing on screen saying why.
    const was = this.merken[i]!;
    this.merken[i] = was === MERK.ONBEKEND ? MERK.LEEG
      : was === MERK.LEEG ? MERK.KLOS
      : MERK.ONBEKEND;
    if (this.merken[i] === MERK.KLOS && !isKlos(this.level.wand, i)) this.geboord.add(i);
    this.check();
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.wand, this.merken)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.geboord.size, stars(this.geboord.size));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    const over = this.celAt(ctx);
    screen.clear(C.ZWART);
    drawCeiling(screen, this.room);
    drawWallGround(screen, this.room, this.level.surface.afwerking);
    this.drawBoard(screen);
    this.drawOpeningen(screen);
    this.drawDingen(screen);
    this.drawMerken(screen, over);
    drawFloor(screen, this.room, 'ondervloer');
    // Props first: the tape is the one thing on this wall that must stay
    // readable, and a bookcase standing in front of it is still a bookcase.
    drawProps(screen, this.room, this.level.surface.props,
      this.originX - TAPE_W, this.originX + this.level.wand.width * this.tile);
    this.drawTape(screen, over);
    this.drawTopBar(screen);
    this.drawBottomBar(screen, over);
    // A beat to see the klossen appear before the panel covers them up.
    if (this.won && this.time - this.wonAt > 1.2) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** Fresh plasterboard, in boards, with the joints showing before the filler. */
  private drawBoard(screen: Screen): void {
    const w = this.level.wand;
    const bw = w.width * this.tile;
    const bh = w.height * this.tile;
    screen.fillRect(this.originX, this.originY, bw, bh, C.KALK);
    // A board is 1.20 wide: the joints between them are taped and set, and
    // still show, which is the one thing that says this wall is closed up.
    const plaat = Math.max(3, Math.round(1.2 / 0.35));
    for (let x = plaat; x < w.width; x += plaat) {
      screen.fillRect(this.originX + x * this.tile - 2, this.originY, 4, bh, C.WIT);
    }
    // The squares, pencilled on. Without them there is nothing to count along.
    for (let x = 1; x < w.width; x++) {
      screen.fillRect(this.originX + x * this.tile, this.originY, 1, bh, C.ZANDGRIJS);
    }
    for (let y = 1; y < w.height; y++) {
      screen.fillRect(this.originX, this.originY + y * this.tile, bw, 1, C.ZANDGRIJS);
    }
    screen.strokeRect(this.originX - 1, this.originY - 1, bw + 2, bh + 2, C.ASGRIJS);
    screen.strokeRect(this.originX - 2, this.originY - 2, bw + 4, bh + 4, C.STEEN);
  }

  private drawOpeningen(screen: Screen): void {
    const band = {
      x: this.originX, y: this.originY,
      w: this.level.wand.width * this.tile, h: this.level.wand.height * this.tile,
    };
    for (const opening of this.level.surface.openings) {
      const cells = openingCells(this.level.surface, opening);
      if (!cells) continue;
      drawWindow(screen,
        this.originX + cells.c0 * this.tile, this.originY + cells.r0 * this.tile,
        (cells.c1 - cells.c0 + 1) * this.tile, (cells.r1 - cells.r0 + 1) * this.tile,
        opening.kind, band);
    }
  }

  private drawDingen(screen: Screen): void {
    for (const ding of this.level.wand.dingen) {
      const { x, y } = xy(this.level.wand, ding.at);
      drawDing(screen, ding.soort,
        this.originX + x * this.tile, this.originY + y * this.tile, this.tile, this.won);
    }
  }

  private drawMerken(screen: Screen, over: number): void {
    const w = this.level.wand;
    const t = this.tile;
    const fout = new Set(this.won ? [] : aanwijzen(w, this.merken));
    for (let i = 0; i < this.merken.length; i++) {
      const { x, y } = xy(w, i);
      const px = this.originX + x * t;
      const py = this.originY + y * t;

      if (this.won && isKlos(w, i)) {
        // Board off: there it was all along.
        screen.fillRect(px + 1, py + 1, t - 2, t - 2, C.HOUT);
        screen.fillRect(px + 1, py + 1, t - 2, 1, C.LICHTHOUT);
        screen.fillRect(px + 1, py + t - 2, t - 2, 1, C.ROET);
        screen.set(px + Math.floor(t / 2), py + Math.floor(t / 2), C.WIT);
        continue;
      }
      if (this.merken[i] === MERK.KLOS) {
        const raak = isKlos(w, i);
        screen.fillRect(px + 2, py + 2, t - 4, t - 4, raak ? C.HOUT : C.ZWART);
        screen.strokeRect(px + 2, py + 2, t - 4, t - 4, raak ? C.LICHTHOUT : C.ROESTROOD);
        if (raak) {
          // A screw, bitten in.
          const cx = px + Math.floor(t / 2);
          const cy = py + Math.floor(t / 2);
          screen.fillRect(cx - 2, cy, 5, 1, C.KALK);
          screen.fillRect(cx, cy - 2, 1, 5, C.KALK);
        }
      } else if (!this.won && this.merken[i] === MERK.LEEG && !w.blok[i] && !dingOp(w, i)) {
        screen.line(px + 3, py + 3, px + t - 4, py + t - 4, C.ASGRIJS);
        screen.line(px + t - 4, py + 3, px + 3, py + t - 4, C.ASGRIJS);
      }
      // Filled in, but you can still see where it was. You always can.
      if (!this.won && this.geboord.has(i) && this.merken[i] !== MERK.KLOS) {
        const cx = px + Math.floor(t / 2);
        const cy = py + Math.floor(t / 2);
        screen.fillRect(cx - 1, cy - 1, 3, 3, C.ZANDGRIJS);
        screen.set(cx, cy, C.STEEN);
      }
      if (i === over && !this.won) screen.strokeRect(px, py, t, t, C.WIT);
      // The squares the bar is complaining about, ringed so that "these two
      // are touching" means these two and not somewhere on this wall.
      if (!this.won && fout.has(i) && Math.floor(this.time * 3) % 2 === 0) {
        screen.strokeRect(px - 1, py - 1, t + 2, t + 2, C.ROESTROOD);
        screen.strokeRect(px, py, t, t, C.ROESTROOD);
      }
    }
  }

  /** The detector readings, written on tape along the top and down the side. */
  private drawTape(screen: Screen, over: number): void {
    const w = this.level.wand;
    const hx = over >= 0 ? over % w.width : -1;
    const hy = over >= 0 ? Math.floor(over / w.width) : -1;

    const tapeY = this.originY - TAPE_H;
    // Masking tape along the top and down the side, with the readings on it.
    screen.fillRect(this.originX - TAPE_W, tapeY, w.width * this.tile + TAPE_W + 1, TAPE_H - 1, C.BOTERGEEL);
    screen.fillRect(this.originX - TAPE_W, tapeY, w.width * this.tile + TAPE_W + 1, 1, C.LICHTOKER);
    screen.text('II', this.originX - TAPE_W + 2, tapeY + 1, C.ASGRIJS);
    const scheef = this.won
      ? { kolommen: [], rijen: [] }
      : scheveLijnen(w, this.merken);
    w.kolomTel.forEach((n, x) => {
      const klaar = this.telling((i) => i % w.width === x) === n;
      screen.text(String(n), this.originX + x * this.tile + Math.floor((this.tile - 5) / 2), tapeY + 1,
        x === hx || scheef.kolommen.includes(x) ? C.ROESTROOD : klaar ? C.DONKERSALIE : C.ROET);
    });

    screen.fillRect(this.originX - TAPE_W, this.originY - 1, TAPE_W - 1, w.height * this.tile + 2, C.BOTERGEEL);
    screen.fillRect(this.originX - TAPE_W, this.originY - 1, 1, w.height * this.tile + 2, C.LICHTOKER);
    w.rijTel.forEach((n, y) => {
      const klaar = this.telling((i) => Math.floor(i / w.width) === y) === n;
      screen.text(String(n), this.originX - TAPE_W + 4, this.originY + y * this.tile + Math.floor((this.tile - 5) / 2),
        y === hy || scheef.rijen.includes(y) ? C.ROESTROOD : klaar ? C.DONKERSALIE : C.ROET);
    });
  }

  private telling(waar: (i: number) => boolean): number {
    let n = 0;
    for (let i = 0; i < this.merken.length; i++) if (waar(i) && this.merken[i] === MERK.KLOS) n++;
    return n;
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(`${this.level.ruimte} - ${this.level.vlak}`, 6, 5, C.LICHTOKER);
    const w = this.level.wand;
    const raak = w.klossen.filter((i) => this.merken[i] === MERK.KLOS).length;
    const label = `KLOS ${raak}/${w.klossen.length}   GATEN ${this.geboord.size}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, this.geboord.size > 0 ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen, over: number): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const ding = over >= 0 ? dingOp(this.level.wand, over) : undefined;
    // While you are still filling the wall in, the count is progress. Once
    // every klos is placed and it is still not right, it is a complaint —
    // and that is the moment someone thinks the game is broken.
    const staan = geplaatst(this.merken).length;
    const mist = this.won || staan === 0 ? null : watMist(this.level.wand, this.merken);
    // Two klossen touching is broken now, not broken at the end.
    const klagend = mist !== null
      && (staan >= this.level.wand.dingen.length
        || aanwijzen(this.level.wand, this.merken).length > 0);
    const slip = this.time - this.geweigerd < 1.4 ? 'DAAR ZIT NIKS TE BOREN' : null;
    screen.text(
      slip ?? (ding ? DING_NAMEN[ding.soort] : mist ?? this.level.praatje), 6, y + 7,
      slip || klagend ? C.ROESTROOD : ding ? C.BOTERGEEL : mist ? C.KALK : C.ASGRIJS);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text('KLIK: KRUIS - BOREN - WEER DICHT', 6, y + 20, C.STEEN);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const got = stars(this.geboord.size);
    const w = 232;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('ALLES HANGT', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(this.geboord.size === 0 ? 'GEEN GAT TE VEEL' : `${this.geboord.size} GATEN GEVULD`,
      WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 60, C.SALIE);
    }
  }
}

/**
 * The things on the wall, pencilled on while the board was still bare. Each
 * one is drawn in its own square so you can see at a glance which way its
 * beugel can reach.
 */
function drawDing(screen: Screen, soort: DingSoort, px: number, py: number, t: number, op: boolean): void {
  const m = Math.max(1, Math.floor(t / 8));
  const x = px + m;
  const y = py + m;
  const s = t - m * 2;
  switch (soort) {
    case 'kastje':
      screen.fillRect(x, y, s, s, C.HOUT);
      screen.fillRect(x, y, s, 1, C.LICHTHOUT);
      screen.fillRect(x + Math.floor(s / 2), y, 1, s, C.ROET);
      screen.fillRect(x + Math.floor(s / 2) - 2, y + Math.floor(s / 2), 2, 1, C.KALK);
      screen.fillRect(x + Math.floor(s / 2) + 2, y + Math.floor(s / 2), 2, 1, C.KALK);
      break;
    case 'plank':
      screen.fillRect(x, y + Math.floor(s / 3), s, 2, C.LICHTHOUT);
      screen.fillRect(x, y + Math.floor(s / 3) + 2, s, 1, C.HOUT);
      screen.fillRect(x + 1, y + Math.floor(s / 3) + 3, 1, Math.floor(s / 3), C.STEEN);
      screen.fillRect(x + s - 2, y + Math.floor(s / 3) + 3, 1, Math.floor(s / 3), C.STEEN);
      break;
    case 'tvbeugel':
      screen.fillRect(x, y, s, s - 3, C.ZWART);
      screen.strokeRect(x, y, s, s - 3, C.ASGRIJS);
      screen.fillRect(x + 2, y + 2, s - 4, s - 7, C.DIEPBLAUW);
      screen.fillRect(x + Math.floor(s / 2) - 2, y + s - 3, 5, 2, C.ASGRIJS);
      break;
    case 'radiator':
      screen.fillRect(x, y + 1, s, s - 2, C.KALK);
      for (let i = 1; i < s - 1; i += 3) screen.fillRect(x + i, y + 2, 1, s - 4, C.ZANDGRIJS);
      screen.fillRect(x, y + 1, s, 1, C.WIT);
      screen.fillRect(x, y + s - 2, s, 1, C.STEEN);
      break;
    case 'kapstok':
      screen.fillRect(x, y + Math.floor(s / 3), s, 2, C.STEEN);
      for (let i = 1; i < s - 1; i += 4) {
        screen.fillRect(x + i, y + Math.floor(s / 3) + 2, 1, 3, C.ASGRIJS);
      }
      break;
    case 'wandlamp':
      screen.fillRect(x + 1, y + 1, s - 2, 3, C.ASGRIJS);
      screen.fillRect(x + 2, y + 4, s - 4, 1, op ? C.BOTERGEEL : C.STEEN);
      if (op) screen.ditherRect(x + 1, y + 5, s - 2, s - 6, C.BOTERGEEL, C.ZANDGRIJS);
      break;
  }
}
