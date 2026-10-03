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
const TRACE_HITS = 8;   // ink samples a letter needs before it counts as traced
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
    const tracedN = [...it.glyph].filter((_, i) => (s.traced[i] | 0) >= TRACE_HITS).length;
    this.label = text(this, cx, area.y + 60 * ui, done ? 'Beautiful tracing!' : n === 1 ? 'Trace the letter with your finger' : `Trace each letter  ·  ${tracedN} of ${n}`, T.small(this, done ? THEME.successDark : THEME.ink2));
    // Big faint letters to trace over.
    const x0 = cx - (letterW * n) / 2, ly = area.y + 76 * ui + fontPx * 0.6;
    this.traceRects = [];
    [...it.glyph].forEach((ch, i) => {
      const lx = x0 + i * letterW + letterW / 2, ok = (s.traced[i] | 0) >= TRACE_HITS;
      this.add.text(lx, ly, ch, { fontFamily: FONT, fontSize: fontPx + 'px', color: hex(ok ? THEME.success : THEME.ink3), fontStyle: WEIGHT.heavy }).setOrigin(0.5).setAlpha(ok ? 0.6 : 0.28);
      this.traceRects.push({ x0: lx - letterW / 2, x1: lx + letterW / 2, y0: ly - fontPx * 0.55, y1: ly + fontPx * 0.55 });
    });
    this.traceArea = { x: area.x, y: area.y + 70 * ui, w: area.w, h: cardH - 70 * ui };
    this.ink = this.add.graphics();
    this.drawStrokes();
    // Hear it again, clear the ink, and move on (Skip until it is traced).
    const by = area.y + cardH + 34 * ui, bw = Math.min((area.w - 32) / 3, 180 * ui);
    if (canSpeak()) button(this, cx - bw - 8, by, bw, 50 * ui, '🔊 Say it', { variant: 'secondary', fontSize: 16, onClick: () => this.say() });
    button(this, cx, by, bw, 50 * ui, 'Clear', { variant: 'secondary', fontSize: 16, onClick: () => { s.strokes = []; s.traced = {}; this.rebuild(); } });
    button(this, cx + bw + 8, by, bw, 50 * ui, done ? 'Next ▶' : 'Skip ▶', { variant: done ? 'primary' : 'ghost', fontSize: 16, onClick: () => this.next() });
    if (this.animateEnter) this.time.delayedCall(350, () => { if (this.item === it) this.say(); });
  }

  drawStrokes() {
    const g = this.ink;
    if (!g || !g.active) return;
    g.clear();
    g.lineStyle(10 * this.ui, INK, 0.9);
    for (const st of this.state.strokes) {
      if (st.length < 2) { if (st.length) { g.fillStyle(INK, 0.9); g.fillCircle(st[0].x, st[0].y, 5 * this.ui); } continue; }
      g.beginPath(); g.moveTo(st[0].x, st[0].y);
      for (let i = 1; i < st.length; i++) g.lineTo(st[i].x, st[i].y);
      g.strokePath();
    }
  }

  inTraceArea(p) { const a = this.traceArea; return !!a && p.x >= a.x && p.x <= a.x + a.w && p.y >= a.y && p.y <= a.y + a.h; }
  traceDone() { const s = this.state, it = this.item; return !!it && [...it.glyph].every((_, i) => (s.traced[i] | 0) >= TRACE_HITS); }

  addInk(p, fresh) {
    const s = this.state;
    if (fresh || !s.strokes.length) s.strokes.push([]);
    s.strokes[s.strokes.length - 1].push({ x: p.x, y: p.y });
    const was = this.traceDone();
    (this.traceRects || []).forEach((r, i) => { if (p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1) s.traced[i] = (s.traced[i] | 0) + 1; });
    this.drawStrokes();
    if (!was && this.traceDone()) {
      Sfx.correct();
      if (!s.finished.includes(s.idx)) s.finished.push(s.idx);
      this.rebuild();
      if (canSpeak()) speak(`Well done! ${this.item.say}`, { rate: this.speechRate });
      this.time.delayedCall(200, () => fireworks(this, this.w / 2, this.h * 0.35, { bursts: 1, spread: this.w * 0.2 }));
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

