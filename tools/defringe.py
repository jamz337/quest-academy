"""Take the white halo off cut sprites.

A sprite cut from a white sheet keeps a ring of edge pixels that were anti-aliased against the white, and they come
out as a pale fringe on grass. For each opaque pixel touching transparency, this works out how much white was
blended in (compared with the solid pixel behind it), gives the pixel that much transparency and the inner colour,
and repeats once more for the ring behind it. Thin twigs and outlines keep their colour because they are compared
with their own neighbours, not with a fixed threshold.

Usage: python tools/defringe.py <png> [<png> ...]   (in place)
"""
import sys
from PIL import Image

def defringe(path):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    px = im.load()
    src = [[px[x, y] for x in range(W)] for y in range(H)]
    get = lambda x, y: src[y][x] if 0 <= x < W and 0 <= y < H else (0, 0, 0, 0)
    N8 = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)]
    opaque = lambda c: c[3] >= 128
    changed = 0
    for ring in (1, 2):
        edge = set()
        for y in range(H):
            for x in range(W):
                if not opaque(src[y][x]): continue
                if any(not opaque(get(x + dx, y + dy)) or (ring == 2 and (x + dx, y + dy) in done) for dx, dy in N8): edge.add((x, y))
        if ring == 1: done = set()
        for (x, y) in edge:
            r, g, b, a = src[y][x]
            # The solid colour behind this pixel: the darkest opaque neighbour that is not itself on the edge.
            cands = [get(x + dx, y + dy) for dx, dy in N8 if opaque(get(x + dx, y + dy)) and (x + dx, y + dy) not in edge and (x + dx, y + dy) not in done]
            if not cands: cands = [get(x + dx, y + dy) for dx, dy in N8 if opaque(get(x + dx, y + dy))]
            if not cands: continue
            cin = min(cands, key=lambda c: c[0] + c[1] + c[2])
            # How far this pixel has drifted from the inner colour towards white, per channel.
            ks = []
            for ce, ci in zip((r, g, b), cin[:3]):
                if 255 - ci > 24: ks.append((255 - ce) / (255 - ci))
            if not ks: continue
            alpha = max(0.0, min(1.0, sum(ks) / len(ks)))
            if alpha > 0.92: continue   # not blended with white: leave it
            px[x, y] = (cin[0], cin[1], cin[2], int(round(alpha * 255)))
            changed += 1
        done |= edge
        src = [[px[x, y] for x in range(W)] for y in range(H)]
    im.save(path, optimize=True)
    return changed

for p in sys.argv[1:]:
    print(p, 'softened', defringe(p), 'edge pixels')
