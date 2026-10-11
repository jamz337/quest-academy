"""A board showing how the drawn heroes could be recoloured for each child: skin tones, hair colours, tops, bottoms
and shoes swapped on the existing player sheets, the way the marker-colour hero sheets will be at runtime.

Usage: python tools/hero-options-board.py <out png>
"""
import colorsys, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
SHEETS = {'boy': 'public/sprites/player.png', 'girl': 'public/sprites/player-girl.png'}
CELL = 192

def frame(path, row=2, col=0):
    im = Image.open(path).convert('RGBA')
    return im.crop((col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL))

def hsl(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return h * 360, s, l
def rgb(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(1, l)), max(0, min(1, s)))
    return int(r * 255), int(g * 255), int(b * 255)
def hue_near(h, target, tol):
    d = abs((h - target + 180) % 360 - 180)
    return d <= tol

# Where things are on the figure (fractions of the figure's own box), and what colour they are drawn in.
PARTS = {
    'boy': {'top': (0.30, 0.58, 215, 30), 'bottom': (0.58, 0.82, 215, 30), 'hair': None},
    'girl': {'top': (0.34, 0.60, 345, 30), 'bottom': (0.58, 0.88, 275, 30), 'hair': (0.0, 0.45, 20, 25)}
}
SKIN = [('#f5cba7', 'light'), ('#e0ac69', 'tan'), ('#c68642', 'bronze'), ('#8d5524', 'brown'), ('#5c3317', 'deep')]
HAIR = [('#1b1b1b', 'black'), ('#5a3a1e', 'brown'), ('#b8743a', 'auburn'), ('#e2b457', 'blonde'), ('#c42a5b', 'pink'), ('#3b6fd6', 'blue')]
CLOTH = [('#e5383b', 'red'), ('#ffd23f', 'yellow'), ('#3fb24d', 'green'), ('#3d7be0', 'blue'), ('#8b5cf6', 'purple'), ('#ff8fc8', 'pink'), ('#ffffff', 'white'), ('#222222', 'black')]

def recolour(img, who, skin=None, hair=None, top=None, bottom=None, shoes=None):
    im = img.copy(); px = im.load(); W, H = im.size
    bbox = im.getbbox(); x0, y0, x1, y1 = bbox; fh = y1 - y0
    parts = PARTS[who]
    def target_hsl(hexs):
        c = tuple(int(hexs[i:i + 2], 16) for i in (1, 3, 5)); return hsl(*c)
    for y in range(y0, y1):
        fy = (y - y0) / fh
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a < 40: continue
            h, s, l = hsl(r, g, b)
            dark = l < 0.16
            # skin: warm, medium-light, anywhere
            if skin and not dark and s > 0.18 and hue_near(h, 25, 20) and 0.22 < l < 0.86 and not (parts['hair'] and hue_near(h, parts['hair'][2], parts['hair'][3]) and l < 0.34 and fy < parts['hair'][1]):
                th, ts, tl = target_hsl(skin[0]); nl = tl + (l - 0.5) * 0.55
                px[x, y] = (*rgb(th, ts, nl), a); continue
            if hair and parts['hair'] and fy < parts['hair'][1] and hue_near(h, parts['hair'][2], parts['hair'][3]) and s > 0.15 and l < 0.34:
                th, ts, tl = target_hsl(hair[0]); nl = tl + (l - 0.22) * 1.2
                px[x, y] = (*rgb(th, ts, nl), a); continue
            if top and parts['top'][0] <= fy < parts['top'][1] and hue_near(h, parts['top'][2], parts['top'][3]) and s > 0.25 and not dark:
                th, ts, tl = target_hsl(top[0]); nl = tl + (l - 0.5) * 0.6
                px[x, y] = (*rgb(th, ts if tl not in (0, 1) else 0, nl), a); continue
            if bottom and parts['bottom'][0] <= fy < parts['bottom'][1] and hue_near(h, parts['bottom'][2], parts['bottom'][3]) and s > 0.25 and not dark:
                th, ts, tl = target_hsl(bottom[0]); nl = tl + (l - 0.45) * 0.6
                px[x, y] = (*rgb(th, ts, nl), a); continue
            if shoes and fy > 0.86 and not dark and l > 0.25:
                th, ts, tl = target_hsl(shoes[0]); nl = tl + (l - 0.6) * 0.5
                px[x, y] = (*rgb(th, ts, nl), a); continue
    return im

SCALE = 1.0
board = Image.new('RGBA', (1860, 1250), (240, 234, 222, 255))
d = ImageDraw.Draw(board)
try: font = ImageFont.truetype('arial.ttf', 26); small = ImageFont.truetype('arial.ttf', 19)
except Exception: font = small = ImageFont.load_default()
def tile(img, x, y, label):
    bg = Image.new('RGBA', (CELL, CELL), (150, 205, 130, 255)); bg.alpha_composite(img)
    board.paste(bg, (x, y)); d.text((x + CELL / 2, y + CELL + 6), label, fill=(60, 50, 40), font=small, anchor='ma')

d.text((30, 20), 'Option A: one drawn hero, recoloured for each child (live, from the current sheets)', fill=(30, 25, 40), font=font)
y = 64
for who in ('boy', 'girl'):
    base = frame(SHEETS[who])
    d.text((30, y + 80), who, fill=(60, 50, 40), font=font)
    x = 110
    tile(base, x, y, 'as drawn'); x += CELL + 14
    for sk in SKIN[:4]: tile(recolour(base, who, skin=sk), x, y, 'skin ' + sk[1]); x += CELL + 14
    if who == 'girl':
        for hc in HAIR[2:5]: tile(recolour(base, who, hair=hc), x, y, 'hair ' + hc[1]); x += CELL + 14
    else:
        for tc in CLOTH[:3]: tile(recolour(base, who, top=tc, bottom=CLOTH[4]), x, y, 'top ' + tc[1]); x += CELL + 14
    y += CELL + 44
d.text((30, y + 10), 'Mix and match: skin, hair, top, bottom and shoes all chosen by the child', fill=(30, 25, 40), font=font)
y += 54
x = 110
mixes = [
    ('girl', dict(skin=SKIN[1], hair=HAIR[3], top=CLOTH[2], bottom=CLOTH[3])),
    ('girl', dict(skin=SKIN[3], hair=HAIR[4], top=CLOTH[1], bottom=CLOTH[7])),
    ('girl', dict(skin=SKIN[0], hair=HAIR[1], top=CLOTH[0], bottom=CLOTH[6])),
    ('boy', dict(skin=SKIN[1], top=CLOTH[0], bottom=CLOTH[7], shoes=CLOTH[3])),
    ('boy', dict(skin=SKIN[4], top=CLOTH[1], bottom=CLOTH[2], shoes=CLOTH[0])),
    ('boy', dict(skin=SKIN[0], top=CLOTH[5], bottom=CLOTH[3], shoes=CLOTH[6])),
    ('boy', dict(skin=SKIN[2], top=CLOTH[7], bottom=CLOTH[1], shoes=CLOTH[4])),
]
for who, kw in mixes:
    names = [v[1] for v in kw.values()]
    tile(recolour(frame(SHEETS[who]), who, **kw), x, y, ' / '.join(names[:2]))
    d.text((x + CELL / 2, y + CELL + 30), ' / '.join(names[2:]), fill=(60, 50, 40), font=small, anchor='ma'); x += CELL + 14
y += CELL + 80
d.text((30, y), 'Hair styles and body shapes come from the generated sheets (one drawing per style); everything else is a colour swap.', fill=(90, 80, 70), font=small)
d.text((30, y + 28), "The boy's black hair cannot be recoloured from this sheet: that is why the new sheets use a purple hair marker.", fill=(90, 80, 70), font=small)
board.convert('RGB').save(OUT)
print('saved', OUT)
