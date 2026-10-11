"""Cut a generated picture of a building on grass into a transparent sprite.

Everything green (grass, leaves, bushes) becomes background, and only the biggest connected piece left is kept (the
building, with whatever hangs off it), so flowers and fences elsewhere in the picture fall away. A crop box trims
away ground that is not green (a sandy path under the door). A JSON note beside the sprite says where the walls
are, so the game can line them up with the map's footprint.

Usage: python tools/cut-building.py <image> <out png> <crop x0,y0,x1,y1> <wall left,right> [out width] [erase x0,y0,x1,y1 ...]
       e.g. python tools/cut-building.py hospital.webp public/sprites/world/hub/hospital.png 0,0,1024,905 128,902 700
"""
import json
import sys
from collections import deque
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
cx0, cy0, cx1, cy1 = [int(v) for v in sys.argv[3].split(',')]
wall_l, wall_r = [int(v) for v in sys.argv[4].split(',')]
OUT_W = int(sys.argv[5]) if len(sys.argv) > 5 else 700
ERASE = [[int(v) for v in box.split(',')] for box in sys.argv[6:]]   # boxes (in the picture's own pixels) wiped before cutting, e.g. a fence beside the building

im = Image.open(src).convert('RGB').crop((cx0, cy0, cx1, cy1))
W, H = im.size
px = im.load()
wall_l -= cx0; wall_r -= cx0

for ex0, ey0, ex1, ey1 in ERASE:
    for y in range(max(0, ey0 - cy0), min(H, ey1 - cy0)):
        for x in range(max(0, ex0 - cx0), min(W, ex1 - cx0)): px[x, y] = (80, 160, 60)

def green(c):
    r, g, b = c
    return g > r + 8 and g > b + 8 and g >= 45

# Connected pieces of non-green pixels, on a coarse grid grown a little so a hanging sign's chains stay attached.
S = 2
gw, gh = (W + S - 1) // S, (H + S - 1) // S
solid = bytearray(gw * gh)
for y in range(H):
    for x in range(W):
        if not green(px[x, y]): solid[(y // S) * gw + x // S] = 1
grown = bytearray(gw * gh)
for gy in range(gh):
    for gx in range(gw):
        if solid[gy * gw + gx]:
            for yy in range(max(0, gy - 1), min(gh, gy + 2)):
                for xx in range(max(0, gx - 1), min(gw, gx + 2)): grown[yy * gw + xx] = 1
label = [0] * (gw * gh)
sizes = {}
n = 0
for start in range(gw * gh):
    if not grown[start] or label[start]: continue
    n += 1; label[start] = n; q = deque([start]); count = 0
    while q:
        i = q.popleft(); count += solid[i]; gx, gy = i % gw, i // gw
        for nx, ny in ((gx + 1, gy), (gx - 1, gy), (gx, gy + 1), (gx, gy - 1)):
            if 0 <= nx < gw and 0 <= ny < gh and grown[ny * gw + nx] and not label[ny * gw + nx]:
                label[ny * gw + nx] = n; q.append(ny * gw + nx)
    sizes[n] = count
keep = max(sizes, key=sizes.get)
print(f'{n} pieces; keeping the biggest ({sizes[keep]} cells of {gw * gh})')

out_im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
op = out_im.load()
for y in range(H):
    for x in range(W):
        if label[(y // S) * gw + x // S] == keep and not green(px[x, y]): op[x, y] = px[x, y] + (255,)

bbox = out_im.getbbox()
sprite = out_im.crop(bbox)
scale = OUT_W / sprite.width
sprite = sprite.resize((OUT_W, round(sprite.height * scale)), Image.LANCZOS)
sprite.save(out)
note = {'wallLeft': round((wall_l - bbox[0]) * scale), 'wallRight': round((wall_r - bbox[0]) * scale), 'width': sprite.width, 'height': sprite.height}
with open(out.replace('.png', '.json'), 'w') as f: json.dump(note, f)
print('saved', out, sprite.size, note)
