import { MinigameScene } from '../MinigameScene.js';
import { THEME, hex } from '../../../ui/theme.js';
import { LETTERS, FIRST_LETTERS, letterInfo, PICTURE_WORDS } from '../../../data/early/letters.js';
import { T, text, FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { card } from '../../../ui/Card.js';
import { stripe } from '../../../ui/Panel.js';
import { Sfx } from '../../../systems/Audio.js';
import { speak, canSpeak, stop as stopSpeech } from '../../../systems/Speech.js';
import { pointerPos } from '../../../systems/Layout.js';
import { fireworks } from '../../../ui/Fireworks.js';

const ROUNDS = 6;
const TRACE_HITS = 8;   // without the letter's shape (headless tests): ink samples inside its box
const GRID = 14;        // checkpoints are laid on a GRID x GRID lattice per font size, over the letter's pixels
const COVER = 0.75;     // share of a letter's checkpoints the child's ink must pass over
const BRUSH = 0.13;     // how far (in font sizes) from the ink a checkpoint still counts as traced
const PAR_MS = 240000;
const INK = 0xff6fae;

/**
 * Letter Trace, for Pre-K to Grade 1: trace a big letter with a finger while hearing it and its picture word
 * ("M is for mango"). Pre-K traces capitals (the first letters children learn), Kindergarten small letters with the
 * capital beside them, Grade 1 short picture words. Ink and progress live in state, so a rebuild keeps them.
 */
export class LetterTrace extends MinigameScene {
  constructor() { super('MG_LetterTrace'); }

  initState() {
    const g = this.payload.grade;
    let items;
    if (g >= 1) items = this.rng.sample(PICTURE_WORDS, ROUNDS).map((x) => ({ glyph: x.w, word: x.w, pic: x.pic, say: `${x.w}. ${[...x.w].join(', ')}. ${x.w}.` }));
    else {
      const pool = g <= -1 ? FIRST_LETTERS : LETTERS.map((x) => x.u);
      items = this.rng.sample(pool, ROUNDS).map((u) => {
        const info = letterInfo(u);
        return { glyph: g <= -1 ? info.u : info.l, upper: info.u, word: info.word, pic: info.pic, say: `${info.u}. ${info.u} is for ${info.word}.` };
      });
    }
    // traced[i]: checkpoint keys ("gx,gy", font-size independent so a rotation keeps them) the ink has covered.
    return { items, idx: 0, strokes: [], traced: {}, finished: [], skipped: 0 };
  }

  create(data) {
    super.create(data);
    if (this.input && typeof this.input.on === 'function') {
      this.onDown = (p) => this.traceDown(p); this.onMove = (p) => this.traceMove(p); this.onUp = () => { this.tracing = false; };
      this.input.on('pointerdown', this.onDown); this.input.on('pointermove', this.onMove); this.input.on('pointerup', this.onUp);
      this.events.once('shutdown', () => { this.input.off('pointerdown', this.onDown); this.input.off('pointermove', this.onMove); this.input.off('pointerup', this.onUp); stopSpeech(); });
    }
  }

  get item() { return this.state.items[this.state.idx]; }
  progressLabel() { return `${Math.min(this.state.idx + 1, ROUNDS)} / ${ROUNDS}`; }
  progressRatio() { return this.state.idx / ROUNDS; }
  enterKey() { return this.state.idx; }

  say() { const it = this.item; if (it && canSpeak()) speak(it.say, { rate: this.speechRate }); }

  buildGame(area) {
    const s = this.state, ui = this.ui, it = this.item;
    if (!it) return;
    const cx = area.x + area.w / 2;
    const done = this.traceDone();
    const n = it.glyph.length;
    const letterW = Math.min(n === 1 ? 220 * ui : 110 * ui, (area.w - 40) / n), fontPx = Math.round(letterW * (n === 1 ? 1.1 : 1.3));
    const cardH = Math.min(area.h - 80 * ui, 110 * ui + fontPx * 1.15);
    card(this, cx, area.y + cardH / 2, area.w, cardH, { stroke: done ? THEME.success : this.subject.soft });
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, INK, 5 * ui);
    // The picture word: "M is for mango", the capital beside a small letter for Kindergarten.
    const caption = it.upper ? `${it.upper}${it.glyph !== it.upper ? ' ' + it.glyph : ''}  is for  ${it.pic} ${it.word}` : `${it.pic}  ${it.word}`;
    text(this, cx, area.y + 32 * ui, caption, T.at(this, 20, THEME.ink, { fontStyle: '700' }));
    // Big faint letters to trace over. Each letter's shape becomes a set of checkpoints; tracing turns them green.
    const x0 = cx - (letterW * n) / 2, ly = area.y + 76 * ui + fontPx * 0.6;
    this.fontPx = fontPx;
    const style = { fontFamily: FONT, fontSize: fontPx + 'px', fontStyle: WEIGHT.heavy };
    const rects = [], fills = [];
    [...it.glyph].forEach((ch, i) => {
      const lx = x0 + i * letterW + letterW / 2;
      const t = this.add.text(lx, ly, ch, { ...style, color: hex(THEME.ink3) }).setOrigin(0.5).setAlpha(0.28);
      rects.push({ x0: lx - letterW / 2, x1: lx + letterW / 2, y0: ly - fontPx * 0.55, y1: ly + fontPx * 0.55, cx: lx, cy: ly, points: glyphPoints(t, lx, ly, fontPx) });
      fills.push(this.add.text(lx, ly, ch, { ...style, color: hex(THEME.success) }).setOrigin(0.5));
    });
    this.traceRects = rects;
    // A green copy of each letter shows through wherever the ink has passed, so the letter fills in along its own
    // shape. The mask is drawn from the covered checkpoints; without masks (tests) the green copy stays hidden.
    this.dots = this.add.graphics();
    this.masked = typeof this.dots.createGeometryMask === 'function' && rects.some((r) => r.points);
    if (this.masked) { this.dots.setVisible(false); const mask = this.dots.createGeometryMask(); fills.forEach((t, i) => { if (!this.letterDone(i)) t.setMask(mask); }); }
    else fills.forEach((t) => t.setVisible(false));
    this.label = text(this, cx, area.y + 60 * ui, this.labelText(), T.small(this, done ? THEME.successDark : THEME.ink2));
    this.traceArea = { x: area.x, y: area.y + 70 * ui, w: area.w, h: cardH - 70 * ui };
    this.ink = this.add.graphics();
    this.drawDots();
    this.drawStrokes();
    // Hear it again, clear the ink, and move on (Skip until it is traced).
    const by = area.y + cardH + 34 * ui, bw = Math.min((area.w - 32) / 3, 180 * ui);
    if (canSpeak()) button(this, cx - bw - 8, by, bw, 50 * ui, '🔊 Say it', { variant: 'secondary', fontSize: 16, onClick: () => this.say() });
    button(this, cx, by, bw, 50 * ui, 'Clear', { variant: 'secondary', fontSize: 16, onClick: () => { s.strokes = []; s.traced = {}; this.rebuild(); } });
    button(this, cx + bw + 8, by, bw, 50 * ui, done ? 'Next ▶' : 'Skip ▶', { variant: done ? 'go' : 'ghost', fontSize: 16, onClick: () => this.next() });
    if (this.animateEnter) this.time.delayedCall(350, () => { if (this.item === it) this.say(); });
  }

  drawStrokes() {
    const g = this.ink;
    if (!g || !g.active) return;
    g.clear();
    g.lineStyle(9 * this.ui, INK, 0.6);
    for (const st of this.state.strokes) {
      if (st.length < 2) { if (st.length) { g.fillStyle(INK, 0.9); g.fillCircle(st[0].x, st[0].y, 5 * this.ui); } continue; }
      g.beginPath(); g.moveTo(st[0].x, st[0].y);
      for (let i = 1; i < st.length; i++) g.lineTo(st[i].x, st[i].y);
      g.strokePath();
    }
  }

  /** "Trace the letter… keep going!" with how much of the letter (or how many letters of the word) is done. */
  labelText() {
    const it = this.item, n = it.glyph.length;
    if (this.traceDone()) return 'Beautiful tracing!';
    if (n > 1) return `Trace each letter  ·  ${[...it.glyph].filter((_, i) => this.letterDone(i)).length} of ${n}`;
    const share = this.coverage(0);
    return share <= 0 ? 'Trace the whole letter with your finger' : `Keep going, fill it all in!  ·  ${Math.round(share * 100)}%`;
  }

  /** Share of letter i's checkpoints the ink has covered (0..1). Without a shape, hits inside the box count. */
  coverage(i) {
    const r = this.traceRects && this.traceRects[i], got = this.state.traced[i];
    if (!r || !r.points) return Math.min(1, (Array.isArray(got) ? got.length : got | 0) / TRACE_HITS);
    if (!Array.isArray(got)) return 0;
    const keys = new Set(r.points.map((p) => p.key));
    return got.filter((k) => keys.has(k)).length / r.points.length;
  }

  letterDone(i) { return this.coverage(i) >= (this.traceRects && this.traceRects[i] && this.traceRects[i].points ? COVER : 1); }

  /** The mask over the green letters: a disc on every covered checkpoint (every checkpoint once a letter is done). */
  drawDots() {
    const g = this.dots;
    if (!g || !g.active || !this.masked) return;
    g.clear();
    g.fillStyle(0xffffff, 1);
    const rad = (this.fontPx / GRID) * 1.5;   // generous: the mask only ever shows the letter's own pixels
    (this.traceRects || []).forEach((r, i) => {
      if (!r.points) return;
      if (this.letterDone(i)) return;   // a finished letter is shown whole (its green copy has no mask)
      const got = new Set(Array.isArray(this.state.traced[i]) ? this.state.traced[i] : []);
      for (const p of r.points) if (got.has(p.key)) g.fillCircle(p.x, p.y, rad);
    });
  }

  inTraceArea(p) { const a = this.traceArea; return !!a && p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h; }
  traceDone() { const it = this.item; return !!it && !!this.traceRects && [...it.glyph].every((_, i) => this.letterDone(i)); }

  addInk(p, fresh) {
    const s = this.state;
    if (fresh || !s.strokes.length) s.strokes.push([]);
    s.strokes[s.strokes.length - 1].push({ x: p.x, y: p.y });
    const was = this.traceDone();
    const lettersBefore = (this.traceRects || []).map((_, i) => this.letterDone(i));
    const reach = BRUSH * (this.fontPx || 100);
    (this.traceRects || []).forEach((r, i) => {
      if (!r.points) { if (p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1) s.traced[i] = (s.traced[i] | 0) + 1; return; }
      const got = Array.isArray(s.traced[i]) ? s.traced[i] : (s.traced[i] = []);
      for (const c of r.points) if (!got.includes(c.key) && Math.hypot(c.x - p.x, c.y - p.y) <= reach) got.push(c.key);
    });
    this.drawDots();
    this.drawStrokes();
    if (this.label && this.label.active && !this.traceDone()) this.label.setText(this.labelText());
    if (!was && this.traceDone()) {
      this.correctFeedback();   // Mango cheers, stars fly to the score
      if (!s.finished.includes(s.idx)) s.finished.push(s.idx);
      this.rebuild();
      if (canSpeak()) speak(`Well done! ${this.item.say}`, { rate: this.speechRate });
      this.time.delayedCall(200, () => fireworks(this, this.w / 2, this.h * 0.35, { bursts: 1, spread: this.w * 0.2 }));
    } else if (lettersBefore.some((d, i) => !d && this.letterDone(i))) {
      // One letter of a word is finished: it turns whole and green, and the child moves on to the next letter.
      Sfx.pop();
      this.rebuild();
    }
  }

  traceDown(pointer) {
    if (this.finished || this.traceDone()) return;
    const p = pointerPos(this, pointer);
    if (!this.inTraceArea(p)) return;
    this.tracing = true;
    this.addInk(p, true);
  }

  traceMove(pointer) {
    if (!this.tracing) return;
    if (pointer && pointer.isDown === false) { this.tracing = false; return; }
    const p = pointerPos(this, pointer);
    if (this.inTraceArea(p)) this.addInk(p, false);
  }

  next() {
    const s = this.state;
    stopSpeech();
    if (!this.traceDone()) s.skipped += 1;
    s.idx += 1; s.strokes = []; s.traced = {};
    if (s.idx >= s.items.length) {
      const correct = s.finished.length;
      if (correct === s.items.length) Sfx.fanfare();
      return this.finish({ correct, total: s.items.length, parTimeMs: PAR_MS, missedSkills: correct < s.items.length ? ['letters'] : [] });
    }
    Sfx.click();
    this.rebuild();
  }
}


/**
 * Checkpoints on a letter: a GRID x GRID lattice (per font size, centred on the letter) keeping the points that land
 * on the letter's own pixels, read from the Phaser text's canvas. Keys are lattice positions, so they stay the same
 * when the screen rotates and the letter is redrawn at another size. Null when the pixels can't be read (tests).
 */
function glyphPoints(t, cx, cy, fontPx) {
  const cv = t && t.canvas;
  if (!cv || !cv.width || typeof cv.getContext !== 'function') return null;
  let data;
  try { data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; } catch (e) { return null; }
  const w = t.displayWidth || t.width, h = t.displayHeight || t.height;
  const left = cx - w / 2, top = cy - h / 2, step = fontPx / GRID;
  const pts = [];
  for (let gy = -GRID; gy <= GRID; gy++) {
    for (let gx = -GRID; gx <= GRID; gx++) {
      const x = cx + gx * step, y = cy + gy * step;
      const px = Math.floor(((x - left) / w) * cv.width), py = Math.floor(((y - top) / h) * cv.height);
      if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
      if (data[(py * cv.width + px) * 4 + 3] > 128) pts.push({ key: gx + ',' + gy, x, y });
    }
  }
  return pts.length >= 4 ? pts : null;
}
