"""A mock-up of option C for the villagers: the game's three drawn grown-ups (Hope, Sam, Nurse Nia) used as base
figures, recoloured into other villagers and given a hat or tool, the way a small set of marker-colour base sheets
would be used for the whole cast.

Usage: python tools/cast-mockup.py <out png>
"""
import colorsys, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
CELL = 192
def front(name): return Image.open(f'public/sprites/{name}.png').convert('RGBA').crop((0, 2 * CELL, CELL, 3 * CELL))
def hsl(r, g, b): h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255); return h * 360, s, l
def rgb(h, s, l): r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(1, l)), max(0, min(1, s))); return int(r * 255), int(g * 255), int(b * 255)
def near(h, t, tol): return abs((h - t + 180) % 360 - 180) <= tol
def hex_hsl(hx): return hsl(*[int(hx[i:i + 2], 16) for i in (1, 3, 5)])

def recolour(img, garment_hue, tol, new_hex, band=(0, 1), min_sat=0.25, light_shift=0):
    """Pixels of the garment's hue (within the figure's height band) take the new colour, keeping their shading."""
    im = img.copy(); px = im.load(); x0, y0, x1, y1 = im.getbbox(); fh = y1 - y0
    th, ts, tl = hex_hsl(new_hex)
    for y in range(y0, y1):
        fy = (y - y0) / fh
        if not (band[0] <= fy < band[1]): continue
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a < 40: continue
            h, s, l = hsl(r, g, b)
            if s < min_sat or l < 0.1 or l > 0.97 or not near(h, garment_hue, tol): continue
            nl = tl + (l - 0.45) * 0.7 + light_shift
            px[x, y] = (*rgb(th, ts if tl < 0.93 else 0, nl), a)
    return im

# ---- props: simple cartoon shapes with a dark outline, placed by hand ---------------------------------------------
def outline(c, k=0.55): return tuple(int(v * k) for v in c)
def chef_hat(d, x, y):
    w, h = 44, 30
    d.rounded_rectangle([x - w / 2, y - h, x + w / 2, y - 6], 14, fill=(250, 250, 250), outline=(120, 120, 130), width=3)
    for dx in (-13, 0, 13): d.ellipse([x + dx - 12, y - h - 10, x + dx + 12, y - h + 10], fill=(250, 250, 250), outline=(120, 120, 130), width=3)
    d.rectangle([x - w / 2 + 2, y - 10, x + w / 2 - 2, y - 2], fill=(236, 236, 240), outline=(120, 120, 130), width=3)
def captain_cap(d, x, y):
    d.ellipse([x - 26, y - 22, x + 26, y + 2], fill=(31, 61, 117), outline=outline((31, 61, 117)), width=3)
    d.rectangle([x - 26, y - 6, x + 26, y + 2], fill=(20, 40, 80), outline=outline((31, 61, 117)), width=3)
    d.chord([x - 28, y - 6, x + 28, y + 14], 0, 180, fill=(30, 30, 40), outline=(10, 10, 20), width=3)
    d.ellipse([x - 6, y - 16, x + 6, y - 4], fill=(255, 197, 49), outline=(179, 116, 0), width=2)
def drumsticks(d, x, y):
    for ang in (-35, 35):
        import math
        dx, dy = math.cos(math.radians(ang)) * 26, math.sin(math.radians(ang)) * 26
        d.line([x - dx, y - dy, x + dx, y + dy], fill=(90, 58, 30), width=9); d.line([x - dx, y - dy, x + dx, y + dy], fill=(176, 122, 79), width=5)
        d.ellipse([x + dx - 5, y + dy - 5, x + dx + 5, y + dy + 5], fill=(230, 210, 180), outline=(90, 58, 30), width=2)
def spanner(d, x, y):
    d.line([x - 16, y + 16, x + 10, y - 10], fill=(70, 75, 85), width=10); d.line([x - 16, y + 16, x + 10, y - 10], fill=(160, 168, 180), width=6)
    d.ellipse([x + 2, y - 20, x + 24, y + 2], fill=(160, 168, 180), outline=(70, 75, 85), width=3); d.ellipse([x + 9, y - 13, x + 17, y - 5], fill=(60, 70, 80))
def flower(d, x, y):
    for ang in range(0, 360, 60):
        import math
        px, py = x + math.cos(math.radians(ang)) * 9, y + math.sin(math.radians(ang)) * 9
        d.ellipse([px - 7, py - 7, px + 7, py + 7], fill=(255, 143, 200), outline=(190, 70, 130), width=2)
    d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(255, 210, 63), outline=(190, 130, 0), width=2)
    d.line([x, y + 8, x - 4, y + 30], fill=(63, 150, 70), width=4)
def mirror(d, x, y):
    d.line([x, y + 10, x - 6, y + 34], fill=(140, 90, 40), width=7)
    d.ellipse([x - 14, y - 20, x + 14, y + 12], fill=(190, 227, 242), outline=(140, 90, 40), width=4)
    d.line([x - 6, y - 12, x + 2, y - 4], fill=(255, 255, 255), width=3)
def chain(d, x, y):
    d.arc([x - 22, y - 16, x + 22, y + 24], 20, 160, fill=(255, 197, 49), width=5)
    d.ellipse([x - 9, y + 12, x + 9, y + 30], fill=(255, 197, 49), outline=(179, 116, 0), width=3)
def glasses_book(d, x, y):
    d.rounded_rectangle([x - 16, y, x + 16, y + 22], 3, fill=(63, 123, 224), outline=(20, 50, 120), width=3)
    d.line([x, y, x, y + 22], fill=(220, 230, 255), width=2)

CASES = [
    ('hope', 'Headmistress Hope', 'elderly woman', [
        ('Owl Librarian', dict(hue=240, tol=22, colour='#2f7d4a'), lambda d, b: None),
        ('Mayor Marigold', dict(hue=240, tol=22, colour='#b3263a'), lambda d, b: chain(d, b[0], b[1] + 0.33 * b[2])),
        ('Old Tom', dict(hue=240, tol=22, colour='#8a6a3c'), lambda d, b: None),
    ]),
    ('sam', 'Sam', 'young man', [
        ('Kofi the Drummer', dict(hue=140, tol=22, colour='#d9342b'), lambda d, b: drumsticks(d, b[0] + 44, b[1] + 0.5 * b[2])),
        ('Captain Compass', dict(hue=140, tol=22, colour='#1f3d75'), lambda d, b: captain_cap(d, b[0] - 2, b[1] + 18)),
        ('Robo Mechanic', dict(hue=140, tol=22, colour='#e8623f'), lambda d, b: spanner(d, b[0] + 46, b[1] + 0.52 * b[2])),
    ]),
    ('nurse', 'Nurse Nia', 'woman', [
        ('Chef Camille', dict(hue=186, tol=20, colour='#f4f4f4'), lambda d, b: chef_hat(d, b[0], b[1] + 22)),
        ('Flora', dict(hue=186, tol=20, colour='#e86aa0'), lambda d, b: flower(d, b[0] - 34, b[1] + 0.55 * b[2])),
        ('Mirror Mia', dict(hue=186, tol=20, colour='#8b5cf6'), lambda d, b: mirror(d, b[0] + 36, b[1] + 0.5 * b[2])),
    ]),
]

board = Image.new('RGBA', (30 + 4 * (CELL + 14) + 30, 3 * (CELL + 60) + 150), (240, 234, 222, 255))
d = ImageDraw.Draw(board)
try: font = ImageFont.truetype('arial.ttf', 24); small = ImageFont.truetype('arial.ttf', 17)
except Exception: font = small = ImageFont.load_default()
d.text((30, 18), 'Option C, mocked up with the three grown-ups the game already has:', fill=(30, 25, 40), font=font)
d.text((30, 44), 'one base figure, recoloured, plus a prop', fill=(30, 25, 40), font=font)
y = 84
for base, base_name, kind, variants in CASES:
    src = front(base); bb = src.getbbox(); cx = (bb[0] + bb[2]) / 2; top = bb[1]; fh = bb[3] - bb[1]
    x = 30
    def tile(img, label, sub=''):
        bg = Image.new('RGBA', (CELL, CELL), (150, 205, 130, 255)); bg.alpha_composite(img)
        board.paste(bg, (x, y)); d.text((x + CELL / 2, y + CELL + 6), label, fill=(60, 50, 40), font=small, anchor='ma')
        if sub: d.text((x + CELL / 2, y + CELL + 26), sub, fill=(120, 110, 100), font=small, anchor='ma')
    tile(src, base_name, 'base: ' + kind); x += CELL + 14
    for name, rc, prop in variants:
        img = recolour(src, rc['hue'], rc['tol'], rc['colour'])
        pd = ImageDraw.Draw(img); prop(pd, (cx, top, fh))
        tile(img, name); x += CELL + 14
    y += CELL + 60
d.text((30, y + 4), 'Real base sheets would be drawn with marker colours, so skin, hair and every garment', fill=(90, 80, 70), font=small)
d.text((30, y + 26), 'swap cleanly; the props would be a drawn sheet, not these sketches.', fill=(90, 80, 70), font=small)
board.convert('RGB').save(OUT)
print('saved', OUT)
