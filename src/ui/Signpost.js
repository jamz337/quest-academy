import { THEME, hex } from './theme.js';
import { FONT, WEIGHT } from './TextStyles.js';

// Board geometry in world pixels. Boards are 11px tall and stack up the post with a 2px gap;
// left/right boards are arrow-shaped pentagons and the bottom one points down.
const BH = 11, TIP = 5, GAP = 2;
const POST_W = 5, POST_TOP = 6;
const WOOD = { fill: 0xa06a3c, dark: 0x5a3a22, light: 0xc98c55 };

/** Which lands the hub signpost points to, top board first. `dir` is where the arrow tip goes. */
export const SIGN_BOARDS = [
  { id: 'science', label: 'Science', dir: 'up' },
  { id: 'music', label: 'Music', dir: 'up' },
  { id: 'words', label: 'Words', dir: 'right' },
  { id: 'math', label: 'Math', dir: 'left' },
  { id: 'bible', label: 'Bible', dir: 'right' },
  { id: 'code', label: 'Code', dir: 'down' },
  { id: 'history', label: 'Harbor', dir: 'down' }
];

/** Outline of a board whose centre line is at (0, cy). Left/right boards straddle the post; the down board is centred. */
function boardPoints(dir, cy) {
  const t = cy - BH / 2, b = cy + BH / 2;
  if (dir === 'right') { const x0 = -9, x1 = 31; return [{ x: x0, y: t }, { x: x1 - TIP, y: t }, { x: x1, y: cy }, { x: x1 - TIP, y: b }, { x: x0, y: b }]; }
  if (dir === 'left') { const x0 = -31, x1 = 9; return [{ x: x0 + TIP, y: t }, { x: x1, y: t }, { x: x1, y: b }, { x: x0 + TIP, y: b }, { x: x0, y: cy }]; }
  const hw = 18;
  if (dir === 'up') return [{ x: -hw, y: t }, { x: -TIP, y: t }, { x: 0, y: t - TIP }, { x: TIP, y: t }, { x: hw, y: t }, { x: hw, y: b }, { x: -hw, y: b }];
  return [{ x: -hw, y: t }, { x: hw, y: t }, { x: hw, y: b }, { x: TIP, y: b }, { x: 0, y: b + TIP }, { x: -TIP, y: b }, { x: -hw, y: b }];
}

/** Where the label sits on a board: the middle of its rectangular body, away from the tip. */
function labelX(dir) { return dir === 'right' ? 8.5 : dir === 'left' ? -8.5 : 0; }

/**
 * A readable wooden signpost for the hub: one coloured arrow board per land, subject-coloured with a
 * white label rendered at high resolution so it stays crisp under the world camera's zoom.
 * (x, y) is the foot of the post. Returns a Container; `.height` is the total height above the foot.
 */
export function signpost(scene, x, y, opts = {}) {
  const { boards = SIGN_BOARDS, resolution = 6, fontSize = 8 } = opts;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const n = boards.length;
  // A down-pointing board that is not the lowest gets room below it, so its tip shows above the next board.
  const extraBelow = (i) => (boards[i].dir === 'down' && i < n - 1 ? TIP : 0);
  const offsets = []; let acc = 0;
  // Likewise an up-pointing board below the top one gets room above it for its tip.
  for (let i = 0; i < n; i++) { if (i > 0 && boards[i].dir === 'up') acc += TIP; offsets.push(acc); acc += BH + GAP + extraBelow(i); }
  const top = -(POST_TOP + acc + 6);

  // Ground shadow and the post itself.
  g.fillStyle(THEME.ink, 0.16); g.fillEllipse(0, 0, 16, 5);
  g.fillStyle(WOOD.dark, 1); g.fillRoundedRect(-POST_W / 2 - 1, top - 1, POST_W + 2, -top + 2, 2);
  g.fillStyle(WOOD.fill, 1); g.fillRoundedRect(-POST_W / 2, top, POST_W, -top, 1.5);
  g.fillStyle(WOOD.light, 1); g.fillRect(-POST_W / 2, top, 1.5, -top);
  g.lineStyle(1.2, WOOD.dark, 1); g.strokeRoundedRect(-POST_W / 2 - 1, top - 1, POST_W + 2, -top + 2, 2);

  const labels = [];
  boards.forEach((b, i) => {
    const cy = top + POST_TOP + offsets[i] + BH / 2;
    const sub = THEME.subjects[b.id] || { accent: THEME.primary, dark: THEME.primaryDark };
    const pts = boardPoints(b.dir, cy);
    g.fillStyle(THEME.ink, 0.18); g.fillPoints(pts.map((p) => ({ x: p.x + 1, y: p.y + 1.5 })), true);
    g.fillStyle(sub.accent, 1); g.fillPoints(pts, true);
    g.lineStyle(1.5, sub.dark, 1); g.strokePoints(pts, true, true);
    // A nail where the board meets the post.
    g.fillStyle(sub.dark, 1); g.fillCircle(0, cy - BH / 2 + 2.5, 1);
    const t = scene.add.text(labelX(b.dir), cy + 0.5, b.label, { fontFamily: FONT, fontSize: fontSize + 'px', fontStyle: WEIGHT.heavy, color: hex(THEME.onAccent) }).setOrigin(0.5);
    if (typeof t.setResolution === 'function') t.setResolution(resolution);
    labels.push(t);
  });
  c.add([g, ...labels]);
  c.height = -top;
  c.labels = labels;
  return c;
}
