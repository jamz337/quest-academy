// Small read-only views of a coding puzzle for the duel screen: a mini maze (walls, flag, coins, a path trail,
// lettered markers and the robot) and a program listed as coloured block rows, the way the lesson editors show it.
import { THEME, hex } from './theme.js';
import { parseLevel } from '../generators/coding/interpreter.js';
import { panel } from './Panel.js';
import { FONT, WEIGHT } from './TextStyles.js';
import { uiScale, clamp } from '../systems/Layout.js';

const FLOOR = 0xffffff, FLOOR_LINE = THEME.line, WALL = THEME.ink2, WALL_TOP = 0x7f7c9c, FRAME = THEME.lineStrong;

/**
 * Draw a level into rect. code: { level: { grid, startDir }, robot?: { x, y, dir }, markers?: [{ letter, x, y }],
 * path?: [{ from, to }] }. The robot stands on the start unless `robot` says otherwise. Returns { cell, origin, lv }.
 */
export function drawMiniMaze(scene, rect, code) {
  const lv = parseLevel(code.level);
  const cell = Math.max(6, Math.floor(Math.min(rect.w / lv.w, rect.h / lv.h)));
  const ox = rect.x + (rect.w - cell * lv.w) / 2, oy = rect.y + (rect.h - cell * lv.h) / 2;
  const at = (x, y) => ({ x: ox + (x + 0.5) * cell, y: oy + (y + 0.5) * cell });
  panel(scene, ox - 4, oy - 4, cell * lv.w + 8, cell * lv.h + 8, { color: FRAME, radius: 10, shadow: 'sm' });
  const g = scene.add.graphics();
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
    const px = ox + x * cell, py = oy + y * cell;
    if (lv.walls[y][x]) { g.fillStyle(WALL, 1); g.fillRect(px, py, cell, cell); g.fillStyle(WALL_TOP, 1); g.fillRect(px + 1, py + 1, cell - 2, cell * 0.35); }
    else { g.fillStyle(FLOOR, 1); g.fillRect(px, py, cell, cell); g.lineStyle(1, FLOOR_LINE, 1); g.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1); }
  }
  const sp = at(lv.start.x, lv.start.y);
  g.fillStyle(THEME.primary, 0.22); g.fillCircle(sp.x, sp.y, cell * 0.36);
  if (lv.goal) {
    const gc = at(lv.goal.x, lv.goal.y);
    g.fillStyle(THEME.success, 0.2); g.fillRect(gc.x - cell / 2 + 2, gc.y - cell / 2 + 2, cell - 4, cell - 4);
    g.fillStyle(THEME.ink2, 1); g.fillRect(gc.x - cell * 0.22, gc.y - cell * 0.36, cell * 0.08, cell * 0.72);
    g.fillStyle(THEME.success, 1); g.fillTriangle(gc.x - cell * 0.14, gc.y - cell * 0.36, gc.x + cell * 0.32, gc.y - cell * 0.18, gc.x - cell * 0.14, gc.y);
  }
  for (const c of lv.coins) { const p = at(c.x, c.y); if (scene.textures.exists('coin')) scene.add.image(p.x, p.y, 'coin').setDisplaySize(cell * 0.55, cell * 0.55); }
  // The trail the robot walked (Robot Dance): a line through every square it stepped on.
  if (code.path && code.path.length) {
    g.lineStyle(Math.max(2, cell * 0.14), THEME.brand, 0.7);
    for (const seg of code.path) { const a = at(seg.from.x, seg.from.y), b = at(seg.to.x, seg.to.y); g.lineBetween(a.x, a.y, b.x, b.y); }
    g.fillStyle(THEME.brand, 0.85);
    for (const seg of code.path) { const b = at(seg.to.x, seg.to.y); g.fillCircle(b.x, b.y, Math.max(2, cell * 0.11)); }
  }
  const robot = code.robot || { x: lv.start.x, y: lv.start.y, dir: lv.dir };
  const rp = at(robot.x, robot.y);
  if (scene.textures.exists('robot')) scene.add.sprite(rp.x, rp.y, 'robot', 0).setDisplaySize(cell * 0.82, cell * 0.82).setAngle(robot.dir * 90);
  // Lettered markers (Predict the Robot): where might it stop?
  for (const m of code.markers || []) {
    const p = at(m.x, m.y);
    const mg = scene.add.graphics();
    mg.fillStyle(0xffffff, 1); mg.fillCircle(p.x, p.y, cell * 0.34);
    mg.lineStyle(2, THEME.brand, 1); mg.strokeCircle(p.x, p.y, cell * 0.34);
    scene.add.text(p.x, p.y + 1, m.letter, { fontFamily: FONT, fontSize: Math.round(cell * 0.5) + 'px', color: hex(THEME.brandDark), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
  }
  return { cell, origin: { x: ox, y: oy }, lv };
}

const ROW_COLOURS = [
  [/^Move/, THEME.block.fwd], [/^Turn ◀/, THEME.block.left], [/^Turn ▶/, THEME.block.right], [/^Repeat/, THEME.block.repeat],
  [/^If/, THEME.block.if], [/^Else/, THEME.block.else], [/^Until/, THEME.block.while], [/^Do/, THEME.block.call], [/^Pick/, THEME.block.pick]
];
const rowColour = (label) => { const hit = ROW_COLOURS.find(([re]) => re.test(label)); return hit ? hit[1] : THEME.ink3; };

/**
 * List a program (programText lines, two spaces per nesting level) as coloured block rows inside rect.
 * opts: numbered (1., 2., … for Bug Hunt), into (a container: rect is then in its local coordinates), fontSize.
 * Returns the objects made.
 */
export function drawProgram(scene, rect, text, { numbered = false, into = null, fontSize = null } = {}) {
  const ui = uiScale(scene);
  const lines = String(text || '').split('\n');
  const n = Math.max(1, lines.length);
  const rh = Math.min(rect.h / n, 22 * ui);
  const font = fontSize || clamp(rh * 0.62, 9, 14 * ui);
  const indent = Math.min(14 * ui, rh * 0.7);
  const g = scene.add.graphics();
  if (into) into.add(g);
  const made = [g];
  lines.forEach((line, i) => {
    const depth = (line.match(/^ */) || [''])[0].length / 2, label = line.trim();
    const x = rect.x + depth * indent, y = rect.y + i * rh, w = rect.w - depth * indent;
    g.fillStyle(rowColour(label), 1); g.fillRoundedRect(x, y + 1, w, rh - 3, Math.min(6, rh / 3));
    const t = scene.add.text(x + 7, y + (rh - 3) / 2 + 1, (numbered ? `${i + 1}. ` : '') + label, { fontFamily: FONT, fontSize: Math.round(font) + 'px', color: '#ffffff', fontStyle: WEIGHT.bold }).setOrigin(0, 0.5);
    if (into) into.add(t);
    made.push(t);
  });
  return made;
}
