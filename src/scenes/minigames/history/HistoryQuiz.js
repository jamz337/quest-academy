import { PictureQuiz } from '../PictureQuiz.js';
import { historySet, historyQuestion, countryOfLabel, flagCode } from '../../../generators/history/questions.js';
import { COUNTRIES, DIRECTIONS, HARBOUR_MAP } from '../../../data/history/facts.js';
import { THEME, hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { button } from '../../../ui/Button.js';
import { flagImage } from '../../../ui/Flags.js';

const SKY = 0xe9eff9, SEA = 0x8fb8e8, SEA_DARK = 0x4f7fc0, SAND = 0xf1dfb0, ROPE = 0x8b6b3e;

/**
 * History Harbor's four games in one quiz: Compass Quest, Community Helpers, Flag Finder and Past & Present.
 * Flags are drawn (ui/Flags.js), never left to the device's emoji. The bench along the top shows the learning:
 * a compass rose whose points light up, a town street filling with helpers, flags hoisted along a rope, and a
 * timeline from long ago to today.
 */
export class HistoryQuiz extends PictureQuiz {
  constructor() { super('MG_HistoryQuiz'); }

  get hasBench() { return true; }
  makeSet(n, targets) { return historySet(this.gameId, this.payload.grade, this.rng, n, targets); }
  /** New Skill pages are words only, so their examples come from the kinds that need no drawn flag or map. */
  makeOne(d) { return historyQuestion(this.gameId, this.payload.grade, this.rng, d, { drawn: false }); }

  promptHeight(area, q) { return q.map || q.flag ? Math.min(area.h * 0.46, 190 * this.ui) : super.promptHeight(area, q); }

  drawPicture(cx, y, size, q) {
    const ui = this.ui;
    if (q.flag) return flagImage(this, cx, y, size * 2.4, size * 1.6, q.flag);
    if (q.map) {
      // The harbour map: the lighthouse in the middle, N E S W marked, the four things around it.
      const c = this.add.container(cx, y), g = this.add.graphics(), r = size * 0.95;
      g.fillStyle(SEA, 0.35); g.fillRoundedRect(-r * 1.9, -r * 1.15, r * 3.8, r * 2.3, 10);
      g.lineStyle(2, SEA_DARK, 0.6); g.lineBetween(-r * 1.3, 0, r * 1.3, 0); g.lineBetween(0, -r * 0.85, 0, r * 0.85);
      const fs = { fontSize: Math.round(size * 0.5) + 'px' };
      c.add([g, this.add.text(0, 0, '🗼', fs).setOrigin(0.5)]);
      const pos = { north: [0, -r * 0.62], south: [0, r * 0.62], east: [r * 1.1, 0], west: [-r * 1.1, 0] };
      for (const s of HARBOUR_MAP) c.add(this.add.text(pos[s.dir][0], pos[s.dir][1], s.pic, fs).setOrigin(0.5));
      const lab = (t, x, yy) => this.add.text(x, yy, t, { fontFamily: FONT, fontSize: Math.round(11 * ui) + 'px', color: hex(SEA_DARK), fontStyle: WEIGHT.heavy }).setOrigin(0.5);
      c.add([lab('N', 0, -r * 1.02), lab('S', 0, r * 1.02), lab('E', r * 1.6, 0), lab('W', -r * 1.6, 0)]);
      return c;
    }
    return super.drawPicture(cx, y, size, q);
  }

  /** Flag-only choices: the button shows the drawn flag and no words (its label is kept, hidden, for tests). */
  answerButton(c, bh, choice, i, q, opts) {
    const b = button(this, c.x, c.y, c.w, bh, choice, opts);
    if (!q.flagChoices) return b;
    const country = countryOfLabel(choice);
    b.label.setVisible(false);
    if (country) b.add(flagImage(this, 0, 0, c.w - 28 * this.ui, bh - 16 * this.ui, country.code));
    return b;
  }
  choiceWords(q, choice) { return q.flagChoices ? null : choice; }

  /** A flags-only question goes into the log (and the later reviews, which show words) as "which country's flag is…?". */
  logQuestion(q, right) {
    if (!q.flagChoices) return super.logQuestion(q, right);
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const name = (code) => { const c = countryOfLabel(code); return c ? cap(c.name) : code; };
    const ans = countryOfLabel(q.answer);
    const text = ans ? `Which country's flag is ${ans.look}?` : q.text;
    super.logQuestion({ ...q, flagChoices: false, prompt: text, text, pics: [], choices: q.choices.map(name), answer: name(q.answer) }, right);
  }

  drawBench(r) {
    const ui = this.ui, s = this.state, id = this.gameId, g = this.add.graphics();
    g.fillStyle(SKY, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
    g.lineStyle(2, this.subject.soft, 1); g.strokeRoundedRect(r.x, r.y, r.w, r.h, 16);
    const fs = (px) => ({ fontSize: Math.round(px) + 'px' });
    const small = { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold };
    if (id === 'his-compass') {
      // A compass rose whose points light up as directions are found, and a ship sailing across with progress.
      const cx = r.x + r.h * 0.55, cy = r.y + r.h / 2, rad = r.h * 0.34;
      g.fillStyle(0xffffff, 0.9); g.fillCircle(cx, cy, rad + 4 * ui);
      const found = new Set(s.bench.map((b) => b.dir).filter(Boolean));
      for (const d of DIRECTIONS) {
        const a = ((d.degrees - 90) * Math.PI) / 180, on = found.has(d.id);
        g.fillStyle(on ? this.subject.accent : 0xc7d2e3, 1);
        g.fillTriangle(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, cx + Math.cos(a + Math.PI / 2) * rad * 0.2, cy + Math.sin(a + Math.PI / 2) * rad * 0.2, cx + Math.cos(a - Math.PI / 2) * rad * 0.2, cy + Math.sin(a - Math.PI / 2) * rad * 0.2);
        this.add.text(cx + Math.cos(a) * (rad + 11 * ui), cy + Math.sin(a) * (rad + 11 * ui), d.letter, { ...small, color: hex(on ? this.subject.dark : 0x9aa7bd) }).setOrigin(0.5);
      }
      const sx = cx + rad + 30 * ui, sw = r.x + r.w - sx - 16 * ui, sy = cy + r.h * 0.08;
      g.fillStyle(SEA, 0.5); g.fillRoundedRect(sx, sy, sw, r.h * 0.28, 8);
      const t = this.add.text(sx + 12 * ui + (sw - 24 * ui) * (s.idx / Math.max(1, this.total)), sy - 2 * ui, '⛵', fs(Math.min(28 * ui, r.h * 0.42))).setOrigin(0.5, 0.7);
      if (this.tweens) this.tweens.add({ targets: t, y: t.y - 3 * ui, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.text(sx + sw / 2, sy - r.h * 0.24, `${s.bench.length} found`, small).setOrigin(0.5);
    } else if (id === 'his-helpers') {
      // A street of the town: each right answer brings a helper out to stand along it.
      const road = r.y + r.h - 16 * ui;
      g.fillStyle(SAND, 1); g.fillRoundedRect(r.x + 8 * ui, road - 6 * ui, r.w - 16 * ui, 14 * ui, 6);
      const houses = ['🏥', '🚒', '🏫', '🏤', '🏪', '🏛️'];
      const hs = Math.min(26 * ui, (r.w - 32 * ui) / 10);
      houses.forEach((h, i) => this.add.text(r.x + 20 * ui + (i * (r.w - 40 * ui)) / (houses.length - 1), road - 14 * ui, h, fs(hs)).setOrigin(0.5, 1));
      s.bench.slice(-8).forEach((b, k) => this.add.text(r.x + 24 * ui + k * hs * 1.15, road + 2 * ui, b.pic || '🧑', fs(hs * 0.8)).setOrigin(0.5, 0.75));
    } else if (id === 'his-flags') {
      // A rope between two masts, with a flag hoisted for each right answer.
      const y = r.y + r.h * 0.22, x0 = r.x + 20 * ui, x1 = r.x + r.w - 20 * ui;
      g.lineStyle(3 * ui, ROPE, 1); g.lineBetween(x0, r.y + 10 * ui, x0, r.y + r.h - 8 * ui); g.lineBetween(x1, r.y + 10 * ui, x1, r.y + r.h - 8 * ui);
      g.lineStyle(2, ROPE, 1); g.lineBetween(x0, y, x1, y);
      const flags = s.bench.map((b) => b.flag).filter(Boolean).slice(-8);
      const fw = Math.min(42 * ui, (x1 - x0 - 20 * ui) / 8.5), fh = (fw * 2) / 3;
      flags.forEach((code, k) => flagImage(this, x0 + 16 * ui + fw / 2 + k * (fw + 6 * ui), y + fh / 2 + 3 * ui, fw, fh, code));
      this.add.text(r.x + r.w / 2, r.y + r.h - 10 * ui, `${s.bench.length} flags hoisted`, small).setOrigin(0.5, 1);
    } else {
      // A timeline from long ago to today, with the right answers' pictures pinned along it.
      const y = r.y + r.h * 0.6, x0 = r.x + 20 * ui, x1 = r.x + r.w - 20 * ui;
      g.lineStyle(4 * ui, ROPE, 1); g.lineBetween(x0, y, x1, y);
      this.add.text(x0, y + 8 * ui, 'long ago', small).setOrigin(0, 0);
      this.add.text(x1, y + 8 * ui, 'today', small).setOrigin(1, 0);
      const n = Math.max(1, this.total);
      s.bench.forEach((b, k) => {
        const x = x0 + 16 * ui + ((x1 - x0 - 32 * ui) * k) / Math.max(1, n - 1);
        g.fillStyle(this.subject.accent, 1); g.fillCircle(x, y, 4 * ui);
        this.add.text(x, y - 6 * ui, b.pic || '🕰️', fs(Math.min(22 * ui, r.h * 0.34))).setOrigin(0.5, 1);
      });
    }
  }

  /** What a right answer adds to the bench: its picture, the flag it was about, the direction it found. */
  benchItem(q) {
    const first = q.answer.split(' ')[0];
    const emoji = /\p{Extended_Pictographic}/u.test(first) ? first : null;
    const pic = emoji || (q.pics && q.pics[0] && !q.map ? q.pics[0] : null);
    const country = q.flag ? COUNTRIES.find((c) => c.code === q.flag) : countryOfLabel(q.answer);
    const dir = DIRECTIONS.find((d) => q.answer === `${d.pic} ${d.name}`) || null;
    return { pic: pic || (country ? flagCode(country) : null), flag: country ? country.code : null, dir: dir ? dir.id : null };
  }
}
