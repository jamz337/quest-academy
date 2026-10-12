"""A board of how the villagers could look in the smooth style: the figures already drawn by hand, and villagers
derived from the hero sheets by recolouring, as the cheap route would produce them.

Usage: python tools/villager-options-board.py <out png>
"""
import importlib.util, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/art/villager-options.png'
spec = importlib.util.spec_from_file_location('hob', 'tools/hero-options-board.py')
# hero-options-board draws its own board on import; we only want its recolour(), so run it with its usual output
sys.argv = ['hero-options-board.py', 'docs/art/hero-options.png']
hob = importlib.util.module_from_spec(spec); spec.loader.exec_module(hob)

CELL = 192
def front(path): return Image.open(path).convert('RGBA').crop((0, 2 * CELL, CELL, 3 * CELL))

board = Image.new('RGBA', (1860, 1000), (240, 234, 222, 255))
d = ImageDraw.Draw(board)
try: font = ImageFont.truetype('arial.ttf', 26); small = ImageFont.truetype('arial.ttf', 18)
except Exception: font = small = ImageFont.load_default()
def tile(img, x, y, label, sub=''):
    bg = Image.new('RGBA', (CELL, CELL), (150, 205, 130, 255)); bg.alpha_composite(img)
    board.paste(bg, (x, y)); d.text((x + CELL / 2, y + CELL + 6), label, fill=(60, 50, 40), font=small, anchor='ma')
    if sub: d.text((x + CELL / 2, y + CELL + 28), sub, fill=(120, 110, 100), font=small, anchor='ma')

d.text((30, 20), 'A. Drawn one by one: what Hope, Sam, Nurse Nia and the heroes already are', fill=(30, 25, 40), font=font)
y = 64; x = 30
for name, label in [('hope', 'Headmistress Hope'), ('sam', 'Sam'), ('nurse', 'Nurse Nia'), ('player', 'hero (boy)'), ('player-girl', 'hero (girl)')]:
    tile(front(f'public/sprites/{name}.png'), x, y, label); x += CELL + 14

d.text((30, 330), 'B. Derived from the hero sheets: recoloured per villager (cheap, but every villager is a child)', fill=(30, 25, 40), font=font)
y = 374; x = 30
S, H, C = hob.SKIN, hob.HAIR, hob.CLOTH
derived = [
    ('boy', dict(skin=S[0], top=C[4], bottom=C[7], shoes=C[6]), 'Professor Plus', 'purple polo, navy'),
    ('girl', dict(skin=S[0], hair=H[1], top=C[6], bottom=C[0]), 'Chef Fraction', 'white top, red skirt'),
    ('girl', dict(skin=S[1], hair=H[3], top=C[2], bottom=C[7]), 'Owl Librarian', 'green, brown'),
    ('boy', dict(skin=S[2], top=C[3], bottom=C[6], shoes=C[7]), 'Robo Mechanic', 'blue, white'),
    ('girl', dict(skin=S[3], hair=H[4], top=C[1], bottom=C[4]), 'Nina Notes', 'yellow, purple'),
    ('boy', dict(skin=S[4], top=C[0], bottom=C[1], shoes=C[2]), 'Kofi the Drummer', 'red, yellow'),
    ('girl', dict(skin=S[2], hair=H[0], top=C[5], bottom=C[3]), 'Mirror Mia', 'pink, blue'),
    ('boy', dict(skin=S[1], top=C[2], bottom=C[7], shoes=C[6]), 'Chisel Charlie', 'green, black'),
]
for who, kw, name, sub in derived:
    tile(hob.recolour(front(hob.SHEETS[who]), who, **kw), x, y, name, sub); x += CELL + 14

d.text((30, 660), 'C. A few grown-up base sheets (woman, man; young, older) with marker colours, recoloured per villager, plus a hat or tool each.', fill=(30, 25, 40), font=font)
d.text((30, 694), 'Nothing to show yet: those bases do not exist. They would come out in the style of row A and swap colours like row B.', fill=(90, 80, 70), font=small)
d.text((30, 724), 'Bosses, the four hub hosts and the four hospital staff would still be drawn one by one, as in A.', fill=(90, 80, 70), font=small)
d.text((30, 770), 'Counts: A = 45 drawings (36 villagers, 9 bosses). B = 0 new drawings beyond the hero sheets. C = about 6 base sheets + 13 drawn + one sheet of ~36 props.', fill=(60, 50, 40), font=small)
board.convert('RGB').save(OUT)
print('saved', OUT)
