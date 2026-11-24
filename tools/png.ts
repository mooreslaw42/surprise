/** Write a PixelBuffer as a PNG, integer-scaled, stamped with its print size. */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import type { PixelBuffer } from '../src/engine/pixelbuffer.ts';
import { PALETTE } from '../src/engine/palette.ts';

export function schrijfPng(pad: string, buf: PixelBuffer, scale: number, breedteMm: number): void {
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
    for (let s = 0; s < scale; s++) rows.push(row);
  }
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const chunk = (tag: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(tag, 'ascii'), data]);
    let crc = 0xffffffff;
    for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(buf.width * scale, 0);
  ihdr.writeUInt32BE(buf.height * scale, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const phys = Buffer.alloc(9);
  const ppm = Math.round((buf.width * scale) / (breedteMm / 1000));
  phys.writeUInt32BE(ppm, 0);
  phys.writeUInt32BE(ppm, 4);
  phys[8] = 1;
  writeFileSync(pad, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('pHYs', phys),
    chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)),
  ]));
}
