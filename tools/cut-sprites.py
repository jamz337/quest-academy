"""Cut a generated sheet of separate objects (trees, bushes, a house...) into one transparent PNG per object.

The sheet is a few objects on a flat background (white works best). The background is whatever touches the
border and is close to the corner colour; it becomes transparent. Objects are the islands left over; bits closer
together than `gap` px (a flower's petals, a tree's loose leaves) count as one object. They are saved in reading
order, left to right and top to bottom, trimmed to their edges with a little room, as
public/sprites/<folder>/<prefix>-1.png, -2.png...  A list of what was cut (number, size) is printed.

Usage: python tools/cut-sprites.py <sheet image> <folder> <prefix> [gap px] [min px]
       e.g. python tools/cut-sprites.py hub-props.png world/hub prop
"""
import os
import sys
from collections import deque
from PIL import Image

src, folder, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
GAP = int(sys.argv[4]) if len(sys.argv) > 4 else 12
MIN = int(sys.argv[5]) if len(sys.argv) > 5 else 40
PAD = 6

im = Image.open(src).convert('RGBA')
W, H = im.size
px = im.load()

# 1. The background: flood from the border over pixels near the corner colour (or already transparent).
corners = [px[2, 2], px[W - 3, 2], px[2, H - 3], px[W - 3, H - 3]]
bg = max(set(c[:3] for c in corners), key=lambda c: sum(1 for k in corners if k[:3] == c))
def is_bg(c): return c[3] < 20 or abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) < 54
back = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if is_bg(px[x, y]) and not back[y * W + x]: back[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if is_bg(px[x, y]) and not back[y * W + x]: back[y * W + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not back[ny * W + nx] and is_bg(px[nx, ny]):
            back[ny * W + nx] = 1; q.append((nx, ny))

# 2. Islands, found on a coarse grid (one cell per S px) grown by the gap, so near bits join up.
S = 4
gw, gh = (W + S - 1) // S, (H + S - 1) // S
solid = bytearray(gw * gh)
for y in range(H):
    row = y * W
    for x in range(W):
        if not back[row + x]: solid[(y // S) * gw + x // S] = 1
grow = max(1, GAP // S)
grown = bytearray(gw * gh)
for gy in range(gh):
    for gx in range(gw):
        if solid[gy * gw + gx]:
            for yy in range(max(0, gy - grow), min(gh, gy + grow + 1)):
                for xx in range(max(0, gx - grow), min(gw, gx + grow + 1)): grown[yy * gw + xx] = 1
label = [0] * (gw * gh)
boxes = []
for start in range(gw * gh):
    if not grown[start] or label[start]: continue
    n = len(boxes) + 1
    label[start] = n
    q = deque([start]); x0 = y0 = 10 ** 9; x1 = y1 = -1
    while q:
        i = q.popleft(); gx, gy = i % gw, i // gw
        if solid[i]: x0, y0, x1, y1 = min(x0, gx), min(y0, gy), max(x1, gx), max(y1, gy)
        for nx, ny in ((gx + 1, gy), (gx - 1, gy), (gx, gy + 1), (gx, gy - 1)):
            if 0 <= nx < gw and 0 <= ny < gh and grown[ny * gw + nx] and not label[ny * gw + nx]:
                label[ny * gw + nx] = n; q.append(ny * gw + nx)
    if x1 >= 0: boxes.append((n, x0 * S, y0 * S, min(W, (x1 + 1) * S), min(H, (y1 + 1) * S)))
boxes = [b for b in boxes if b[3] - b[1] >= MIN and b[4] - b[2] >= MIN]

# 3. Reading order: rows by vertical overlap, then left to right.
boxes.sort(key=lambda b: b[2])
rows = []
for b in boxes:
    for r in rows:
        top, bot = min(x[2] for x in r), max(x[4] for x in r)
        if b[2] < bot - (b[4] - b[2]) * 0.4 and b[4] > top: r.append(b); break
    else: rows.append([b])
ordered = [b for r in rows for b in sorted(r, key=lambda b: b[1])]

# 4. Save each object with the background (and other objects' pixels) cleared.
out_dir = os.path.join('public', 'sprites', folder)
os.makedirs(out_dir, exist_ok=True)
for k, (n, x0, y0, x1, y1) in enumerate(ordered, 1):
    x0, y0, x1, y1 = max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD), min(H, y1 + PAD)
    out = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    op = out.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if back[y * W + x] or label[(y // S) * gw + x // S] != n: continue
            op[x - x0, y - y0] = px[x, y]
    path = os.path.join(out_dir, f'{prefix}-{k}.png')
    out.save(path)
    print(f'{k}: {path}  {x1 - x0} x {y1 - y0}')
print(f'{len(ordered)} objects cut from {src}')
