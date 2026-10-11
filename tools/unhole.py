"""Open the gaps in cut sprites: patches of the sheet's background left inside a sprite (between a tree's branches)
become transparent.

A patch counts when it is a light, near-neutral colour (the sheet behind the drawing) and its border is outline
and shading rather than real colour, which is how a drawing encloses a gap; white petals next to a yellow centre
are left alone. The
usual de-fringe pass (tools/defringe.py) then softens the new edges.

Usage: python tools/unhole.py [--dry] <png> [<png> ...]   (in place unless --dry)
"""
import sys
from collections import deque
from PIL import Image

dry = '--dry' in sys.argv
paths = [p for p in sys.argv[1:] if p != '--dry']

def light_neutral(c):
    r, g, b, a = c
    return a >= 128 and min(r, g, b) >= 215 and max(r, g, b) - min(r, g, b) <= 30
def coloured(c):
    """A real colour (a yellow centre, a green leaf), not an outline or a shade of the background."""
    return c[3] >= 128 and max(c[:3]) - min(c[:3]) > 60 and c[0] + c[1] + c[2] >= 330

for path in paths:
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    px = im.load()
    seen = set()
    removed = 0
    for sy in range(H):
        for sx in range(W):
            if (sx, sy) in seen or not light_neutral(px[sx, sy]): continue
            comp, q, border, coloured_border, touches_edge = [], deque([(sx, sy)]), 0, 0, False
            seen.add((sx, sy))
            while q:
                x, y = q.popleft(); comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= W or ny >= H: touches_edge = True; continue
                    c = px[nx, ny]
                    if light_neutral(c):
                        if (nx, ny) not in seen: seen.add((nx, ny)); q.append((nx, ny))
                    elif c[3] < 128: touches_edge = True
                    else:
                        border += 1
                        if coloured(c): coloured_border += 1
            if touches_edge or len(comp) < 4 or border == 0 or coloured_border / border > 0.25: continue
            for (x, y) in comp: px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
            removed += len(comp)
    print(path, 'opened', removed, 'pixels')
    if removed and not dry: im.save(path, optimize=True)
