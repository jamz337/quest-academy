"""Turn a generated 8 x 4 character sheet into one of the game's walking sheets.

The generator's sheets have four rows (front, left, right-or-left-again, back), eight columns (0-3 standing
poses, 4-7 a walk cycle) and a flat background colour. The game's sheets (public/sprites/<name>.png) are
9 columns x 4 rows of square cells in the pixel sheets' order (rows up / left / down / right; column 0 standing,
columns 1-8 the walk cycle), transparent, every frame scaled the same with its feet on one line. When the third
source row faces left like the second, the left row is mirrored for the right row.

Usage: python tools/make-player-sheet.py <source image> <name> [cell px]
       e.g. python tools/make-player-sheet.py sheet.webp player   -> public/sprites/player.png
"""
import sys
from collections import deque
from PIL import Image, ImageChops

src_path = sys.argv[1]
name = sys.argv[2] if len(sys.argv) > 2 else 'player'
CELL = int(sys.argv[3]) if len(sys.argv) > 3 else 192
COLS, ROWS = 8, 4
OUT_COLS = 9
STAND, WALK = 0, [4, 5, 6, 7, 4, 5, 6, 7]

im = Image.open(src_path).convert('RGBA')
W, H = im.size
cw, ch = W // COLS, H // ROWS
px = im.load()

# Background: everything joined to the border that is close to the corner colour becomes transparent.
bg = px[2, 2][:3]
def near(c): return abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) < 60
seen = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if near(px[x, y][:3]) and not seen[y * W + x]: seen[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if near(px[x, y][:3]) and not seen[y * W + x]: seen[y * W + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    px[x, y] = (0, 0, 0, 0)
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and near(px[nx, ny][:3]):
            seen[ny * W + nx] = 1; q.append((nx, ny))
# Soften the cut edge: pixels next to transparency that still carry the background tint fade a little.
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        if a and abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) < 110:
            if any(px[nx, ny][3] == 0 for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)) if 0 <= nx < W and 0 <= ny < H):
                px[x, y] = (r, g, b, 90)

def cell_box(c, r):
    cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
    return cell, cell.getbbox()

boxes = {}
tallest = 0
for r in range(ROWS):
    for c in range(COLS):
        cell, box = cell_box(c, r)
        boxes[(c, r)] = (cell, box)
        if box: tallest = max(tallest, box[3] - box[1])
scale = (CELL * 0.92) / tallest

# Does the third row face right (its own drawing) or left again (then the left row is mirrored for right)?
def figure(c, r, mirror=False):
    cell, box = boxes[(c, r)]
    fig = cell.crop(box).getchannel('A').resize((64, 128))
    return fig.transpose(Image.FLIP_LEFT_RIGHT) if mirror else fig
def diff(a, b): return sum(ImageChops.difference(a, b).getdata())
third_faces_right = diff(figure(STAND, 2), figure(STAND, 1, True)) < diff(figure(STAND, 2), figure(STAND, 1))
OUT_ROWS = [('up', 3, False), ('left', 1, False), ('down', 0, False), ('right', 2, False) if third_faces_right else ('right', 1, True)]

out = Image.new('RGBA', (CELL * OUT_COLS, CELL * ROWS), (0, 0, 0, 0))
def place(cell, box, mirror, oc, orow):
    if not box: return
    fig = cell.crop(box)
    if mirror: fig = fig.transpose(Image.FLIP_LEFT_RIGHT)
    fw, fh = max(1, round(fig.width * scale)), max(1, round(fig.height * scale))
    fig = fig.resize((fw, fh), Image.LANCZOS)
    x = oc * CELL + (CELL - fw) // 2
    y = orow * CELL + CELL - 6 - fh     # feet on one line, just above the cell's edge
    out.alpha_composite(fig, (x, y))

for orow, (_, srow, mirror) in enumerate(OUT_ROWS):
    cell, box = boxes[(STAND, srow)]
    place(cell, box, mirror, 0, orow)
    for i, sc in enumerate(WALK):
        cell, box = boxes[(sc, srow)]
        place(cell, box, mirror, 1 + i, orow)

path = f'public/sprites/{name}.png'
out.save(path)
print('wrote', path, out.size, 'scale', round(scale, 3), 'tallest', tallest, 'right row:', 'own drawing' if third_faces_right else 'mirrored left')
