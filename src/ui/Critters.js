// The wandering sheep and bunny, and the coding games' robot, drawn with smooth shapes. Each is painted in a
// 16 x 16 drawing space and scaled up into large cells (CRITTER_CELL), so it stays sharp when the camera zooms in.
// Two frames each: standing, and a step (the animals face left; flip them to face right).

/** Side of one cell of the 'sheep', 'bunny' and 'robot' sheets. */
export const CRITTER_CELL = 192;
/** Scale that shows a cell one tile (32 px) tall in the world. */
export const CRITTER_WORLD_SCALE = 32 / CRITTER_CELL;

const INK = '#3b3550';
const oval = (c, x, y, rx, ry, col, rot = 0, a = 1) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; };
const box = (c, x, y, w, h, r, col) => { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
/** Shapes as one soft-edged blob: a slightly larger, darker copy underneath gives it a rim. Each is [x, y, rx, ry?, rot?]. */
const blob = (c, shapes, rim, fill, edge = 0.35) => {
  for (const [x, y, rx, ry = rx, rot = 0] of shapes) oval(c, x, y, rx + edge, ry + edge, rim, rot);
  for (const [x, y, rx, ry = rx, rot = 0] of shapes) oval(c, x, y, rx, ry, fill, rot);
};
const shadow = (c, x, w) => oval(c, x, 13.7, w, 0.9, '#1e1b4b', 0, 0.16);

function sheep(c, step) {
  shadow(c, 8.4, 5.2);
  const legs = step ? [3.9, 6.1, 9.9, 12.1] : [4.7, 6.6, 9.4, 11.3];
  legs.forEach((x, i) => box(c, x, 10.4, 1.3, 3.2 - (step && i % 2 ? 0.5 : 0), 0.6, INK));
  blob(c, [[6, 6.6, 3], [8.4, 5.1, 3.1], [11, 5.7, 2.9], [12.3, 8, 2.7], [9.6, 9.1, 3.1], [6.6, 9.2, 2.9]], '#d5d0e0', '#ffffff');
  oval(c, 8.2, 6.4, 1.6, 1, '#eef0f7', 0.3); oval(c, 10.6, 8.6, 1.4, 0.9, '#eef0f7', -0.2);   // soft curls
  oval(c, 14.4, 7.4, 1.1, 1.1, '#ffffff');                                                     // tail
  oval(c, 4.9, 5.1, 1.5, 0.75, INK, 0.5);                                                      // ear
  oval(c, 3.3, 6.9, 2.1, 2.6, INK, 0.12);                                                      // face
  oval(c, 4.2, 4.5, 1.5, 1.2, '#ffffff');                                                      // woolly fringe
  oval(c, 2.7, 6.4, 0.62, 0.7, '#ffffff'); oval(c, 2.55, 6.5, 0.3, 0.34, '#1e1b4b');           // eye
  oval(c, 2, 8.3, 0.5, 0.3, '#ff9db4');                                                        // nose
}

function bunny(c, step) {
  const up = step ? -0.8 : 0;   // a little hop on the step frame
  shadow(c, 8.4, step ? 4.2 : 4.8);
  const FUR = '#f3e7d6', RIM = '#cdb9a0';
  blob(c, step ? [[4.3, 12.4, 1.7, 0.75], [12.6, 12.3, 2.3, 0.8, 0.25]] : [[5.4, 12.7, 1.7, 0.8], [11, 12.8, 2.3, 0.85]], RIM, FUR, 0.3);   // feet
  oval(c, 13.7, 8.7 + up, 1.35, 1.35, '#ffffff');                                              // tail
  blob(c, [[3.7, 3.4 + up, 0.95, 2.7, -0.12], [5.7, 3.3 + up, 0.95, 2.7, 0.14], [11, 9.9 + up, 3.1, 2.8], [8.4, 9.4 + up, 4.5, 3.1], [4.7, 7.3 + up, 2.7]], RIM, FUR);
  oval(c, 3.7, 3.5 + up, 0.45, 1.9, '#ffb3c7', -0.12); oval(c, 5.7, 3.4 + up, 0.45, 1.9, '#ffb3c7', 0.14);   // inside the ears
  oval(c, 8.6, 10.6 + up, 2.6, 1.3, '#fffaf2');                                                // pale tummy
  oval(c, 3.9, 6.9 + up, 0.55, 0.62, '#1e1b4b'); oval(c, 4.05, 6.75 + up, 0.2, 0.2, '#ffffff'); // eye
  oval(c, 2.15, 7.9 + up, 0.42, 0.34, '#ff8fa3');                                              // nose
  oval(c, 3.4, 8.6 + up, 0.9, 0.6, '#ffd0dc', 0, 0.6);                                         // cheek
}

/** The robot seen from the front; "up" is the way it faces, because the maze turns the whole sprite. */
function robot(c, step) {
  const BODY = '#f4f6fb', RIM = '#3b3550', ORANGE = '#e8623f';
  box(c, step ? 3.4 : 4.1, 11.4, 3.2, 3.2, 1, RIM); box(c, step ? 9.4 : 8.7, 11.4, 3.2, 3.2, 1, RIM);   // treads
  c.strokeStyle = RIM; c.lineWidth = 0.7; c.lineCap = 'round'; c.beginPath(); c.moveTo(8, 3.2); c.lineTo(8, 1.6); c.stroke();
  oval(c, 8, 1.4, 0.95, 0.95, '#ffc531');                                                      // antenna light
  oval(c, 2.7, 8.2, 1.1, 1.5, '#ffc531'); oval(c, 13.3, 8.2, 1.1, 1.5, '#ffc531');             // side bolts
  box(c, 2.9, 2.9, 10.2, 9.4, 2.4, RIM); box(c, 3.4, 3.4, 9.2, 8.4, 1.9, BODY);
  box(c, 3.4, 9.6, 9.2, 1.1, 0, ORANGE);                                                       // chest band
  oval(c, 5.2, 4.3, 1.6, 0.5, '#ffffff', -0.3);                                                // shine
  box(c, 4.5, 4.7, 7, 3.9, 1.3, '#1e1b4b');                                                    // face screen
  oval(c, 6.4, 6.5, 0.85, 0.95, '#6fe3ff'); oval(c, 9.6, 6.5, 0.85, 0.95, '#6fe3ff');          // eyes
  c.strokeStyle = '#6fe3ff'; c.lineWidth = 0.35; c.beginPath(); c.arc(8, 7.3, 0.9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();   // smile
}

const PAINTERS = { sheep, bunny, robot };
export const CRITTER_KEYS = Object.keys(PAINTERS);

/** Paint frame `step` (0 standing, 1 stepping) of 'sheep', 'bunny' or 'robot' into a size x size cell at (ox, oy). */
export function drawCritter(ctx, key, ox, oy, size, step = 0) {
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(size / 16, size / 16);
  PAINTERS[key](ctx, step);
  ctx.restore();
}
