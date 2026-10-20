import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';

const FLOOR_Y = 176;
const STUD_SPACING = 40;
const STUD_W = 6;

/**
 * Title screen. A half-stripped wall: studs exposed, insulation half in, floor
 * half laid. The state of the real house, in other words.
 */
export class TitleScene implements Scene {
  private time = 0;

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (ctx.input.confirmed()) {
      // Placeholder until the house map lands in week 1.
      this.time = 0;
    }
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.BLACK);
    this.drawWall(screen);
    this.drawWindow(screen, 300, 98, 60, 46);
    this.drawFloor(screen);
    this.drawSledgehammer(screen, 26, 118);
    this.drawTitle(screen);

    if (Math.floor(this.time * 1.6) % 2 === 0) {
      screen.textCenteredShadow('DRUK OP ENTER OM TE SLOPEN', WIDTH / 2, 152, C.PAINT);
    }
    screen.fillRect(0, HEIGHT - 14, WIDTH, 14, C.BLACK);
    screen.fillRect(0, HEIGHT - 14, WIDTH, 1, C.STEEL);
    screen.text('S = SCANLINES   P = PALET   F = VOLLEDIG SCHERM', 6, HEIGHT - 10, C.GREY);
    screen.text('V0.1', WIDTH - 29, HEIGHT - 10, C.DARKGREY);
  }

  /** Stud frame with the cavities dark and a few of them insulated. */
  private drawWall(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, FLOOR_Y, C.DARKGREY);
    screen.ditherRect(0, 0, WIDTH, FLOOR_Y, C.DARKGREY, C.BLACK);

    // How full each cavity is, left to right. The house in one array.
    const FILL = [0, 0.75, 1, 0, 0.45, 1, 0.9, 0, 1, 0.3];

    let stud = 0;
    for (let x = -8; x < WIDTH; x += STUD_SPACING, stud++) {
      const fill = FILL[stud % FILL.length]!;
      if (fill > 0) {
        const cavityX = x + STUD_W;
        const cavityW = STUD_SPACING - STUD_W;
        const h = Math.round(FLOOR_Y * fill);
        screen.ditherRect(cavityX, FLOOR_Y - h, cavityW, h, C.LIGHTRED, C.PLASTER);
        screen.fillRect(cavityX, FLOOR_Y - h, cavityW, 1, C.PLASTER);
      }
      screen.fillRect(x, 0, STUD_W, FLOOR_Y, C.WOOD);
      screen.fillRect(x, 0, 1, FLOOR_Y, C.PINE);
      screen.fillRect(x + STUD_W - 1, 0, 1, FLOOR_Y, C.BROWN);
    }

    // Horizontal regel across the studs.
    screen.fillRect(0, 96, WIDTH, 5, C.WOOD);
    screen.fillRect(0, 96, WIDTH, 1, C.PINE);
    screen.fillRect(0, 100, WIDTH, 1, C.BROWN);
  }

  /** A hole to the outside, because it is December and the frame is not in yet. */
  private drawWindow(screen: Screen, x: number, y: number, w: number, h: number): void {
    screen.fillRect(x, y, w, h, C.BLUE);
    screen.ditherRect(x, y, w, 10, C.BLUE, C.BLACK);
    for (const [sx, sy] of [[8, 8], [22, 16], [40, 6], [50, 22], [14, 30], [34, 34]] as const) {
      screen.set(x + sx, y + sy, C.WHITE);
    }
    screen.fillRect(x + w - 18, y + 6, 8, 8, C.PAINT);
    screen.fillRect(x + w - 16, y + 6, 6, 6, C.BLUE);
    screen.strokeRect(x - 1, y - 1, w + 2, h + 2, C.STEEL);
  }

  /** Planks laid from the left, bare screed on the right. */
  private drawFloor(screen: Screen): void {
    screen.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y, C.GREY);
    screen.ditherRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y, C.GREY, C.DARKGREY);

    const laidTo = 232;
    for (let y = FLOOR_Y; y < HEIGHT; y += 7) {
      const row = (y - FLOOR_Y) / 7;
      screen.fillRect(0, y, laidTo, 7, row % 2 === 0 ? C.WOOD : C.PINE);
      screen.fillRect(0, y, laidTo, 1, C.BROWN);
      // Staggered end joints, the whole point of the Vloeren stage.
      for (let jx = (row % 3) * 26; jx < laidTo; jx += 78) {
        screen.fillRect(jx, y, 1, 7, C.BROWN);
      }
    }
    screen.fillRect(laidTo, FLOOR_Y, 2, HEIGHT - FLOOR_Y, C.BROWN);
  }

  private drawSledgehammer(screen: Screen, x: number, y: number): void {
    for (let i = 0; i < 56; i++) {
      const hx = x + Math.round(i * 0.4);
      screen.fillRect(hx, y + i, 4, 1, C.WOOD);
      screen.fillRect(hx, y + i, 1, 1, C.PINE);
    }
    screen.fillRect(x - 9, y - 11, 22, 13, C.STEEL);
    screen.fillRect(x - 9, y - 11, 22, 3, C.LIGHTGREY);
    screen.fillRect(x - 9, y - 1, 22, 3, C.BLACK);
    screen.fillRect(x - 2, y - 11, 8, 13, C.DARKGREY);
  }

  private drawTitle(screen: Screen): void {
    const top = 'DE EEUWIGE';
    const bottom = 'VERBOUWING';
    const topX = Math.round((WIDTH - screen.textScaledWidth(top, 3)) / 2);
    const bottomX = Math.round((WIDTH - screen.textScaledWidth(bottom, 4)) / 2);

    screen.fillRect(0, 20, WIDTH, 76, C.BLACK);
    screen.fillRect(0, 20, WIDTH, 1, C.STEEL);
    screen.fillRect(0, 95, WIDTH, 1, C.STEEL);

    screen.textScaled(top, topX + 2, 26, C.BROWN, 3);
    screen.textScaled(top, topX, 24, C.YELLOW, 3);
    screen.textScaled(bottom, bottomX + 2, 50, C.RED, 4);
    screen.textScaled(bottom, bottomX, 48, C.PAINT, 4);

    screen.textCentered('EEN SINTERKLAASSURPRISE VOOR WOUTER', WIDTH / 2, 85, C.LIGHTGREY);
  }
}
