import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  type MeubelSoort, type Stuk,
  MEUBEL_NAMEN, cellsOf, isSolved, kanSchuiven, schuif, stars,
} from '../puzzles/schuifwerk/model.ts';
import { solve } from '../puzzles/schuifwerk/solver.ts';
import type { SchuifLevel } from '../puzzles/schuifwerk/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The room from above, with everything still in it. Slide the furniture until
 * the one marked piece can get out of the door. Nothing else can start until
 * the room is empty.
 */
export class SchuifScene implements Scene {
  private readonly level: SchuifLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private stukken: Stuk[];
  private zetten = 0;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  /** Which piece the mouse is over, so the bar can name it. */
  private wijst = -1;

  /** What is being dragged, and where it stood when the drag began. */
  private sleept: { index: number; grepen: { x: number; y: number }; begon: Stuk } | null = null;

  constructor(level: SchuifLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.plan).par;
    this.stukken = level.plan.stukken.map((s) => ({ ...s }));
    this.uitleg = new Dialogue(level.uitleg);

    const plan = level.plan;
    this.tile = Math.max(8, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - 10) / plan.height),
      Math.floor((WIDTH - 60) / (plan.width + 1)),
    ));
    this.originX = Math.round((WIDTH - (plan.width + 1) * this.tile) / 2);
    this.originY = TOP_H + Math.round((HEIGHT - TOP_H - BOTTOM_H - plan.height * this.tile) / 2);
  }

  private cellAt(ctx: SceneContext): { x: number; y: number } {
    return {
      x: Math.floor((ctx.input.mouseX - this.originX) / this.tile),
      y: Math.floor((ctx.input.mouseY - this.originY) / this.tile),
    };
  }

  private stukOp(cell: { x: number; y: number }): number {
    return this.stukken.findIndex((s) => cellsOf(s).some((c) => c.x === cell.x && c.y === cell.y));
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
      this.stukken = this.level.plan.stukken.map((s) => ({ ...s }));
      this.zetten = 0;
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      const next = solve({ ...this.level.plan, stukken: this.stukken }).zetten[0];
      if (next) {
        const i = this.stukken.findIndex((s) => s.id === next.id);
        if (i >= 0) {
          this.stukken = schuif(this.level.plan, this.stukken, i, next.stap);
          this.zetten++;
        }
      }
      this.check();
      return;
    }

    const cell = this.cellAt(ctx);
    if (ctx.input.mouseClicked && ctx.input.mouseOver) {
      const i = this.stukOp(cell);
      if (i >= 0) this.sleept = { index: i, grepen: cell, begon: { ...this.stukken[i]! } };
    }

    if (this.sleept && ctx.input.mouseDown) {
      const { index, grepen, begon } = this.sleept;
      const stuk = this.stukken[index]!;
      // How far the mouse has travelled along the piece's own axis.
      const wens = stuk.orientatie === 'horizontaal'
        ? cell.x - grepen.x - (stuk.x - begon.x)
        : cell.y - grepen.y - (stuk.y - begon.y);
      if (wens !== 0) {
        const stap = Math.sign(wens);
        // One cell at a time, so the piece stops against whatever is in the way.
        for (let n = 0; n < Math.abs(wens); n++) {
          if (!kanSchuiven(this.level.plan, this.stukken, index, stap)) break;
          this.stukken = schuif(this.level.plan, this.stukken, index, stap);
        }
      }
    }

    if (this.sleept && !ctx.input.mouseDown) {
      // A drag of any distance is one move, as it is on the table.
      const now = this.stukken[this.sleept.index]!;
      if (now.x !== this.sleept.begon.x || now.y !== this.sleept.begon.y) this.zetten++;
      this.sleept = null;
      this.check();
    }
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.plan, this.stukken)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.zetten, stars(this.zetten, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    this.wijst = ctx.input.mouseOver
      ? (this.sleept ? this.sleept.index : this.stukOp(this.cellAt(ctx)))
      : -1;
    screen.clear(C.ROET);
    this.drawKamer(screen);
    this.drawMeubels(screen);
    if (!this.won && !this.uitleg) this.drawHover(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** Marble, white, laid in big slabs. It is the last day you will see it. */
  private drawKamer(screen: Screen): void {
    const plan = this.level.plan;
    const w = plan.width * this.tile;
    const h = plan.height * this.tile;
    screen.fillRect(this.originX - 4, this.originY - 4, w + 8, h + 8, C.ZANDGRIJS);
    screen.strokeRect(this.originX - 4, this.originY - 4, w + 8, h + 8, C.STEEN);

    screen.fillRect(this.originX, this.originY, w, h, C.KALK);
    const slab = this.tile * 2;
    for (let x = slab; x < w; x += slab) {
      screen.fillRect(this.originX + x, this.originY, 1, h, C.ZANDGRIJS);
    }
    for (let y = slab; y < h; y += slab) {
      screen.fillRect(this.originX, this.originY + y, w, 1, C.ZANDGRIJS);
    }
    // Veining, fixed rather than random so the floor is the same every time.
    let seed = 19;
    for (let n = 0; n < 26; n++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const vx = this.originX + (seed % Math.max(1, w - 10));
      const vy = this.originY + ((seed >> 9) % Math.max(1, h - 6));
      const len = 4 + ((seed >> 5) % 7);
      screen.line(vx, vy, vx + len, vy + ((seed >> 3) % 3) - 1, C.ZANDGRIJS);
    }

    for (const v of plan.vast) {
      const px = this.originX + v.x * this.tile;
      const py = this.originY + v.y * this.tile;
      screen.fillRect(px, py, this.tile, this.tile, C.ROET);
      screen.ditherRect(px + 2, py + 2, this.tile - 4, this.tile - 4, C.TERRACOTTA, C.ROET);
      screen.strokeRect(px, py, this.tile, this.tile, C.ZWART);
    }

    this.drawDeur(screen);
  }

  /** A hole in the right-hand wall with the hall beyond, and the door open. */
  private drawDeur(screen: Screen): void {
    const plan = this.level.plan;
    const t = this.tile;
    const ax = this.originX + plan.width * t;
    const ay = this.originY + plan.deur.y * t;

    // The hall: the same marble, but you are not looking straight at it.
    screen.fillRect(ax - 4, ay, t + 16, t, C.ZANDGRIJS);
    screen.ditherRect(ax - 4, ay, t + 16, t, C.ZANDGRIJS, C.STEEN);
    // Jambs, cut out of the wall above and below the opening.
    screen.fillRect(ax - 4, ay - 5, 5, 5, C.ZANDGRIJS);
    screen.fillRect(ax - 4, ay + t, 5, 5, C.ZANDGRIJS);
    screen.fillRect(ax - 4, ay - 1, 5, 1, C.STEEN);
    screen.fillRect(ax - 4, ay + t, 5, 1, C.STEEN);
    // Threshold, where the marble stops.
    screen.fillRect(ax + 1, ay, 2, t, C.STEEN);
    // The leaf, swung out into the hall and seen on edge from above.
    screen.fillRect(ax + 5, ay + 1, t + 6, 5, C.MAHONIE);
    screen.fillRect(ax + 5, ay + 1, t + 6, 1, C.HOUT);
    screen.fillRect(ax + 5, ay + 5, t + 6, 1, C.ROET);
    screen.fillRect(ax + 5, ay + 2, 2, 3, C.ROET);
    screen.fillRect(ax + t + 7, ay + 2, 3, 2, C.ZANDGRIJS);
    screen.text('DEUR', ax + 2, ay + t + 6, C.LICHTOKER);
  }

  /** Furniture from above, each thing drawn as the thing it is. */
  private drawMeubels(screen: Screen): void {
    for (const stuk of this.stukken) {
      const px = this.originX + stuk.x * this.tile + 2;
      const py = this.originY + stuk.y * this.tile + 2;
      const w = (stuk.orientatie === 'horizontaal' ? stuk.lengte : 1) * this.tile - 4;
      const h = (stuk.orientatie === 'verticaal' ? stuk.lengte : 1) * this.tile - 4;
      drawMeubel(screen, stuk.soort, px, py, w, h, stuk.orientatie === 'horizontaal');
      if (stuk.hoofd) {
        // The one that has to leave, ringed so it cannot be missed.
        const puls = Math.floor(this.time * 3) % 2 === 0 ? C.BOTERGEEL : C.OKER;
        screen.strokeRect(px - 2, py - 2, w + 4, h + 4, puls);
        screen.strokeRect(px - 1, py - 1, w + 2, h + 2, C.DONKEROKER);
      }
    }
  }

  private drawHover(screen: Screen, ctx: SceneContext): void {
    if (!ctx.input.mouseOver) return;
    const i = this.sleept ? this.sleept.index : this.stukOp(this.cellAt(ctx));
    if (i < 0) return;
    const stuk = this.stukken[i]!;
    const px = this.originX + stuk.x * this.tile;
    const py = this.originY + stuk.y * this.tile;
    const w = (stuk.orientatie === 'horizontaal' ? stuk.lengte : 1) * this.tile;
    const h = (stuk.orientatie === 'verticaal' ? stuk.lengte : 1) * this.tile;
    screen.strokeRect(px, py, w, h, C.WIT);
    // Which way it can go, as arrows on its own axis rather than a letter.
    const cx = px + Math.floor(w / 2);
    const cy = py + Math.floor(h / 2);
    if (stuk.orientatie === 'horizontaal') {
      pijl(screen, px - 7, cy, -1, 0);
      pijl(screen, px + w + 7, cy, 1, 0);
    } else {
      pijl(screen, cx, py - 7, 0, -1);
      pijl(screen, cx, py + h + 7, 0, 1);
    }
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, C.LICHTOKER);
    const label = `ZETTEN ${String(this.zetten).padStart(2, '0')}   PAR ${String(this.par).padStart(2, '0')}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, this.zetten > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const aangewezen = this.wijst >= 0 ? this.stukken[this.wijst] : undefined;
    screen.text(aangewezen
      ? `${MEUBEL_NAMEN[aangewezen.soort]}${aangewezen.hoofd ? ' - MOET ERUIT' : ''}`
      : 'SLEEP EEN MEUBEL IN ZIJN EIGEN RICHTING',
      6, y + 7, aangewezen?.hoofd ? C.BOTERGEEL : C.KALK);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  /** Approved, costed, and not delivered. */
  private drawWon(screen: Screen): void {
    const got = stars(this.zetten, this.par);
    const w = 240;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.MAGENTA);
    screen.textCentered('KAMER LEEG', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${this.zetten} ZETTEN   PAR ${this.par}`, WIDTH / 2, y + 44, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 62, C.SALIE);
    }
  }
}

type Kleur = { readonly body: number; readonly rand: number; readonly detail: number };

/** What each thing is made of, which is most of what tells them apart. */
const KLEUREN: Record<MeubelSoort, Kleur> = {
  bank: { body: C.TERRACOTTA, rand: C.DONKERROOD, detail: C.ROESTROOD },
  fauteuil: { body: C.ROESTROOD, rand: C.DONKERROOD, detail: C.TERRACOTTA },
  kast: { body: C.MAHONIE, rand: C.ROET, detail: C.HOUT },
  boekenkast: { body: C.HOUT, rand: C.ROET, detail: C.LICHTHOUT },
  eettafel: { body: C.HOUT, rand: C.ROET, detail: C.MAHONIE },
  salontafel: { body: C.LICHTHOUT, rand: C.HOUT, detail: C.HOUT },
  koelkast: { body: C.KALK, rand: C.ASGRIJS, detail: C.WIT },
  fornuis: { body: C.ASGRIJS, rand: C.ZWART, detail: C.ROET },
  aanrecht: { body: C.WIT, rand: C.ASGRIJS, detail: C.ZANDGRIJS },
  dozen: { body: C.OKER, rand: C.DONKEROKER, detail: C.KALK },
  tvmeubel: { body: C.ROET, rand: C.ZWART, detail: C.DIEPBLAUW },
};

const SPINES = [C.TERRACOTTA, C.SALIE, C.LICHTOKER, C.KALK, C.DIEPBLAUW, C.MAGENTA, C.MOSGROEN];

/** A small arrowhead, pointing the way a piece is allowed to slide. */
function pijl(screen: Screen, x: number, y: number, dx: number, dy: number): void {
  for (let i = 0; i < 4; i++) {
    if (dx !== 0) screen.fillRect(x - dx * i, y - i, 1, 2 * i + 1, C.WIT);
    else screen.fillRect(x - i, y - dy * i, 2 * i + 1, 1, C.WIT);
  }
}

/**
 * One piece of furniture, seen from above.
 *
 * Everything is drawn along its own axis: `lang` is the length of the thing,
 * `kort` its depth, and `h` flips which of the two is the screen's x. That
 * way a bank lying along the wall and a bank standing against it are the
 * same drawing turned a quarter, rather than two drawings that drift apart.
 */
function drawMeubel(
  screen: Screen, soort: MeubelSoort,
  px: number, py: number, w: number, h: number, horizontaal: boolean,
): void {
  const k = KLEUREN[soort];
  const lang = horizontaal ? w : h;
  const kort = horizontaal ? h : w;

  /** Place a rectangle in along-the-piece coordinates. */
  const vak = (a: number, b: number, al: number, bl: number, kleur: number) => {
    if (horizontaal) screen.fillRect(px + a, py + b, al, bl, kleur);
    else screen.fillRect(px + b, py + a, bl, al, kleur);
  };

  screen.fillRect(px, py, w, h, k.rand);
  vak(1, 1, lang - 2, kort - 2, k.body);

  switch (soort) {
    case 'bank':
    case 'fauteuil': {
      // Back along one side, an arm at each end, cushions in between.
      const arm = soort === 'bank' ? 4 : 6;
      vak(1, 1, lang - 2, 4, k.rand);
      vak(1, 1, arm, kort - 2, k.rand);
      vak(lang - 1 - arm, 1, arm, kort - 2, k.rand);
      const kussens = soort === 'bank' ? Math.max(2, Math.round(lang / 18)) : 1;
      const binnen = lang - 2 - arm * 2;
      for (let i = 1; i < kussens; i++) {
        vak(1 + arm + Math.round((binnen * i) / kussens), 5, 1, kort - 6, k.rand);
      }
      vak(1 + arm, 5, binnen, 1, k.detail);
      if (soort === 'fauteuil') vak(1 + arm, 7, binnen, kort - 10, k.detail);
      break;
    }
    case 'kast': {
      // A deep box with its doors on the long side: seam down the middle,
      // two handles either side of it.
      vak(1, kort - 5, lang - 2, 4, k.detail);
      vak(Math.floor(lang / 2), kort - 5, 1, 4, k.rand);
      vak(Math.floor(lang / 2) - 3, kort - 4, 2, 2, C.ZANDGRIJS);
      vak(Math.floor(lang / 2) + 2, kort - 4, 2, 2, C.ZANDGRIJS);
      break;
    }
    case 'boekenkast': {
      // Spines all along the open side.
      let a = 2;
      let seed = 23;
      while (a < lang - 3) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const bw = 2 + (seed % 3);
        if (a + bw > lang - 3) break;
        vak(a, kort - 6, bw, 5, SPINES[(seed >> 9) % SPINES.length]!);
        a += bw + 1;
      }
      vak(1, kort - 7, lang - 2, 1, k.rand);
      break;
    }
    case 'eettafel':
    case 'salontafel': {
      // A salontafel is the same thing, lower and a size down, so it is
      // drawn inset: the floor shows all round it and the legs are stubbier.
      const in_ = soort === 'eettafel' ? 1 : 4;
      const poot = soort === 'eettafel' ? 3 : 2;
      const l = lang - in_ * 2;
      const b = kort - in_ * 2;
      vak(in_, in_, l, b, k.rand);
      vak(in_ + 1, in_ + 1, l - 2, b - 2, k.body);
      vak(in_ + 1, in_ + 1, poot, poot, k.rand);
      vak(in_ + l - 1 - poot, in_ + 1, poot, poot, k.rand);
      vak(in_ + 1, in_ + b - 1 - poot, poot, poot, k.rand);
      vak(in_ + l - 1 - poot, in_ + b - 1 - poot, poot, poot, k.rand);
      // The dining table is the one with the leaf down the middle.
      if (soort === 'eettafel') vak(Math.floor(lang / 2), in_ + 1, 1, b - 2, k.detail);
      break;
    }
    case 'koelkast': {
      // Freezer at one end, and a handle down each door.
      const vries = Math.round(lang / 3);
      vak(1, 1, vries, kort - 2, k.detail);
      vak(vries, 1, 2, kort - 2, C.ASGRIJS);
      vak(2, kort - 5, vries - 2, 2, C.ASGRIJS);
      vak(vries + 4, kort - 5, lang - vries - 7, 2, C.ASGRIJS);
      vak(2, 2, lang - 4, 1, C.WIT);
      break;
    }
    case 'fornuis': {
      // Four burners and the knobs along the front.
      const cx = [Math.round(lang * 0.3), Math.round(lang * 0.7)];
      const cy = [Math.round(kort * 0.32), Math.round(kort * 0.68)];
      for (const a of cx) {
        for (const b of cy) {
          const r = Math.max(2, Math.floor(Math.min(lang, kort) / 7));
          if (horizontaal) screen.fillEllipse(px + a, py + b, r, r, k.detail);
          else screen.fillEllipse(px + b, py + a, r, r, k.detail);
        }
      }
      vak(2, kort - 4, lang - 4, 1, C.ZANDGRIJS);
      break;
    }
    case 'aanrecht': {
      // Worktop with the sink let into it, the tap behind it, and the
      // draining grooves alongside — which is what says sink and not fridge.
      const a0 = Math.round(lang * 0.1);
      const sw = Math.round(lang * 0.36);
      vak(a0, 4, sw, kort - 8, C.ASGRIJS);
      vak(a0 + 1, 5, sw - 2, kort - 10, C.ZANDGRIJS);
      vak(a0 + Math.round(sw / 2) - 1, kort - 8, 2, 3, C.STEEN);
      vak(a0 + Math.round(sw / 2) - 1, 1, 2, 4, C.ASGRIJS);
      vak(a0 + Math.round(sw / 2) - 3, 1, 5, 2, C.ASGRIJS);
      for (let g = 0; g < 4; g++) {
        vak(a0 + sw + 3 + g * 3, 5, 1, kort - 10, k.detail);
      }
      break;
    }
    case 'dozen': {
      // One box per cell, each taped shut across the flaps.
      const n = Math.max(2, Math.round(lang / Math.max(1, kort)));
      const bw = Math.floor((lang - 2) / n);
      for (let i = 0; i < n; i++) {
        const a = 2 + i * bw;
        const bb = bw - 3;
        vak(a, 2, bb, kort - 4, k.body);
        vak(a, 2, bb, 1, C.LICHTOKER);
        vak(a, kort - 3, bb, 1, k.rand);
        vak(a, Math.floor(kort / 2) - 1, bb, 2, k.detail);
      }
      break;
    }
    case 'tvmeubel': {
      // The low unit, with the telly standing on the back edge.
      vak(1, kort - 6, lang - 2, 5, C.ZWART);
      vak(3, 1, lang - 6, 4, k.detail);
      vak(3, 1, lang - 6, 1, C.LUCHTBLAUW);
      vak(Math.floor(lang / 2) - 2, 5, 5, 2, C.ASGRIJS);
      break;
    }
  }
}
