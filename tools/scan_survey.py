"""Survey a scanned OBJ: dimensions, up-axis, floor/ceiling heights, floor plan.

Reads only `v` lines, so it is fast and indifferent to how the mesh is
triangulated. Writes a top-down plan PNG and prints the numbers we need to
build the house data model.

Usage: python3 -I tools/scan_survey.py <scan.obj> <out-prefix>
"""

import struct
import sys
import zlib
from collections import Counter


def read_vertices(path):
    xs, ys, zs = [], [], []
    with open(path, "r", errors="replace") as fh:
        for line in fh:
            if not line.startswith("v "):
                continue
            parts = line.split()
            if len(parts) < 4:
                continue
            try:
                xs.append(float(parts[1]))
                ys.append(float(parts[2]))
                zs.append(float(parts[3]))
            except ValueError:
                continue
    return xs, ys, zs


def histogram(values, bins=48):
    lo, hi = min(values), max(values)
    span = hi - lo or 1.0
    counts = Counter(min(bins - 1, int((v - lo) / span * bins)) for v in values)
    return lo, hi, span, [counts.get(i, 0) for i in range(bins)]


def sparkline(counts, width=48):
    chars = " .:-=+*#%@"
    peak = max(counts) or 1
    return "".join(chars[min(len(chars) - 1, int(c / peak * (len(chars) - 1)))] for c in counts[:width])


def peakiness(values):
    """Fraction of points in the single densest bin. Floors and ceilings are
    huge flat planes, so the vertical axis scores far higher than the others."""
    _, _, _, counts = histogram(values, bins=64)
    return max(counts) / len(values)


def write_png(path, width, height, rgb_rows):
    raw = b"".join(b"\x00" + bytes(row) for row in rgb_rows)
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 6))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


def render_plan(path, pts_a, pts_b, heights, floor, ceiling, px_per_m=60):
    """Top-down density plot of the band between knee and shoulder height, so
    walls and worktops show up and the floor slab does not drown everything."""
    lo_cut = floor + 0.4
    hi_cut = min(ceiling - 0.3, floor + 2.0)
    sel = [(a, b) for a, b, h in zip(pts_a, pts_b, heights) if lo_cut <= h <= hi_cut]
    if not sel:
        sel = list(zip(pts_a, pts_b))

    a_lo = min(a for a, _ in sel); a_hi = max(a for a, _ in sel)
    b_lo = min(b for _, b in sel); b_hi = max(b for _, b in sel)
    w = max(1, int((a_hi - a_lo) * px_per_m) + 1)
    h = max(1, int((b_hi - b_lo) * px_per_m) + 1)

    grid = [[0] * w for _ in range(h)]
    for a, b in sel:
        x = min(w - 1, int((a - a_lo) * px_per_m))
        y = min(h - 1, int((b - b_lo) * px_per_m))
        grid[y][x] += 1

    peak = max((max(r) for r in grid if r), default=1) or 1
    rows = []
    for y in range(h - 1, -1, -1):          # flip so +axis points up
        row = bytearray()
        for x in range(w):
            n = grid[y][x]
            if n == 0:
                row += b"\x10\x12\x18"
            else:
                t = min(1.0, (n / peak) ** 0.35)
                row += bytes((int(40 + 215 * t), int(50 + 190 * t), int(60 + 120 * t)))
        rows.append(row)
    write_png(path, w, h, rows)
    return w, h, (a_hi - a_lo), (b_hi - b_lo)


def main():
    obj_path, prefix = sys.argv[1], sys.argv[2]
    xs, ys, zs = read_vertices(obj_path)
    axes = {"x": xs, "y": ys, "z": zs}
    print(f"\n=== {obj_path}")
    print(f"vertices: {len(xs):,}")

    scores = {}
    for name, vals in axes.items():
        lo, hi, span, counts = histogram(vals)
        scores[name] = peakiness(vals)
        print(f"  {name}: {lo:8.2f} .. {hi:8.2f}   extent {span:6.2f}   flatness {scores[name]:.3f}")
        print(f"     |{sparkline(counts)}|")

    up = max(scores, key=lambda k: scores[k])
    flat = [k for k in axes if k != up]
    heights = axes[up]
    lo, hi, _, counts = histogram(heights, bins=64)

    # Floor and ceiling are the two densest bins, far apart.
    ranked = sorted(range(64), key=lambda i: counts[i], reverse=True)
    top = ranked[0]
    second = next((i for i in ranked[1:] if abs(i - top) > 8), ranked[1])
    h1 = lo + (top + 0.5) / 64 * (hi - lo)
    h2 = lo + (second + 0.5) / 64 * (hi - lo)
    floor, ceiling = min(h1, h2), max(h1, h2)

    print(f"\n  up axis: {up}   plan axes: {flat[0]} x {flat[1]}")
    print(f"  floor   ~ {floor:.2f}")
    print(f"  ceiling ~ {ceiling:.2f}")
    print(f"  CEILING HEIGHT ~ {ceiling - floor:.2f} m   (if units are metres)")

    out = f"{prefix}-plan.png"
    w, h, ea, eb = render_plan(out, axes[flat[0]], axes[flat[1]], heights, floor, ceiling)
    print(f"  footprint: {ea:.2f} x {eb:.2f} m")
    print(f"  wrote {out}  ({w}x{h}px at 60 px/m)")


main()
