"""Turn a single picture of a character on white into one of the game's villager sheets, standing still.

The game's drawn villagers (Hope, Sam) are 9 x 4 sheets of 192 px cells (rows up / left / down / right; column 0
standing, 1-8 walking). A villager who only ever stands gets the same picture in every cell, so the world can treat
her like the others. The white background and the grey floor shadow are removed, and the figure is scaled to stand
with her feet near the bottom of the cell.

Usage: python tools/make-standing-sheet.py <image> <name>   -> public/sprites/<name>.png
"""
import sys
from collections import deque
from PIL import Image

src, name = sys.argv[1], sys.argv[2]
CELL, COLS, ROWS, FIGURE_H = 192, 9, 4, 180

im = Image.open(src).convert('RGBA')
W, H = im.size
px = im.load()
bg = px[2, 2][:3]
def near(c, t=60): return abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) < t
back = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if near(px[x, y]) and not back[y * W + x]: back[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if near(px[x, y]) and not back[y * W + x]: back[y * W + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not back[ny * W + nx] and near(px[nx, ny]): back[ny * W + nx] = 1; q.append((nx, ny))
fig = Image.new('RGBA', (W, H), (0, 0, 0, 0))
fp = fig.load()
for y in range(H):
    for x in range(W):
        if not back[y * W + x]: fp[x, y] = px[x, y][:3] + (255,)
# The floor shadow: flat grey pixels in the bottom tenth of the figure go.
bbox = fig.getbbox()
for y in range(int(bbox[3] - (bbox[3] - bbox[1]) * 0.1), bbox[3]):
    for x in range(bbox[0], bbox[2]):
        r, g, b, a = fp[x, y]
        if a and abs(r - g) < 14 and abs(g - b) < 14 and 120 < g < 236: fp[x, y] = (0, 0, 0, 0)
fig = fig.crop(fig.getbbox())
scale = FIGURE_H / fig.height
fig = fig.resize((max(1, round(fig.width * scale)), FIGURE_H), Image.LANCZOS)
sheet = Image.new('RGBA', (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))
for row in range(ROWS):
    for col in range(COLS):
        sheet.paste(fig, (col * CELL + (CELL - fig.width) // 2, row * CELL + CELL - 6 - FIGURE_H), fig)
out = f'public/sprites/{name}.png'
sheet.save(out)
print('saved', out, sheet.size, 'figure', fig.size)
