// A little moving picture for a Bible passage (Jonah and the big fish, the ark on the flood, David's stone…), shown
// beside the passage in "Let's see why". Each story is a handful of emoji "actors" with a looping move.
// Actors are [emoji, x, y, size, move?]: x and y run from -1 to 1 across the picture, size is a share of its height,
// and `move` is where the actor goes ({ x, y, scale, alpha, angle } plus ms, wait, yoyo, ease) before it starts again.

const waves = (y = 0.72) => [-0.8, -0.27, 0.27, 0.8].map((x, i) => ['🌊', x, y, 0.36, { x: x + 0.1, ms: 1400, wait: i * 120, yoyo: true }]);
const twinkle = (x, y, size = 0.22, wait = 0) => ['✨', x, y, size, { scale: 0.3, alpha: 0.2, ms: 700, wait, yoyo: true }];

// First match wins: `ref` tests the passage, `words` (when given) tests the question and its answer too.
const STORIES = [
  { ref: /^Jonah/, actors: [...waves(), ['🐋', 0.35, 0.2, 0.7, { x: 0.2, y: 0.28, ms: 1300, yoyo: true }], ['🧍', -0.7, -0.75, 0.34, { x: 0.02, y: 0.22, scale: 0.1, alpha: 0, angle: 200, ms: 2000, ease: 'Quad.In', rest: 900 }]] },
  { ref: /^Genesis 8\b/, actors: [...waves(), ['⛵', -0.45, 0.25, 0.6, { angle: 6, ms: 1200, yoyo: true }], ['🕊️', 0.9, -0.7, 0.32, { x: -0.25, y: -0.25, ms: 2200, ease: 'Sine.Out', rest: 900 }], ['🌿', 0.9, -0.5, 0.2, { x: -0.25, y: -0.05, ms: 2200, ease: 'Sine.Out', rest: 900 }]] },
  { ref: /^Genesis 9\b/, actors: [['🌈', 0, -0.1, 1.1, { alpha: 0, scale: 0.6, ms: 1800, from: true, rest: 1600 }], ['☁️', -0.7, 0.45, 0.4, { x: -0.6, ms: 1600, yoyo: true }], ['☁️', 0.7, 0.45, 0.4, { x: 0.6, ms: 1600, yoyo: true }]] },
  { ref: /^Genesis 7\b/, actors: [['⛵', 0.6, 0, 0.75], ...['🦒', '🦒', '🐘', '🐘'].map((e, i) => [e, -1.1 - i * 0.32, 0.5, 0.32, { x: 0.45, alpha: 0, ms: 2600, wait: i * 260, rest: 500 }])] },
  { ref: /^Genesis 6\b/, actors: [...waves(), ['⛵', 0, 0.2, 0.7, { angle: 7, y: 0.12, ms: 1300, yoyo: true }], ...[-0.7, -0.2, 0.3, 0.8].map((x, i) => ['💧', x, -1, 0.18, { y: 0.5, alpha: 0, ms: 900, wait: i * 220, ease: 'Quad.In' }])] },
  { ref: /^1 Samuel 17\b/, actors: [['🧒', -0.75, 0.35, 0.42], ['🧔', 0.6, 0, 0.95, { angle: 80, y: 0.45, ms: 500, wait: 1100, ease: 'Quad.In', rest: 1200 }], ['🪨', -0.6, 0.2, 0.18, { x: 0.5, y: -0.45, angle: 360, ms: 1000, rest: 1800 }]] },
  { ref: /^Matthew 2\b/, actors: [['⭐', 0.65, -0.6, 0.4, { scale: 1.3, ms: 700, yoyo: true }], ['🏠', 0.65, 0.35, 0.5], ...[0, 1, 2].map((i) => ['🐫', -1.2 - i * 0.4, 0.42, 0.36, { x: 0.2 - i * 0.4, ms: 2800, rest: 900 }])] },
  { ref: /^Luke 2\b/, actors: [['⭐', 0, -0.65, 0.4, { scale: 1.35, ms: 700, yoyo: true }], ['👶', 0, 0.2, 0.5, { angle: 6, ms: 900, yoyo: true }], ['🐑', -0.7, 0.45, 0.34, { y: 0.3, ms: 500, yoyo: true }], ['🐑', 0.7, 0.45, 0.34, { y: 0.3, ms: 500, wait: 250, yoyo: true }]] },
  { ref: /^Daniel 6\b/, actors: [['🙏', 0, 0.2, 0.5], ['🦁', -0.68, 0.3, 0.5, { angle: -8, ms: 1100, yoyo: true }], ['🦁', 0.68, 0.3, 0.5, { angle: 8, ms: 1100, wait: 300, yoyo: true }], ['😇', 0, -1.1, 0.36, { y: -0.55, ms: 1500, ease: 'Sine.Out', rest: 1500 }]] },
  { ref: /^Daniel 3\b/, actors: [['🔥', -0.6, 0.3, 0.6, { scale: 1.15, ms: 400, yoyo: true }], ['🔥', 0.6, 0.3, 0.6, { scale: 1.15, ms: 400, wait: 200, yoyo: true }], ['🧍', -0.22, 0.25, 0.4], ['🧍', 0.02, 0.25, 0.4], ['🧍', 0.26, 0.25, 0.4], ['😇', 0, -0.55, 0.36, { y: -0.45, ms: 900, yoyo: true }]] },
  { ref: /^Genesis 1\b/, actors: [['🌍', 0, 0.15, 0.7, { angle: 360, ms: 6000 }], ['☀️', -0.72, -0.5, 0.36, { scale: 1.2, ms: 900, yoyo: true }], ['🌙', 0.72, -0.5, 0.3, { angle: 12, ms: 1200, yoyo: true }], twinkle(0.35, -0.75), twinkle(-0.3, -0.8, 0.2, 350)] },
  { ref: /^Genesis 2\b/, actors: [['🌳', 0, -0.05, 0.9, { angle: 2, ms: 1500, yoyo: true }], ['🧑', -0.6, 0.4, 0.38], ['👩', 0.6, 0.4, 0.38], ['🦋', -0.8, -0.5, 0.2, { x: 0.8, y: -0.7, ms: 2600, yoyo: true }]] },
  { ref: /^Genesis 37\b/, actors: [['🧥', 0, 0.05, 0.75, { angle: 8, ms: 900, yoyo: true }], ['🌈', 0, -0.55, 0.5, { alpha: 0.3, ms: 900, yoyo: true }], twinkle(-0.6, -0.2), twinkle(0.6, 0.2, 0.22, 350)] },
  { ref: /^Exodus 2\b/, actors: [...waves(0.6), ['🧺', -0.9, 0.2, 0.45, { x: 0.7, ms: 3200, rest: 600 }], ['🌾', -0.85, 0.1, 0.4], ['🌾', 0.85, 0.1, 0.4]] },
  { ref: /^Exodus 14\b/, actors: [['🌊', -0.25, 0.2, 0.6, { x: -0.8, ms: 1300, rest: 1900 }], ['🌊', 0.25, 0.2, 0.6, { x: 0.8, ms: 1300, rest: 1900 }], ['🚶', 0, 0.9, 0.36, { y: -0.3, scale: 0.6, ms: 1700, wait: 1100, rest: 400 }]] },
  { ref: /^Exodus (20|3–20)\b/, actors: [['⛰️', 0, 0.25, 0.95], ['⚡', -0.5, -0.6, 0.34, { alpha: 0, ms: 350, yoyo: true, rest: 500 }], ['📜', 0, -1.1, 0.4, { y: -0.2, ms: 1600, ease: 'Sine.Out', rest: 1400 }]] },
  { ref: /^Joshua 6\b/, actors: [['🎺', -0.7, 0.1, 0.42, { angle: -14, scale: 1.15, ms: 260, yoyo: true }], ...[0.2, 0.52, 0.84].map((x, i) => ['🧱', x, -0.1, 0.36, { y: 0.6, angle: 40 + i * 30, ms: 700, wait: 1100 + i * 120, ease: 'Bounce.Out', rest: 1200 }])] },
  { ref: /^(Matthew 14|John 6|Mark 6)\b/, words: /walk|water|wave|sink/i, actors: [...waves(0.6), ['🚶', -0.9, 0.2, 0.5, { x: 0.3, ms: 2800, rest: 700 }], ['⛵', 0.7, 0.15, 0.45, { angle: 8, ms: 900, yoyo: true }]] },
  { ref: /^(Matthew 14|John 6|Mark 6)\b/, actors: [['🧺', 0, 0.35, 0.55], ...[[-0.7, -0.3, '🍞'], [-0.35, -0.6, '🐟'], [0, -0.7, '🍞'], [0.35, -0.6, '🐟'], [0.7, -0.3, '🍞']].map(([x, y, e], i) => [e, 0, 0.3, 0.3, { x, y, ms: 800, wait: i * 240, ease: 'Back.Out', from: false, rest: 1600 - i * 240 }])] },
  { ref: /^Luke 19\b/, words: /tree|zacchaeus|climb|short/i, actors: [['🌴', 0.2, 0, 1], ['🧍', -0.1, 0.55, 0.3, { y: -0.3, ms: 1600, ease: 'Sine.Out', rest: 1400 }], ['👋', -0.7, 0.3, 0.3, { angle: 25, ms: 350, yoyo: true }]] },
  { ref: /^Luke 15\b/, actors: [['🧑‍🌾', 0.55, 0.15, 0.6], ['🐑', -1, 0.4, 0.38, { x: 0.1, ms: 2000, ease: 'Sine.Out', rest: 1400 }], ['❤️', 0.3, -1.2, 0.26, { y: -0.6, ms: 700, wait: 1900, ease: 'Back.Out', rest: 800 }]] },
  { ref: /^(Mark 4|Matthew 8)\b/, actors: [...waves(), ['⛵', 0, 0.2, 0.65, { angle: 16, ms: 500, yoyo: true }], ['⛈️', 0, -0.6, 0.5, { alpha: 0, ms: 1500, wait: 1200, rest: 1400 }], ['☀️', 0.7, -0.6, 0.36, { alpha: 0, ms: 1500, wait: 1200, from: true, rest: 1400 }]] },
  { ref: /^(Luke 24|John 20|Matthew 28|Mark 16)\b/, actors: [['⛰️', 0, 0.2, 1], ['🪨', 0, 0.4, 0.42, { x: 0.65, angle: 180, ms: 1500, ease: 'Sine.InOut', rest: 1700 }], ['☀️', -0.65, -0.1, 0.4, { y: -0.6, scale: 1.2, ms: 1800, rest: 1400 }]] },
  { ref: /^Acts 2\b/, actors: [...[-0.6, 0, 0.6].map((x, i) => ['🧍', x, 0.4, 0.42]), ...[-0.6, 0, 0.6].map((x, i) => ['🔥', x, -1.1, 0.26, { y: -0.12, ms: 1200, wait: i * 200, ease: 'Sine.Out', rest: 1500 - i * 200 }])] },
  { ref: /^Matthew 3\b/, actors: [...waves(0.6), ['🧍', 0, 0.25, 0.45], ['🕊️', 0.6, -1.1, 0.36, { x: 0, y: -0.45, ms: 1700, ease: 'Sine.Out', rest: 1500 }]] },
  { ref: /^1 Kings 17\b/, actors: [['🧔', -0.55, 0.3, 0.5], ['🐦', 1, -0.7, 0.32, { x: -0.2, y: -0.1, ms: 1900, ease: 'Sine.Out', rest: 1100 }], ['🍞', 1, -0.5, 0.22, { x: -0.2, y: 0.1, ms: 1900, ease: 'Sine.Out', rest: 1100 }]] },
  { ref: /^Judges 16\b/, actors: [['🏛️', 0, 0, 0.95, { angle: 5, x: 0.05, ms: 140, yoyo: true }], ['💪', 0, 0.5, 0.38, { scale: 1.3, ms: 500, yoyo: true }]] },
  { ref: /^1 Samuel (3|1–3)\b/, actors: [['🛏️', -0.2, 0.35, 0.6], ['🌙', 0.7, -0.6, 0.3], ['💬', 0.3, -0.25, 0.4, { scale: 0.2, alpha: 0, ms: 600, from: true, ease: 'Back.Out', rest: 1300 }], twinkle(-0.6, -0.6)] },
  { ref: /^Psalm 23\b/, actors: [['🐑', -0.35, 0.3, 0.42, { y: 0.2, ms: 600, yoyo: true }], ['🌿', 0.45, 0.4, 0.4, { angle: 8, ms: 1000, yoyo: true }], ['🧑‍🌾', 0.75, 0, 0.55], ['☀️', -0.7, -0.6, 0.32, { scale: 1.15, ms: 900, yoyo: true }]] },
  { ref: /^Psalm/, actors: [['🎵', -0.5, 0.5, 0.36, { y: -0.7, alpha: 0, ms: 2000 }], ['🎶', 0.1, 0.6, 0.4, { y: -0.7, alpha: 0, ms: 2300, wait: 500 }], ['🎵', 0.6, 0.5, 0.3, { y: -0.7, alpha: 0, ms: 1900, wait: 1000 }], ['🙌', 0, 0.45, 0.4, { scale: 1.12, ms: 600, yoyo: true }]] }
];
// Any other passage: the Bible itself, glowing.
const BOOK = { actors: [['📖', 0, 0.1, 0.75, { scale: 1.08, y: 0.04, ms: 900, yoyo: true }], twinkle(-0.6, -0.5, 0.26), twinkle(0.62, -0.3, 0.22, 300), twinkle(0.2, -0.75, 0.2, 600)] };

/** The moving picture for a question with a passage (`q.ref`), or null when it has none. */
export function storyFor(q) {
  if (!q || !q.ref) return null;
  const said = `${q.prompt || ''} ${q.answer || ''}`;
  return STORIES.find((s) => s.ref.test(q.ref) && (!s.words || s.words.test(said))) || BOOK;
}

/** Play `story` in the w x h box centred on (cx, cy). Returns what it made (the caller owns and destroys it). */
export function playStory(scene, cx, cy, w, h, story) {
  const made = [];
  const unit = Math.min(h, w * 0.62), rx = w / 2 - unit * 0.22, ry = h / 2 - unit * 0.18;
  for (const [emoji, ax, ay, size, move] of story.actors) {
    const x = cx + ax * rx, y = cy + ay * ry;
    const t = scene.add.text(x, y, emoji, { fontSize: Math.max(10, Math.round(unit * size)) + 'px' }).setOrigin(0.5);
    made.push(t);
    if (!move || !scene.tweens) continue;
    const to = {};
    if (move.x !== undefined) to.x = cx + move.x * rx;
    if (move.y !== undefined) to.y = cy + move.y * ry;
    for (const k of ['scale', 'alpha', 'angle']) if (move[k] !== undefined) to[k] = move[k];
    // `from: true` means the actor arrives (fades or grows in) instead of leaving.
    const props = {};
    for (const k of Object.keys(to)) props[k] = move.from ? { from: to[k], to: t[k] } : to[k];
    const tween = scene.tweens.add({
      targets: t, props, duration: move.ms || 1200, delay: move.wait || 0, ease: move.ease || 'Sine.InOut',
      yoyo: !!move.yoyo, repeat: -1, repeatDelay: move.rest || 0
    });
    if (typeof t.once === 'function') t.once('destroy', () => { if (tween && tween.stop) tween.stop(); });
  }
  return made;
}
