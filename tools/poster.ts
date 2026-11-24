/**
 * The A3 poster that goes with the floppy.
 *
 * One pixel to the millimetre: 297 x 420. Text sits on that grid; the wall and
 * the cast are drawn at half that and doubled, the way the title is.
 *
 * Usage: node --experimental-strip-types tools/poster.ts [outdir] [scale]
 * Writes poster.png and poster.html (A3, no margins, for printing to PDF).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PixelBuffer } from '../src/engine/pixelbuffer.ts';
import { C } from '../src/engine/palette.ts';
import { drawPim, PIM_W, PIM_H } from '../src/scenes/pim.ts';
import { drawMoeder, drawMyrthe, drawWiep } from '../src/scenes/portretten.ts';
import { schrijfPng } from './png.ts';

const W = 297;
const H = 420;

const CEILING_H = 22;
const SCENE_Y = CEILING_H + 6;
const BANNER_Y = 34;
const BANNER_H = 88;
const PANEL_Y = 246;

const p = new PixelBuffer(W, H);
p.clear(C.ZWART);

/** Copy a small buffer onto the poster with every pixel doubled. */
function dubbel(src: PixelBuffer, x: number, y: number): void {
  for (let sy = 0; sy < src.height; sy++) {
    for (let sx = 0; sx < src.width; sx++) p.fillRect(x + sx * 2, y + sy * 2, 2, 2, src.get(sx, sy));
  }
}

// Ceiling.
p.fillRect(0, 0, W, CEILING_H, C.SALIE);
for (let y = 2; y < CEILING_H; y += 4) p.fillRect(0, y, W, 1, C.DONKERSALIE);
for (let x = 22; x < W; x += 54) {
  p.fillRect(x, 0, 7, CEILING_H, C.KALK);
  p.fillRect(x, 0, 1, CEILING_H, C.WIT);
  p.fillRect(x + 6, 0, 1, CEILING_H, C.ZANDGRIJS);
}
p.fillRect(0, CEILING_H, W, 4, C.WIT);
p.fillRect(0, CEILING_H + 4, W, 2, C.ZANDGRIJS);

// The wall, at half size.
{
  const SW = Math.ceil(W / 2);
  const SH = (PANEL_Y - SCENE_Y) / 2;
  const TOP = (BANNER_Y + BANNER_H - SCENE_Y) / 2;   // first row the banner leaves visible
  const FLOOR = SH - 12;
  const PAPERED = 64;
  const STRIPPED = 108;
  const RAAK_X = PAPERED;
  const RAAK_Y = Math.round((TOP + FLOOR) / 2) - 1;
  const s = new PixelBuffer(SW, SH);

  s.fillRect(0, 0, PAPERED, FLOOR, C.OKER);

  {
    const x = 6, w = 28, h = 30, y = RAAK_Y - 15;
    s.fillRect(x, y + 4, w, h - 4, C.LUCHTBLAUW);
    s.fillRect(x + 3, y + 1, w - 6, 4, C.LUCHTBLAUW);
    s.fillRect(x + 7, y, w - 14, 2, C.LUCHTBLAUW);
    s.ditherRect(x, y + h - 12, w, 12, C.MOSGROEN, C.LUCHTBLAUW);
    s.fillRect(x, y + h - 6, w, 6, C.MOSGROEN);
    s.fillRect(x + 14, y + 1, 1, h - 1, C.WIT);
    for (let my = y + 10; my < y + h - 2; my += 10) s.fillRect(x, my, w, 1, C.WIT);
    s.strokeRect(x - 2, y - 2, w + 4, h + 4, C.WIT);
    s.fillRect(x - 3, y + h + 1, w + 6, 3, C.KALK);
  }

  {
    const x = PAPERED, w = STRIPPED - PAPERED;
    s.fillRect(x, 0, w, FLOOR, C.KALK);
    for (let gx = x; gx < x + w; gx += 8) s.fillRect(gx, 0, 1, FLOOR, C.LICHTOKER);
    for (let gy = 0; gy < FLOOR; gy += 8) s.fillRect(x, gy, w, 1, C.LICHTOKER);
    for (let gx = x + 4; gx < x + w; gx += 24) s.fillRect(gx, 0, 1, FLOOR, C.ZANDGRIJS);
    for (let gy = 4; gy < FLOOR; gy += 24) s.fillRect(x, gy, w, 1, C.ZANDGRIJS);
  }

  s.fillRect(STRIPPED, 0, SW - STRIPPED, FLOOR, C.ROET);
  {
    const FILL = [1, 0.45, 0.75];
    let cavity = 0;
    for (let x = STRIPPED; x < SW; x += 15, cavity++) {
      const wh = Math.round((FLOOR - TOP) * FILL[cavity % FILL.length]!);
      s.ditherRect(x + 4, FLOOR - wh, 11, wh, C.BOTERGEEL, C.LICHTOKER);
      s.fillRect(x + 4, FLOOR - wh, 11, 1, C.WIT);
      s.fillRect(x, 0, 4, FLOOR, C.HOUT);
      s.fillRect(x, 0, 1, FLOOR, C.LICHTHOUT);
      s.fillRect(x + 3, 0, 1, FLOOR, C.STEEN);
    }
  }
  for (let y = 0; y < FLOOR; y += 3) {
    const jag = ((y * 7919) % 9) - 4;
    const curl = ((y * 104729) % 4) + 2;
    s.fillRect(STRIPPED + jag - curl, y, curl, 3, C.KALK);
    s.fillRect(STRIPPED + jag - curl, y, 1, 3, C.ZANDGRIJS);
  }

  {
    const w = 40, h = 34;
    const x = RAAK_X - w / 2, y = RAAK_Y - h / 2;
    s.fillRect(x, y, w, h, C.ROET);
    s.ditherRect(x + 6, y + 7, w - 12, h - 13, C.DONKEROKER, C.OKER);
    s.fillRect(x + 6, y + 7, w - 12, 2, C.ZWART);
    s.fillRect(x + 6, y + 7, 2, h - 13, C.ZWART);
    const stud = x + w / 2 + 4;
    s.fillRect(stud, y + 4, 5, h - 8, C.HOUT);
    s.fillRect(stud, y + 4, 1, h - 8, C.LICHTHOUT);
    s.fillRect(stud + 4, y + 4, 1, h - 8, C.ROET);
    for (let ey = y; ey < y + h; ey += 3) {
      const jag = ((ey * 7919) % 7) - 3;
      s.fillRect(x + jag - 3, ey, 4, 3, C.KALK);
      s.fillRect(x + w + jag - 1, ey, 4, 3, C.KALK);
      s.fillRect(x + jag - 3, ey, 1, 3, C.ZANDGRIJS);
    }
    for (let ex = x; ex < x + w; ex += 4) {
      const jag = ((ex * 104729) % 5) - 2;
      s.fillRect(ex, y + jag - 2, 4, 3, C.KALK);
      s.fillRect(ex, y + h + jag - 1, 4, 3, C.KALK);
    }
  }

  {
    const laidTo = STRIPPED - 22;
    const h = SH - FLOOR;
    s.fillRect(0, FLOOR, SW, h, C.LICHTHOUT);
    s.ditherRect(laidTo, FLOOR, SW - laidTo, h, C.LICHTHOUT, C.HOUT);
    for (let i = 0, y = FLOOR; y < SH; i++, y += 6) {
      s.fillRect(0, y, laidTo, 6, C.MAHONIE);
      s.fillRect(0, y, laidTo, 1, C.ROET);
      s.fillRect(0, y + 1, laidTo, 1, C.DONKERROOD);
      for (let gx = (i * 37) % 41; gx < laidTo - 7; gx += 41) s.fillRect(gx, y + 3, 7, 1, C.DONKERROOD);
      for (let jx = ((i % 3) + 1) * 23; jx < laidTo; jx += 69) s.fillRect(jx, y, 1, 6, C.ROET);
    }
    s.fillRect(laidTo, FLOOR, 2, h, C.ROET);
    s.fillRect(0, FLOOR - 3, SW, 3, C.WIT);
    s.fillRect(0, FLOOR - 3, SW, 1, C.ZANDGRIJS);
  }

  {
    const KLEUR = [C.WIT, C.KALK, C.ZANDGRIJS, C.ASGRIJS];
    const t = 0.36;
    for (let i = 0; i < 28; i++) {
      const hoek = ((i * 7919) % 360) * (Math.PI / 180);
      const snelheid = 40 + ((i * 104729) % 70);
      const x = Math.round(RAAK_X + Math.cos(hoek) * snelheid * t);
      const y = Math.round(RAAK_Y - (Math.abs(Math.sin(hoek)) * snelheid + 30) * t + 240 * t * t);
      if (y > FLOOR + 6 || y < TOP + 2 || x < 2 || x >= SW - 2) continue;
      const maat = i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1;
      s.fillRect(x, y, maat, maat, KLEUR[i % KLEUR.length]!);
    }
  }

  {
    const x = RAAK_X - 16, y = RAAK_Y - 6;
    for (let i = 0; i < SH - y - 2; i++) {
      const hx = x + Math.round(i * 0.38);
      s.fillRect(hx, y + i, 4, 1, C.HOUT);
      s.fillRect(hx, y + i, 1, 1, C.LICHTHOUT);
    }
    s.fillRect(x - 9, y - 11, 22, 13, C.ASGRIJS);
    s.fillRect(x - 9, y - 11, 22, 3, C.ZANDGRIJS);
    s.fillRect(x - 9, y - 1, 22, 3, C.ROET);
    s.fillRect(x - 2, y - 11, 8, 13, C.STEEN);
  }

  dubbel(s, 0, SCENE_Y);
}

// Title banner.
{
  const top = 'DE EEUWIGE';
  const bottom = 'VERBOUWING';
  const topX = Math.round((W - p.textScaledWidth(top, 3)) / 2);
  const bottomX = Math.round((W - p.textScaledWidth(bottom, 4)) / 2);
  p.fillRect(0, BANNER_Y, W, BANNER_H, C.ZWART);
  p.fillRect(0, BANNER_Y, W, 1, C.MAGENTA);
  p.fillRect(0, BANNER_Y + BANNER_H - 1, W, 1, C.MAGENTA);
  p.textCentered('BLACK&DEKKER SOFTWARE PRESENTEERT', W / 2, BANNER_Y + 7, C.ASGRIJS);
  p.textScaled(top, topX + 1, BANNER_Y + 20, C.DONKEROKER, 3);
  p.textScaled(top, topX, BANNER_Y + 19, C.LICHTOKER, 3);
  p.textScaled(bottom, bottomX + 2, BANNER_Y + 47, C.DONKERROOD, 4);
  p.textScaled(bottom, bottomX, BANNER_Y + 45, C.KALK, 4);
  p.textCentered('EEN SINTERKLAASSURPRISE VOOR WOUTER', W / 2, BANNER_Y + 77, C.SALIE);
}

// Lower panel: tagline, cast, small print.
p.fillRect(0, PANEL_Y, W, H - PANEL_Y, C.ZWART);
p.fillRect(0, PANEL_Y, W, 1, C.MAGENTA);
{
  const tag = 'DIT KEER KOMT HET AF.';
  const tagX = Math.round((W - p.textScaledWidth(tag, 2)) / 2);
  p.textScaled(tag, tagX + 1, PANEL_Y + 10, C.DONKEROKER, 2);
  p.textScaled(tag, tagX, PANEL_Y + 9, C.LICHTOKER, 2);

  p.textCentered('MET OPTREDENS VAN', W / 2, PANEL_Y + 31, C.ASGRIJS);

  const CAST = [
    { naam: 'WIEP', teken: drawWiep },
    { naam: 'MARGRIET', teken: drawMoeder },
    { naam: 'MYRTHE', teken: drawMyrthe },
    { naam: 'PIM', teken: drawPim },
  ];
  // Four do not fit side by side at full width, so each loses the empty
  // margin either side of the head: the frame closes in, the face stays.
  const SNEE = 4;
  const kw = PIM_W - SNEE * 2;
  const pw = kw * 2, ph = PIM_H * 2, gap = 8;
  const x0 = Math.round((W - (pw * CAST.length + gap * (CAST.length - 1))) / 2);
  const y0 = PANEL_Y + 43;
  CAST.forEach(({ naam, teken }, i) => {
    const kop = new PixelBuffer(kw, PIM_H);
    kop.clear(C.ROET);
    teken(kop, -SNEE, 0, false);
    const x = x0 + i * (pw + gap);
    p.fillRect(x - 2, y0 - 2, pw + 4, ph + 4, C.STEEN);
    dubbel(kop, x, y0);
    p.textCentered(naam, x + pw / 2, y0 + ph + 5, C.KALK);
  });

  p.fillRect(14, H - 21, W - 28, 1, C.STEEN);
  p.textCentered('8 FASEN - 3 KAMERS - 0 VENTILATIE', W / 2, H - 15, C.LICHTOKER);
}

const outdir = process.argv[2] ?? 'poster';
const scale = Number(process.argv[3] ?? 12);
mkdirSync(outdir, { recursive: true });
schrijfPng(join(outdir, 'poster.png'), p, scale, W);
writeFileSync(join(outdir, 'poster.html'), `<!DOCTYPE html>
<html lang="nl">
<meta charset="UTF-8">
<title>Poster - De Eeuwige Verbouwing</title>
<style>
  @page { size: 297mm 420mm; margin: 0; }
  html, body { margin: 0; background: #0e0d0b; }
  img { display: block; width: 297mm; height: 420mm; image-rendering: pixelated; }
</style>
<img src="poster.png" alt="De Eeuwige Verbouwing">
</html>
`);
console.log(`wrote ${outdir}/poster.png (${W * scale}x${H * scale}) and ${outdir}/poster.html`);
