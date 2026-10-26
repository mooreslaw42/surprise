"""Pull real wall elevations out of a scanned OBJ.

Straightens the scan, finds the vertical planes, splits each into contiguous
segments, then projects the points of each segment into an (along-wall, height)
grid. Openings fall out as vertical gaps that are bounded by wall above and
below — which is what a window is.

Usage: python3 -I tools/walls.py <scan.obj> <out-dir> [angle]
"""

import math
import os
import struct
import sys
import zlib
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from minifont import draw as draw_text, width_of

CELL = 0.05           # 5 cm raster
PLANE_TOL = 0.10      # points this close to a plane belong to it
MIN_WALL_POINTS = 400
MIN_SEG_LEN = 1.2     # metres
SEG_GAP = 0.6         # a gap this wide splits a wall into two segments

BG = (12, 13, 18)
WALL = (205, 198, 178)
WALL_DIM = (120, 114, 100)
OPENING = (143, 195, 221)
EDGE = (70, 75, 90)
LABEL = (240, 192, 106)


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
    a = lo + (top + 0.5) / bins * span
    b = lo + (second + 0.5) / bins * span
    return min(a, b), max(a, b)


def best_angle(pts, step=0.25, cell=0.02):
    best, best_score = 0.0, -1.0
    t = 0.0
    while t < 90.0:
        r = math.radians(t)
        ct, st = math.cos(r), math.sin(r)
        ha, hb = Counter(), Counter()
        for a, b in pts:
            ha[int((a * ct - b * st) / cell)] += 1
            hb[int((a * st + b * ct) / cell)] += 1
        score = sum(c * c for c in ha.values()) + sum(c * c for c in hb.values())
        if score > best_score:
            best, best_score = t, score
        t += step
    return best


def peaks(values, cell=CELL, min_count=MIN_WALL_POINTS, min_gap=0.35):
    """Bin positions that hold enough points to be a wall, keeping the
    strongest when several land within min_gap of each other."""
    hist = Counter(int(round(v / cell)) for v in values)
    found = []
    for b, n in sorted(hist.items(), key=lambda kv: -kv[1]):
        if n < min_count:
            break
        pos = b * cell
        if all(abs(pos - p) > min_gap for p, _ in found):
            found.append((pos, n))
    return sorted(found)


def segments(coords, gap=SEG_GAP, min_len=MIN_SEG_LEN):
    if not coords:
        return []
    coords = sorted(coords)
    out, start, prev = [], coords[0], coords[0]
    for c in coords[1:]:
        if c - prev > gap:
            if prev - start >= min_len:
                out.append((start, prev))
            start = c
        prev = c
    if prev - start >= min_len:
        out.append((start, prev))
    return out


def write_png(path, width, height, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    blob = b"\x89PNG\r\n\x1a\n"
    blob += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    blob += chunk(b"IDAT", zlib.compress(raw, 6))
    blob += chunk(b"IEND", b"")
    open(path, "wb").write(blob)


def elevation(points, u0, u1, floor, ceiling):
    """Occupancy grid over the wall face, and the openings found in it."""
    cols = max(1, int((u1 - u0) / CELL) + 1)
    rows = max(1, int((ceiling - floor) / CELL) + 1)
    grid = [[0] * cols for _ in range(rows)]
    for u, h in points:
        c = int((u - u0) / CELL)
        r = int((h - floor) / CELL)
        if 0 <= c < cols and 0 <= r < rows:
            grid[r][c] += 1

    # Smear by one cell: scans are sparse and a wall should read as solid.
    solid = [[False] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            if grid[r][c]:
                for dr in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        if 0 <= r + dr < rows and 0 <= c + dc < cols:
                            solid[r + dr][c + dc] = True

    # A column's gap counts as an opening when wall sits above and below it.
    opening = [[False] * cols for _ in range(rows)]
    for c in range(cols):
        filled = [r for r in range(rows) if solid[r][c]]
        if len(filled) < 4:
            continue
        lo, hi = min(filled), max(filled)
        r = lo
        while r <= hi:
            if not solid[r][c]:
                start = r
                while r <= hi and not solid[r][c]:
                    r += 1
                if r - start >= 6:           # at least 30 cm tall
                    for rr in range(start, r):
                        opening[rr][c] = True
            else:
                r += 1
    return solid, opening, cols, rows


def components(opening, cols, rows):
    """Connected opening cells, as bounding boxes with a fill ratio."""
    seen = [[False] * cols for _ in range(rows)]
    boxes = []
    for r0 in range(rows):
        for c0 in range(cols):
            if not opening[r0][c0] or seen[r0][c0]:
                continue
            stack = [(r0, c0)]
            seen[r0][c0] = True
            cells = []
            while stack:
                r, c = stack.pop()
                cells.append((r, c))
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and opening[nr][nc] and not seen[nr][nc]:
                        seen[nr][nc] = True
                        stack.append((nr, nc))
            rs = [r for r, _ in cells]
            cs = [c for _, c in cells]
            r_lo, r_hi, c_lo, c_hi = min(rs), max(rs), min(cs), max(cs)
            area = (r_hi - r_lo + 1) * (c_hi - c_lo + 1)
            boxes.append({
                'c0': c_lo, 'c1': c_hi, 'r0': r_lo, 'r1': r_hi,
                'fill': len(cells) / area,
            })
    return boxes


def clean_openings(opening, cols, rows, floor_row_tol=3):
    """Keep boxes big and solid enough to be a real hole in a wall."""
    out = []
    for b in components(opening, cols, rows):
        w = (b['c1'] - b['c0'] + 1) * CELL
        h = (b['r1'] - b['r0'] + 1) * CELL
        if w < 0.4 or h < 0.4 or b['fill'] < 0.45:
            continue
        b['w'] = w
        b['h'] = h
        b['kind'] = 'deur' if b['r0'] <= floor_row_tol and h > 1.6 else 'raam'
        out.append(b)
    return sorted(out, key=lambda b: b['c0'])


def split_at(u0, u1, cuts, min_len=MIN_SEG_LEN):
    """Break a wall run at the partitions that cross it."""
    marks = sorted(c for c in cuts if u0 + min_len / 2 < c < u1 - min_len / 2)
    out, start = [], u0
    for c in marks:
        if c - start >= min_len:
            out.append((start, c))
            start = c
    if u1 - start >= min_len:
        out.append((start, u1))
    return out or [(u0, u1)]


def main():
    obj_path, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)

    verts = read_vertices(obj_path)
    heights = [v[1] for v in verts]
    floor, ceiling = floor_and_ceiling(heights)

    band = [(v[0], v[2]) for v in verts if floor + 0.4 <= v[1] <= min(ceiling - 0.3, floor + 1.9)]
    angle = float(sys.argv[3]) if len(sys.argv) > 3 else best_angle(band)
    r = math.radians(angle)
    ct, st = math.cos(r), math.sin(r)
    rot = [(v[0] * ct - v[2] * st, v[1], v[0] * st + v[2] * ct) for v in verts]

    wall_pts = [p for p in rot if floor + 0.15 <= p[1] <= ceiling - 0.05]
    print(f"{obj_path}\n  angle {angle:.2f}  floor {floor:.2f}  ceiling {ceiling:.2f}  wall points {len(wall_pts):,}")

    plane_pos = {
        'X': [pos for pos, _ in peaks([p[0] for p in wall_pts])],
        'Z': [pos for pos, _ in peaks([p[2] for p in wall_pts])],
    }

    walls = []
    # Axis 0: planes of constant x, running along z. Axis 2: the other way.
    for axis, name in ((0, 'X'), (2, 'Z')):
        other = 2 if axis == 0 else 0
        cuts = plane_pos['Z' if axis == 0 else 'X']
        for pos in plane_pos[name]:
            on_plane = [p for p in wall_pts if abs(p[axis] - pos) < PLANE_TOL]
            for u0, u1 in segments([p[other] for p in on_plane]):
                for s0, s1 in split_at(u0, u1, cuts):
                    pts = [(p[other], p[1]) for p in on_plane if s0 <= p[other] <= s1]
                    if len(pts) < MIN_WALL_POINTS:
                        continue
                    walls.append({'axis': name, 'pos': pos, 'u0': s0, 'u1': s1, 'pts': pts})

    # Split again on gaps in the wall face itself. Point-gap splitting merges
    # across a doorway because the scan still sees floor and ceiling through
    # it; an empty column of wall is the honest break.
    split = []
    for w in walls:
        solid, _, cols, rows = elevation(w['pts'], w['u0'], w['u1'], floor, ceiling)
        occupied = [any(solid[r][c] for r in range(rows)) for c in range(cols)]
        runs, start = [], None
        for c in range(cols + 1):
            here = c < cols and occupied[c]
            if here and start is None:
                start = c
            elif not here and start is not None:
                if c - start >= 4:
                    runs.append((start, c - 1))
                start = None
        merged = []
        for run in runs:
            if merged and run[0] - merged[-1][1] <= 12:     # under 60 cm: same wall
                merged[-1] = (merged[-1][0], run[1])
            else:
                merged.append(run)
        for c0, c1 in merged:
            a0 = w['u0'] + c0 * CELL
            a1 = w['u0'] + (c1 + 1) * CELL
            if a1 - a0 < MIN_SEG_LEN:
                continue
            pts = [(u, h) for u, h in w['pts'] if a0 <= u <= a1]
            if len(pts) < MIN_WALL_POINTS:
                continue
            split.append({'axis': w['axis'], 'pos': w['pos'], 'u0': a0, 'u1': a1, 'pts': pts})
    walls = split

    walls.sort(key=lambda w: -(w['u1'] - w['u0']))
    walls = walls[:14]

    print(f"  {len(walls)} wall segments")
    sheets = []
    for i, w in enumerate(walls):
        solid, opening, cols, rows = elevation(w['pts'], w['u0'], w['u1'], floor, ceiling)
        boxes = clean_openings(opening, cols, rows)
        w.update(solid=solid, opening=opening, cols=cols, rows=rows, boxes=boxes)
        summary = ', '.join(f"{b['kind']} {b['w']:.2f}x{b['h']:.2f}" for b in boxes) or 'dicht'
        print(f"    {i+1:2d}  {w['axis']}={w['pos']:6.2f}  {w['u1']-w['u0']:5.2f} m"
              f"  {len(w['pts']):5d} pts  -> {summary}")
        sheets.append(w)

    # One sheet: every wall elevation stacked, scaled up so it is readable.
    scale = 3
    pad = 10
    label_h = 12
    width = max(w['cols'] for w in sheets) * scale + pad * 2
    height = sum(w['rows'] * scale + label_h + pad for w in sheets) + pad
    img = [[BG] * width for _ in range(height)]

    y = pad
    for i, w in enumerate(sheets):
        draw_text(img, f"{i+1} {w['axis']}={w['pos']:.2f} {w['u1']-w['u0']:.2f}M", pad, y, LABEL, 2)
        y += label_h
        box_mask = [[False] * w['cols'] for _ in range(w['rows'])]
        for b in w['boxes']:
            for r in range(b['r0'], b['r1'] + 1):
                for c in range(b['c0'], b['c1'] + 1):
                    box_mask[r][c] = True
        for r in range(w['rows']):
            for c in range(w['cols']):
                if box_mask[r][c]:
                    col = OPENING
                elif w['solid'][r][c]:
                    col = WALL
                else:
                    col = WALL_DIM if any(w['solid'][rr][c] for rr in range(w['rows'])) else BG
                if col is BG:
                    continue
                py0 = y + (w['rows'] - 1 - r) * scale
                for dy in range(scale):
                    row = img[py0 + dy]
                    for dx in range(scale):
                        row[pad + c * scale + dx] = col
        y += w['rows'] * scale + pad

    rows_out = [bytearray(b for px in row for b in px) for row in img]
    out = os.path.join(out_dir, 'elevations.png')
    write_png(out, width, height, rows_out)
    print(f"  wrote {out} ({width}x{height})")

    write_plan(os.path.join(out_dir, 'walls-plan.png'), rot, sheets, floor, ceiling)
    write_spec(os.path.join(out_dir, 'walls.json'), sheets, floor, ceiling)


def write_plan(path, rot, walls, floor, ceiling):
    """The plan again, with each numbered wall drawn over it, so a wall
    elevation can be tied back to a place in the house."""
    ppm = 42
    band = [(p[0], p[2]) for p in rot if floor + 0.5 <= p[1] <= min(ceiling - 0.3, floor + 1.9)]
    a_lo = min(a for a, _ in band) - 0.5; a_hi = max(a for a, _ in band) + 0.5
    b_lo = min(b for _, b in band) - 0.5; b_hi = max(b for _, b in band) + 0.5
    w = int((a_hi - a_lo) * ppm) + 1
    h = int((b_hi - b_lo) * ppm) + 1
    img = [[BG] * w for _ in range(h)]

    for a, b in band:
        x = int((a - a_lo) * ppm); y = int((b - b_lo) * ppm)
        if 0 <= x < w and 0 <= y < h:
            img[y][x] = WALL_DIM

    flip = lambda y: h - 1 - y
    for i, wl in enumerate(walls):
        for t in range(int((wl['u1'] - wl['u0']) * ppm) + 1):
            u = wl['u0'] + t / ppm
            if wl['axis'] == 'Z':
                x, y = int((u - a_lo) * ppm), int((wl['pos'] - b_lo) * ppm)
            else:
                x, y = int((wl['pos'] - a_lo) * ppm), int((u - b_lo) * ppm)
            for d in (-1, 0, 1):
                for px, py in (((x + d), y), (x, (y + d))):
                    if 0 <= px < w and 0 <= py < h:
                        img[py][px] = LABEL if wl['boxes'] else WALL

    flipped = [img[flip(y)] for y in range(h)]
    for i, wl in enumerate(walls):
        mid = (wl['u0'] + wl['u1']) / 2
        if wl['axis'] == 'Z':
            x, y = int((mid - a_lo) * ppm), int((wl['pos'] - b_lo) * ppm)
        else:
            x, y = int((wl['pos'] - a_lo) * ppm), int((mid - b_lo) * ppm)
        draw_text(flipped, str(i + 1), max(2, x - 4), max(2, flip(y) - 14), OPENING, 3)

    write_png(path, w, h, [bytearray(b for px in row for b in px) for row in flipped])
    print(f"  wrote {path} ({w}x{h})")


def write_spec(path, walls, floor, ceiling):
    """Machine-readable wall specs: the geometry the game is built from."""
    import json
    out = []
    for i, wl in enumerate(walls):
        out.append({
            'id': i + 1,
            'axis': wl['axis'],
            'pos': round(wl['pos'], 3),
            'width': round(wl['u1'] - wl['u0'], 3),
            'height': round(ceiling - floor, 3),
            'openings': [{
                'kind': b['kind'],
                'x': round(b['c0'] * CELL, 3),
                'y': round(b['r0'] * CELL, 3),
                'w': round(b['w'], 3),
                'h': round(b['h'], 3),
            } for b in wl['boxes']],
        })
    open(path, 'w').write(json.dumps(out, indent=2))
    print(f"  wrote {path}")
    void = (EDGE, width_of)


main()
