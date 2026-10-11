"""Open the gaps in a character sheet cut from a tinted sheet: between an arm and the body, between the legs.

The generator's background had a faint warm tint, so the gaps are a very light, slightly yellow colour that nothing
in the drawing uses (eye whites are neutral). Those pixels go transparent, then the usual de-fringe pass softens the
new edges. Usage: python tools/sheet-gaps.py <png> [<png> ...]   (in place)
"""
import colorsys, sys
from PIL import Image

for path in sys.argv[1:]:
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    px = im.load()
    n = 0
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 40: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if l > 0.87 and s > 0.35 and 30 <= h * 360 <= 70:
                px[x, y] = (r, g, b, 0); n += 1
    im.save(path, optimize=True)
    print(path, 'opened', n, 'pixels')
