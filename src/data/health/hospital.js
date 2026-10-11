// Inside the Academy hospital (Health Heights lives here). The whole interior is one drawn picture
// (public/sprites/world/hospital/inside.png) laid over a grid of HOSPITAL_W x HOSPITAL_H squares of TILE px; this file
// says where its floor can be walked, where the staff stand, where the player arrives and where the way out is.
// 'o' is floor, '#' a wall, bed, desk or machine, 'x' the mat by the door. Pure data, tested in node.
import { HEALTH_GAMES } from '../../generators/health/questions.js';

export const HOSPITAL_W = 20, HOSPITAL_H = 20;
/** Picture pixels per square: the 1024 px picture over twenty squares. */
export const PICTURE_PX = 1024;
export const FLOOR = [
  '####################',
  '####################',
  '####################',
  '####################',
  '####################',
  '#########oo#########',
  '#####ooo#ooo########',
  '##oooooo###ooo######',
  '###oo##o#o#ooooo####',
  '#####ooo#ooooooooo##',
  '#####oooooooo##o####',
  '#####oooooooo#######',
  '#######ooo#o###oo###',
  '#######ooo#o#oooo###',
  '######ooo##ooo#o####',
  '######oooo#ooo######',
  '######ox#o##oo######',
  '####################',
  '####################',
  '####################'
];
export const EXIT = { tx: 7, ty: 16 };          // the mat by the lobby door, right of the reception desk
export const SPAWN = { tx: 7.5, ty: 15.4 };     // just inside, facing the corridor

/** The staff: one per game, standing where their work is. Looks come from NPC_STYLES (data/avatars.js). */
export const STAFF = [
  {
    id: 'doctor', name: 'Dr Dee', voice: 'female', pitch: 1.1, rate: 0.95, sprite: 'npc35', gameId: 'hea-body', at: { tx: 5, ty: 9 },
    lines: ['Welcome to my consulting room. Say "aaah"! I know every bone, muscle and organ in the body.', 'Your heart beats about seventy times a minute, and it never takes a day off.'],
    playPrompt: 'Want to play Body Map?'
  },
  {
    id: 'dietitian', name: 'Chef Camille', voice: 'female', pitch: 1.0, rate: 1.05, sprite: 'npc36', gameId: 'hea-plate', at: { tx: 12, ty: 10 },
    lines: ['I plan the plates here: half fruit and veg, a quarter grains, a quarter protein, and water to drink.', 'Flying fish and cou-cou, mango and sweet potato: Bajan food can be the healthiest in the world!'],
    playPrompt: 'Want to play Plate Planner?'
  },
  {
    id: 'pharmacist', name: 'Pharmacist Pat', voice: 'male', pitch: 0.9, rate: 1.0, sprite: 'npc37', gameId: 'hea-germs', at: { tx: 6, ty: 14 },
    lines: ['Germs are too small to see, but soap, tissues and toothbrushes zap them every day.', 'Medicine only from a grown-up you trust, and in Barbados the ambulance is 511. Remember that!'],
    playPrompt: 'Want to play Germ Zapper?'
  },
  {
    id: 'physio', name: 'Coach Fay', voice: 'female', pitch: 1.2, rate: 1.1, sprite: 'npc38', gameId: 'hea-feel', at: { tx: 17, ty: 9 },
    lines: ['I get patients moving again! An hour of running or swimming a day, and a good long sleep every night.', 'Feelings need looking after too. Big feeling? Five slow breaths, then tell someone.'],
    playPrompt: 'Want to play Feel Good?'
  }
];
export const getStaff = (id) => STAFF.find((s) => s.id === id) || null;

const at = (tx, ty) => (ty >= 0 && ty < HOSPITAL_H && tx >= 0 && tx < HOSPITAL_W ? FLOOR[ty][tx] : '#');
export const isFloor = (tx, ty) => at(tx, ty) !== '#';
export const isSolid = (tx, ty) => !isFloor(tx, ty) || STAFF.some((s) => s.at.tx === tx && s.at.ty === ty);
export const onExit = (tx, ty) => at(tx, ty) === 'x';

/** Floor squares reachable from the spawn (for tests: every staff member and the door can be walked to). */
export function reachableFloor() {
  const seen = new Set(), start = [Math.floor(SPAWN.tx), Math.floor(SPAWN.ty)];
  const stack = [start]; seen.add(start.join(','));
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= HOSPITAL_W || ny >= HOSPITAL_H || seen.has(k) || isSolid(nx, ny)) continue;
      seen.add(k); stack.push([nx, ny]);
    }
  }
  return seen;
}

/** Each game has one member of staff, and each member of staff one game. */
export const staffGames = () => STAFF.map((s) => s.gameId);
void HEALTH_GAMES;
