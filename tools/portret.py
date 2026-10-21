"""Turn a photo into a sprite in the game's 24 colours.

Crops and scales with ffmpeg, then maps each pixel to the nearest palette
entry. Emits ASCII art, one character per palette index, which is checked in
as a normal source file and hand-tuned afterwards — the machine gets the
likeness roughly right, a person fixes the eyes and the glasses.

Usage: python3 -I tools/portret.py <image> <crop w:h:x:y> <cols> <rows>
"""

import re
import struct
import subprocess
import sys
import zlib

KEYS = '0123456789abcdefghijklmn'

PALETTE = [
    '#0e0d0b', '#241e19', '#46392f', '#6b6358', '#9a9081', '#cdc6b2', '#f5f2e6',
    '#3d5247', '#7e9c86', '#bad0bf',
    '#7d4a1c', '#cc8a2e', '#f0c06a',
    '#47201a', '#913b27', '#c25f33',
    '#6e2f23', '#a9743f', '#d9a86a',
    '#e3e08f', '#5e7a3a', '#8fc3dd', '#2d4663', '#8e3a5c',
]
RGB = [(int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)) for h in PALETTE]


def luma(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def nearest(pixel, allowed):
    best, best_d = allowed[0], None
    for i in allowed:
        c = RGB[i]
        dr, dg, db = pixel[0] - c[0], pixel[1] - c[1], pixel[2] - c[2]
        dl = luma(pixel) - luma(c)
        d = 0.7 * (dr * dr + dg * dg + db * db) + 1.3 * dl * dl
        if best_d is None or d < best_d:
            best, best_d = i, d
    return best


# A face has no business being grey, green or blue. Restricting the palette
# keeps mid-brown hair out of the neutrals, where it reads as grey.
PORTRET = [0, 1, 2, 5, 6, 10, 11, 12, 13, 16, 17, 18, 19]


def write_png(path, width, height, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    blob = b'\x89PNG\r\n\x1a\n'
    blob += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    blob += chunk(b'IDAT', zlib.compress(raw, 6))
    blob += chunk(b'IEND', b'')
    open(path, 'wb').write(blob)


def preview(art, cols, rows, path, scale=6):
    out = []
    for line in art:
        row = bytearray()
        for ch in line:
            c = (24, 24, 28) if ch == '.' else RGB[KEYS.index(ch)]
            row += bytes(c) * scale
        for _ in range(scale):
            out.append(row)
    write_png(path, cols * scale, rows * scale, out)


def main():
    path, crop, cols, rows = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    if not re.fullmatch(r'\d+:\d+:\d+:\d+', crop):
        raise SystemExit('crop must be w:h:x:y')

    # A little extra contrast and saturation survives quantisation better.
    vf = f'crop={crop},scale={cols}:{rows}:flags=lanczos,eq=contrast=1.18:saturation=1.25'
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-vf', vf,
         '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        capture_output=True, check=True).stdout

    art = []
    for y in range(rows):
        line = ''
        for x in range(cols):
            i = (y * cols + x) * 3
            line += KEYS[nearest((raw[i], raw[i + 1], raw[i + 2]), PORTRET)]
        art.append(line)

    out = sys.argv[5] if len(sys.argv) > 5 else None
    if out:
        preview(art, cols, rows, out)
        print(f'wrote {out}')
    for line in art:
        print(f"  '{line}',")


main()
