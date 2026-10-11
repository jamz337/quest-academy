"""Erase things from a drawn picture by covering them with patches copied from elsewhere in the same picture.

Each box is wiped with a same-sized crop taken from a clean source spot, pasted solid with a few pixels of soft
edge so no seam shows. Used to open a path through Studio Summit's stones (the picture is the land, so the map
cannot move them).

Usage: python tools/erase-boxes.py <png> <box x0,y0,x1,y1=source sx,sy> ...
       e.g. python tools/erase-boxes.py public/sprites/world/studio/summit.png 636,586,722,684=440,630 722,630,756,684=380,700
"""
import sys
from PIL import Image, ImageFilter

path = sys.argv[1]
im = Image.open(path).convert('RGBA')
for spec in sys.argv[2:]:
    box, src = spec.split('=')
    x0, y0, x1, y1 = [int(v) for v in box.split(',')]
    sx, sy = [int(v) for v in src.split(',')]
    w, h = x1 - x0, y1 - y0
    patch = im.crop((sx, sy, sx + w, sy + h))
    feather = max(2, min(6, min(w, h) // 6))
    mask = Image.new('L', (w, h), 0)
    mask.paste(Image.new('L', (w - 2 * feather, h - 2 * feather), 255), (feather, feather))
    mask = mask.filter(ImageFilter.GaussianBlur(feather / 2))
    im.paste(patch, (x0, y0), mask)
    print('erased', box, 'with floor from', src)
im.save(path, optimize=True)
print('saved', path)
