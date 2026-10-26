"""Render a straightened, measurable floor plan from a scanned OBJ.

Buildings are rectilinear, so we find the rotation that makes the wall points
line up with the axes (the angle whose projected histograms are spikiest) and
draw a one-metre grid over the result.

Usage: python3 -I tools/floorplan.py <scan.obj> <out.png> [px_per_m]
"""

import math
import os
import struct
import sys
import zlib
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from minifont import draw as draw_text, width_of

BG = (14, 16, 22)
GRID = (34, 40, 52)
GRID5 = (60, 70, 88)
WALL = (235, 232, 210)
FAINT = (120, 128, 120)
LABEL = (120, 150, 200)
LABEL5 = (190, 210, 255)


def read_vertices(path):
    out = []
    with open(path, "r", errors="replace") as fh:
        for line in fh:
            if line.startswith("v "):
                p = line.split()
                if len(p) >= 4:
                    try:
                        out.append((float(p[1]), float(p[2]), float(p[3])))
                    except ValueError:
                        pass
    return out


def floor_and_ceiling(heights, bins=64):
    lo, hi = min(heights), max(heights)
    span = hi - lo or 1.0
    counts = Counter(min(bins - 1, int((h - lo) / span * bins)) for h in heights)
    counts = [counts.get(i, 0) for i in range(bins)]
    ranked = sorted(range(bins), key=lambda i: counts[i], reverse=True)
    top = ranked[0]
    second = next((i for i in ranked[1:] if abs(i - top) > 8), ranked[1])
    h1 = lo + (top + 0.5) / bins * span
    h2 = lo + (second + 0.5) / bins * span
    return min(h1, h2), max(h1, h2)


def best_angle(pts, step_deg=0.25, cell=0.02):
    """Angle in [0,90) whose axis projections are most concentrated."""
    best, best_score = 0.0, -1.0
    t = 0.0
    while t < 90.0:
        r = math.radians(t)
        cos_t, sin_t = math.cos(r), math.sin(r)
        ha, hb = Counter(), Counter()
        for a, b in pts:
            ha[int((a * cos_t - b * sin_t) / cell)] += 1
            hb[int((a * sin_t + b * cos_t) / cell)] += 1
        score = sum(c * c for c in ha.values()) + sum(c * c for c in hb.values())
        if score > best_score:
            best, best_score = t, score
        t += step_deg
    return best


def write_png(path, width, height, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    blob = b"\x89PNG\r\n\x1a\n"
    blob += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    blob += chunk(b"IDAT", zlib.compress(raw, 6))
    blob += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(blob)


def main():
    obj_path, out_path = sys.argv[1], sys.argv[2]
    ppm = int(sys.argv[3]) if len(sys.argv) > 3 else 50

    verts = read_vertices(obj_path)
    heights = [v[1] for v in verts]                     # y is up in these scans
    floor, ceiling = floor_and_ceiling(heights)

    # Waist-height band: walls and worktops, not the floor slab or the ceiling.
    band = [(v[0], v[2]) for v in verts if floor + 0.5 <= v[1] <= min(ceiling - 0.3, floor + 1.9)]
    # Everything standing, for a faint context layer.
    ctx = [(v[0], v[2]) for v in verts if floor + 0.1 <= v[1] <= ceiling - 0.05]

    angle = best_angle(band)
    r = math.radians(angle)
    cos_t, sin_t = math.cos(r), math.sin(r)
    rot = lambda ps: [(a * cos_t - b * sin_t, a * sin_t + b * cos_t) for a, b in ps]
    band, ctx = rot(band), rot(ctx)

    a_lo = min(a for a, _ in ctx); a_hi = max(a for a, _ in ctx)
    b_lo = min(b for _, b in ctx); b_hi = max(b for _, b in ctx)
    pad = 0.4
    a_lo -= pad; b_lo -= pad; a_hi += pad; b_hi += pad
    w = int((a_hi - a_lo) * ppm) + 1
    h = int((b_hi - b_lo) * ppm) + 1

    img = [[BG] * w for _ in range(h)]

    # Metre grid, every fifth line brighter.
    for m in range(int(math.floor(a_lo)), int(math.ceil(a_hi)) + 1):
        x = int((m - a_lo) * ppm)
        if 0 <= x < w:
            c = GRID5 if m % 5 == 0 else GRID
            for y in range(h):
                img[y][x] = c
    for m in range(int(math.floor(b_lo)), int(math.ceil(b_hi)) + 1):
        y = int((m - b_lo) * ppm)
        if 0 <= y < h:
            c = GRID5 if m % 5 == 0 else GRID
            for x in range(w):
                img[y][x] = c

    def plot(points, color, weight):
        acc = {}
        for a, b in points:
            x = int((a - a_lo) * ppm)
            y = int((b - b_lo) * ppm)
            if 0 <= x < w and 0 <= y < h:
                acc[(x, y)] = acc.get((x, y), 0) + 1
        peak = max(acc.values()) if acc else 1
        for (x, y), n in acc.items():
            t = min(1.0, (n / peak) ** 0.25) * weight
            base = img[y][x]
            img[y][x] = tuple(int(base[i] + (color[i] - base[i]) * t) for i in range(3))

    plot(ctx, FAINT, 0.45)
    plot(band, WALL, 1.0)

    # Flip to final orientation first: minifont draws top-down, and so does
    # the output image, but img has been accumulating bottom-up until now.
    flipped = [img[y] for y in range(h - 1, -1, -1)]

    # Label the grid so we can talk about the plan precisely: columns A.. from
    # the left, rows 1.. from the top. Cell boundaries are the drawn gridlines.
    first_a = math.floor(a_lo) + 1
    first_b = math.floor(b_lo) + 1
    n_cols = int((a_hi - first_a))
    n_rows = int((b_hi - first_b))
    for i in range(max(0, n_cols)):
        label = chr(ord('A') + i) if i < 26 else 'A' + chr(ord('A') + i - 26)
        x = int((first_a + i - a_lo) * ppm) + ppm // 2 - width_of(label, 2) // 2
        draw_text(flipped, label, x, 4, LABEL5 if i % 5 == 0 else LABEL, 2)
    for j in range(max(0, n_rows)):
        label = str(j + 1)
        # Row 1 is the top row, so count down from b_hi.
        y = int((b_hi - (first_b + n_rows - j)) * ppm) + ppm // 2 - 5
        draw_text(flipped, label, 4, y, LABEL5 if j % 5 == 0 else LABEL, 2)

    rows = [bytearray(b for px in row for b in px) for row in flipped]
    write_png(out_path, w, h, rows)

    print(f"{obj_path}")
    print(f"  straightened by {angle:.2f} deg")
    print(f"  floor {floor:.2f}  ceiling {ceiling:.2f}  height {ceiling - floor:.2f} m")
    print(f"  extent {a_hi - a_lo:.2f} x {b_hi - b_lo:.2f} m")
    print(f"  wrote {out_path} ({w}x{h}px, {ppm} px/m, grid = 1 m)")


main()
