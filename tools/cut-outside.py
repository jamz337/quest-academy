"""Make the white OUTSIDE of a picture transparent, keeping any white inside it (floors, walls, paper).

Flood-fills near-white from the picture's edges, so only the background that touches the border goes; a soft edge
follows how far from white each border pixel is. Used for the hospital's interior, whose floors are nearly white.

Usage: python tools/cut-outside.py <image> <out png>
"""
import os, sys
from collections import deque
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()
near = lambda c: min(c) > 232
outside = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if near(px[x, y]) and not outside[y * W + x]: outside[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if near(px[x, y]) and not outside[y * W + x]: outside[y * W + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not outside[ny * W + nx] and near(px[nx, ny]):
            outside[ny * W + nx] = 1; q.append((nx, ny))
res = Image.new('RGBA', (W, H))
rp = res.load()
for y in range(H):
    for x in range(W):
        r, g, b = px[x, y]
        if outside[y * W + x]:
            m = min(r, g, b)
            a = 0 if m > 250 else int((250 - m) * 255 / 18)
            rp[x, y] = (r, g, b, min(255, a))
        else: rp[x, y] = (r, g, b, 255)
os.makedirs(os.path.dirname(out), exist_ok=True)
res.save(out, optimize=True)
print('saved', out, res.size, os.path.getsize(out) // 1024, 'KB')
