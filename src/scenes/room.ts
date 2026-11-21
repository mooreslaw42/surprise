import { C } from '../engine/palette.ts';
import { WIDTH, type Screen } from '../engine/screen.ts';
import type { Afwerking, Opening, Prop, RoomId, Surface } from '../data/house.ts';

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
 * From Pim's walk-through video. The woonkamer is plain plaster, white, with
 * a soft cove where it meets the wall. The keuken is the one with the
 * carpentry: white boards between beams painted a grey sage. The tv-kamer
 * has the same boards and beams, all white.
 */
export function drawCeiling(screen: Screen, l: RoomLayout, ruimte: RoomId = 'woonkamer'): void {
  screen.fillRect(0, l.ceilingY, WIDTH, l.ceilingH, C.WIT);
  if (ruimte === 'woonkamer') {
    // The cove: the plaster rolls over into the wall instead of meeting it.
    screen.ditherRect(0, l.ceilingY + l.ceilingH - 7, WIDTH, 4, C.WIT, C.KALK);
    screen.fillRect(0, l.ceilingY + l.ceilingH - 3, WIDTH, 3, C.KALK);
    return;
  }
  const balk = ruimte === 'keuken' ? C.SALIE : C.WIT;
  const schaduw = ruimte === 'keuken' ? C.DONKERSALIE : C.ZANDGRIJS;
  for (let y = l.ceilingY + 2; y < l.ceilingY + l.ceilingH - 4; y += 3) {
    screen.fillRect(0, y, WIDTH, 1, C.KALK);
  }
  for (let x = 14; x < WIDTH; x += 58) {
    screen.fillRect(x, l.ceilingY, 8, l.ceilingH - 4, balk);
    screen.fillRect(x + 7, l.ceilingY, 2, l.ceilingH - 4, schaduw);
  }
  // The beam the ceiling lands on.
  screen.fillRect(0, l.ceilingY + l.ceilingH - 5, WIDTH, 4, balk);
  screen.fillRect(0, l.ceilingY + l.ceilingH - 1, WIDTH, 1, schaduw);
}

/**
 * The floor, which changes with the job. Three of them, in Pim's words:
 * white marble tiles before anything started, bare concrete all the while
 * the walls were open, and dark wood once it was laid. So marble is only
 * ever seen while the rooms are being emptied, and the wood only arrives at
 * Vloeren, near the end.
 */
export type Vloer = 'marmer' | 'beton' | 'mahonie';

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
  } else if (vloer === 'beton') {
    // Poured, grey, never quite one colour, with the odd crack and the dust
    // of everything that came off the walls.
    screen.fillRect(0, l.floorY, WIDTH, l.floorH, C.ZANDGRIJS);
    let seed = 41;
    for (let n = 0; n < 40; n++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const x = seed % WIDTH;
      const y = l.floorY + 4 + ((seed >> 9) % Math.max(1, l.floorH - 6));
      const w = 8 + ((seed >> 4) % 26);
      screen.ditherRect(x, y, w, 2 + ((seed >> 13) % 3), C.ZANDGRIJS, n % 4 === 0 ? C.ASGRIJS : C.KALK);
    }
    for (let n = 0; n < 5; n++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const x = seed % WIDTH;
      const y = l.floorY + 6 + ((seed >> 9) % Math.max(1, l.floorH - 10));
      screen.line(x, y, x + 9 + ((seed >> 5) % 12), y + ((seed >> 3) % 5) - 2, C.ASGRIJS);
    }
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
      // Yellow check on cream, with a thin blue line every third square.
      for (let x = 0; x < WIDTH; x += 8) screen.fillRect(x, l.wallY, 2, l.wallH, C.BOTERGEEL);
      for (let y = l.wallY; y < l.wallY + l.wallH; y += 8) screen.fillRect(0, y, WIDTH, 2, C.BOTERGEEL);
      for (let x = 5; x < WIDTH; x += 24) screen.fillRect(x, l.wallY, 1, l.wallH, C.DIEPBLAUW);
      for (let y = l.wallY + 5; y < l.wallY + l.wallH; y += 24) screen.fillRect(0, y, WIDTH, 1, C.DIEPBLAUW);
      break;
    case 'kaal': {
      // Stripped back to the old green plaster, patched and stained, with
      // the filler still showing where the paper came off.
      screen.fillRect(0, l.wallY, WIDTH, l.wallH, C.LICHTSALIE);
      let seed = 23;
      for (let n = 0; n < 34; n++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const x = seed % WIDTH;
        const y = l.wallY + ((seed >> 9) % Math.max(1, l.wallH - 8));
        const w = 6 + ((seed >> 4) % 18);
        const h = 3 + ((seed >> 14) % 7);
        screen.ditherRect(x, y, w, h, C.LICHTSALIE, n % 3 === 0 ? C.ZANDGRIJS : C.KALK);
      }
      screen.ditherRect(0, l.wallY + l.wallH - 5, WIDTH, 5, C.LICHTSALIE, C.ASGRIJS);
      break;
    }
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
 * A real window: frame, glazing bars, a sill that oversails, and the garden
 * beyond. Drawn as one object rather than per tile, which is what stops it
 * reading as a hole in a grid.
 *
 * The house has five kinds and they are most of what tells the walls apart,
 * so the opening says which it is: the black steel grid, the little arch
 * beside it, the hopper-topped ones, the cross, and the plain pair.
 */
export function drawWindow(
  screen: Screen, x: number, y: number, w: number, h: number,
  opening: Pick<Opening, 'kind' | 'stijl'>,
  band?: { x: number; y: number; w: number; h: number },
): void {
  const { kind, stijl } = opening;
  if (stijl === 'gordijn') {
    drawDeurgordijn(screen, x, y, w, h);
    return;
  }
  const b = band ?? { x, y, w, h };
  drawOutsideSlice(screen, x, y, w, h, b.x, b.y, b.w, b.h);

  if (stijl === 'staal' || stijl === 'boog') {
    // Steel: thin and black, no timber anywhere, the bars a single pixel.
    const kolommen = stijl === 'staal' ? 3 : 2;
    const rijen = stijl === 'staal' ? 3 : 2;
    for (let i = 1; i < kolommen; i++) screen.fillRect(x + Math.round((w * i) / kolommen), y, 1, h, C.ROET);
    for (let j = 1; j < rijen; j++) screen.fillRect(x, y + Math.round((h * j) / rijen), w, 1, C.ROET);
    if (stijl === 'boog') {
      // Round the head off by giving the corners back to the ochre wall.
      const r = Math.max(2, Math.floor(w / 3));
      for (let dy = 0; dy < r; dy++) {
        const inspring = r - Math.round(Math.sqrt(r * r - (r - dy) * (r - dy)));
        screen.fillRect(x, y + dy, inspring, 1, C.OKER);
        screen.fillRect(x + w - inspring, y + dy, inspring, 1, C.OKER);
      }
    }
    screen.strokeRect(x - 1, y - 1, w + 2, h + 2, C.ROET);
    screen.strokeRect(x, y, w, h, C.ROET);
    screen.fillRect(x - 3, y + h + 1, w + 6, 2, C.KALK);
    screen.fillRect(x - 3, y + h + 3, w + 6, 1, C.DONKEROKER);
    return;
  }

  const staand = (bx: number): void => {
    screen.fillRect(bx - 1, y, 3, h, C.WIT);
    screen.fillRect(bx + 1, y, 1, h, C.ZANDGRIJS);
  };
  const liggend = (ty: number): void => {
    screen.fillRect(x, ty, w, 3, C.WIT);
    screen.fillRect(x, ty + 2, w, 1, C.ZANDGRIJS);
  };

  if (kind === 'deur') {
    // The back door: small panes above, a solid panel below.
    const paneel = y + Math.round(h * 0.62);
    screen.fillRect(x, paneel, w, y + h - paneel, C.WIT);
    screen.strokeRect(x + 3, paneel + 3, w - 6, y + h - paneel - 6, C.KALK);
    staand(x + Math.round(w / 2));
    liggend(y + Math.round((paneel - y) / 3));
    liggend(y + Math.round(((paneel - y) * 2) / 3));
    screen.fillRect(x + w - 5, paneel - 4, 3, 2, C.ASGRIJS);
  } else if (stijl === 'bovenlicht') {
    liggend(y + Math.round(h * 0.28));
  } else if (stijl === 'kruis') {
    staand(x + Math.round(w / 2));
    liggend(y + Math.round(h * 0.42));
  } else {
    const bars = Math.max(1, Math.round(w / 40));
    for (let i = 1; i <= bars; i++) staand(x + Math.round((w * i) / (bars + 1)));
  }

  // Frame.
  screen.strokeRect(x - 1, y - 1, w + 2, h + 2, C.ZANDGRIJS);
  screen.fillRect(x - 3, y - 3, w + 6, 3, C.WIT);
  screen.fillRect(x - 3, y + h, w + 6, 3, C.WIT);
  screen.fillRect(x - 3, y - 3, 3, h + 6, C.WIT);
  screen.fillRect(x + w, y - 3, 3, h + 6, C.WIT);

  if (kind === 'deur') return;
  // Sill, oversailing both sides.
  screen.fillRect(x - 5, y + h + 2, w + 10, 3, C.WIT);
  screen.fillRect(x - 5, y + h + 5, w + 10, 1, C.ZANDGRIJS);
}

/**
 * The doorway between the keuken and the tv-kamer: no door in it, just the
 * orange curtain on its rings, inside a white architrave.
 */
function drawDeurgordijn(screen: Screen, x: number, y: number, w: number, h: number): void {
  screen.fillRect(x, y, w, h, C.TERRACOTTA);
  for (let px = x + 1; px < x + w - 1; px += 4) {
    screen.fillRect(px, y + 3, 1, h - 3, C.DONKERROOD);
    screen.fillRect(px + 1, y + 3, 1, h - 3, C.ROESTROOD);
  }
  screen.fillRect(x, y, w, 2, C.ROET);
  for (let px = x + 2; px < x + w - 2; px += 4) screen.set(px, y + 2, C.KALK);
  screen.fillRect(x - 3, y - 3, w + 6, 3, C.WIT);
  screen.fillRect(x - 3, y - 3, 3, h + 3, C.WIT);
  screen.fillRect(x + w, y - 3, 3, h + 3, C.WIT);
  screen.strokeRect(x - 1, y - 1, w + 2, h + 1, C.ZANDGRIJS);
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
