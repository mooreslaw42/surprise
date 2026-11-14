import { BAAS } from '../data/liedjes.ts';
import { PLATTEGROND, binnenshuis } from '../data/plattegrond.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import { solve as elektraSolve } from '../puzzles/elektra/solver.ts';
import { LEEG, RICHTINGEN, draai } from '../puzzles/kanalen/model.ts';
import { KLOS_LEVELS } from '../puzzles/klossen/levels.ts';
import { WANDEN, maakBaas, reken, zaadVan, type Werk } from '../puzzles/oplevering/baas.ts';
import {
  BREEDTE, HOOGTE, SCHACHTEN,
  type Baasbord, type Stand, type Weigering,
  begin, bereikt, doorVerf, gebreken, isSolved, kamerVan, magSchacht, roostersAan, stars,
} from '../puzzles/oplevering/model.ts';
import { Dialogue } from './dialogue.ts';

export const OPLEVERING_ID = 'oplevering';

export const UITLEG = [
  'DE UNIT IS ER.',
  'NIET \'ONDERWEG\'. NIET \'VOLGENDE WEEK\'. ER.',
  'ALLES IN EEN KEER: ONDER DE VLOER NAAR DE KAMER, DE SCHACHT IN, BOVEN HET PLAFOND NAAR DE ROOSTERS.',
  'DRAAIEN KEN JE. NIEUW: DRUK OP X EN ZET EEN SCHACHT TEGEN EEN BINNENMUUR. ELKE KAMER HEEFT ER EEN NODIG, EN JE HEBT ER DRIE.',
  'EEN SCHACHT KAN ALLEEN WAAR OP ALLEBEI DE TEKENINGEN EEN KANAAL LIGT. EN NIET WAAR JE ZELF AL IETS IN DE MUUR HEBT GESTOPT. KIES ZE GOED.',
];

/** Said once, in full, by Pim, the first time a schacht lands on his own cable. */
export const EIGEN_LEIDING = ['DAAR ZIT JE EIGEN LEIDING.'];

export const WEIGERING: Record<Weigering, string> = {
  kabel: 'DAAR LOOPT JE EIGEN KABEL.',
  klos: 'DAAR ZIT EEN KLOS. DIE HEB JE ZELF GEVONDEN.',
  geen: 'EEN SCHACHT MOET TEGEN EEN BINNENMUUR.',
  leeg: 'HIER LIGT NIET OP ALLEBEI DE TEKENINGEN EEN KANAAL.',
  rooster: 'DAAR ZIT EEN ROOSTER.',
  vol: 'DRIE SCHACHTEN. MEER HEB JE ER NIET.',
};

const TOP_H = 16;
const BOTTOM_H = 30;
const TILE = 16;
const PLAN_W = BREEDTE * TILE;
const PLAN_H = HOOGTE * TILE;
const PLAN_Y = 40;
const PLAN_X = [20, WIDTH - 20 - PLAN_W] as const;
const KOP = ['ONDER DE VLOER', 'BOVEN HET PLAFOND'] as const;

/**
 * What is already in the four inside walls, read back out of the save.
 *
 * The cables are his: the routes Elektra wrote down when he finished the
 * wall. A save from before that was kept, or a wall he was let past, falls
 * back on the routes the solver would lay — nobody notices, except that it
 * is not his route. The klossen never needed saving. Each wall has exactly
 * one answer, so where they are is level data.
 */
export function werkUit(save: Save): Werk {
  const werk: Werk = {};
  for (const wand of WANDEN) {
    const elektra = ELEKTRA_LEVELS.find((l) => l.id === `elektra-${wand.surface}`);
    const klossen = KLOS_LEVELS.find((l) => l.surface.id === wand.surface);
    let kabel: number[] = [];
    let breedte = elektra?.board.width ?? klossen?.wand.width ?? 0;
    if (elektra) {
      const eigen = save.get(elektra.id)?.draden;
      if (eigen) {
        kabel = eigen.flat().map((i) => i % elektra.board.width);
      } else {
        try {
          kabel = elektraSolve(elektra.board).routes.flat().map((p) => p.x);
        } catch {
          kabel = [];
        }
      }
    }
    // Klossen sit on a wall of their own width; bring them onto this one.
    const klos = klossen
      ? klossen.wand.klossen.map((i) => Math.floor(((i % klossen.wand.width) * breedte) / klossen.wand.width))
      : [];
    if (breedte === 0) breedte = 1;
    werk[wand.surface] = { breedte, kabel, klos };
  }
  return werk;
}

/**
 * The last level. Two drawings of the same house, side by side, and three
 * schachten to join them. See puzzles/oplevering/model.ts for why.
 */
export class OpleveringScene implements Scene {
  readonly muziek = BAAS;

  private readonly save: Save;
  private readonly bord: Baasbord;
  private readonly par: number;

  private stand: Stand;
  private draaien = 0;
  private time = 0;
  private won = false;
  private wonAt = 0;
  /** X: the next click sites a schacht instead of turning a piece. */
  private schachtStand = false;
  private melding = '';
  private meldingTot = -1;
  private eigenLeidingGezegd = false;
  private uitleg: Dialogue | null;

  constructor(save: Save, werk: Werk = werkUit(save)) {
    this.save = save;
    this.bord = maakBaas(werk, zaadVan(werk));
    this.par = reken(this.bord, this.bord.vloer, this.bord.plafond).par;
    this.stand = begin(this.bord);
    this.uitleg = new Dialogue(UITLEG);
  }

  /** Which drawing and which cell the pointer is on, if any. */
  private onder(ctx: SceneContext): { laag: number; cel: number } | null {
    if (!ctx.input.mouseOver) return null;
    for (let laag = 0; laag < 2; laag++) {
      const x = Math.floor((ctx.input.mouseX - PLAN_X[laag]!) / TILE);
      const y = Math.floor((ctx.input.mouseY - PLAN_Y) / TILE);
      if (x >= 0 && y >= 0 && x < BREEDTE && y < HOOGTE) return { laag, cel: y * BREEDTE + x };
    }
    return null;
  }

  private zeg(tekst: string): void {
    this.melding = tekst;
    this.meldingTot = this.time + 3.5;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.uitleg) {
      if (this.uitleg.update(dt, ctx)) this.uitleg = null;
      return;
    }
    if (this.won) {
      if (this.time - this.wonAt > 1 && ctx.input.confirmed()) ctx.pop();
      return;
    }
    if (ctx.input.justPressed('Escape')) { ctx.pop(); return; }
    if (ctx.input.justPressed('KeyU')) { this.uitleg = new Dialogue(UITLEG); return; }
    if (ctx.input.justPressed('KeyR')) {
      this.stand = begin(this.bord);
      this.draaien = 0;
      this.schachtStand = false;
      return;
    }
    if (ctx.input.justPressed('KeyX')) this.schachtStand = !this.schachtStand;
    if (ctx.input.justPressed('KeyH')) { this.hint(); this.check(ctx); return; }

    if (!ctx.input.mouseClicked) return;
    const plek = this.onder(ctx);
    if (!plek) return;

    const shift = ctx.input.isDown('ShiftLeft') || ctx.input.isDown('ShiftRight');
    if (this.schachtStand || shift) {
      this.zetSchacht(plek.cel, ctx);
    } else {
      const masks = plek.laag === 0 ? this.stand.vloer : this.stand.plafond;
      if (masks[plek.cel] === LEEG) return;
      masks[plek.cel] = draai(masks[plek.cel]!, ctx.input.mouseRechts ? 3 : 1);
      this.draaien++;
    }
    this.check(ctx);
  }

  private zetSchacht(cel: number, ctx: SceneContext): void {
    const staat = this.stand.schachten.indexOf(cel);
    if (staat >= 0) {
      this.stand.schachten.splice(staat, 1);
      return;
    }
    const nee = magSchacht(this.bord, this.stand, cel);
    if (nee === null) {
      this.stand.schachten.push(cel);
      this.schachtStand = false;
      ctx.geluid?.('tik');
      if (doorVerf(this.bord, this.stand) && this.bord.kandidaten.find((k) => k.cel === cel)?.geschilderd) {
        this.zeg('DWARS DOOR DE VERSE OKER. DAT KOST EEN STER.');
      }
      return;
    }
    ctx.geluid?.('fout');
    // Said in full once, by Pim, and after that it is only a line of text.
    if (nee === 'kabel' && !this.eigenLeidingGezegd) {
      this.eigenLeidingGezegd = true;
      this.uitleg = new Dialogue(EIGEN_LEIDING);
      return;
    }
    this.zeg(WEIGERING[nee]);
  }

  /**
   * The next schacht that is missing, and once all three rooms have one, the
   * next piece that is turned wrong.
   */
  private hint(): void {
    for (let kamer = 0; kamer < PLATTEGROND.ruimtes.length; kamer++) {
      if (this.stand.schachten.some((c) => kamerVan(c) === kamer)) continue;
      if (this.stand.schachten.length >= SCHACHTEN) {
        // Three placed and a room without: one of them is a second in a room.
        const dubbel = this.stand.schachten.findIndex(
          (c, i) => this.stand.schachten.findIndex((d) => kamerVan(d) === kamerVan(c)) !== i,
        );
        this.stand.schachten.splice(Math.max(0, dubbel), 1);
      }
      this.stand.schachten.push(this.bord.oplossing.schachten[kamer]!);
      return;
    }
    const goed = reken(this.bord, this.stand.vloer, this.stand.plafond);
    for (const [masks, doel] of [[this.stand.vloer, goed.vloer], [this.stand.plafond, goed.plafond]] as const) {
      const i = masks.findIndex((m, k) => m !== doel[k]);
      if (i >= 0) {
        masks[i] = draai(masks[i]!, 1);
        this.draaien++;
        return;
      }
    }
  }

  private check(_ctx: SceneContext): void {
    if (this.won || !isSolved(this.bord, this.stand)) return;
    this.won = true;
    this.wonAt = this.time;
    this.save.record(OPLEVERING_ID, this.draaien, stars(this.draaien, this.par, doorVerf(this.bord, this.stand)));
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ZWART);
    const lucht = bereikt(this.bord, this.stand);
    const mis = gebreken(this.bord, this.stand);

    for (let laag = 0; laag < 2; laag++) {
      const ox = PLAN_X[laag]!;
      this.drawPapier(screen, ox, laag);
      this.drawKanalen(screen, ox,
        laag === 0 ? this.stand.vloer : this.stand.plafond,
        laag === 0 ? lucht.vloer : lucht.plafond,
        new Set(laag === 0 ? mis.lekVloer : mis.lekPlafond), laag);
      this.drawMuurwerk(screen, ox);
      this.drawSchachten(screen, ox, laag);
    }
    if (!this.won && !this.uitleg) this.drawWijzer(screen, ctx);
    this.drawTussen(screen);
    this.drawTopBar(screen);
    this.drawBottomBar(screen, mis.lekVloer.length + mis.lekPlafond.length);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** Blueprint paper with the house on it, the same sheet twice. */
  private drawPapier(screen: Screen, ox: number, laag: number): void {
    screen.fillRect(ox - 5, PLAN_Y - 5, PLAN_W + 10, PLAN_H + 10, C.DIEPBLAUW);
    screen.strokeRect(ox - 5, PLAN_Y - 5, PLAN_W + 10, PLAN_H + 10, C.LUCHTBLAUW);
    screen.textCentered(KOP[laag]!, ox + PLAN_W / 2, PLAN_Y - 16, laag === 0 ? C.LICHTHOUT : C.LICHTSALIE);

    for (let y = 0; y < HOOGTE; y++) {
      for (let x = 0; x < BREEDTE; x++) {
        if (!binnenshuis(x, y)) continue;
        const px = ox + x * TILE;
        const py = PLAN_Y + y * TILE;
        screen.fillRect(px, py, TILE, 1, C.ASGRIJS);
        screen.fillRect(px, py, 1, TILE, C.ASGRIJS);
        if (!binnenshuis(x, y - 1)) screen.fillRect(px, py - 1, TILE, 2, C.WIT);
        if (!binnenshuis(x, y + 1)) screen.fillRect(px, py + TILE - 1, TILE, 2, C.WIT);
        if (!binnenshuis(x - 1, y)) screen.fillRect(px - 1, py, 2, TILE, C.WIT);
        if (!binnenshuis(x + 1, y)) screen.fillRect(px + TILE - 1, py, 2, TILE, C.WIT);
      }
    }
    for (const ruimte of PLATTEGROND.ruimtes) {
      screen.strokeRect(ox + ruimte.x * TILE, PLAN_Y + ruimte.y * TILE,
        ruimte.w * TILE, ruimte.h * TILE, C.LUCHTBLAUW);
    }
    // The corner of the sheet that is not house: say whose room is whose
    // there, once, rather than over the duct.
    if (laag === 0) {
      screen.text('WOONK.', ox + 2, PLAN_Y + 4 * TILE + 5, C.LUCHTBLAUW);
      screen.text('KEUKEN: BOVEN', ox + 2, PLAN_Y + 4 * TILE + 14, C.LUCHTBLAUW);
      screen.text('TV: RECHTSONDER', ox - 4, PLAN_Y + 4 * TILE + 23, C.LUCHTBLAUW);
    } else {
      screen.text('GEEN KANAAL', ox + 2, PLAN_Y + 4 * TILE + 6, C.ASGRIJS);
      screen.text('DOOR EEN MUUR', ox, PLAN_Y + 4 * TILE + 15, C.ASGRIJS);
    }
  }

  private drawKanalen(
    screen: Screen, ox: number, masks: readonly number[],
    live: readonly boolean[], lek: ReadonlySet<number>, laag: number,
  ): void {
    const mid = Math.floor(TILE / 2);
    const thick = 4;
    const off = mid - Math.floor(thick / 2);
    for (let i = 0; i < masks.length; i++) {
      const mask = masks[i]!;
      if (mask === LEEG) continue;
      const x = ox + (i % BREEDTE) * TILE;
      const y = PLAN_Y + Math.floor(i / BREEDTE) * TILE;
      const kleur = live[i] ? C.SALIE : C.ZANDGRIJS;
      const rand = live[i] ? C.DONKERSALIE : C.ASGRIJS;

      for (const r of RICHTINGEN) {
        if (!(mask & r.bit)) continue;
        if (r.dx === 0) {
          const top = r.dy < 0 ? y : y + mid;
          screen.fillRect(x + off, top, thick, mid + 1, kleur);
          screen.fillRect(x + off, top, 1, mid + 1, rand);
        } else {
          const left = r.dx < 0 ? x : x + mid;
          screen.fillRect(left, y + off, mid + 1, thick, kleur);
          screen.fillRect(left, y + off, mid + 1, 1, rand);
        }
      }
      screen.fillRect(x + off - 1, y + off - 1, thick + 2, thick + 2, kleur);
      screen.strokeRect(x + off - 1, y + off - 1, thick + 2, thick + 2, rand);

      if (laag === 0 && i === this.bord.wtw) {
        screen.fillRect(x + 2, y + 2, TILE - 4, TILE - 4, C.ASGRIJS);
        screen.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4, C.WIT);
        // It stands still until the whole system is right. Then it turns,
        // which is the only thing this game has been about.
        const spin = this.won && Math.floor(this.time * 8) % 2 === 0;
        screen.fillRect(x + mid - 4, y + mid - (spin ? 0 : 1), 9, 2, this.won ? C.MAGENTA : C.ROET);
        screen.fillRect(x + mid - (spin ? 1 : 0), y + mid - 4, 2, 9, this.won ? C.MAGENTA : C.ROET);
      } else if (laag === 1 && this.bord.roosters.includes(i)) {
        screen.fillRect(x + mid - 4, y + mid - 4, 9, 9, live[i] ? C.BOTERGEEL : C.ZANDGRIJS);
        screen.strokeRect(x + mid - 4, y + mid - 4, 9, 9, C.ROET);
        for (let g = -2; g <= 2; g += 2) screen.fillRect(x + mid - 3, y + mid + g, 7, 1, C.ROET);
      }
      if (lek.has(i)) screen.fillRect(x + 1, y + 1, 2, 2, C.ROESTROOD);
    }
  }

  /**
   * What he put in the inside walls, on both sheets: a stroke of cable in
   * Elektra's own colour, a block of timber for a klos, a lick of ochre on
   * the painted wall. Always on show, so the wall says no before he asks.
   */
  private drawMuurwerk(screen: Screen, ox: number): void {
    for (const k of this.bord.kandidaten) {
      const x = ox + (k.cel % BREEDTE) * TILE;
      const y = PLAN_Y + Math.floor(k.cel / BREEDTE) * TILE;
      if (k.bezet === 'kabel') {
        screen.fillRect(x + TILE - 6, y + 2, 4, 1, C.LICHTOKER);
        screen.fillRect(x + TILE - 5, y + 3, 1, 2, C.LICHTOKER);
        screen.fillRect(x + TILE - 5, y + 5, 3, 1, C.LICHTOKER);
      } else if (k.bezet === 'klos') {
        screen.fillRect(x + TILE - 6, y + 2, 4, 4, C.HOUT);
        screen.strokeRect(x + TILE - 6, y + 2, 4, 4, C.LICHTHOUT);
      } else if (k.geschilderd) {
        screen.fillRect(x + TILE - 6, y + 2, 4, 2, C.OKER);
      }
    }
  }

  private drawSchachten(screen: Screen, ox: number, laag: number): void {
    const mid = Math.floor(TILE / 2);
    for (const cel of this.stand.schachten) {
      const x = ox + (cel % BREEDTE) * TILE + mid;
      const y = PLAN_Y + Math.floor(cel / BREEDTE) * TILE + mid;
      screen.fillRect(x - 5, y - 5, 11, 11, C.MAGENTA);
      screen.strokeRect(x - 5, y - 5, 11, 11, C.WIT);
      // Up from under the floor, down from over the ceiling.
      for (let i = 0; i < 4; i++) {
        const rij = laag === 0 ? y - 3 + i : y + 3 - i;
        screen.fillRect(x - i, rij, 2 * i + 1, 1, C.WIT);
      }
    }
  }

  /** The cell under the pointer, and in schacht mode every cell that could. */
  private drawWijzer(screen: Screen, ctx: SceneContext): void {
    if (this.schachtStand) {
      const aan = Math.floor(this.time * 3) % 2 === 0;
      for (const k of this.bord.kandidaten) {
        const vrij = this.stand.schachten.includes(k.cel) || magSchacht(this.bord, this.stand, k.cel) === null;
        for (const ox of PLAN_X) {
          const x = ox + (k.cel % BREEDTE) * TILE;
          const y = PLAN_Y + Math.floor(k.cel / BREEDTE) * TILE;
          if (vrij) {
            screen.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2, aan ? C.WIT : C.MAGENTA);
          } else {
            screen.line(x + 3, y + 3, x + TILE - 4, y + TILE - 4, C.ROESTROOD);
            screen.line(x + TILE - 4, y + 3, x + 3, y + TILE - 4, C.ROESTROOD);
          }
        }
      }
    }
    const plek = this.onder(ctx);
    if (!plek) return;
    // The same cell on the other sheet too: a schacht is one place, twice.
    for (let laag = 0; laag < 2; laag++) {
      screen.strokeRect(PLAN_X[laag]! + (plek.cel % BREEDTE) * TILE,
        PLAN_Y + Math.floor(plek.cel / BREEDTE) * TILE, TILE, TILE,
        laag === plek.laag ? C.WIT : C.ASGRIJS);
    }
  }

  /** Between the sheets and the bar: the schachten in hand, and what Pim said. */
  private drawTussen(screen: Screen): void {
    const y = PLAN_Y + PLAN_H + 9;
    screen.text('SCHACHTEN', 20, y, C.KALK);
    for (let i = 0; i < SCHACHTEN; i++) {
      const x = 20 + 10 * 6 + i * 13;
      const gezet = i < this.stand.schachten.length;
      screen.fillRect(x, y - 1, 9, 9, gezet ? C.MAGENTA : C.ROET);
      screen.strokeRect(x, y - 1, 9, 9, gezet ? C.WIT : C.STEEN);
    }
    const aan = roostersAan(this.bord, this.stand);
    const roosters = `ROOSTERS ${aan}/${this.bord.roosters.length}`;
    screen.text(roosters, WIDTH - 20 - roosters.length * 6, y,
      aan === this.bord.roosters.length ? C.SALIE : C.KALK);

    // One line under that, and whichever of the three is most urgent gets it.
    if (this.time < this.meldingTot) {
      screen.textCentered(this.melding, WIDTH / 2, y + 13, C.ROESTROOD);
    } else if (this.schachtStand) {
      screen.textCentered('KLIK EEN VAK TEGEN EEN BINNENMUUR.   X = TOCH NIET', WIDTH / 2, y + 13, C.MAGENTA);
    } else {
      screen.textCentered('X = SCHACHT ZETTEN   (OF SHIFT + KLIK)', WIDTH / 2, y + 13, C.ASGRIJS);
    }
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text('OPLEVERING', 6, 5, C.MAGENTA);
    screen.text('HET HELE SYSTEEM', 6 + 12 * 6, 5, C.ASGRIJS);
    const label = `DRAAIEN ${String(this.draaien).padStart(2, '0')}   PAR ${String(this.par).padStart(2, '0')}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, this.draaien > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen, lekken: number): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    screen.text(lekken > 0 ? `${lekken} OPEN EINDEN` : 'NIETS LEKT', 6, y + 7, lekken > 0 ? C.ROESTROOD : C.SALIE);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text('KABEL OF KLOS IN DE MUUR: GEEN SCHACHT.', 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const got = stars(this.draaien, this.par, doorVerf(this.bord, this.stand));
    const w = 250;
    const h = 96;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.MAGENTA);
    const kop = 'HIJ DRAAIT.';
    screen.textScaled(kop, Math.round((WIDTH - screen.textScaledWidth(kop, 2)) / 2), y + 8, C.BOTERGEEL, 2);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 30, i < got, 2);
    }
    screen.textCentered(`${this.draaien} DRAAIEN   PAR ${this.par}`, WIDTH / 2, y + 52, C.KALK);
    screen.fillRect(x + 8, y + 64, w - 16, 11, C.DONKERSALIE);
    screen.textCentered('GELEVERD', WIDTH / 2, y + 66, C.WIT);
    if (this.time - this.wonAt > 1 && Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 81, C.SALIE);
    }
  }
}
