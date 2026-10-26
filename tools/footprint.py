"""Coarse floor footprint from a scanned OBJ, as ASCII.

Uses points just above floor level rather than waist height: those cover the
floor itself, so the raster is the area you can walk on rather than the things
standing in it. Straightened the same way as the floor plan.

Usage: python3 -I tools/footprint.py <scan.obj> <cols> <rows> [angle]
"""

import math
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from floorplan import read_vertices, floor_and_ceiling, best_angle


def main():
    path, cols, rows = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    verts = read_vertices(path)
    heights = [v[1] for v in verts]
    floor, ceiling = floor_and_ceiling(heights)

    band = [(v[0], v[2]) for v in verts if floor + 0.5 <= v[1] <= min(ceiling - 0.3, floor + 1.9)]
    angle = float(sys.argv[4]) if len(sys.argv) > 4 else best_angle(band)
    r = math.radians(angle)
    ct, st = math.cos(r), math.sin(r)

    # Just above the floor: the slab, not the furniture.
    low = [(v[0] * ct - v[2] * st, v[0] * st + v[2] * ct)
           for v in verts if floor - 0.05 <= v[1] <= floor + 0.45]
    if not low:
        raise SystemExit('no points near floor level')

    a_lo = min(a for a, _ in low); a_hi = max(a for a, _ in low)
    b_lo = min(b for _, b in low); b_hi = max(b for _, b in low)
    counts = Counter()
    for a, b in low:
        cx = min(cols - 1, int((a - a_lo) / (a_hi - a_lo + 1e-9) * cols))
        cy = min(rows - 1, int((b - b_lo) / (b_hi - b_lo + 1e-9) * rows))
        counts[(cx, cy)] += 1

    peak = max(counts.values())
    print(f"# {os.path.basename(path)}  angle {angle:.2f}")
    print(f"# {a_hi - a_lo:.1f} x {b_hi - b_lo:.1f} m over {cols} x {rows} cells")
    print(f"# cell ~ {(a_hi - a_lo) / cols:.2f} x {(b_hi - b_lo) / rows:.2f} m")
    for y in range(rows - 1, -1, -1):
        line = ''
        for x in range(cols):
            n = counts.get((x, y), 0)
            line += '#' if n > peak * 0.04 else ('+' if n > peak * 0.01 else '.')
        print(f"  '{line}',")


main()
