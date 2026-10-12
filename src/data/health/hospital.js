// Inside the Academy hospital (Health Heights lives here), drawn in code like the house and the church: a lobby by
// the door with Nurse Nia's desk, a corridor up the middle, and four rooms off it. Top left the consulting room
// (Dr Dee, the stethoscope stand and the couch for splinter surgery), top right the ward (beds that restore hearts,
// the X-ray machine and Coach Fay), bottom left the pharmacy (Pharmacist Pat), bottom right the kitchen (Chef
// Camille). In tiles of TILE px. Pure data, tested in node.
import { HEALTH_GAMES } from '../../generators/health/questions.js';

export const HOSPITAL_W = 15, HOSPITAL_H = 13;
export const EXIT = { tx: 7, ty: 11 };            // the mat inside the lobby door
export const SPAWN = { tx: 7.5, ty: 10.4 };       // just inside, facing the corridor
export const CORRIDOR_X = 7;

/** The four rooms (interior squares) and where their doors open onto the corridor. */
export const ROOMS = [
  { id: 'consulting', name: 'Consulting room', x: 1, y: 1, w: 5, h: 4, door: { tx: 6, ty: 2 } },
  { id: 'ward', name: 'Ward', x: 9, y: 1, w: 5, h: 4, door: { tx: 8, ty: 2 } },
  { id: 'pharmacy', name: 'Pharmacy', x: 1, y: 6, w: 5, h: 3, door: { tx: 6, ty: 7 } },
  { id: 'kitchen', name: 'Kitchen', x: 9, y: 6, w: 5, h: 3, door: { tx: 8, ty: 7 } }
];
export const LOBBY = { x: 1, y: 10, w: 13, h: 2 };
const DOORS = ROOMS.map((r) => `${r.door.tx},${r.door.ty}`);

/** Furniture that stands in the way (and is drawn): rects in tiles. */
export const FURNITURE = [
  { id: 'desk', x: 1, y: 1, w: 2, h: 1 },          // the doctor's desk
  { id: 'shelves', x: 1, y: 6, w: 5, h: 1 },       // the pharmacy's shelves of bottles
  { id: 'counter', x: 9, y: 6, w: 5, h: 1 },       // the kitchen counter and stove
  { id: 'lobby-desk', x: 2, y: 10, w: 3, h: 1 },   // Nurse Nia's desk
  { id: 'plant', x: 1, y: 11, w: 1, h: 1 }, { id: 'plant', x: 13, y: 11, w: 1, h: 1 },
  { id: 'chair', x: 10, y: 11, w: 1, h: 1 }, { id: 'chair', x: 12, y: 11, w: 1, h: 1 },
  { id: 'bed', x: 12, y: 1, w: 1, h: 2 }           // the second ward bed (the first is a station)
];

/** Things to use: stand on `at` and press. */
export const STATIONS = [
  { id: 'stetho', title: 'Stethoscope', x: 5, y: 1, w: 1, h: 1, at: { tx: 5, ty: 2 } },
  { id: 'surgery', title: 'Splinter Surgery', x: 3, y: 4, w: 2, h: 1, at: { tx: 4, ty: 3 }, gameId: 'hea-splinter' },
  { id: 'bed', title: 'Rest', x: 10, y: 1, w: 1, h: 2, at: { tx: 9, ty: 1 } },
  { id: 'xray', title: 'X-ray', x: 13, y: 3, w: 1, h: 2, at: { tx: 12, ty: 3 } }
];

/** The staff: one per game, in their rooms, and Nurse Nia at the lobby desk. Looks come from NPC_STYLES, or a drawn sheet (`art`). */
export const STAFF = [
  {
    id: 'doctor', name: 'Dr Dee', voice: 'female', pitch: 1.1, rate: 0.95, sprite: 'npc35', gameId: 'hea-body', at: { tx: 2, ty: 2 },
    lines: ['Welcome to my consulting room. Say "aaah"! I know every bone, muscle and organ in the body.', 'Try the stethoscope by the window, and if you have a steady hand, the couch is ready for splinter surgery.'],
    playPrompt: 'Want to play Body Map?'
  },
  {
    id: 'physio', name: 'Coach Fay', voice: 'female', pitch: 1.2, rate: 1.1, sprite: 'npc38', gameId: 'hea-feel', at: { tx: 11, ty: 4 },
    lines: ['This is the ward. A good sleep mends more than any medicine: lie down in a bed when your hearts are low.', 'And the X-ray machine shows what is inside you: two hundred and six bones!'],
    playPrompt: 'Want to play Feel Good?'
  },
  {
    id: 'pharmacist', name: 'Pharmacist Pat', voice: 'male', pitch: 0.9, rate: 1.0, sprite: 'npc37', gameId: 'hea-germs', at: { tx: 3, ty: 7 },
    lines: ['Germs are too small to see, but soap, tissues and toothbrushes zap them every day.', 'Medicine only from a grown-up you trust, and in Barbados the ambulance is 511. Remember that!'],
    playPrompt: 'Want to play Germ Zapper?'
  },
  {
    id: 'dietitian', name: 'Chef Camille', voice: 'female', pitch: 1.0, rate: 1.05, sprite: 'npc36', gameId: 'hea-plate', at: { tx: 11, ty: 7 },
    lines: ['Welcome to the hospital kitchen! Half fruit and veg, a quarter grains, a quarter protein, and water to drink.', 'Flying fish and cou-cou, mango and sweet potato: Bajan food can be the healthiest in the world!'],
    playPrompt: 'Want to play Plate Planner?'
  },
  {
    id: 'nurse', name: 'Nurse Nia', voice: 'female', pitch: 1.15, rate: 1.0, art: 'nurse', sprite: 'npc0', gameId: null, at: { tx: 5, ty: 10 },
    lines: ['Hello there! I am Nurse Nia. Up the corridor: the doctor and the ward through the first doors, the pharmacy and the kitchen through the next.', 'Low on hearts? A rest in a ward bed fills them up, once a day. Drink your water and wash your hands and you will hardly need it!'],
    playPrompt: null
  }
];
export const getStaff = (id) => STAFF.find((s) => s.id === id) || null;

const inRect = (r, tx, ty) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;
export const isDoor = (tx, ty) => DOORS.includes(`${tx},${ty}`);
export function isWall(tx, ty) {
  if (tx <= 0 || tx >= HOSPITAL_W - 1 || ty <= 0) return true;
  if (ty >= HOSPITAL_H - 1) return tx !== EXIT.tx;
  if (isDoor(tx, ty)) return false;
  if ((tx === 6 || tx === 8) && ty <= 8) return true;             // the rooms' corridor walls
  if ((ty === 5 || ty === 9) && tx !== CORRIDOR_X) return true;   // between the rooms, and above the lobby
  return false;
}
export const isSolid = (tx, ty) => isWall(tx, ty) || FURNITURE.some((f) => inRect(f, tx, ty)) || STATIONS.some((s) => inRect(s, tx, ty)) || STAFF.some((s) => s.at.tx === tx && s.at.ty === ty);
export const isFloor = (tx, ty) => !isWall(tx, ty);
export const onExit = (tx, ty) => tx === EXIT.tx && ty === EXIT.ty;
export const roomAt = (tx, ty) => ROOMS.find((r) => inRect(r, tx, ty)) || (inRect(LOBBY, tx, ty) ? { id: 'lobby', name: 'Lobby' } : null);

/** Floor squares reachable from the spawn (for tests: every station and member of staff can be walked to). */
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

/** The games the staff offer, in staff order (the surgery is a station, not a person). */
export const staffGames = () => STAFF.filter((s) => s.gameId).map((s) => s.gameId);
void HEALTH_GAMES;
