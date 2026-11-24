/**
 * The label for the floppy the surprise is handed over on.
 *
 * Drawn with the game's own PixelBuffer, font and palette, so the sticker is
 * the title screen rather than a picture of it. A 3.5" label is 70 x 54 mm on
 * the front face; at four pixels to the millimetre that is 280 x 216, which is
 * the game's own screen height.
 *
 * Usage: node --experimental-strip-types tools/sticker.ts [outdir] [scale]
 * Writes sticker.png and print.html (label at true size, with crop marks).
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PixelBuffer } from '../src/engine/pixelbuffer.ts';
import { PALETTE, C } from '../src/engine/palette.ts';

const MM_W = 70;
const MM_H = 54;
const W = MM_W * 4;
const H = MM_H * 4;

const CEILING_H = 22;
const WALL_Y = CEILING_H + 6;
const BANNER_Y = WALL_Y;
const BANNER_H = 64;
const FLOOR_Y = 176;
const FOOTER_Y = 190;

const PAPERED_X = 92;
const STRIPPED_X = 180;
const RAAK_X = PAPERED_X;
const RAAK_Y = 134;

const b = new PixelBuffer(W, H);
b.clear(C.ZWART);

// Ceiling: salie tongue-and-groove, white beams, cornice.
b.fillRect(0, 0, W, CEILING_H, C.SALIE);
for (let y = 2; y < CEILING_H; y += 4) b.fillRect(0, y, W, 1, C.DONKERSALIE);
for (let x = 18; x < W; x += 54) {
  b.fillRect(x, 0, 7, CEILING_H, C.KALK);
  b.fillRect(x, 0, 1, CEILING_H, C.WIT);
  b.fillRect(x + 6, 0, 1, CEILING_H, C.ZANDGRIJS);
}
b.fillRect(0, CEILING_H, W, 4, C.WIT);
b.fillRect(0, CEILING_H + 4, W, 2, C.ZANDGRIJS);

// The wall: finished ochre, old wallpaper, stripped to studs and wool.
const wallH = FLOOR_Y - WALL_Y;
b.fillRect(0, WALL_Y, PAPERED_X, wallH, C.OKER);

// Arched window.
{
  const x = 12, y = 112, w = 42, h = 34;
  b.fillRect(x, y + 4, w, h - 4, C.LUCHTBLAUW);
  b.fillRect(x + 3, y + 1, w - 6, 4, C.LUCHTBLAUW);
  b.fillRect(x + 9, y, w - 18, 2, C.LUCHTBLAUW);
  b.ditherRect(x, y + h - 12, w, 12, C.MOSGROEN, C.LUCHTBLAUW);
  b.fillRect(x, y + h - 6, w, 6, C.MOSGROEN);
  for (let mx = x + 13; mx < x + w - 2; mx += 13) b.fillRect(mx, y + 1, 1, h - 1, C.WIT);
  for (let my = y + 11; my < y + h - 2; my += 11) b.fillRect(x, my, w, 1, C.WIT);
  b.strokeRect(x - 2, y - 2, w + 4, h + 4, C.WIT);
  b.fillRect(x - 3, y + h + 1, w + 6, 3, C.KALK);
}

// Check wallpaper.
{
  const x = PAPERED_X, y = WALL_Y, w = STRIPPED_X - PAPERED_X, h = wallH;
  b.fillRect(x, y, w, h, C.KALK);
  for (let gx = x; gx < x + w; gx += 8) b.fillRect(gx, y, 1, h, C.LICHTOKER);
  for (let gy = y; gy < y + h; gy += 8) b.fillRect(x, gy, w, 1, C.LICHTOKER);
  for (let gx = x + 4; gx < x + w; gx += 24) b.fillRect(gx, y, 1, h, C.ZANDGRIJS);
  for (let gy = y + 4; gy < y + h; gy += 24) b.fillRect(x, gy, w, 1, C.ZANDGRIJS);
}

// Stripped end.
b.fillRect(STRIPPED_X, WALL_Y, W - STRIPPED_X, wallH, C.ROET);
{
  const FILL = [1, 0.5, 0, 0.72];
  let cavity = 0;
  for (let x = STRIPPED_X; x < W; x += 28, cavity++) {
    const fill = FILL[cavity % FILL.length]!;
    if (fill > 0) {
      const wh = Math.round((FLOOR_Y - BANNER_Y - BANNER_H) * fill);
      b.ditherRect(x + 5, FLOOR_Y - wh, 23, wh, C.BOTERGEEL, C.LICHTOKER);
      b.fillRect(x + 5, FLOOR_Y - wh, 23, 1, C.WIT);
    }
    b.fillRect(x, WALL_Y, 5, wallH, C.HOUT);
    b.fillRect(x, WALL_Y, 1, wallH, C.LICHTHOUT);
    b.fillRect(x + 4, WALL_Y, 1, wallH, C.STEEN);
  }
}
for (let y = WALL_Y; y < FLOOR_Y; y += 3) {
  const jag = ((y * 7919) % 13) - 6;
  const curl = ((y * 104729) % 5) + 2;
  b.fillRect(STRIPPED_X + jag - curl, y, curl, 3, C.KALK);
  b.fillRect(STRIPPED_X + jag - curl, y, 1, 3, C.ZANDGRIJS);
}

// The hole the voorhamer just made.
{
  const w = 46, h = 38;
  const x = RAAK_X - w / 2, y = RAAK_Y - h / 2;
  b.fillRect(x, y, w, h, C.ROET);
  b.ditherRect(x + 6, y + 7, w - 12, h - 13, C.DONKEROKER, C.OKER);
  b.fillRect(x + 6, y + 7, w - 12, 2, C.ZWART);
  b.fillRect(x + 6, y + 7, 2, h - 13, C.ZWART);
  const stud = x + w / 2 + 4;
  b.fillRect(stud, y + 4, 5, h - 8, C.HOUT);
  b.fillRect(stud, y + 4, 1, h - 8, C.LICHTHOUT);
  b.fillRect(stud + 4, y + 4, 1, h - 8, C.ROET);
  for (let ey = y; ey < y + h; ey += 3) {
    const jag = ((ey * 7919) % 9) - 4;
    b.fillRect(x + jag - 3, ey, 4, 3, C.KALK);
    b.fillRect(x + w + jag - 1, ey, 4, 3, C.KALK);
    b.fillRect(x + jag - 3, ey, 1, 3, C.ZANDGRIJS);
  }
  for (let ex = x; ex < x + w; ex += 4) {
    const jag = ((ex * 104729) % 7) - 3;
    b.fillRect(ex, y + jag - 2, 4, 3, C.KALK);
    b.fillRect(ex, y + h + jag - 1, 4, 3, C.KALK);
  }
}

// Floor: mahogany laid from the left, bare subfloor where the work is.
{
  const laidTo = STRIPPED_X - 34;
  const h = FOOTER_Y - FLOOR_Y;
  b.fillRect(0, FLOOR_Y, W, h, C.LICHTHOUT);
  b.ditherRect(laidTo, FLOOR_Y, W - laidTo, h, C.LICHTHOUT, C.HOUT);
  const BOARD_H = 7;
  for (let i = 0, y = FLOOR_Y; y < FOOTER_Y; i++, y += BOARD_H) {
    b.fillRect(0, y, laidTo, BOARD_H, C.MAHONIE);
    b.fillRect(0, y, laidTo, 1, C.ROET);
    b.fillRect(0, y + 1, laidTo, 1, C.DONKERROOD);
    for (let gx = (i * 37) % 41; gx < laidTo - 7; gx += 41) b.fillRect(gx, y + 4, 7, 1, C.DONKERROOD);
    for (let jx = ((i % 3) + 1) * 31; jx < laidTo; jx += 93) b.fillRect(jx, y, 1, BOARD_H, C.ROET);
  }
  b.fillRect(laidTo, FLOOR_Y, 2, h, C.ROET);
  b.fillRect(0, FLOOR_Y - 3, W, 3, C.WIT);
  b.fillRect(0, FLOOR_Y - 3, W, 1, C.ZANDGRIJS);
}

// Plaster in the air and on the floor.
{
  const KLEUR = [C.WIT, C.KALK, C.ZANDGRIJS, C.ASGRIJS];
  const t = 0.38;
  for (let i = 0; i < 28; i++) {
    const hoek = ((i * 7919) % 360) * (Math.PI / 180);
    const snelheid = 45 + ((i * 104729) % 85);
    const x = Math.round(RAAK_X + Math.cos(hoek) * snelheid * t);
    const y = Math.round(RAAK_Y - (Math.abs(Math.sin(hoek)) * snelheid + 30) * t + 240 * t * t);
    if (y > FLOOR_Y + 8 || y < BANNER_Y + BANNER_H + 2 || x < 4 || x >= W - 4) continue;
    const maat = i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1;
    b.fillRect(x, y, maat, maat, KLEUR[i % KLEUR.length]!);
  }
}

// Voorhamer, pulled back out of its own work.
{
  const x = RAAK_X - 22, y = RAAK_Y - 4;
  for (let i = 0; i < 52; i++) {
    const hx = x + Math.round(i * 0.38);
    b.fillRect(hx, y + i, 4, 1, C.HOUT);
    b.fillRect(hx, y + i, 1, 1, C.LICHTHOUT);
  }
  b.fillRect(x - 9, y - 11, 22, 13, C.ASGRIJS);
  b.fillRect(x - 9, y - 11, 22, 3, C.ZANDGRIJS);
  b.fillRect(x - 9, y - 1, 22, 3, C.ROET);
  b.fillRect(x - 2, y - 11, 8, 13, C.STEEN);
}

// The one thing not in the box, in the colour of the thing that never comes.
{
  const x = 198, y = 104, w = 70, h = 25;
  b.fillRect(x + 2, y + 2, w, h, C.ZWART);
  b.fillRect(x, y, w, h, C.MAGENTA);
  b.strokeRect(x + 1, y + 1, w - 2, h - 2, C.KALK);
  b.textCentered('EXCLUSIEF', x + w / 2, y + 5, C.WIT);
  b.textCentered('VENTILATIE', x + w / 2, y + 14, C.WIT);
}

// Title banner.
{
  const top = 'DE EEUWIGE';
  const bottom = 'VERBOUWING';
  const topX = Math.round((W - b.textScaledWidth(top, 2)) / 2);
  const bottomX = Math.round((W - b.textScaledWidth(bottom, 4)) / 2);
  b.fillRect(0, BANNER_Y, W, BANNER_H, C.ZWART);
  b.fillRect(0, BANNER_Y, W, 1, C.MAGENTA);
  b.fillRect(0, BANNER_Y + BANNER_H - 1, W, 1, C.MAGENTA);
  b.textScaled(top, topX + 1, BANNER_Y + 7, C.DONKEROKER, 2);
  b.textScaled(top, topX, BANNER_Y + 6, C.LICHTOKER, 2);
  b.textScaled(bottom, bottomX + 2, BANNER_Y + 24, C.DONKERROOD, 4);
  b.textScaled(bottom, bottomX, BANNER_Y + 22, C.KALK, 4);
  b.textCentered('EEN SINTERKLAASSURPRISE VOOR WOUTER', W / 2, BANNER_Y + 54, C.SALIE);
}

// Footer: the small print every disk label has.
b.fillRect(0, FOOTER_Y, W, H - FOOTER_Y, C.ZWART);
b.fillRect(0, FOOTER_Y, W, 1, C.STEEN);
{
  const L = 10, R = W - 10;
  const rechts = (t: string, y: number, c: number) => b.text(t, R - b.textScaledWidth(t, 1), y, c);
  b.text('BLACK&DEKKER SOFTWARE', L, FOOTER_Y + 5, C.LICHTOKER);
  rechts('DISK 1/1 - 1.44 MB', FOOTER_Y + 5, C.KALK);
  b.text('MET WIEP, MARGRIET, MYRTHE EN PIM', L, FOOTER_Y + 15, C.ASGRIJS);
}

// ---- output -------------------------------------------------------------

const outdir = process.argv[2] ?? 'sticker';
const scale = Number(process.argv[3] ?? 12);
mkdirSync(outdir, { recursive: true });

const rgb = PALETTE.map((hex) => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
]);
const rows: Buffer[] = [];
for (let y = 0; y < H; y++) {
  const row = Buffer.alloc(1 + W * scale * 3);
  for (let x = 0; x < W; x++) {
    const [r, g, bl] = rgb[b.get(x, y)]!;
    for (let s = 0; s < scale; s++) {
      const o = 1 + (x * scale + s) * 3;
      row[o] = r!; row[o + 1] = g!; row[o + 2] = bl!;
    }
  }
  for (let s = 0; s < scale; s++) rows.push(row);
}

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function chunk(tag: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(tag, 'ascii'), data]);
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, body, crcBuf]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W * scale, 0);
ihdr.writeUInt32BE(H * scale, 4);
ihdr[8] = 8; ihdr[9] = 2;
// pHYs, so anything that honours it prints the label at 70 x 54 mm unasked.
const phys = Buffer.alloc(9);
const ppm = Math.round((W * scale) / (MM_W / 1000));
phys.writeUInt32BE(ppm, 0);
phys.writeUInt32BE(ppm, 4);
phys[8] = 1;

writeFileSync(join(outdir, 'sticker.png'), Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('pHYs', phys),
  chunk('IDAT', deflateSync(Buffer.concat(rows))),
  chunk('IEND', Buffer.alloc(0)),
]));

// Three to a sheet: one to stick, two to get the cutting wrong on.
const label = `<div class="label"><img src="sticker.png" alt=""><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>`;
writeFileSync(join(outdir, 'print.html'), `<!DOCTYPE html>
<html lang="nl">
<meta charset="UTF-8">
<title>Sticker - De Eeuwige Verbouwing</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { margin: 0; font: 9pt/1.4 system-ui, sans-serif; color: #46392f; }
  p { margin: 0 0 8mm; }
  .label { position: relative; width: ${MM_W}mm; height: ${MM_H}mm; margin: 0 0 14mm 6mm; }
  .label img { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
  .label i { position: absolute; width: 4mm; height: 4mm; border: 0 solid #000; }
  .tl { left: -5mm; top: -5mm; border-right-width: .2mm !important; border-bottom-width: .2mm !important; }
  .tr { right: -5mm; top: -5mm; border-left-width: .2mm !important; border-bottom-width: .2mm !important; }
  .bl { left: -5mm; bottom: -5mm; border-right-width: .2mm !important; border-top-width: .2mm !important; }
  .br { right: -5mm; bottom: -5mm; border-left-width: .2mm !important; border-top-width: .2mm !important; }
  .tl, .tr, .bl, .br { transform: none; }
</style>
<p>${MM_W} x ${MM_H} mm. Print op 100% (niet "passend maken"), op stickerpapier. Snij langs de hoekjes.</p>
${label}
${label}
${label}
</html>
`);

console.log(`wrote ${outdir}/sticker.png (${W * scale}x${H * scale}) and ${outdir}/print.html`);
