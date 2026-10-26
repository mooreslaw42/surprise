import { PALETTE, PALETTE_NAMES, C, luma } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';

const ROWS = 12;
const ROW_H = 15;
const TOP = 22;

/**
 * The palette, named, with its value ramp. Press D. This is a working tool
 * rather than part of the game: it is how we agree on the colours.
 */
export class DesignSheetScene implements Scene {
  update(_dt: number, ctx: SceneContext): void {
    // D is handled by the game loop, which owns the toggle.
    if (ctx.input.justPressed('Escape')) ctx.pop();
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.ZWART);
    screen.fillRect(0, 0, WIDTH, 14, C.ROET);
    screen.text('HET HUIS IN 24 KLEUREN', 6, 4, C.LICHTOKER);
    screen.text('D = TERUG', WIDTH - 59, 4, C.ASGRIJS);

    const colW = Math.floor(WIDTH / 2);
    for (let i = 0; i < PALETTE.length; i++) {
      const col = Math.floor(i / ROWS);
      const row = i % ROWS;
      const x = col * colW + 5;
      const y = TOP + row * ROW_H;

      screen.fillRect(x, y, 22, 11, i);
      screen.strokeRect(x, y, 22, 11, C.ROET);
      screen.text(String(i).padStart(2, '0'), x + 26, y + 2, C.ASGRIJS);
      screen.text(PALETTE_NAMES[i]!, x + 42, y + 2, C.KALK);
      screen.text(PALETTE[i]!.slice(1).toUpperCase(), x + 114, y + 2, C.STEEN);

      // Value bar, so clashes in lightness are obvious at a glance.
      const bar = Math.round((luma(i) / 255) * 24);
      screen.fillRect(x + 154, y + 4, 24, 3, C.ROET);
      screen.fillRect(x + 154, y + 4, bar, 3, C.SALIE);
    }

    screen.fillRect(0, HEIGHT - 12, WIDTH, 12, C.ROET);
    screen.text('NEUTRAAL  SALIE  OKER  TERRACOTTA  HOUT  BUITEN', 6, HEIGHT - 9, C.ASGRIJS);
  }
}
