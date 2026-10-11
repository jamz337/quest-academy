"""Erase things from a drawn picture by covering them with patches copied from elsewhere in the same picture.

Each box is wiped with a same-sized crop taken from a clean source spot, pasted solid with a few pixels of soft
edge so no seam shows. Used to open a path through Studio Summit's stones and to clear an easel out of its
forecourt (the picture is the land, so the map cannot move them).

Usage: python tools/erase-boxes.py <png> <box x0,y0,x1,y1=source> ...
       source is `sx,sy` (top-left of the patch to copy) or `auto[:x0,y0,x1,y1]`: the plainest patch of that size
       in the picture (or in the given search area), judged by how little its colours vary, never overlapping the box.
       e.g. python tools/erase-boxes.py public/sprites/world/studio/summit.png 392,520,470,628=auto:150,480,900,830
"""
import sys
from PIL import Image, ImageFilter, ImageStat

path = sys.argv[1]
im = Image.open(path).convert('RGBA')
W, H = im.size

def plainest(w, h, avoid, area):
    """Top-left of the lowest-variance opaque window of w x h inside `area`, not overlapping `avoid`."""
    ax0, ay0, ax1, ay1 = area
    best, where = None, None
    for y in range(ay0, ay1 - h + 1, 4):
        for x in range(ax0, ax1 - w + 1, 4):
            if x < avoid[2] and x + w > avoid[0] and y < avoid[3] and y + h > avoid[1]: continue
            win = im.crop((x, y, x + w, y + h))
            if ImageStat.Stat(win.getchannel('A')).extrema[0][0] < 255: continue
            score = sum(ImageStat.Stat(win.convert('RGB')).stddev)
            if best is None or score < best: best, where = score, (x, y)
    return where

for spec in sys.argv[2:]:
    box, src = spec.split('=')
    x0, y0, x1, y1 = [int(v) for v in box.split(',')]
    w, h = x1 - x0, y1 - y0
    if src.startswith('auto'):
        area = [int(v) for v in src.split(':')[1].split(',')] if ':' in src else (0, 0, W, H)
        sx, sy = plainest(w, h, (x0, y0, x1, y1), area)
    else:
        sx, sy = [int(v) for v in src.split(',')]
    patch = im.crop((sx, sy, sx + w, sy + h))
    feather = max(2, min(3, min(w, h) // 6))   # thin: the box should already clear the thing by a few pixels
    mask = Image.new('L', (w, h), 0)
    mask.paste(Image.new('L', (w - 2 * feather, h - 2 * feather), 255), (feather, feather))
    mask = mask.filter(ImageFilter.GaussianBlur(feather / 2))
    im.paste(patch, (x0, y0), mask)
    print('erased', box, 'with floor from', (sx, sy))
im.save(path, optimize=True)
print('saved', path)
