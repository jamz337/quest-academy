"""Cut a drawing off a flat coloured background (a tree on green grass): the background colour is read from the
corners, everything near it that touches the picture's edge becomes transparent, and only the biggest piece left
(the thing itself, with its ground shadow) is kept, so scattered tufts and flowers fall away.

Usage: python tools/cut-on-colour.py <image> <out png> [out width] [tolerance]
"""
import os, sys
from collections import deque
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
OUT_W = int(sys.argv[3]) if len(sys.argv) > 3 else 0
TOL = int(sys.argv[4]) if len(sys.argv) > 4 else 42
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()
corners = [px[2, 2], px[W - 3, 2], px[2, H - 3], px[W - 3, H - 3]]
bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
dist = lambda c: abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2])
near = lambda c: dist(c) <= TOL * 3

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

# Pieces of what is left: keep the biggest.
label = [0] * (W * H)
sizes = {}
n = 0
for start in range(W * H):
    if outside[start] or label[start]: continue
    n += 1; label[start] = n; stack = [start]; count = 0
    while stack:
        i = stack.pop(); count += 1; x, y = i % W, i // W
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H:
                j = ny * W + nx
                if not outside[j] and not label[j]: label[j] = n; stack.append(j)
    sizes[n] = count
keep = max(sizes, key=sizes.get)
print(f'background {bg}; {n} pieces; keeping the biggest ({sizes[keep]} px)')

res = Image.new('RGBA', (W, H), (0, 0, 0, 0))
rp = res.load()
for y in range(H):
    for x in range(W):
        if label[y * W + x] != keep: continue
        c = px[x, y]
        d = dist(c)
        a = 255 if d > TOL * 3 + 30 else max(0, min(255, int((d - TOL * 3 + 30) * 255 / 60)))
        rp[x, y] = (c[0], c[1], c[2], max(a, 1) if a else 0)
bbox = res.getbbox()
sprite = res.crop(bbox)
if OUT_W:
    sprite = sprite.resize((OUT_W, round(sprite.height * OUT_W / sprite.width)), Image.LANCZOS)
os.makedirs(os.path.dirname(out), exist_ok=True)
sprite.save(out, optimize=True)
print('saved', out, sprite.size)
