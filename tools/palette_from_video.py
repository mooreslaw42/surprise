"""Pull a colour palette out of a video.

Builds a 5-bit RGB histogram over many downscaled frames, then runs weighted
k-means over the non-empty bins. Working on the histogram rather than the raw
pixels keeps this fast enough in pure Python.

Usage: python3 -I tools/palette_from_video.py <video> <out.png> [k]
"""

import os
import struct
import subprocess
import sys
import zlib

W, H, FPS = 160, 90, 3


def frames(path, start=None, dur=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", str(start)]
    if dur is not None:
        cmd += ["-t", str(dur)]
    cmd += ["-i", path, "-vf", f"fps={FPS},scale={W}:{H}",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    return subprocess.run(cmd, capture_output=True, check=True).stdout


def white_balance(buf, pct=0.995):
    """White-patch correction. Interior video under tungsten light has a heavy
    warm cast that collapses every surface into beige; scaling each channel so
    its near-maximum becomes neutral recovers the actual hues."""
    hist = [[0] * 256 for _ in range(3)]
    for i in range(0, len(buf) - 2, 3):
        hist[0][buf[i]] += 1
        hist[1][buf[i + 1]] += 1
        hist[2][buf[i + 2]] += 1
    n = len(buf) // 3
    caps = []
    for ch in range(3):
        run = 0
        for v in range(256):
            run += hist[ch][v]
            if run >= n * pct:
                caps.append(max(1, v))
                break
        else:
            caps.append(255)
    target = max(caps)
    gains = [target / c for c in caps]
    print(f"  white balance gains r={gains[0]:.3f} g={gains[1]:.3f} b={gains[2]:.3f}")
    lut = [[min(255, int(v * g + 0.5)) for v in range(256)] for g in gains]
    out = bytearray(buf)
    for i in range(0, len(out) - 2, 3):
        out[i] = lut[0][out[i]]
        out[i + 1] = lut[1][out[i + 1]]
        out[i + 2] = lut[2][out[i + 2]]
    return bytes(out)


def histogram(buf, bits=5):
    shift = 8 - bits
    hist = {}
    for i in range(0, len(buf) - 2, 3):
        key = (buf[i] >> shift, buf[i + 1] >> shift, buf[i + 2] >> shift)
        hist[key] = hist.get(key, 0) + 1
    scale = 1 << shift
    half = scale // 2
    return [((r * scale + half, g * scale + half, b * scale + half), n) for (r, g, b), n in hist.items()]


def luma(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def dist(a, b):
    """RGB distance with a luma term, so lightness differences count properly."""
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    dl = luma(a) - luma(b)
    return 0.6 * (dr * dr + dg * dg + db * db) + 1.4 * dl * dl


def kmeans(points, k, iters=24):
    # Weighted farthest-point seeding: spread the initial centroids out.
    centroids = [max(points, key=lambda p: p[1])[0]]
    while len(centroids) < k:
        best, best_score = None, -1.0
        for c, n in points:
            d = min(dist(c, m) for m in centroids)
            score = d * (n ** 0.5)
            if score > best_score:
                best, best_score = c, score
        centroids.append(best)

    for _ in range(iters):
        sums = [[0.0, 0.0, 0.0, 0.0] for _ in range(k)]
        for c, n in points:
            i = min(range(k), key=lambda j: dist(c, centroids[j]))
            s = sums[i]
            s[0] += c[0] * n; s[1] += c[1] * n; s[2] += c[2] * n; s[3] += n
        moved = False
        for i, s in enumerate(sums):
            if s[3] == 0:
                continue
            new = (s[0] / s[3], s[1] / s[3], s[2] / s[3])
            if dist(new, centroids[i]) > 1.0:
                moved = True
            centroids[i] = new
        if not moved:
            break

    weights = [0] * k
    for c, n in points:
        weights[min(range(k), key=lambda j: dist(c, centroids[j]))] += n
    out = [(tuple(int(round(v)) for v in centroids[i]), weights[i]) for i in range(k)]
    return sorted(out, key=lambda t: -t[1])


def write_png(path, width, height, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    blob = b"\x89PNG\r\n\x1a\n"
    blob += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    blob += chunk(b"IDAT", zlib.compress(raw, 6))
    blob += chunk(b"IEND", b"")
    open(path, "wb").write(blob)


def main():
    video, out = sys.argv[1], sys.argv[2]
    k = int(sys.argv[3]) if len(sys.argv) > 3 else 24
    start = float(sys.argv[4]) if len(sys.argv) > 4 else None
    dur = float(sys.argv[5]) if len(sys.argv) > 5 else None

    buf = frames(video, start, dur)
    buf = white_balance(buf)
    n_frames = len(buf) // (W * H * 3)
    points = histogram(buf)
    print(f"{n_frames} frames, {len(points):,} distinct bins")

    palette = kmeans(points, k)
    total = sum(n for _, n in palette)

    sw, sh = 64, 64
    rows = [bytearray() for _ in range(sh)]
    for (r, g, b), n in palette:
        for y in range(sh):
            rows[y] += bytes((r, g, b)) * sw
    write_png(out, sw * len(palette), sh, rows)

    print(f"\n  {'hex':>9}  {'rgb':>16}  share")
    for (r, g, b), n in palette:
        print(f"  #{r:02x}{g:02x}{b:02x}  {str((r,g,b)):>16}  {100*n/total:5.1f}%")
    print(f"\nwrote {out}")


main()
