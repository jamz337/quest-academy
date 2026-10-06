"""Turn a generated character sheet into one of the game's walking sheets.

The generator's sheets have four rows (front, left, right-or-left-again, back) and a row of figures per facing:
the first half standing poses, the second half a walk cycle, on a flat background colour. The columns are found
from the picture itself (the gaps between figures), so 6- or 8-column sheets both work. The game's sheets
(public/sprites/<name>.png) are 9 columns x 4 rows of square cells in the pixel sheets' order (rows up / left /
down / right; column 0 standing, columns 1-8 the walk cycle), transparent, every frame scaled the same with its
feet on one line. When the third source row faces left like the second, the left row is mirrored for the right.

Usage: python tools/make-player-sheet.py <source image> <name> [cell px]
       e.g. python tools/make-player-sheet.py sheet.webp player   -> public/sprites/player.png
"""
import sys
from collections import deque
from PIL import Image, ImageChops

src_path = sys.argv[1]
name = sys.argv[2] if len(sys.argv) > 2 else 'player'
CELL = int(sys.argv[3]) if len(sys.argv) > 3 else 192
OUT_COLS, ROWS = 9, 4

im = Image.open(src_path).convert('RGBA')
W, H = im.size
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

# The grid: rows are the bands of the picture with any ink, columns the bands within each row (gaps of a few
# pixels are bridged so a raised arm or a prop does not split a figure).
alpha = im.getchannel('A')
def bands(values, min_gap):
    out, start, gap = [], None, 0
    for i, v in enumerate(values):
        if v:
            if start is None: start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap: out.append((start, i - gap + 1)); start, gap = None, 0
    if start is not None: out.append((start, len(values)))
    return out
row_ink = [any(alpha.getpixel((x, y)) for x in range(0, W, 2)) for y in range(H)]
row_bands = bands(row_ink, 12)
assert len(row_bands) == ROWS, f'expected {ROWS} rows of figures, found {len(row_bands)}'
grid = []   # grid[row] = list of (left, top, right, bottom) figure boxes
for (y0, y1) in row_bands:
    strip = alpha.crop((0, y0, W, y1))
    col_ink = [any(strip.getpixel((x, y)) for y in range(0, y1 - y0, 2)) for x in range(W)]
    grid.append([(x0, y0, x1, y1) for (x0, x1) in bands(col_ink, 10)])
COLS = min(len(r) for r in grid)
assert COLS >= 4, f'too few figures per row: {[len(r) for r in grid]}'
half = COLS // 2
STAND = 0
walk_cols = list(range(COLS - half, COLS))
cycle = walk_cols if len(walk_cols) % 2 == 0 else walk_cols + walk_cols[-2:0:-1]   # an odd count swings back and forth
# Front and back: the generator alternates the forward foot, so the frames play in order. Side views: every one
# of its frames is the same stride (one leg forward), so a stride and the standing pose (legs together) take turns,
# which reads as stepping; the first two strides are used, as later ones sometimes drop a prop.
WALK_FACING = [cycle[i % len(cycle)] for i in range(OUT_COLS - 1)]
WALK_SIDE = [walk_cols[0], STAND, walk_cols[1], STAND] * 2

def figure_at(c, r):
    box = grid[r][c]
    fig = im.crop(box)
    inner = fig.getbbox()
    return fig.crop(inner) if inner else None

figures = {(c, r): figure_at(c, r) for r in range(ROWS) for c in range(COLS)}
tallest = max(f.height for f in figures.values() if f)
scale = (CELL * 0.92) / tallest

# Does the third row face right (its own drawing) or left again (then the left row is mirrored for right)?
def silhouette(c, r, mirror=False):
    fig = figures[(c, r)].getchannel('A').resize((64, 128))
    return fig.transpose(Image.FLIP_LEFT_RIGHT) if mirror else fig
def diff(a, b): return sum(ImageChops.difference(a, b).getdata())
third_faces_right = diff(silhouette(STAND, 2), silhouette(STAND, 1, True)) < diff(silhouette(STAND, 2), silhouette(STAND, 1))
OUT_ROWS = [('up', 3, False), ('left', 1, False), ('down', 0, False), ('right', 2, False) if third_faces_right else ('right', 1, True)]

out = Image.new('RGBA', (CELL * OUT_COLS, CELL * ROWS), (0, 0, 0, 0))
def place(fig, mirror, oc, orow):
    if fig is None: return
    if mirror: fig = fig.transpose(Image.FLIP_LEFT_RIGHT)
    fw, fh = max(1, round(fig.width * scale)), max(1, round(fig.height * scale))
    fig = fig.resize((fw, fh), Image.LANCZOS)
    x = oc * CELL + (CELL - fw) // 2
    y = orow * CELL + CELL - 6 - fh     # feet on one line, just above the cell's edge
    out.alpha_composite(fig, (x, y))

for orow, (facing, srow, mirror) in enumerate(OUT_ROWS):
    place(figures[(STAND, srow)], mirror, 0, orow)
    for i, sc in enumerate(WALK_SIDE if facing in ('left', 'right') else WALK_FACING):
        place(figures[(sc, srow)], mirror, 1 + i, orow)

path = f'public/sprites/{name}.png'
out.save(path)
print('wrote', path, out.size, 'columns', COLS, 'walk', WALK_FACING, 'side', WALK_SIDE, 'scale', round(scale, 3), 'tallest', tallest,
      'right row:', 'own drawing' if third_faces_right else 'mirrored left')
