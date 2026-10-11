// Studio Summit: the facts its four games draw on, from Pre-K colours and shapes to Grade 8 art vocabulary.
// Pure data, no Phaser. Colours carry a hex `swatch` the scenes paint, because colour emoji differ by device.

// ---- Color Mixer -------------------------------------------------------------------------------------------

export const COLOURS = [
  { name: 'red', pic: '🔴', swatch: '#e5383b', warm: true, primary: true },
  { name: 'yellow', pic: '🟡', swatch: '#ffd23f', warm: true, primary: true },
  { name: 'blue', pic: '🔵', swatch: '#3d7be0', warm: false, primary: true },
  { name: 'orange', pic: '🟠', swatch: '#ff8f3f', warm: true, mix: ['red', 'yellow'] },
  { name: 'green', pic: '🟢', swatch: '#3fb24d', warm: false, mix: ['blue', 'yellow'] },
  { name: 'purple', pic: '🟣', swatch: '#8b5cf6', warm: false, mix: ['red', 'blue'] },
  { name: 'pink', pic: '🩷', swatch: '#ff8fc8', warm: true },
  { name: 'brown', pic: '🟤', swatch: '#8a5a2b', warm: true },
  { name: 'black', pic: '⚫', swatch: '#222222', warm: false },
  { name: 'white', pic: '⚪', swatch: '#f4f4f4', warm: false },
  { name: 'grey', pic: '🩶', swatch: '#9a9a9a', warm: false }
];
export const colourOf = (name) => COLOURS.find((c) => c.name === name);
export const PRIMARY = COLOURS.filter((c) => c.primary);
export const SECONDARY = COLOURS.filter((c) => c.mix);
export const COMPLEMENTS = [['red', 'green'], ['blue', 'orange'], ['yellow', 'purple']];
/** Things that are one colour, for the youngest: "What colour is a banana?" */
export const COLOURED_THINGS = [
  { name: 'banana', pic: '🍌', colour: 'yellow' }, { name: 'sun', pic: '☀️', colour: 'yellow' }, { name: 'lemon', pic: '🍋', colour: 'yellow' },
  { name: 'strawberry', pic: '🍓', colour: 'red' }, { name: 'fire engine', pic: '🚒', colour: 'red' }, { name: 'tomato', pic: '🍅', colour: 'red' },
  { name: 'sky', pic: '🌤️', colour: 'blue' }, { name: 'blueberries', pic: '🫐', colour: 'blue' }, { name: 'whale', pic: '🐳', colour: 'blue' },
  { name: 'frog', pic: '🐸', colour: 'green' }, { name: 'leaf', pic: '🍃', colour: 'green' }, { name: 'cactus', pic: '🌵', colour: 'green' },
  { name: 'orange', pic: '🍊', colour: 'orange' }, { name: 'carrot', pic: '🥕', colour: 'orange' }, { name: 'pumpkin', pic: '🎃', colour: 'orange' },
  { name: 'grapes', pic: '🍇', colour: 'purple' }, { name: 'aubergine', pic: '🍆', colour: 'purple' },
  { name: 'pig', pic: '🐷', colour: 'pink' }, { name: 'flamingo', pic: '🦩', colour: 'pink' },
  { name: 'chocolate', pic: '🍫', colour: 'brown' }, { name: 'bear', pic: '🐻', colour: 'brown' },
  { name: 'panda\'s patches', pic: '🐼', colour: 'black' }, { name: 'snow', pic: '❄️', colour: 'white' }
];
export const COLOUR_WORDS = [
  { word: 'primary colours', means: 'red, yellow and blue: the colours you cannot mix from others', band: 'B' },
  { word: 'secondary colours', means: 'orange, green and purple, each mixed from two primaries', band: 'B' },
  { word: 'tint', means: 'a colour with white added, to make it lighter', band: 'B' },
  { word: 'shade', means: 'a colour with black added, to make it darker', band: 'B' },
  { word: 'warm colours', means: 'reds, oranges and yellows, like fire and sun', band: 'B' },
  { word: 'cool colours', means: 'blues, greens and purples, like water and shade', band: 'B' },
  { word: 'complementary colours', means: 'two colours opposite each other on the colour wheel', band: 'C' },
  { word: 'hue', means: 'the pure colour itself, such as red or blue', band: 'C' },
  { word: 'tone', means: 'a colour with grey added, to make it softer', band: 'C' },
  { word: 'colour wheel', means: 'a circle of colours in rainbow order, used for mixing', band: 'C' },
  { word: 'monochrome', means: 'a picture in the tints and shades of one colour', band: 'C' }
];
export const RAINBOW = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

// ---- Symmetry Painter ------------------------------------------------------------------------------------------

/** Capital letters with a vertical mirror line down the middle, and those without. */
export const SYMMETRIC_LETTERS = ['A', 'H', 'M', 'O', 'T', 'U', 'V', 'W', 'X', 'Y'];
export const LOPSIDED_LETTERS = ['F', 'G', 'J', 'L', 'N', 'P', 'Q', 'R', 'S', 'Z'];
export const SYMMETRIC_THINGS = [
  { name: 'butterfly', pic: '🦋' }, { name: 'heart', pic: '❤️' }, { name: 'star', pic: '⭐' }, { name: 'face', pic: '😀' },
  { name: 'ladybird', pic: '🐞' }, { name: 'snowflake', pic: '❄️' }, { name: 'circle', pic: '🔵' }, { name: 'crown', pic: '👑' }
];
export const LOPSIDED_THINGS = [
  { name: 'fish', pic: '🐟' }, { name: 'flag', pic: '🚩' }, { name: 'boot', pic: '🥾' }, { name: 'key', pic: '🔑' },
  { name: 'moon', pic: '🌙' }, { name: 'leaf', pic: '🍃' }, { name: 'guitar', pic: '🎸' }, { name: 'hammer', pic: '🔨' }
];
export const LINES_OF_SYMMETRY = [
  { shape: 'a square', pic: '🟥', lines: 4 }, { shape: 'a rectangle', pic: '▬', lines: 2 }, { shape: 'an equilateral triangle', pic: '🔺', lines: 3 },
  { shape: 'a regular hexagon', pic: '⬡', lines: 6 }, { shape: 'a five-pointed star', pic: '⭐', lines: 5 }, { shape: 'a heart', pic: '❤️', lines: 1 },
  { shape: 'the letter H', pic: 'H', lines: 2 }, { shape: 'the letter A', pic: 'A', lines: 1 }, { shape: 'a snowflake', pic: '❄️', lines: 6 }
];
export const SYMMETRY_WORDS = [
  { word: 'symmetry', means: 'when one half of a shape is the mirror of the other', band: 'B' },
  { word: 'line of symmetry', means: 'the line you could fold a shape along so the halves match', band: 'B' },
  { word: 'reflection', means: 'a mirror image, flipped over a line', band: 'B' },
  { word: 'rotational symmetry', means: 'looking the same after a turn, before a full circle', band: 'C' },
  { word: 'tessellation', means: 'shapes fitting together with no gaps, like tiles', band: 'C' },
  { word: 'pattern', means: 'something repeated in order, over and over', band: 'B' },
  { word: 'kaleidoscope', means: 'a tube of mirrors that makes repeating symmetrical patterns', band: 'C' },
  { word: 'mandala', means: 'a round pattern that repeats around its centre', band: 'C' }
];

// ---- Sculpting Shapes ------------------------------------------------------------------------------------------

export const FLAT_SHAPES = [
  { name: 'circle', pic: '🔵', sides: 0, corners: 0, tells: 'A circle is round all the way, with no sides or corners.' },
  { name: 'triangle', pic: '🔺', sides: 3, corners: 3, tells: 'A triangle has three sides and three corners.' },
  { name: 'square', pic: '🟥', sides: 4, corners: 4, tells: 'A square has four equal sides and four corners.' },
  { name: 'rectangle', pic: '▬', sides: 4, corners: 4, tells: 'A rectangle has four sides, two long and two short.' },
  { name: 'pentagon', pic: '⬠', sides: 5, corners: 5, tells: 'A pentagon has five sides.' },
  { name: 'hexagon', pic: '⬡', sides: 6, corners: 6, tells: 'A hexagon has six sides, like a honeycomb cell.' },
  { name: 'star', pic: '⭐', sides: 10, corners: 10, tells: 'A five-pointed star has ten sides and ten corners.' },
  { name: 'heart', pic: '❤️', sides: 0, corners: 1, tells: 'A heart has two curves on top and one point at the bottom.' }
];
export const SOLID_SHAPES = [
  { name: 'sphere', pic: '⚽', thing: 'a ball', faces: 1, edges: 0, corners: 0, rolls: true, tells: 'A sphere is round like a ball: it rolls any way you push it.' },
  { name: 'cube', pic: '🎲', thing: 'a dice', faces: 6, edges: 12, corners: 8, rolls: false, tells: 'A cube has six square faces, like a dice.' },
  { name: 'cuboid', pic: '📦', thing: 'a box', faces: 6, edges: 12, corners: 8, rolls: false, tells: 'A cuboid is a box shape: six faces, some longer than others.' },
  { name: 'cone', pic: '🍦', thing: 'an ice-cream cone', faces: 2, edges: 1, corners: 1, rolls: true, tells: 'A cone has a round bottom and a point on top.' },
  { name: 'cylinder', pic: '🥫', thing: 'a tin can', faces: 3, edges: 2, corners: 0, rolls: true, tells: 'A cylinder has two round ends and rolls on its side.' },
  { name: 'pyramid', pic: '🔼', thing: 'an Egyptian pyramid', faces: 5, edges: 8, corners: 5, rolls: false, tells: 'A square pyramid has a square bottom and four triangle sides meeting at a point.' }
];
export const SCULPT_WORDS = [
  { word: 'sculpture', means: 'art you can walk around, in stone, clay, metal or wood', band: 'B' },
  { word: 'clay', means: 'soft earth that can be shaped, then baked hard', band: 'B' },
  { word: 'kiln', means: 'the very hot oven that bakes clay hard', band: 'C' },
  { word: 'chisel', means: 'the sharp tool a sculptor taps into stone or wood', band: 'B' },
  { word: 'face (of a shape)', means: 'one flat side of a solid shape', band: 'B' },
  { word: 'edge', means: 'the line where two faces of a solid shape meet', band: 'B' },
  { word: 'vertex', means: 'a corner, where edges meet', band: 'C' },
  { word: 'net', means: 'a flat shape that folds up into a solid', band: 'C' },
  { word: 'prism', means: 'a solid with the same shape at both ends, like a tent', band: 'C' },
  { word: 'bronze', means: 'the metal many statues are cast in', band: 'C' }
];

// ---- Gallery Guide -----------------------------------------------------------------------------------------

export const TOOLS = [
  { name: 'paintbrush', pic: '🖌️', does: 'paint', fact: 'A brush carries paint onto the paper or canvas.' },
  { name: 'crayons', pic: '🖍️', does: 'colour', fact: 'Crayons are coloured wax; press hard for strong colour.' },
  { name: 'pencil', pic: '✏️', does: 'draw', fact: 'A pencil draws lines and shades; a rubber takes them away again.' },
  { name: 'scissors', pic: '✂️', does: 'cut', fact: 'Scissors cut paper for a collage.' },
  { name: 'clay', pic: '🏺', does: 'sculpt', fact: 'Clay is shaped with the hands and baked hard in a kiln.' },
  { name: 'palette', pic: '🎨', does: 'mix paint', fact: 'A palette is the board an artist mixes paint on.' },
  { name: 'camera', pic: '📷', does: 'take photographs', fact: 'Photography is art made with light and a lens.' },
  { name: 'chisel', pic: '🔨', does: 'carve', fact: 'A chisel and mallet carve stone and wood.' }
];
export const ART_KINDS = [
  { kind: 'portrait', means: 'a picture of a person', pic: '🧑‍🎨', band: 'A' },
  { kind: 'landscape', means: 'a picture of the land, sea or sky outdoors', pic: '🏞️', band: 'A' },
  { kind: 'still life', means: 'a picture of objects set out on a table, like fruit and jugs', pic: '🍎', band: 'A' },
  { kind: 'self-portrait', means: 'a picture an artist makes of themselves', pic: '🪞', band: 'B' },
  { kind: 'mural', means: 'a huge painting made on a wall', pic: '🧱', band: 'B' },
  { kind: 'collage', means: 'a picture made by sticking cut pieces of paper together', pic: '✂️', band: 'B' },
  { kind: 'mosaic', means: 'a picture made from many tiny pieces of tile or glass', pic: '🟦', band: 'B' },
  { kind: 'sketch', means: 'a quick, rough drawing', pic: '✏️', band: 'B' },
  { kind: 'abstract art', means: 'art made of shapes and colours rather than real things', pic: '🔶', band: 'C' },
  { kind: 'sculpture', means: 'art with depth, made from stone, clay, metal or wood', pic: '🗿', band: 'B' }
];
export const ART_WORDS = [
  { word: 'canvas', means: 'the stretched cloth a painting is made on', band: 'B' },
  { word: 'easel', means: 'the stand that holds a painting while it is worked on', band: 'B' },
  { word: 'gallery', means: 'a room or building where art is shown', band: 'B' },
  { word: 'texture', means: 'how a surface looks like it would feel: rough, smooth, furry', band: 'B' },
  { word: 'outline', means: 'the line drawn round the edge of a shape', band: 'B' },
  { word: 'background', means: 'the part of a picture furthest away, behind everything', band: 'B' },
  { word: 'foreground', means: 'the part of a picture nearest to you, in front', band: 'C' },
  { word: 'perspective', means: 'drawing far things smaller, as the eye sees them', band: 'C' },
  { word: 'composition', means: 'how the parts of a picture are arranged', band: 'C' },
  { word: 'exhibition', means: 'a show of art put on for people to visit', band: 'C' },
  { word: 'masterpiece', means: 'an artist\'s very best work', band: 'C' }
];
export const ART_FACTS = [
  { q: 'Who painted the Mona Lisa?', a: 'Leonardo da Vinci', pool: ['Pablo Picasso', 'Vincent van Gogh', 'Frida Kahlo'], explain: 'Leonardo painted her in Italy around 1503; she hangs in the Louvre in Paris.', band: 'B' },
  { q: 'Vincent van Gogh is famous for a painting of…', a: 'sunflowers', pool: ['penguins', 'cars', 'castles'], explain: 'Van Gogh painted sunflowers in thick, swirling yellow paint in 1888.', band: 'B' },
  { q: 'Which artist painted the ceiling of the Sistine Chapel?', a: 'Michelangelo', pool: ['Monet', 'Picasso', 'Banksy'], explain: 'Michelangelo lay on scaffolding for four years to paint it.', band: 'C' },
  { q: 'What are the costumes of Crop Over and Carnival mostly made of?', a: 'feathers, sequins and beads', pool: ['wood and nails', 'wool and leather', 'paper and glue'], explain: 'Costume designers build huge, bright costumes for the Grand Kadooment parade.', band: 'B' },
  { q: 'The brightly painted wooden houses of Barbados are called…', a: 'chattel houses', pool: ['tree houses', 'long houses', 'igloos'], explain: 'Chattel houses were built to be moved, and painted in bright colours.', band: 'B' },
  { q: 'Who designed the flag of Barbados?', a: 'Grantley Prescod', pool: ['Rihanna', 'Errol Barrow', 'Sir Garfield Sobers'], explain: 'Grantley Prescod, an art teacher, won the national competition in 1966.', band: 'C' },
  { q: 'The trident on the Barbados flag has a broken shaft to show…', a: 'the break from colonial rule', pool: ['a storm at sea', 'three beaches', 'a broken fork'], explain: 'The three points stand for government of, for and by the people.', band: 'C' },
  { q: 'What is a mural?', a: 'a painting on a wall', pool: ['a tiny painting', 'a painting of the sea', 'a painting of a horse'], explain: 'Bridgetown has murals of its history and heroes on its walls.', band: 'B' },
  { q: 'Pablo Picasso painted faces from…', a: 'several sides at once', pool: ['behind', 'the dark', 'photographs'], explain: 'Picasso\'s cubism shows the front and side of a face together.', band: 'C' },
  { q: 'Claude Monet painted the same water lilies…', a: 'again and again in different light', pool: ['only once', 'from memory', 'in black and white'], explain: 'Monet was an impressionist: he painted how light changed through the day.', band: 'C' },
  { q: 'A picture of fruit on a table is called…', a: 'a still life', pool: ['a portrait', 'a landscape', 'a mural'], explain: 'Still life pictures show objects that keep still.', band: 'B' },
  { q: 'Which of these is sculpture?', a: 'a statue in a park', pool: ['a photograph', 'a poem', 'a mural'], explain: 'Sculpture is art with depth, that you can walk around.', band: 'B' }
];
