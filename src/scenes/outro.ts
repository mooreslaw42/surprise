import { BAAS, MENU } from '../data/liedjes.ts';
import { AFTITELING, GEDICHT, SLOT } from '../data/outro.ts';
import { STAGES } from '../data/stages.ts';
import type { Muziekkeuze } from '../engine/muziek.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { Dialogue } from './dialogue.ts';
import { SPREKER_NAAM } from './portretten.ts';

/**
 * After the last level: the house, finished, at night, with the lights on.
 *
 * Four beats, each ended with Enter. The house and the score; Moeder
 * getting the last word; the gedicht, scrolling; and the credits over the
 * slow blues.
 *
 * The plan says no sentiment, and this keeps to it until the gedicht, which
 * is Pim's and can be as sentimental as he likes.
 */

type Fase = 'huis' | 'slot' | 'gedicht' | 'aftiteling';

const REGEL_H = 12;
const ROL = 11;           // pixels a second: slow enough to read aloud

type Vlok = { x: number; y: number; v: number; kleur: number };

export class OutroScene implements Scene {
  private readonly save: Save;
  private fase: Fase = 'huis';
  private time = 0;
  private sinds = 0;
  private beat = 0;
  private praatje: Dialogue | null = null;
  private readonly vlokken: Vlok[] = [];

  constructor(save: Save) {
    this.save = save;
    let s = 3;
    const next = (): number => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const kleuren = [C.BOTERGEEL, C.ROESTROOD, C.SALIE, C.LUCHTBLAUW, C.MAGENTA, C.WIT];
    for (let i = 0; i < 60; i++) {
      this.vlokken.push({
        x: next() * WIDTH, y: next() * HEIGHT, v: 14 + next() * 26,
        kleur: kleuren[Math.floor(next() * kleuren.length)]!,
      });
    }
  }

  get muziek(): Muziekkeuze | null {
    return this.fase === 'aftiteling' ? BAAS : MENU;
  }

  enter(ctx: SceneContext): void {
    ctx.geluid?.('fanfare');
  }

  private naar(fase: Fase): void {
    this.fase = fase;
    this.sinds = this.time;
    if (fase === 'slot') {
      this.beat = 0;
      this.praatje = this.volgendeBeat();
      if (!this.praatje) this.naar('gedicht');
    } else if (fase === 'gedicht' && GEDICHT.length === 0) {
      this.naar('aftiteling');
    }
  }

  private volgendeBeat(): Dialogue | null {
    const beat = SLOT[this.beat];
    return beat ? new Dialogue(beat.tekst, SPREKER_NAAM[beat.wie]) : null;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    for (const v of this.vlokken) {
      v.y += v.v * dt;
      if (v.y > HEIGHT) v.y = -3;
    }
    const door = ctx.input.confirmed() || ctx.input.mouseClicked;
    const t = this.time - this.sinds;

    switch (this.fase) {
      case 'huis':
        if (t > 1.5 && door) this.naar('slot');
        break;
      case 'slot':
        if (this.praatje?.update(dt, ctx)) {
          this.beat++;
          this.praatje = this.volgendeBeat();
          if (!this.praatje) this.naar('gedicht');
        }
        break;
      case 'gedicht':
        if ((t > 1 && door) || t > this.gedichtDuur() + 4) this.naar('aftiteling');
        break;
      case 'aftiteling':
        if (t > 2 && (door || ctx.input.justPressed('Escape'))) ctx.pop();
        break;
    }
  }

  private gedichtDuur(): number {
    return (HEIGHT + GEDICHT.length * REGEL_H) / ROL;
  }

  render(screen: Screen, _ctx: SceneContext): void {
    const t = this.time - this.sinds;
    if (this.fase === 'gedicht') {
      this.drawNacht(screen, true);
      this.drawRol(screen, GEDICHT, t, C.KALK);
      this.drawEnter(screen, t > 1);
      return;
    }
    if (this.fase === 'aftiteling') {
      this.drawNacht(screen, true);
      // Comes up once and stays, so the last screen is the whole of it.
      const REGEL_H = 11;       // tighter than the gedicht: all of it has to fit at once
      const hoogte = AFTITELING.length * REGEL_H;
      const eind = Math.round((HEIGHT - hoogte) / 2);
      const y0 = Math.max(eind, HEIGHT - Math.round(t * ROL * 3));
      AFTITELING.forEach((regel, i) => {
        screen.textCentered(regel, WIDTH / 2, y0 + i * REGEL_H,
          i === 0 ? C.LICHTOKER : i === AFTITELING.length - 1 ? C.BOTERGEEL : C.KALK);
      });
      this.drawEnter(screen, t > 2 && y0 === eind);
      return;
    }

    this.drawNacht(screen, false);
    this.drawHuis(screen);
    for (const v of this.vlokken) screen.fillRect(Math.round(v.x), Math.round(v.y), 2, 1, v.kleur);

    const kop = 'OPGELEVERD!';
    const schaal = 3;
    const kx = Math.round((WIDTH - screen.textScaledWidth(kop, schaal)) / 2);
    screen.textScaled(kop, kx + 2, 14, C.ZWART, schaal);
    screen.textScaled(kop, kx, 12, C.BOTERGEEL, schaal);

    const max = STAGES.reduce((n, s) => n + s.entries.length, 0) * 3;
    screen.textCenteredShadow(`${this.save.totalStars()} VAN DE ${max} STERREN`, WIDTH / 2, 40, C.KALK, C.ZWART);

    if (this.fase === 'huis') this.drawEnter(screen, t > 1.5);
    if (this.praatje) this.praatje.render(screen, this.time);
  }

  private drawEnter(screen: Screen, mag: boolean): void {
    if (mag && Math.floor(this.time * 2) % 2 === 0) {
      screen.text('ENTER', WIDTH - 36, HEIGHT - 11, C.SALIE);
    }
  }

  private drawNacht(screen: Screen, leeg: boolean): void {
    screen.clear(C.ZWART);
    screen.ditherRect(0, 0, WIDTH, leeg ? HEIGHT : 150, C.DIEPBLAUW, C.ZWART);
    // The same few stars every time, so they do not crawl.
    let s = 99;
    for (let i = 0; i < 40; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const x = s % WIDTH;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const y = s % (leeg ? HEIGHT : 90);
      const fonkel = Math.floor(this.time * 2 + i) % 7 === 0;
      screen.set(x, y, fonkel ? C.WIT : C.ZANDGRIJS);
    }
  }

  /**
   * The house from the garden, done: lights on in all three rooms, the
   * cowl on the roof turning, and at the edge of the lawn a tiny house on a
   * trailer with its own light on.
   */
  private drawHuis(screen: Screen): void {
    const grond = 168;
    screen.fillRect(0, grond, WIDTH, HEIGHT - grond, C.MOSGROEN);
    screen.ditherRect(0, grond, WIDTH, 6, C.MOSGROEN, C.DONKERSALIE);
    screen.ditherRect(0, grond + 26, WIDTH, HEIGHT - grond - 26, C.DONKERSALIE, C.MOSGROEN);

    // The long block and the wing, like the footprint.
    const x = 46;
    const w = 208;
    const top = 104;
    screen.fillRect(x, top, w, grond - top, C.KALK);
    screen.ditherRect(x, top, w, grond - top, C.KALK, C.ZANDGRIJS);
    screen.fillRect(x, grond - 5, w, 5, C.STEEN);
    // Roof.
    for (let i = 0; i < 26; i++) {
      screen.fillRect(x - 6 + i, top - i - 1, w + 12 - 2 * i, 1, i % 4 === 3 ? C.DONKERROOD : C.TERRACOTTA);
    }
    screen.fillRect(x - 6, top - 1, w + 12, 2, C.DONKERROOD);

    // Three rooms, three lit windows, the ochre wall showing in the first.
    const ramen = [
      { rx: x + 12, rw: 56, binnen: C.OKER },
      { rx: x + 82, rw: 44, binnen: C.BOTERGEEL },
      { rx: x + 142, rw: 52, binnen: C.LICHTOKER },
    ];
    for (const raam of ramen) {
      screen.fillRect(raam.rx - 2, top + 12, raam.rw + 4, 38, C.WIT);
      screen.fillRect(raam.rx, top + 14, raam.rw, 34, raam.binnen);
      screen.ditherRect(raam.rx, top + 14, raam.rw, 12, raam.binnen, C.BOTERGEEL);
      screen.fillRect(raam.rx + Math.floor(raam.rw / 2), top + 14, 1, 34, C.WIT);
      // Light falling out onto the lawn.
      screen.ditherRect(raam.rx - 4, grond + 2, raam.rw + 8, 8, C.BOTERGEEL, C.MOSGROEN);
    }
    // The salie ceiling, just visible above the middle window's light.
    screen.fillRect(ramen[1]!.rx, top + 14, ramen[1]!.rw, 3, C.SALIE);

    // The cowl. It turns. Two years.
    const kx = x + 150;
    const ky = top - 34;
    screen.fillRect(kx - 2, ky + 6, 5, 12, C.ASGRIJS);
    screen.fillRect(kx - 6, ky, 13, 7, C.ZANDGRIJS);
    screen.strokeRect(kx - 6, ky, 13, 7, C.ROET);
    const stand = Math.floor(this.time * 10) % 4;
    for (let i = 0; i < 3; i++) {
      screen.fillRect(kx - 4 + ((i * 4 + stand) % 10), ky + 1, 1, 5, C.ROET);
    }
    // And air comes out of it.
    for (let i = 0; i < 3; i++) {
      const drift = (this.time * 8 + i * 9) % 26;
      screen.fillRect(kx + 8 + Math.round(drift), ky - 2 - Math.round(drift / 3) + i * 2, 4, 1,
        drift < 18 ? C.LUCHTBLAUW : C.DIEPBLAUW);
    }

    // Wiep, at the end of the garden.
    const tx = 288;
    const ty = grond - 4;
    screen.fillRect(tx, ty - 34, 62, 30, C.HOUT);
    screen.ditherRect(tx, ty - 34, 62, 30, C.HOUT, C.LICHTHOUT);
    screen.fillRect(tx - 2, ty - 38, 66, 5, C.DONKERSALIE);
    screen.fillRect(tx + 8, ty - 26, 14, 12, C.BOTERGEEL);
    screen.strokeRect(tx + 8, ty - 26, 14, 12, C.ROET);
    screen.fillRect(tx + 40, ty - 24, 10, 20, C.MAHONIE);
    screen.fillRect(tx - 4, ty - 4, 70, 3, C.STEEN);
    screen.fillEllipse(tx + 16, ty + 2, 5, 5, C.ZWART);
    screen.fillEllipse(tx + 16, ty + 2, 2, 2, C.ASGRIJS);
    screen.fillEllipse(tx + 46, ty + 2, 5, 5, C.ZWART);
    screen.fillEllipse(tx + 46, ty + 2, 2, 2, C.ASGRIJS);
    screen.fillRect(tx - 14, ty - 3, 12, 1, C.STEEN);
  }

  /** Lines rolling up from the bottom edge. */
  private drawRol(screen: Screen, regels: readonly string[], t: number, kleur: number): void {
    const y0 = HEIGHT - Math.round(t * ROL);
    regels.forEach((regel, i) => {
      const y = y0 + i * REGEL_H;
      if (y < -8 || y > HEIGHT) return;
      screen.textCentered(regel, WIDTH / 2, y, kleur);
    });
  }
}
