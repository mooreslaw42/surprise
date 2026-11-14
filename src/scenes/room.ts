import { C } from '../engine/palette.ts';
import { WIDTH, type Screen } from '../engine/screen.ts';
import type { Afwerking, Prop, RoomId, Surface } from '../data/house.ts';

/**
 * The room around the puzzle.
 *
 * A wall on its own is nobody's house. What makes one of these rooms
 * recognisable is everything framing it: the salie tongue-and-groove ceiling
 * with its white beams, the mahogany floor, white window frames with their
 * glazing bars and deep sills, and the bookcase standing against the end wall.
 *
 * Every stage will need this shell, so it lives here rather than in the Sloop
 * scene.
 */

export type RoomLayout = {
  readonly ceilingY: number;
  readonly ceilingH: number;
  readonly wallY: number;
  readonly wallH: number;
  readonly floorY: number;
  readonly floorH: number;
};

export const TOP_BAR = 16;
export const BOTTOM_BAR = 30;

export type Geometry = { tile: number; originX: number; originY: number };

/**
 * Where a grid of wall cells lands on screen. Shared by every stage so the
 * puzzle, the windows and the mouse can never disagree about it.
 */
export function wallGeometry(cols: number, rows: number, screenW: number, screenH: number): Geometry {
  const l = layout(TOP_BAR, BOTTOM_BAR, screenH);
  const tile = Math.max(6, Math.min(
    Math.floor(l.wallH / rows),
    Math.floor((screenW - 24) / cols),
  ));
  return {
    tile,
    originX: Math.round((screenW - cols * tile) / 2),
    originY: l.floorY - rows * tile,
  };
}

/** Centre of a wall cell, in screen pixels. */
export function cellCentre(cols: number, rows: number, screenW: number, screenH: number,
                           p: { x: number; y: number }): { x: number; y: number } {
  const g = wallGeometry(cols, rows, screenW, screenH);
  return {
    x: g.originX + p.x * g.tile + Math.floor(g.tile / 2),
    y: g.originY + p.y * g.tile + Math.floor(g.tile / 2),
  };
}

export function layout(topBar: number, bottomBar: number, screenH: number): RoomLayout {
  const ceilingY = topBar;
  const ceilingH = 26;
  const floorH = 20;
  const floorY = screenH - bottomBar - floorH;
  return { ceilingY, ceilingH, wallY: ceilingY + ceilingH, wallH: floorY - (ceilingY + ceilingH), floorY, floorH };
}

/**
 * The ceiling, which is the first thing that says which room this is.
 *
 * From the photos, not from memory of them. The woonkamer is tongue-and-
 * groove boards and beams painted one pale salie, beam and board alike, and
 * the beam along the wall is that colour too — there is no white cornice.
 * The keuken is the same carpentry painted white. The tv-kamer, the room
 * still being worked on, has white boards and a strip of old green showing
 * where the ceiling used to meet the wall.
 */
export function drawCeiling(screen: Screen, l: RoomLayout, ruimte: RoomId = 'woonkamer'): void {
  const wit = ruimte !== 'woonkamer';
  const plank = wit ? C.WIT : C.LICHTSALIE;
  const groef = wit ? C.KALK : C.SALIE;
  const schaduw = wit ? C.ZANDGRIJS : C.DONKERSALIE;

  screen.fillRect(0, l.ceilingY, WIDTH, l.ceilingH, plank);
  for (let y = l.ceilingY + 2; y < l.ceilingY + l.ceilingH - 4; y += 3) {
    screen.fillRect(0, y, WIDTH, 1, groef);
  }
  if (ruimte !== 'tvkamer') {
    // Beams across, the same paint as the boards, told apart by their shadow.
    for (let x = 14; x < WIDTH; x += 58) {
      screen.fillRect(x, l.ceilingY, 8, l.ceilingH - 4, plank);
      screen.fillRect(x, l.ceilingY, 1, l.ceilingH - 4, wit ? C.WIT : C.WIT);
      screen.fillRect(x + 7, l.ceilingY, 2, l.ceilingH - 4, schaduw);
    }
  }
  // The beam the ceiling lands on.
  screen.fillRect(0, l.ceilingY + l.ceilingH - 5, WIDTH, 4, plank);
  screen.fillRect(0, l.ceilingY + l.ceilingH - 5, WIDTH, 1, wit ? C.WIT : C.WIT);
  screen.fillRect(0, l.ceilingY + l.ceilingH - 1, WIDTH, 1, schaduw);
  if (ruimte === 'tvkamer') {
    // What is left of the old ceiling line: a band of green above the paper.
    screen.fillRect(0, l.ceilingY + l.ceilingH - 4, WIDTH, 3, C.MOSGROEN);
    screen.ditherRect(0, l.ceilingY + l.ceilingH - 4, WIDTH, 3, C.MOSGROEN, C.DONKERSALIE);
  }
}

/**
 * The floor, which changes with the stage. White marble is what was there
 * before the sledgehammers came out; the mahogany boards only arrive at the
 * Vloeren stage, near the end.
 */
export type Vloer = 'marmer' | 'mahonie' | 'ondervloer';

export function drawFloor(screen: Screen, l: RoomLayout, vloer: Vloer): void {
  if (vloer === 'marmer') {
    screen.fillRect(0, l.floorY, WIDTH, l.floorH, C.WIT);
    // Big square slabs with thin joints, and a little grey veining.
    for (let x = -6; x < WIDTH; x += 26) {
      screen.fillRect(x, l.floorY + 4, 1, l.floorH, C.ZANDGRIJS);
    }
    for (let y = l.floorY + 10; y < l.floorY + l.floorH; y += 9) {
      screen.fillRect(0, y, WIDTH, 1, C.ZANDGRIJS);
    }
    let seed = 11;
    for (let n = 0; n < 26; n++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const vx = seed % WIDTH;
      const vy = l.floorY + 5 + ((seed >> 7) % Math.max(1, l.floorH - 6));
      screen.fillRect(vx, vy, 3 + ((seed >> 3) % 4), 1, C.KALK);
    }
  } else if (vloer === 'ondervloer') {
    screen.fillRect(0, l.floorY, WIDTH, l.floorH, C.LICHTHOUT);
    screen.ditherRect(0, l.floorY + 4, WIDTH, l.floorH - 4, C.LICHTHOUT, C.HOUT);
  } else {
    // Mahogany strip parquet: short lengths, staggered, no two quite the
    // same red. In the photos it is the floor that glows, not the walls.
    screen.fillRect(0, l.floorY, WIDTH, l.floorH, C.MAHONIE);
    let seed = 5;
    for (let i = 0, y = l.floorY + 4; y < l.floorY + l.floorH; i++, y += 4) {
      for (let x = -((i * 13) % 22); x < WIDTH; x += 22) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const toon = seed % 5;
        if (toon === 0) screen.fillRect(x, y, 21, 3, C.TERRACOTTA);
        else if (toon === 1) screen.ditherRect(x, y, 21, 3, C.MAHONIE, C.TERRACOTTA);
        else if (toon === 2) screen.ditherRect(x, y, 21, 3, C.MAHONIE, C.DONKERROOD);
        screen.fillRect(x + 21, y, 1, 4, C.DONKERROOD);
      }
      screen.fillRect(0, y + 3, WIDTH, 1, C.DONKERROOD);
    }
  }
  screen.fillRect(0, l.floorY, WIDTH, 4, C.WIT);          // plint
  screen.fillRect(0, l.floorY + 3, WIDTH, 1, C.ZANDGRIJS);
}

/** The wall finish, drawn right across so the room does not float in a void. */
export function drawWallGround(screen: Screen, l: RoomLayout, afwerking: Afwerking): void {
  switch (afwerking) {
    case 'oker':
      screen.fillRect(0, l.wallY, WIDTH, l.wallH, C.OKER);
      screen.ditherRect(0, l.wallY, WIDTH, 8, C.DONKEROKER, C.OKER);
      break;
    case 'behang':
      screen.fillRect(0, l.wallY, WIDTH, l.wallH, C.KALK);
      for (let x = 0; x < WIDTH; x += 8) screen.fillRect(x, l.wallY, 1, l.wallH, C.LICHTOKER);
      for (let y = l.wallY; y < l.wallY + l.wallH; y += 8) screen.fillRect(0, y, WIDTH, 1, C.LICHTOKER);
      for (let x = 4; x < WIDTH; x += 24) screen.fillRect(x, l.wallY, 1, l.wallH, C.ZANDGRIJS);
      break;
    default:
      // Warm cream, not grey: the plain walls in that house are nearly white.
      screen.fillRect(0, l.wallY, WIDTH, l.wallH, C.WIT);
      screen.ditherRect(0, l.wallY, WIDTH, l.wallH, C.WIT, C.KALK);
      screen.ditherRect(0, l.wallY, WIDTH, 6, C.KALK, C.ZANDGRIJS);
  }
}

/** Intersect a rect with a window before drawing it. */
function fillClipped(
  screen: Screen, x: number, y: number, w: number, h: number, color: number,
  cx: number, cy: number, cw: number, ch: number,
): void {
  const x0 = Math.max(x, cx);
  const y0 = Math.max(y, cy);
  const x1 = Math.min(x + w, cx + cw);
  const y1 = Math.min(y + h, cy + ch);
  if (x1 <= x0 || y1 <= y0) return;
  screen.fillRect(x0, y0, x1 - x0, y1 - y0, color);
}

/**
 * The garden, hedge and field, as one continuous backdrop behind the whole
 * wall. Windows and knocked-through holes draw slices of the same view, so a
 * hole beside a window shows the same hedge at the same height instead of its
 * own little private landscape.
 */
export function drawOutsideSlice(
  screen: Screen,
  x: number, y: number, w: number, h: number,
  bandX: number, bandY: number, bandW: number, bandH: number,
): void {
  const grass = bandY + Math.round(bandH * 0.58);
  const clouds = bandY + Math.max(2, Math.round(bandH * 0.18));
  const path = grass + Math.round((bandY + bandH - grass) * 0.55);

  fillClipped(screen, bandX, bandY, bandW, bandH, C.LUCHTBLAUW, x, y, w, h);
  for (let py = Math.max(y, bandY); py < Math.min(y + h, clouds); py++) {
    for (let px = Math.max(x, bandX); px < Math.min(x + w, bandX + bandW); px++) {
      if ((px + py) % 2 === 0) screen.set(px, py, C.WIT);
    }
  }
  fillClipped(screen, bandX, grass, bandW, bandY + bandH - grass, C.MOSGROEN, x, y, w, h);
  for (let py = Math.max(y, grass - 3); py < Math.min(y + h, grass); py++) {
    for (let px = Math.max(x, bandX); px < Math.min(x + w, bandX + bandW); px++) {
      if ((px + py) % 2 === 0) screen.set(px, py, C.MOSGROEN);
    }
  }
  // A hedge of trees along the far side, aligned to the band so slices agree.
  for (let tx = bandX + 5; tx < bandX + bandW - 2; tx += 19) {
    const th = 6 + ((tx * 7) % 5);
    fillClipped(screen, tx, grass - th, 8, th, C.DONKERSALIE, x, y, w, h);
    fillClipped(screen, tx + 1, grass - th - 3, 6, 4, C.DONKERSALIE, x, y, w, h);
  }
  fillClipped(screen, bandX, path, bandW, 2, C.DONKERSALIE, x, y, w, h);
}

/** The whole view, for a window that owns its own patch of outside. */
export function drawOutside(screen: Screen, x: number, y: number, w: number, h: number): void {
  drawOutsideSlice(screen, x, y, w, h, x, y, w, h);
}

/**
 * A real window: deep white frame, glazing bars, a sill that oversails, and
 * the garden beyond. Drawn as one object rather than per tile, which is what
 * stops it reading as a hole in a grid.
 */
export function drawWindow(
  screen: Screen, x: number, y: number, w: number, h: number, kind: 'raam' | 'deur',
  band?: { x: number; y: number; w: number; h: number },
): void {
  const b = band ?? { x, y, w, h };
  drawOutsideSlice(screen, x, y, w, h, b.x, b.y, b.w, b.h);

  // Glazing bars: tall openings get a transom, wide ones a mullion.
  const bars = Math.max(1, Math.round(w / 34));
  for (let i = 1; i <= bars; i++) {
    const bx = x + Math.round((w * i) / (bars + 1));
    screen.fillRect(bx - 1, y, 3, h, C.WIT);
    screen.fillRect(bx + 1, y, 1, h, C.ZANDGRIJS);
  }
  if (kind === 'deur' && h > 40) {
    const ty = y + Math.round(h * 0.22);
    screen.fillRect(x, ty, w, 3, C.WIT);
    screen.fillRect(x, ty + 2, w, 1, C.ZANDGRIJS);
  }

  // Frame.
  screen.strokeRect(x - 1, y - 1, w + 2, h + 2, C.ZANDGRIJS);
  screen.fillRect(x - 3, y - 3, w + 6, 3, C.WIT);
  screen.fillRect(x - 3, y + h, w + 6, 3, C.WIT);
  screen.fillRect(x - 3, y - 3, 3, h + 6, C.WIT);
  screen.fillRect(x + w, y - 3, 3, h + 6, C.WIT);

  // Sill, oversailing both sides.
  screen.fillRect(x - 5, y + h + 2, w + 10, 3, C.WIT);
  screen.fillRect(x - 5, y + h + 5, w + 10, 1, C.ZANDGRIJS);
}

export function drawProps(screen: Screen, l: RoomLayout, props: readonly Prop[], gridX0: number, gridX1: number): void {
  for (const prop of props) {
    switch (prop) {
      case 'boekenkast': drawBookcase(screen, l, Math.max(2, gridX0 - 52)); break;
      case 'lamp': drawPendant(screen, l, Math.round((gridX0 + gridX1) / 2)); break;
      case 'tv': drawTv(screen, l, Math.min(WIDTH - 44, gridX1 + 6)); break;
      case 'aanrecht': drawWorktop(screen, l, Math.min(WIDTH - 46, gridX1 + 4)); break;
      case 'stofzuiger': drawVacuum(screen, l, Math.max(4, gridX0 - 30)); break;
      case 'balk': drawPaal(screen, l, Math.min(WIDTH - 11, gridX1 + 1)); break;
      case 'gordijn-paars': drawGordijn(screen, l, 0, C.MAGENTA, C.DONKERROOD, C.TERRACOTTA); break;
      case 'gordijn-rood': drawGordijn(screen, l, WIDTH - 11, C.TERRACOTTA, C.DONKERROOD, C.ROESTROOD); break;
    }
  }
}

/**
 * The post in the middle of the woonkamer: a whole tree trunk, bark off,
 * floor to ceiling. Nobody who has been in that room forgets it.
 */
function drawPaal(screen: Screen, l: RoomLayout, x: number): void {
  const y = l.wallY - 1;
  const h = l.floorY - y + 3;
  screen.fillRect(x, y, 10, h, C.HOUT);
  screen.fillRect(x, y, 2, h, C.DONKEROKER);
  screen.fillRect(x + 7, y, 3, h, C.LICHTHOUT);
  let seed = 3;
  for (let n = 0; n < 9; n++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const ky = y + 6 + (seed % Math.max(1, h - 12));
    screen.fillRect(x + 2 + ((seed >> 4) % 5), ky, 2, 3 + ((seed >> 8) % 4), C.MAHONIE);
  }
  screen.fillRect(x - 1, y, 1, h, C.ROET);
}

/** A curtain hanging at the edge of the wall, pleated, in that room's cloth. */
function drawGordijn(screen: Screen, l: RoomLayout, x: number, stof: number, plooi: number, licht: number): void {
  const y = l.wallY;
  const h = l.floorY - y;
  screen.fillRect(x, y, 11, h, stof);
  for (let px = x + 1; px < x + 11; px += 3) {
    screen.fillRect(px, y, 1, h, plooi);
    screen.fillRect(px + 1, y, 1, h, licht);
  }
  screen.fillRect(x, y, 11, 2, C.ROET);
}

/** The dark shelves, full of spines. Unmistakable in that room. */
function drawBookcase(screen: Screen, l: RoomLayout, x: number): void {
  const w = 48;
  const y = l.wallY + 10;
  const h = l.floorY - y + 2;
  screen.fillRect(x, y, w, h, C.DONKERROOD);
  screen.fillRect(x, y, w, 2, C.MAHONIE);
  const spineColors = [C.TERRACOTTA, C.SALIE, C.LICHTOKER, C.KALK, C.DIEPBLAUW, C.MAGENTA, C.MOSGROEN, C.ROESTROOD, C.WIT];
  let shelf = y + 3;
  let seed = 7;
  while (shelf + 9 < y + h) {
    let bx = x + 2;
    while (bx < x + w - 2) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const bw = 2 + (seed % 3);
      const bh = 6 + ((seed >> 5) % 2);
      if (bx + bw > x + w - 2) break;
      screen.fillRect(bx, shelf + (8 - bh), bw, bh, spineColors[(seed >> 9) % spineColors.length]!);
      bx += bw + 1;
    }
    shelf += 9;
    screen.fillRect(x, shelf - 1, w, 1, C.ROET);
  }
  screen.strokeRect(x, y, w, h, C.ROET);
}

function drawPendant(screen: Screen, l: RoomLayout, x: number): void {
  screen.fillRect(x, l.ceilingY + l.ceilingH, 1, 8, C.ROET);
  screen.fillRect(x - 6, l.ceilingY + l.ceilingH + 8, 13, 3, C.LICHTOKER);
  screen.fillRect(x - 4, l.ceilingY + l.ceilingH + 11, 9, 2, C.OKER);
}

function drawTv(screen: Screen, l: RoomLayout, x: number): void {
  const y = l.floorY - 26;
  screen.fillRect(x, y, 38, 22, C.ROET);
  screen.fillRect(x + 2, y + 2, 34, 18, C.DIEPBLAUW);
  screen.ditherRect(x + 2, y + 2, 34, 18, C.DIEPBLAUW, C.ZWART);
  screen.fillRect(x + 17, y + 22, 4, 4, C.ROET);
  screen.fillRect(x + 11, l.floorY - 1, 16, 2, C.ROET);
}

function drawWorktop(screen: Screen, l: RoomLayout, x: number): void {
  const y = l.floorY - 28;
  screen.fillRect(x, y, 42, 28, C.WIT);
  screen.fillRect(x, y, 42, 3, C.ASGRIJS);
  screen.fillRect(x, y + 12, 42, 1, C.ZANDGRIJS);
  screen.fillRect(x + 20, y + 3, 1, 25, C.ZANDGRIJS);
  screen.fillRect(x + 14, y + 6, 6, 1, C.ASGRIJS);
  screen.fillRect(x + 23, y + 6, 6, 1, C.ASGRIJS);
}

/** The Festool that has been standing in the middle of the job for months. */
function drawVacuum(screen: Screen, l: RoomLayout, x: number): void {
  const y = l.floorY - 20;
  screen.fillRect(x, y + 6, 22, 14, C.WIT);
  screen.fillRect(x, y + 6, 22, 3, C.ASGRIJS);
  screen.fillRect(x, y + 14, 22, 2, C.ROET);
  screen.fillRect(x + 2, y, 18, 7, C.DONKERSALIE);
  screen.fillRect(x + 4, y + 1, 14, 2, C.SALIE);
  screen.fillRect(x + 2, y + 19, 4, 3, C.ROET);
  screen.fillRect(x + 16, y + 19, 4, 3, C.ROET);
}

export function openingPixelRect(
  surface: Surface, index: number, originX: number, originY: number, tile: number,
  cells: { c0: number; c1: number; r0: number; r1: number },
): { x: number; y: number; w: number; h: number } {
  void surface;
  void index;
  return {
    x: originX + cells.c0 * tile,
    y: originY + cells.r0 * tile,
    w: (cells.c1 - cells.c0 + 1) * tile,
    h: (cells.r1 - cells.r0 + 1) * tile,
  };
}
