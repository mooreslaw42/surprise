import { OPENING } from '../data/liedjes.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { HouseMapScene } from './housemap.ts';

const CEILING_H = 30;
const WALL_Y = CEILING_H + 6;
const FLOOR_Y = 168;
const FOOTER_H = 14;

/** Where the renovation front has got to, left to right. */
const STRIPPED_X = 236;   // wallpaper gone from here right
const PAPERED_X = 112;    // ochre wall up to here, wallpaper after it

/** Where the voorhamer lands, which is where the hole opens. */
const RAAK_X = 112;
const RAAK_Y = 124;

/**
 * The swing, in seconds. Wind up, drive, hit — and then a beat before the
 * house map, which is not padding: nothing may make a sound until the player
 * has pressed something, so this press is the one that starts the riff, and
 * leaving on the same frame would mean the title screen never gets to play
 * its own music. So it swings instead. The screen did say to.
 */
const WINDOP = 0.22;
const INSLAG = 0.42;
const NAAR_KAART = 2.2;

/**
 * Title screen: one wall of the house, caught mid-renovation. Finished ochre
 * on the left, the old check wallpaper in the middle, stripped back to studs
 * and wool on the right. The whole game in one picture.
 */
export class TitleScene implements Scene {
  readonly muziek = OPENING;
  private readonly save: Save;
  private time = 0;
  /** Seconds since the hammer started moving. Negative while it is resting. */
  private zwaai = -1;

  constructor(save: Save) {
    this.save = save;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;

    if (this.zwaai < 0) {
      if (ctx.input.confirmed() || ctx.input.mouseClicked) this.zwaai = 0;
      return;
    }

    this.zwaai += dt;
    if (this.zwaai >= NAAR_KAART) {
      // Reset before leaving, so coming back out of the house map finds the
      // wall whole and the hammer up again.
      this.zwaai = -1;
      ctx.push(new HouseMapScene(this.save));
    }
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.ZWART);
    this.drawCeiling(screen);
    this.drawWall(screen);
    if (this.zwaai >= INSLAG) this.drawGat(screen);
    this.drawFloor(screen);
    const { dx, dy } = this.hamerStand();
    this.drawSledgehammer(screen, 100 + dx, 118 + dy);
    if (this.zwaai >= INSLAG) this.drawGruis(screen);
    this.drawTitle(screen);

    if (this.zwaai < 0 && Math.floor(this.time * 1.6) % 2 === 0) {
      screen.textCenteredShadow('DRUK OP ENTER OM TE SLOPEN', WIDTH / 2, 150, C.LICHTOKER, C.ZWART);
    }

    screen.fillRect(0, HEIGHT - FOOTER_H, WIDTH, FOOTER_H, C.ZWART);
    screen.fillRect(0, HEIGHT - FOOTER_H, WIDTH, 1, C.STEEN);
    screen.text('S=SCANLINES  M=MUZIEK  P=PALET  D=ONTWERP  F=SCHERM', 6, HEIGHT - 10, C.ASGRIJS);
    screen.text('V0.9', WIDTH - 29, HEIGHT - 10, C.STEEN);
  }

  /** Up and back, then down and through, then a short recoil. */
  private hamerStand(): { dx: number; dy: number } {
    const t = this.zwaai;
    if (t < 0) return { dx: 0, dy: 0 };
    if (t < WINDOP) {
      const p = t / WINDOP;
      return { dx: Math.round(-6 * p), dy: Math.round(-16 * p) };
    }
    if (t < INSLAG) {
      const p = (t - WINDOP) / (INSLAG - WINDOP);
      return { dx: Math.round(-6 + 14 * p), dy: Math.round(-16 + 25 * p) };
    }
    // Pulls back up out of its own work, so the hole is the thing you look at.
    const p = Math.min(1, (t - INSLAG) / 0.3);
    return { dx: Math.round(8 - 6 * p), dy: Math.round(9 - 12 * p) };
  }

  /**
   * What a voorhamer actually leaves: board gone, the cavity behind it open,
   * one stud still standing. The same wall section the stripped end of the
   * screen is already showing, only this time you made it.
   */
  private drawGat(screen: Screen): void {
    const groei = Math.min(1, (this.zwaai - INSLAG) / 0.12);
    const w = Math.round(46 * groei);
    const h = Math.round(38 * groei);
    if (w < 6 || h < 6) return;
    const x = RAAK_X - Math.round(w / 2);
    const y = RAAK_Y - Math.round(h / 2);

    // A hole has to read as a hole against cream wallpaper as well as against
    // ochre, and the thing that makes it read is the dark: the cavity is the
    // only place on this wall you can see into. So the rim stays wide and the
    // wool behind it is in shadow, not the lit botergeel of the stripped end.
    screen.fillRect(x, y, w, h, C.ROET);
    screen.ditherRect(x + 6, y + 7, w - 12, h - 13, C.DONKEROKER, C.OKER);
    screen.fillRect(x + 6, y + 7, w - 12, 2, C.ZWART);          // shadow under the lintel
    screen.fillRect(x + 6, y + 7, 2, h - 13, C.ZWART);

    const stud = x + Math.round(w / 2) + 4;
    screen.fillRect(stud, y + 4, 5, h - 8, C.HOUT);
    screen.fillRect(stud, y + 4, 1, h - 8, C.LICHTHOUT);
    screen.fillRect(stud + 4, y + 4, 1, h - 8, C.ROET);

    // The broken edge of the board, all the way round.
    for (let ey = y; ey < y + h; ey += 3) {
      const jag = ((ey * 7919) % 9) - 4;
      screen.fillRect(x + jag - 3, ey, 4, 3, C.KALK);
      screen.fillRect(x + w + jag - 1, ey, 4, 3, C.KALK);
      screen.fillRect(x + jag - 3, ey, 1, 3, C.ZANDGRIJS);
    }
    for (let ex = x; ex < x + w; ex += 4) {
      const jag = ((ex * 104729) % 7) - 3;
      screen.fillRect(ex, y + jag - 2, 4, 3, C.KALK);
      screen.fillRect(ex, y + h + jag - 1, 4, 3, C.KALK);
    }

    // Two frames of nothing but dust, at full size whatever the hole is doing.
    if (this.zwaai - INSLAG < 0.07) {
      screen.fillRect(RAAK_X - 29, RAAK_Y - 25, 58, 50, C.WIT);
    }
  }

  /** Plaster thrown out of the hole, on its way to the floor. */
  private drawGruis(screen: Screen): void {
    const t = this.zwaai - INSLAG;
    if (t > 1.2) return;
    const KLEUR = [C.WIT, C.KALK, C.ZANDGRIJS, C.ASGRIJS];
    for (let i = 0; i < 28; i++) {
      const hoek = ((i * 7919) % 360) * (Math.PI / 180);
      const snelheid = 45 + ((i * 104729) % 85);
      const x = Math.round(RAAK_X + Math.cos(hoek) * snelheid * t);
      const y = Math.round(RAAK_Y - (Math.abs(Math.sin(hoek)) * snelheid + 30) * t + 240 * t * t);
      if (y > FLOOR_Y + 4 || x < 0 || x >= WIDTH) continue;
      const maat = i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1;
      screen.fillRect(x, y, maat, maat, KLEUR[i % KLEUR.length]!);
    }
  }

  /** Tongue-and-groove boards in salie, white beams across. The signature. */
  private drawCeiling(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, CEILING_H, C.SALIE);
    for (let y = 2; y < CEILING_H; y += 4) {
      screen.fillRect(0, y, WIDTH, 1, C.DONKERSALIE);
    }
    for (let x = 18; x < WIDTH; x += 54) {
      screen.fillRect(x, 0, 7, CEILING_H, C.KALK);
      screen.fillRect(x, 0, 1, CEILING_H, C.WIT);
      screen.fillRect(x + 6, 0, 1, CEILING_H, C.ZANDGRIJS);
    }
    // Cornice.
    screen.fillRect(0, CEILING_H, WIDTH, 4, C.WIT);
    screen.fillRect(0, CEILING_H + 4, WIDTH, 2, C.ZANDGRIJS);
  }

  private drawWall(screen: Screen): void {
    const h = FLOOR_Y - WALL_Y;

    // Finished ochre, with the little arched window.
    screen.fillRect(0, WALL_Y, PAPERED_X, h, C.OKER);
    screen.ditherRect(0, WALL_Y, PAPERED_X, 10, C.DONKEROKER, C.OKER);
    this.drawArchedWindow(screen, 40, 108, 42, 32);

    // The old check wallpaper.
    this.drawWallpaper(screen, PAPERED_X, WALL_Y, STRIPPED_X - PAPERED_X, h);

    // Stripped back: plaster, studs, and wool in the cavities.
    screen.fillRect(STRIPPED_X, WALL_Y, WIDTH - STRIPPED_X, h, C.ROET);
    const FILL = [1, 0.55, 0, 1, 0.8];
    let cavity = 0;
    for (let x = STRIPPED_X; x < WIDTH; x += 30, cavity++) {
      const fill = FILL[cavity % FILL.length]!;
      if (fill > 0) {
        const wh = Math.round(h * fill);
        screen.ditherRect(x + 5, FLOOR_Y - wh, 25, wh, C.BOTERGEEL, C.LICHTOKER);
        screen.fillRect(x + 5, FLOOR_Y - wh, 25, 1, C.WIT);
      }
      screen.fillRect(x, WALL_Y, 5, h, C.HOUT);
      screen.fillRect(x, WALL_Y, 1, h, C.LICHTHOUT);
      screen.fillRect(x + 4, WALL_Y, 1, h, C.STEEN);
    }

    // The torn edge where the paper stops.
    for (let y = WALL_Y; y < FLOOR_Y; y += 3) {
      const jag = ((y * 7919) % 13) - 6;
      const curl = ((y * 104729) % 5) + 2;
      screen.fillRect(STRIPPED_X + jag - curl, y, curl, 3, C.KALK);
      screen.fillRect(STRIPPED_X + jag - curl, y, 1, 3, C.ZANDGRIJS);
    }
  }

  /** Cream ground, yellow grid, faint grey cross-line. Straight off the wall. */
  private drawWallpaper(screen: Screen, x: number, y: number, w: number, h: number): void {
    screen.fillRect(x, y, w, h, C.KALK);
    for (let gx = x; gx < x + w; gx += 8) screen.fillRect(gx, y, 1, h, C.LICHTOKER);
    for (let gy = y; gy < y + h; gy += 8) screen.fillRect(x, gy, w, 1, C.LICHTOKER);
    for (let gx = x + 4; gx < x + w; gx += 24) screen.fillRect(gx, y, 1, h, C.ZANDGRIJS);
    for (let gy = y + 4; gy < y + h; gy += 24) screen.fillRect(x, gy, w, 1, C.ZANDGRIJS);
  }

  private drawArchedWindow(screen: Screen, x: number, y: number, w: number, h: number): void {
    screen.fillRect(x, y + 4, w, h - 4, C.LUCHTBLAUW);
    screen.fillRect(x + 3, y + 1, w - 6, 4, C.LUCHTBLAUW);   // shallow arch
    screen.fillRect(x + 9, y, w - 18, 2, C.LUCHTBLAUW);
    screen.ditherRect(x, y + h - 12, w, 12, C.MOSGROEN, C.LUCHTBLAUW);
    screen.fillRect(x, y + h - 6, w, 6, C.MOSGROEN);
    for (let mx = x + 13; mx < x + w - 2; mx += 13) screen.fillRect(mx, y + 1, 1, h - 1, C.WIT);
    for (let my = y + 11; my < y + h - 2; my += 11) screen.fillRect(x, my, w, 1, C.WIT);
    screen.strokeRect(x - 2, y - 2, w + 4, h + 4, C.WIT);
    screen.fillRect(x - 3, y + h + 1, w + 6, 3, C.KALK);
  }

  /** Mahogany laid from the left, bare subfloor where the work is. */
  private drawFloor(screen: Screen): void {
    const laidTo = STRIPPED_X - 40;
    const h = HEIGHT - FLOOR_Y;

    // Bare subfloor everywhere, then real boards over the finished part.
    screen.fillRect(0, FLOOR_Y, WIDTH, h, C.LICHTHOUT);
    screen.ditherRect(laidTo, FLOOR_Y, WIDTH - laidTo, h, C.LICHTHOUT, C.HOUT);

    const BOARD_H = 11;
    for (let i = 0, y = FLOOR_Y; y < HEIGHT; i++, y += BOARD_H) {
      screen.fillRect(0, y, laidTo, BOARD_H, C.MAHONIE);
      screen.fillRect(0, y, laidTo, 1, C.ROET);                   // board edge
      screen.fillRect(0, y + 1, laidTo, 1, C.DONKERROOD);         // shadow under it
      // Grain: a few long dashes, offset per board so it never tiles visibly.
      for (let gx = (i * 37) % 41; gx < laidTo; gx += 41) {
        screen.fillRect(gx, y + 4 + (gx % 4), 7, 1, C.DONKERROOD);
      }
      // Butt joints, staggered.
      for (let jx = ((i % 3) + 1) * 31; jx < laidTo; jx += 93) {
        screen.fillRect(jx, y, 1, BOARD_H, C.ROET);
      }
    }
    screen.fillRect(laidTo, FLOOR_Y, 2, h, C.ROET);
    screen.fillRect(0, FLOOR_Y - 3, WIDTH, 3, C.WIT);             // plint
    screen.fillRect(0, FLOOR_Y - 3, WIDTH, 1, C.ZANDGRIJS);
  }

  private drawSledgehammer(screen: Screen, x: number, y: number): void {
    for (let i = 0; i < 58; i++) {
      const hx = x + Math.round(i * 0.38);
      screen.fillRect(hx, y + i, 4, 1, C.HOUT);
      screen.fillRect(hx, y + i, 1, 1, C.LICHTHOUT);
    }
    screen.fillRect(x - 9, y - 11, 22, 13, C.ASGRIJS);
    screen.fillRect(x - 9, y - 11, 22, 3, C.ZANDGRIJS);
    screen.fillRect(x - 9, y - 1, 22, 3, C.ROET);
    screen.fillRect(x - 2, y - 11, 8, 13, C.STEEN);
  }

  private drawTitle(screen: Screen): void {
    const top = 'DE EEUWIGE';
    const bottom = 'VERBOUWING';
    const topX = Math.round((WIDTH - screen.textScaledWidth(top, 2)) / 2);
    const bottomX = Math.round((WIDTH - screen.textScaledWidth(bottom, 4)) / 2);

    // The banner sits below the cornice, so the salie ceiling stays visible.
    screen.fillRect(0, 40, WIDTH, 60, C.ZWART);
    screen.fillRect(0, 40, WIDTH, 1, C.MAGENTA);
    screen.fillRect(0, 99, WIDTH, 1, C.MAGENTA);

    screen.textScaled(top, topX + 1, 47, C.DONKEROKER, 2);
    screen.textScaled(top, topX, 46, C.LICHTOKER, 2);
    screen.textScaled(bottom, bottomX + 2, 64, C.DONKERROOD, 4);
    screen.textScaled(bottom, bottomX, 62, C.KALK, 4);

    screen.textCentered('EEN SINTERKLAASSURPRISE VOOR WOUTER', WIDTH / 2, 91, C.SALIE);
  }
}
