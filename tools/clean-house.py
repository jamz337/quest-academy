"""Turn the generated picture of the player's house into a clean sprite.

The picture has the house on grass, with hearts and a hanging sign over the roof, the player standing at the front
wall and plants either side. The house is symmetric and the roof tiles repeat, so: the walls' outline is the run
of non-grass pixels through the house's middle on each row; the roof's outline is a trapezoid measured from its
clean right end and mirrored; the sign's patch is copied from the clean roof tiles to its right (at the tile
period); the hearts' patch is mirrored from the right of the roof; the player's patch is mirrored from the left
wall; and the grass is made transparent. The clean house is cropped and saved, with a JSON note of where its walls
sit inside the picture (so the game can line them up with the map's footprint).

Usage: python tools/clean-house.py <image> <out png> [out width]
"""
import json
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
OUT_W = int(sys.argv[3]) if len(sys.argv) > 3 else 640

im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()

def green(c):   # grass, leaves and the house's shadow on the grass
    r, g, b = c
    return g > r + 8 and g > b + 8 and g >= 45

def run_at(y, x):
    """The run of non-grass pixels on row y that contains x (or the nearest such run to its right)."""
    while x < W - 1 and green(px[x, y]): x += 1
    l = r = x
    while l > 0 and not green(px[l - 1, y]): l -= 1
    while r < W - 1 and not green(px[r + 1, y]): r += 1
    return l, r

# ---- Measure the house ---------------------------------------------------------------------------------------
xr = int(W * 0.78)
ridge = next(y for y in range(H) if not green(px[xr, y]))                     # the roof's top, on a clean column
xw = int(W * 0.25)
bottom = next(y for y in range(H - 1, 0, -1) if not green(px[xw, y]))        # the base's bottom, grass below it
ymid = (ridge + bottom) // 2
wall_l, wall_r = run_at(ymid, W // 2)
cx = (wall_l + wall_r) / 2
mirror = lambda x: int(round(2 * cx - x))
# The roof: its right end at the ridge, and the eave (the widest row), both measured on the clean right side.
# The roof's slope, from two clean rows on the LEFT (below the hearts, above the plants), extended up to the ridge.
y1, y2 = ridge + 120, ridge + 220
l1, l2 = run_at(y1, int(cx))[0], run_at(y2, int(cx))[0]
ridge_r = mirror(round(l1 - (l2 - l1) * (y1 - ridge) / (y2 - y1)))
widths = {y: run_at(y, int(cx)) for y in range(ridge + 12, ymid)}
y_eave = max(widths, key=lambda y: widths[y][1] - widths[y][0])
eave_r = widths[y_eave][1]
y_eave_end = max(y for y in widths if widths[y][1] >= eave_r - 6)     # the eave beam's last row
print(f'size {W}x{H} ridge {ridge} bottom {bottom} walls {wall_l}..{wall_r} centre {cx:.0f} ridge end {ridge_r} eave {y_eave}..{y_eave_end} to {eave_r}')

def right_edge(y):
    if y < y_eave: return round(ridge_r + (eave_r - ridge_r) * (y - ridge) / (y_eave - ridge))
    if y <= y_eave_end: return eave_r
    return wall_r   # the walls are straight down from the eave (the flower boxes' leaves would read as grass)
edges = {y: right_edge(y) for y in range(ridge, bottom + 1)}
inside = lambda x, y: ridge <= y <= bottom and mirror(edges[y]) <= x <= edges[y]

out_im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
op = out_im.load()
for y in range(ridge, bottom + 1):
    for x in range(max(0, mirror(edges[y])), min(W, edges[y] + 1)): op[x, y] = px[x, y] + (255,)

# ---- The sign: copy clean roof tiles from its right, at the tile period --------------------------------------
yb = max(0, ridge - 8)   # just above the ridge, the board is the only thing that is not grass near the middle
board_l, board_r = run_at(yb, int(cx))
board_l -= 18; board_r += 18
tan = lambda c: abs(c[0] - 198) < 45 and abs(c[1] - 147) < 45 and abs(c[2] - 100) < 50
board_b = ridge
for y in range(ridge, y_eave):
    if sum(1 for x in range(board_l, board_r, 4) if tan(px[x, y])) > (board_r - board_l) / 4 * 0.25: board_b = y
board_b += 26   # its shadow on the tiles
yrow = ridge + int((y_eave - ridge) * 0.5)
src0 = board_r + 60   # past the board's shadow on the tiles
best, period = None, 100
for p in range(60, 180):
    pts = range(src0, edges[yrow] - 50 - p, 3)
    if len(pts) < 20: continue
    score = sum(sum(abs(a - b) for a, b in zip(px[x, yrow], px[x + p, yrow])) for x in pts) / len(pts)
    if best is None or score < best: best, period = score, p
span = period * max(1, (edges[ridge + 14] - 50 - src0) // period)
print(f'sign board {board_l}..{board_r} down to {board_b}; roof tile period {period}, copying a band of {span}')
for y in range(ridge, min(board_b, bottom) + 1):
    for x in range(board_l, board_r + 1):
        sx = src0 + ((x - src0) % span)
        if inside(x, y) and sx < W: op[x, y] = px[sx, y] + (255,)

# ---- The hearts (top left) and the player (front right): mirrored from the other side --------------------------
def mirror_box(x0, y0, x1, y1):
    for y in range(max(ridge, y0), min(bottom, y1) + 1):
        for x in range(x0, x1 + 1):
            if not inside(x, y): continue
            mx = mirror(x)
            if 0 <= mx < W: op[x, y] = out_im.getpixel((mx, y))
mirror_box(0, ridge, int(cx) - 1, ridge + int((bottom - ridge) * 0.14))
mirror_box(int(cx) + 1, ridge + int((bottom - ridge) * 0.7), W - 1, bottom)

# ---- Crop, scale, save ------------------------------------------------------------------------------------------
bbox = out_im.getbbox()
house = out_im.crop(bbox)
scale = OUT_W / house.width
house = house.resize((OUT_W, round(house.height * scale)), Image.LANCZOS)
house.save(out)
note = {'wallLeft': round((wall_l - bbox[0]) * scale), 'wallRight': round((wall_r - bbox[0]) * scale), 'width': house.width, 'height': house.height}
with open(out.replace('.png', '.json'), 'w') as f: json.dump(note, f)
print('saved', out, house.size, note)
