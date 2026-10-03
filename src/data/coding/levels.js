// Hand-designed Robo Maze levels (12 per band) and Bug Hunt puzzles (6 per band).
// Grid: '#' wall, '.' floor, 'S' start, 'G' goal, '*' coin. Every level carries a reference `solution`
// (tests run it through the interpreter). par = block count of that solution.
import { B, assignUids } from '../../generators/coding/ast.js';
import { countBlocks } from '../../generators/coding/interpreter.js';

const { fwd, left, right, repeat, iff, whl, call } = B;
const SEQ = ['fwd', 'left', 'right'];
const LOOP = ['fwd', 'left', 'right', 'repeat'];
const IF = ['fwd', 'left', 'right', 'repeat', 'if'];
const FN = ['fwd', 'left', 'right', 'repeat', 'call'];
const ALL = ['fwd', 'left', 'right', 'repeat', 'if', 'while', 'call'];

/** Body used by the "keep going, turn right at walls" corridor levels. */
const followRight = () => iff('ahead', [fwd()], [right()]);
const followLeft = () => iff('ahead', [fwd()], [left()]);
/** Snake body: go ahead, else turn whichever way is open (right first). */
const snakeBody = () => iff('ahead', [fwd()], [iff('right', [right()], [left()])]);
/** Classic right-hand rule. */
const rightHand = () => iff('right', [right(), fwd()], [iff('ahead', [fwd()], [left()])]);
const leftHand = () => iff('left', [left(), fwd()], [iff('ahead', [fwd()], [right()])]);

const MOVE = ['fwd'];

const RAW = [
  // ───────────── Band E (Pre-K and K): a few moves forward, then one turn, then a zig zag ─────────────
  { id: 'E-01', band: 'E', title: 'Two Steps', startDir: 'E', blocks: MOVE, maxBlocks: 4,
    hint: 'Tap Move ▲ two times, then tap Run!',
    grid: ['#####', '#S.G#', '#####'], solution: { main: [fwd(), fwd()] } },
  { id: 'E-02', band: 'E', title: 'Three Steps', startDir: 'E', blocks: MOVE, maxBlocks: 5,
    hint: 'Count the squares to the flag: one, two, three.',
    grid: ['######', '#S..G#', '######'], solution: { main: [fwd(), fwd(), fwd()] } },
  { id: 'E-03', band: 'E', title: 'Up We Go', startDir: 'N', blocks: MOVE, maxBlocks: 4,
    hint: 'The robot faces up. Move it up to the flag.',
    grid: ['###', '#G#', '#.#', '#S#', '###'], solution: { main: [fwd(), fwd()] } },
  { id: 'E-04', band: 'E', title: 'Four Steps', startDir: 'E', blocks: MOVE, maxBlocks: 6,
    hint: 'A long road! Count the squares, then add that many moves.',
    grid: ['#######', '#S...G#', '#######'], solution: { main: [fwd(), fwd(), fwd(), fwd()] } },
  { id: 'E-05', band: 'E', title: 'Turn Right', startDir: 'E', blocks: SEQ, maxBlocks: 6,
    hint: 'Move, then Turn ▶ to face down, then move down to the flag.',
    grid: ['#####', '#S.##', '##.##', '##G##', '#####'], solution: { main: [fwd(), right(), fwd(), fwd()] } },
  { id: 'E-06', band: 'E', title: 'Turn Left', startDir: 'N', blocks: SEQ, maxBlocks: 6,
    hint: 'Go up two squares, then Turn ◀ and move to the flag.',
    grid: ['#####', '#G.##', '##.##', '##S##', '#####'], solution: { main: [fwd(), fwd(), left(), fwd()] } },
  { id: 'E-07', band: 'E', title: 'Round the Corner', startDir: 'E', blocks: SEQ, maxBlocks: 7,
    hint: 'Two moves, Turn ▶, then two moves.',
    grid: ['######', '#S..##', '###.##', '###G##', '######'], solution: { main: [fwd(), fwd(), right(), fwd(), fwd()] } },
  { id: 'E-08', band: 'E', title: 'Zig Zag', startDir: 'E', blocks: SEQ, maxBlocks: 9,
    hint: 'Move, turn right, move, turn left… like steps!',
    grid: ['######', '#S.###', '##..##', '###G##', '######'], solution: { main: [fwd(), right(), fwd(), left(), fwd(), right(), fwd()] } },

  // ───────────── Band A: sequences, then repeat, then nested repeat ─────────────
  { id: 'A-01', band: 'A', title: 'First Steps', startDir: 'E', blocks: SEQ, maxBlocks: 6,
    hint: 'Tap Move ▲ four times to walk to the flag.',
    grid: ['#######', '#S...G#', '#######'],
    solution: { main: [fwd(), fwd(), fwd(), fwd()] } },
  { id: 'A-02', band: 'A', title: 'Turn Right', startDir: 'E', blocks: SEQ, maxBlocks: 9,
    hint: 'Walk to the corner, Turn ▶, then walk again.',
    grid: ['######', '#S...#', '####.#', '####.#', '####G#', '######'],
    solution: { main: [fwd(), fwd(), fwd(), right(), fwd(), fwd(), fwd()] } },
  { id: 'A-03', band: 'A', title: 'Turn Left', startDir: 'N', blocks: SEQ, maxBlocks: 9,
    hint: 'The robot faces up. At the top, Turn ◀.',
    grid: ['######', '#G...#', '####.#', '####.#', '####S#', '######'],
    solution: { main: [fwd(), fwd(), fwd(), left(), fwd(), fwd(), fwd()] } },
  { id: 'A-04', band: 'A', title: 'Zig Zag', startDir: 'E', blocks: SEQ, maxBlocks: 11,
    hint: 'Two turns this time: right, then left.',
    grid: ['########', '#S..####', '###.####', '###...G#', '########'],
    solution: { main: [fwd(), fwd(), right(), fwd(), fwd(), left(), fwd(), fwd(), fwd()] } },
  { id: 'A-05', band: 'A', title: 'Repeat Yourself', startDir: 'E', blocks: LOOP, maxBlocks: 4,
    hint: 'Put one Move ▲ inside a Repeat and set the number to 7.',
    grid: ['##########', '#S......G#', '##########'],
    solution: { main: [repeat(7, [fwd()])] } },
  { id: 'A-06', band: 'A', title: 'Two Hallways', startDir: 'E', blocks: LOOP, maxBlocks: 7,
    hint: 'Repeat, turn, repeat.',
    grid: ['#######', '#S....#', '#####.#', '#####.#', '#####.#', '#####.#', '#####G#', '#######'],
    solution: { main: [repeat(4, [fwd()]), right(), repeat(5, [fwd()])] } },
  { id: 'A-07', band: 'A', title: 'Staircase', startDir: 'E', blocks: LOOP, maxBlocks: 8,
    hint: 'Each stair is: Move, Turn ▶, Move, Turn ◀. Repeat that!',
    grid: ['########', '#S.#####', '##..####', '###..###', '####..##', '#####.G#', '########'],
    solution: { main: [repeat(4, [fwd(), right(), fwd(), left()]), fwd()] } },
  { id: 'A-08', band: 'A', title: 'Around the Block', startDir: 'E', blocks: LOOP, maxBlocks: 10,
    hint: 'Three hallways of four steps, with a right turn between them.',
    grid: ['#######', '#S....#', '#.###.#', '#.###.#', '#.###.#', '#G....#', '#######'],
    solution: { main: [repeat(4, [fwd()]), right(), repeat(4, [fwd()]), right(), repeat(4, [fwd()])] } },
  { id: 'A-09', band: 'A', title: 'Loop in a Loop', startDir: 'E', blocks: LOOP, maxBlocks: 6,
    hint: 'Put a Repeat inside a Repeat: (4 moves, then turn) twice.',
    grid: ['#######', '#S....#', '#####.#', '#####.#', '#####.#', '#####G#', '#######'],
    solution: { main: [repeat(2, [repeat(4, [fwd()]), right()])] } },
  { id: 'A-10', band: 'A', title: 'Big Stairs', startDir: 'E', blocks: LOOP, maxBlocks: 9,
    hint: 'Each stair is two moves, a right turn, two moves, a left turn.',
    grid: ['#########', '#S..#####', '###.#####', '###...###', '#####.###', '#####...#', '#######.#', '#######G#', '#########'],
    solution: { main: [repeat(3, [repeat(2, [fwd()]), right(), repeat(2, [fwd()]), left()])] } },
  { id: 'A-11', band: 'A', title: 'Grand Square', startDir: 'E', blocks: LOOP, maxBlocks: 6,
    hint: 'Six moves then a right turn, three times.',
    grid: ['#########', '#S......#', '#.#####.#', '#.#####.#', '#.#####.#', '#.#####.#', '#.#####.#', '#G......#', '#########'],
    solution: { main: [repeat(3, [repeat(6, [fwd()]), right()])] } },
  { id: 'A-12', band: 'A', title: 'Spiral', startDir: 'E', blocks: LOOP, maxBlocks: 10,
    hint: 'Three long hallways of six, then two hallways of four. Turn right every time.',
    grid: ['#########', '#S......#', '#######.#', '#....G#.#', '#.#####.#', '#.#####.#', '#.#####.#', '#.......#', '#########'],
    solution: { main: [repeat(3, [repeat(6, [fwd()]), right()]), repeat(2, [repeat(4, [fwd()]), right()])] } },

  // ───────────── Band B: coins, then if / else on branching corridors ─────────────
  { id: 'B-01', band: 'B', title: 'Coin Run', startDir: 'E', blocks: LOOP, maxBlocks: 4,
    hint: 'Coins are picked up as you walk over them. Grab them all before the flag!',
    grid: ['########', '#S*.*.G#', '########'],
    solution: { main: [repeat(5, [fwd()])] } },
  { id: 'B-02', band: 'B', title: 'Coin Corner', startDir: 'E', blocks: LOOP, maxBlocks: 7,
    hint: 'Walk, turn right, walk. Both coins are on the way.',
    grid: ['#######', '#S..*.#', '#####.#', '#####*#', '#####G#', '#######'],
    solution: { main: [repeat(4, [fwd()]), right(), repeat(3, [fwd()])] } },
  { id: 'B-03', band: 'B', title: 'Coin Ring', startDir: 'E', blocks: LOOP, maxBlocks: 6,
    hint: 'A loop inside a loop: four moves and a right turn, three times.',
    grid: ['#######', '#S..*.#', '#####.#', '#####*#', '#####.#', '#G*...#', '#######'],
    solution: { main: [repeat(3, [repeat(4, [fwd()]), right()])] } },
  { id: 'B-04', band: 'B', title: 'If Path Ahead', startDir: 'E', blocks: IF, maxBlocks: 6,
    hint: 'Repeat 8 times: if the path ahead is open, Move; else Turn ▶.',
    grid: ['#######', '#S....#', '#####.#', '#####.#', '#####G#', '#######'],
    solution: { main: [repeat(8, [followRight()])] } },
  { id: 'B-05', band: 'B', title: 'Winding Right', startDir: 'E', blocks: IF, maxBlocks: 7,
    hint: 'Same trick, but you need 16 rounds. Repeat 8 inside Repeat 2.',
    grid: ['#######', '#S....#', '#####.#', '##G##.#', '##.##.#', '##....#', '#######'],
    solution: { main: [repeat(2, [repeat(8, [followRight()])])] } },
  { id: 'B-06', band: 'B', title: 'Coins and Corners', startDir: 'E', blocks: IF, maxBlocks: 8,
    hint: 'If ahead is open, move; else turn right. Repeat 7 twice picks up every coin.',
    grid: ['########', '#S..*..#', '######.#', '#G*...*#', '########'],
    solution: { main: [repeat(2, [repeat(7, [followRight()])])] } },
  { id: 'B-07', band: 'B', title: 'Look Left', startDir: 'E', blocks: IF, maxBlocks: 6,
    hint: 'Repeat 7: if the path on the LEFT is open, Turn ◀. Then always Move.',
    grid: ['######', '#G..##', '###.##', '###.##', '#S...#', '######'],
    solution: { main: [repeat(7, [iff('left', [left()]), fwd()])] } },
  { id: 'B-08', band: 'B', title: 'Look Right', startDir: 'E', blocks: IF, maxBlocks: 6,
    hint: 'Repeat 7: if the path on the RIGHT is open, Turn ▶. Then Move.',
    grid: ['######', '#S...#', '###.##', '###*##', '#G*.##', '######'],
    solution: { main: [repeat(7, [iff('right', [right()]), fwd()])] } },
  { id: 'B-09', band: 'B', title: 'Coin Spiral', startDir: 'E', blocks: IF, maxBlocks: 7,
    hint: 'Repeat 6 inside Repeat 5: if ahead is open move, else turn right.',
    grid: ['#########', '#S..*...#', '#######.#', '#..*.G#.#', '#.#####*#', '#.#####.#', '#*#####.#', '#...*...#', '#########'],
    solution: { main: [repeat(5, [repeat(6, [followRight()])])] } },
  { id: 'B-10', band: 'B', title: 'Winding Left', startDir: 'E', blocks: IF, maxBlocks: 7,
    hint: 'This hallway only turns left. Use the else branch to Turn ◀.',
    grid: ['#######', '##....#', '##.##.#', '##G##.#', '#####.#', '#S....#', '#######'],
    solution: { main: [repeat(2, [repeat(8, [followLeft()])])] } },
  { id: 'B-11', band: 'B', title: 'Snake', startDir: 'E', blocks: IF, maxBlocks: 9,
    hint: 'At a wall: if the right is open turn right, else turn left. Put an If inside the else.',
    grid: ['######', '#S...#', '####.#', '#....#', '#.####', '#...G#', '######'],
    solution: { main: [repeat(2, [repeat(9, [snakeBody()])])] } },
  { id: 'B-12', band: 'B', title: 'Coin Snake', startDir: 'E', blocks: IF, maxBlocks: 9,
    hint: 'The snake body again, 32 rounds: Repeat 8 inside Repeat 4.',
    grid: ['########', '#S..*..#', '######.#', '#..*...#', '#.######', '#...*..#', '######.#', '#G.*...#', '########'],
    solution: { main: [repeat(4, [repeat(8, [snakeBody()])])] } },

  // ───────────── Band C: while-until-goal, functions, mazes ─────────────
  { id: 'C-01', band: 'C', title: 'Until Goal', startDir: 'E', blocks: ALL, maxBlocks: 4,
    hint: 'The Until goal block keeps going until the robot stands on the flag.',
    grid: ['##########', '#S......G#', '##########'],
    solution: { main: [whl([fwd()])] } },
  { id: 'C-02', band: 'C', title: 'Until the Corner', startDir: 'E', blocks: ALL, maxBlocks: 6,
    hint: 'Until goal: if ahead is open move, else turn right.',
    grid: ['#######', '#S....#', '#####.#', '##G##.#', '##.##.#', '##....#', '#######'],
    solution: { main: [whl([followRight()])] } },
  { id: 'C-03', band: 'C', title: 'Left Spiral', startDir: 'W', blocks: ALL, maxBlocks: 6,
    hint: 'Same idea, but this spiral turns left. Coins are on the way.',
    grid: ['#########', '#...*..S#', '#.#######', '#.#G....#', '#*#####.#', '#.#####*#', '#.#####.#', '#...*...#', '#########'],
    solution: { main: [whl([followLeft()])] } },
  { id: 'C-04', band: 'C', title: 'Do F1', startDir: 'E', blocks: FN, maxBlocks: 10,
    hint: 'Teach F1 one wiggle: Turn ▶, Move, Turn ◀, Move. Then call it three times with a Move between.',
    grid: ['#########', '#S#######', '#...#####', '###....##', '######.G#', '#########'],
    solution: { main: [repeat(2, [call(), fwd()]), fwd(), call()], functions: { F1: [right(), fwd(), left(), fwd()] } } },
  { id: 'C-05', band: 'C', title: 'Loop the Function', startDir: 'E', blocks: FN, maxBlocks: 11,
    hint: 'F1 is the wiggle again. Repeat (F1, Move) three times, turn right, Move, then F1 once more.',
    grid: ['#########', '#S#######', '#...#####', '###...###', '#####...#', '######..#', '######G##', '#########'],
    solution: { main: [repeat(3, [call(), fwd()]), right(), fwd(), call()], functions: { F1: [right(), fwd(), left(), fwd()] } } },
  { id: 'C-06', band: 'C', title: 'Junction Snake', startDir: 'E', blocks: ALL, maxBlocks: 8,
    hint: 'Until goal: if ahead move, else (if right is open turn right, else turn left).',
    grid: ['########', '#S..*..#', '######.#', '#..*...#', '#.######', '#...*..#', '######.#', '#G.*...#', '########'],
    solution: { main: [whl([snakeBody()])] } },
  { id: 'C-07', band: 'C', title: 'Right-Hand Rule', startDir: 'E', blocks: ALL, maxBlocks: 9,
    hint: 'Keep your right hand on the wall: if right is open turn right and move; else if ahead move; else turn left.',
    grid: ['#########', '#S..#...#', '#.#.#.#.#', '#.#...#.#', '#.#####.#', '#.....#.#', '###.###.#', '#...#..G#', '#########'],
    solution: { main: [whl([rightHand()])] } },
  { id: 'C-08', band: 'C', title: 'Coin Maze', startDir: 'S', blocks: ALL, maxBlocks: 9,
    hint: 'The right-hand rule visits every dead end, so it finds all the coins too.',
    grid: ['#########', '#S#.....#', '#.#.###.#', '#...#..*#', '#####.###', '#*#.....#', '#.#.###.#', '#....*#G#', '#########'],
    solution: { main: [whl([rightHand()])] } },
  { id: 'C-09', band: 'C', title: 'Three Calls', startDir: 'E', blocks: FN, maxBlocks: 11,
    hint: 'F1: Repeat 2 Move, Turn ▶, Move. Call it, turn left, call it, Move, turn left, call it.',
    grid: ['#########', '#S..#####', '###...###', '#####.###', '#####...#', '#######G#', '#########'],
    solution: { main: [call(), left(), call(), fwd(), left(), call()], functions: { F1: [repeat(2, [fwd()]), right(), fwd()] } } },
  { id: 'C-10', band: 'C', title: 'Left-Hand Rule', startDir: 'W', blocks: ALL, maxBlocks: 9,
    hint: 'Mirror the rule: if LEFT is open turn left and move; else if ahead move; else turn right.',
    grid: ['#########', '#.#....S#', '#.#.#####', '#.......#', '#####.#.#', '#.....#.#', '#.#.#.###', '#G#.#..*#', '#########'],
    solution: { main: [whl([leftHand()])] } },
  { id: 'C-11', band: 'C', title: 'Stair Master', startDir: 'E', blocks: FN, maxBlocks: 11,
    hint: 'F1: Move, Move, Turn ◀, Move. Call it, turn right, call it, Move, turn right, call it.',
    grid: ['#########', '#######G#', '#####...#', '#####.###', '###...###', '#S..#####', '#########'],
    solution: { main: [call(), right(), call(), fwd(), right(), call()], functions: { F1: [fwd(), fwd(), left(), fwd()] } } },
  { id: 'C-12', band: 'C', title: 'Grand Coin Maze', startDir: 'E', blocks: ALL, maxBlocks: 9,
    hint: 'Right-hand rule, one more time. Watch the robot search every corner.',
    grid: ['#########', '#S..#...#', '###.#.#.#', '#*#...#.#', '#.###.#.#', '#.#...#*#', '#.#.#.#.#', '#...#*#G#', '#########'],
    solution: { main: [whl([rightHand()])] } }
];

export const LEVELS = RAW.map((lv) => {
  const solution = assignUids({ main: lv.solution.main, functions: lv.solution.functions || {} }, 's');
  return { ...lv, solution, par: countBlocks(solution) };
});

export const levelsForBand = (band) => { const own = LEVELS.filter((l) => l.band === band); return own.length ? own : LEVELS.filter((l) => l.band === 'A'); };
export const getLevel = (id) => LEVELS.find((l) => l.id === id) || null;

/** First level in the band without stars in profile.coding.levels, else the last one. */
export function nextUnsolvedLevel(profile, band) {
  const list = levelsForBand(band);
  const rec = (profile && profile.coding && profile.coding.levels) || {};
  return list.find((l) => !(rec[l.id] && rec[l.id].stars > 0)) || list[list.length - 1];
}

// ───────────── Bug Hunt puzzles: one wrong block each; `fix` repairs it ─────────────
const bug = (id, band, title, grid, startDir, blocks, program, fix, hint) => ({
  id, band, hint, fix,
  level: { id, band, title, grid, startDir, blocks, maxBlocks: countBlocks(program) + 2 },
  program: assignUids({ main: program.main, functions: program.functions || {} }, id.toLowerCase() + '-')
});

export const BUG_LEVELS = [
  bug('BA-01', 'A', 'Wrong Way', ['######', '#S...#', '####.#', '####G#', '######'], 'E', SEQ,
    { main: [fwd(), fwd(), fwd(), left('bug'), fwd(), fwd()] }, { uid: 'bug', op: 'right' },
    'The robot turns the wrong way at the corner.'),
  bug('BA-02', 'A', 'Not Far Enough', ['########', '#S....G#', '########'], 'E', LOOP,
    { main: [repeat(3, [fwd()], 'bug')] }, { uid: 'bug', n: 5 },
    'Count the steps to the flag. The repeat number is too small.'),
  bug('BA-03', 'A', 'Left, Not Right', ['######', '#G...#', '####.#', '####.#', '####S#', '######'], 'N', SEQ,
    { main: [fwd(), fwd(), fwd(), right('bug'), fwd(), fwd(), fwd()] }, { uid: 'bug', op: 'left' },
    'Which way is the flag when the robot reaches the top?'),
  bug('BA-04', 'A', 'Broken Stairs', ['########', '#S.#####', '##..####', '###..###', '####..##', '#####.G#', '########'], 'E', LOOP,
    { main: [repeat(4, [fwd(), left('bug'), fwd(), left()]), fwd()] }, { uid: 'bug', op: 'right' },
    'A stair step is Move, Turn ▶, Move, Turn ◀. One turn is wrong.'),
  bug('BA-05', 'A', 'One Step Too Many', ['######', '#S...#', '####.#', '####.#', '#G...#', '######'], 'E', SEQ,
    { main: [fwd(), fwd(), fwd(), right(), fwd(), fwd(), fwd(), fwd('bug'), fwd(), fwd(), fwd()] }, { uid: 'bug', op: 'right' },
    'After walking down, the robot must turn before the last hallway.'),
  bug('BA-06', 'A', 'Short Loop', ['######', '#S...#', '#.##.#', '#.##.#', '#G...#', '######'], 'E', LOOP,
    { main: [repeat(2, [repeat(2, [fwd()], 'bug'), right()]), repeat(3, [fwd()])] }, { uid: 'bug', n: 3 },
    'Each side of the square is three steps long.'),

  bug('BB-01', 'B', 'Wrong Check', ['#######', '#S....#', '#####.#', '#####.#', '#####G#', '#######'], 'E', IF,
    { main: [repeat(8, [iff('right', [fwd()], [right()], 'bug')])] }, { uid: 'bug', cond: 'ahead' },
    'The If should check the path AHEAD before moving.'),
  bug('BB-02', 'B', 'Else Where?', ['#######', '##....#', '##.##.#', '##G##.#', '#####.#', '#S....#', '#######'], 'E', IF,
    { main: [repeat(2, [repeat(8, [iff('ahead', [fwd()], [right('bug')])])])] }, { uid: 'bug', op: 'left' },
    'This hallway only turns one way. Look at the else branch.'),
  bug('BB-03', 'B', 'Missed a Coin', ['#######', '#S..*.#', '#####.#', '#####*#', '#####G#', '#######'], 'E', LOOP,
    { main: [repeat(4, [fwd()]), right(), repeat(2, [fwd()], 'bug')] }, { uid: 'bug', n: 3 },
    'The robot stops one step short of the flag.'),
  bug('BB-04', 'B', 'Look the Other Way', ['######', '#G..##', '###.##', '###.##', '#S...#', '######'], 'E', IF,
    { main: [repeat(7, [iff('right', [left()], null, 'bug'), fwd()])] }, { uid: 'bug', cond: 'left' },
    'The robot should turn left when the LEFT path is open.'),
  bug('BB-05', 'B', 'Coin Stairs', ['########', '#S.#####', '##.*####', '###..###', '####*.##', '#####.G#', '########'], 'E', LOOP,
    { main: [repeat(4, [fwd(), right(), fwd(), right('bug')]), fwd()] }, { uid: 'bug', op: 'left' },
    'After going down a step, the robot must turn back toward the flag.'),
  bug('BB-06', 'B', 'Snake Bite', ['######', '#S...#', '####.#', '#....#', '#.####', '#...G#', '######'], 'E', IF,
    { main: [repeat(2, [repeat(9, [iff('ahead', [fwd()], [iff('right', [right()], [right('bug')])])])])] }, { uid: 'bug', op: 'left' },
    'If the right is blocked too, the robot must turn the OTHER way.'),

  bug('BC-01', 'C', 'Until Wrong', ['#######', '#S....#', '#####.#', '##G##.#', '##.##.#', '##....#', '#######'], 'E', ALL,
    { main: [whl([iff('ahead', [fwd()], [left('bug')])])] }, { uid: 'bug', op: 'right' },
    'The hallway turns right at every wall.'),
  bug('BC-02', 'C', 'Bad Condition', ['#########', '#...*..S#', '#.#######', '#.#G....#', '#*#####.#', '#.#####*#', '#.#####.#', '#...*...#', '#########'], 'W', ALL,
    { main: [whl([iff('right', [fwd()], [left()], 'bug')])] }, { uid: 'bug', cond: 'ahead' },
    'Move only when the path AHEAD is open.'),
  bug('BC-03', 'C', 'Faulty Function', ['#########', '#S..#####', '###...###', '#####.###', '#####...#', '#######G#', '#########'], 'E', FN,
    { main: [call(), left(), call(), fwd(), left(), call()], functions: { F1: [repeat(2, [fwd()]), left('bug'), fwd()] } }, { uid: 'bug', op: 'right' },
    'The bug is inside F1. Check the F1 tab.'),
  bug('BC-04', 'C', 'Wrong Hand', ['#########', '#S..#...#', '#.#.#.#.#', '#.#...#.#', '#.#####.#', '#.....#.#', '###.###.#', '#...#..G#', '#########'], 'E', ALL,
    { main: [whl([iff('left', [right(), fwd()], [iff('ahead', [fwd()], [left()])], 'bug')])] }, { uid: 'bug', cond: 'right' },
    'Right-hand rule: check the RIGHT side first.'),
  bug('BC-05', 'C', 'Loop the Bug', ['#########', '#S#######', '#...#####', '###...###', '#####...#', '######..#', '######G##', '#########'], 'E', FN,
    { main: [repeat(3, [call(), fwd()]), right(), fwd(), call()], functions: { F1: [right(), fwd(), right('bug'), fwd()] } }, { uid: 'bug', op: 'left' },
    'F1 should be a wiggle: Turn ▶, Move, Turn ◀, Move.'),
  bug('BC-06', 'C', 'Maze Mix-up', ['#########', '#S..#...#', '###.#.#.#', '#*#...#.#', '#.###.#.#', '#.#...#*#', '#.#.#.#.#', '#...#*#G#', '#########'], 'E', ALL,
    { main: [whl([iff('right', [right(), fwd()], [iff('ahead', [fwd()], [right('bug')])])])] }, { uid: 'bug', op: 'left' },
    'When both right and ahead are blocked, which way should the robot turn?')
];

export const bugLevelsForBand = (band) => BUG_LEVELS.filter((b) => b.band === band);
