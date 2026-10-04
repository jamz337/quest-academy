// Mango in the corner of every mini-game: he bobs while you think, jumps and cheers when you are right, spins for a
// streak, and scratches his head (with a little "?") when you miss, with a short line in a speech bubble.
// Games rebuild their screens after each answer, so the mood is kept on the scene (scene.buddyMood) and every
// rebuild draws Mango in it; the jump plays once per answer.
import { THEME, hex } from './theme.js';
import { FONT, WEIGHT } from './TextStyles.js';
import { MONKEY_FRAMES } from './FlatCharacter.js';

export const BUDDY_LINES = {
  cheer: ['Yes!', 'Great!', 'You got it!', 'Nice one!', 'Brilliant!', 'Super!'],
  wow: ['WOW!', 'On fire!', 'Amazing!', 'Unstoppable!'],
  oops: ['Nearly!', 'Try again!', 'Hmm…', 'You can do it!', 'So close!']
};
const MOOD_MS = 1500;

/** A fresh mood record for a scene. */
export const newBuddyMood = () => ({ id: 0, mood: null, line: '', until: 0, played: -1 });

/** Set a new mood (and pick its line). Returns the record. */
export function setMood(rec, mood, line = null, now = Date.now()) {
  const pool = BUDDY_LINES[mood] || BUDDY_LINES.cheer;
  rec.id += 1; rec.mood = mood; rec.line = line || pool[Math.floor(Math.random() * pool.length)]; rec.until = now + MOOD_MS;
  return rec;
}

/**
 * Draw Mango at (x, y) (his feet), `size` px tall, in the scene's current mood; returns { c, react }. The speech
 * bubble opens to the right. react() plays the current mood's animation (once per mood).
 */
export function buddy(scene, x, y, size, rec) {
  const c = scene.add.container(x, y).setDepth(800);
  const live = rec && rec.mood && Date.now() < rec.until;
  const mood = live ? rec.mood : null;
  const frame = mood === 'cheer' || mood === 'wow' ? MONKEY_FRAMES.cheer : MONKEY_FRAMES.stand;
  let body;
  if (scene.textures && scene.textures.exists('monkey')) {
    body = scene.add.sprite(0, 0, 'monkey', frame).setOrigin(0.5, 1);
    const fh = (body.frame && body.frame.height) || 64;
    body.setScale(size / fh);
  } else body = scene.add.text(0, 0, '🐒', { fontSize: Math.round(size * 0.8) + 'px' }).setOrigin(0.5, 1);
  c.add(body);
  let bubble = null;
  if (live && rec.line) {
    // The bubble opens just below the header, to Mango's right, so it never covers the game's title.
    const t = scene.add.text(size * 0.45 + 12, size * 0.32, rec.line, { fontFamily: FONT, fontSize: Math.round(Math.max(15, size * 0.36)) + 'px', color: hex(mood === 'oops' ? THEME.ink : THEME.successDark), fontStyle: WEIGHT.heavy }).setOrigin(0, 0.5);
    const g = scene.add.graphics();
    const bw = (t.width || 60) + 18, bh = (t.height || 18) + 10, bx = size * 0.45 + 3, by = size * 0.32 - bh / 2;
    g.fillStyle(0x2d2a4a, 0.15); g.fillRoundedRect(bx + 2, by + 3, bw, bh, bh / 2);
    g.fillStyle(0xffffff, 1); g.fillRoundedRect(bx, by, bw, bh, bh / 2);
    g.lineStyle(2, mood === 'oops' ? THEME.warning : THEME.success, 1); g.strokeRoundedRect(bx, by, bw, bh, bh / 2);
    g.fillStyle(0xffffff, 1); g.fillTriangle(bx + 6, by + 1, bx + 16, by + 1, bx - 2, by - 8);   // tail up towards Mango
    bubble = [g, t];
    c.add(bubble);
  }
  const react = () => {
    if (!scene.tweens || !live || rec.played === rec.id) return;
    rec.played = rec.id;
    if (bubble) { bubble.forEach((b) => b.setScale(0.3)); scene.tweens.add({ targets: bubble, scale: 1, duration: 260, ease: 'Back.Out' }); }
    if (mood === 'cheer') scene.tweens.add({ targets: body, y: -size * 0.3, duration: 180, yoyo: true, ease: 'Quad.Out' });
    else if (mood === 'wow') {
      scene.tweens.add({ targets: body, y: -size * 0.45, duration: 220, yoyo: true, repeat: 1, ease: 'Quad.Out' });
      scene.tweens.add({ targets: body, angle: 360, duration: 700, ease: 'Cubic.Out', onComplete: () => body.setAngle && body.setAngle(0) });
    } else if (mood === 'oops') {
      scene.tweens.add({ targets: body, angle: -12, duration: 140, yoyo: true, repeat: 2, ease: 'Sine.InOut' });
      const q = scene.add.text(size * 0.15, -size * 1.05, '?', { fontFamily: FONT, fontSize: Math.round(size * 0.45) + 'px', color: hex(THEME.warningDark), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
      c.add(q);
      scene.tweens.add({ targets: q, y: q.y - size * 0.25, alpha: 0, delay: 500, duration: 700, onComplete: () => q.destroy() });
    }
  };
  // Idle: a gentle bob, so he always looks alive.
  if (!live && scene.tweens) scene.tweens.add({ targets: body, y: -2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return { c, react };
}
