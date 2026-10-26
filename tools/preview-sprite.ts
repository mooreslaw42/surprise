/**
 * Render a sprite to a PNG without starting the game, so drawing code can be
 * iterated on quickly. Usage: node --experimental-strip-types tools/preview-sprite.ts <out.png> [scale]
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { PixelBuffer } from '../src/engine/pixelbuffer.ts';
import { PALETTE, C } from '../src/engine/palette.ts';
import { drawPim, PIM_W, PIM_H } from '../src/scenes/pim.ts';

const scale = Number(process.argv[3] ?? 7);
const pad = 4;
const buf = new PixelBuffer(PIM_W + pad * 2, PIM_H + pad * 2 + 14);
buf.clear(C.ZWART);
drawPim(buf, pad, pad);

const rgb = PALETTE.map((hex) => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
]);

const rows: Buffer[] = [];
for (let y = 0; y < buf.height; y++) {
  const row = Buffer.alloc(1 + buf.width * scale * 3);
  for (let x = 0; x < buf.width; x++) {
    const [r, g, b] = rgb[buf.get(x, y)]!;
    for (let s = 0; s < scale; s++) {
      const o = 1 + (x * scale + s) * 3;
      row[o] = r!; row[o + 1] = g!; row[o + 2] = b!;
    }
  }
  for (let s = 0; s < scale; s++) rows.push(Buffer.from(row));
}

function chunk(tag: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(tag, 'ascii'), data]);
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, body, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(buf.width * scale, 0);
ihdr.writeUInt32BE(buf.height * scale, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

writeFileSync(process.argv[2]!, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(Buffer.concat(rows))),
  chunk('IEND', Buffer.alloc(0)),
]));
console.log(`wrote ${process.argv[2]} (${buf.width * scale}x${buf.height * scale})`);
