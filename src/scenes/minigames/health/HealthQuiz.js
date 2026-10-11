import { PictureQuiz } from '../PictureQuiz.js';
import { healthSet, healthQuestion } from '../../../generators/health/questions.js';
import { FOOD_GROUPS, groupOf } from '../../../data/health/facts.js';
import { THEME, hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { Sfx } from '../../../systems/Audio.js';

const PLATE = 0xffffff, PLATE_RIM = 0xcfd8e3, EMPTY = 0xeef2f6, PULSE = 0xe0485c, GRID = 0xf6d6db;
const num = (s) => parseInt(s.slice(1), 16);

/**
 * The Hospital's four games in one quiz: Body Map, Plate Planner, Germ Zapper and Feel Good. A plate question draws
 * a real plate divided into quarters, the missing group left empty, so the child sees the gap. The bench is a heart
 * monitor whose line gains a beat for every right answer: a finished game is a healthy, steady pulse.
 */
export class HealthQuiz extends PictureQuiz {
  constructor() { super('MG_HealthQuiz'); }

  get hasBench() { return true; }
  makeSet(n, targets) { return healthSet(this.gameId, this.payload.grade, this.rng, n, targets); }
  /** New Skill pages are words only, so their examples come from the kinds that draw nothing. */
  makeOne(d) { return healthQuestion(this.gameId, this.payload.grade, this.rng, d, { drawn: false }); }

  promptHeight(area, q) { return q.plate ? Math.min(area.h * 0.46, 176 * this.ui) : super.promptHeight(area, q); }

  drawPicture(cx, y, size, q) {
    if (!q.plate) return super.drawPicture(cx, y, size, q);
    const ui = this.ui, r = Math.min(size * 0.55, 46 * ui), c = this.add.container(cx, y), g = this.add.graphics();
    g.fillStyle(0x000000, 0.1); g.fillEllipse(2, r * 0.15 + 3, r * 2.2, r * 2.1);
    g.fillStyle(PLATE_RIM, 1); g.fillCircle(0, 0, r + 4);
    g.fillStyle(PLATE, 1); g.fillCircle(0, 0, r);
    // Four quarters: fruit, vegetables, grains, protein, in that order round the plate; a missing one stays empty.
    const order = ['fruit', 'veg', 'grains', 'protein'], labels = [];
    order.forEach((id, i) => {
      const a0 = -Math.PI / 2 + (i * Math.PI) / 2, a1 = a0 + Math.PI / 2, has = q.plate.includes(id), grp = groupOf(id);
      g.fillStyle(has ? num(grp.colour) : EMPTY, has ? 0.85 : 1);
      g.slice(0, 0, r - 3, a0, a1, false); g.fillPath();
      const mid = (a0 + a1) / 2, lx = Math.cos(mid) * r * 0.55, ly = Math.sin(mid) * r * 0.55;
      if (has) labels.push(this.add.text(lx, ly, grp.pic, { fontSize: Math.round(r * 0.5) + 'px' }).setOrigin(0.5));
      else labels.push(this.add.text(lx, ly, '?', { fontFamily: FONT, fontSize: Math.round(r * 0.5) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5));
    });
    g.lineStyle(2, PLATE_RIM, 1); g.lineBetween(-r, 0, r, 0); g.lineBetween(0, -r, 0, r); g.strokeCircle(0, 0, r);
    c.add([g, ...labels]);
    return c;
  }

  /** The bench: a heart monitor, one beat per right answer, flat line where the beats are still to come. */
  drawBench(r) {
    const ui = this.ui, s = this.state, g = this.add.graphics();
    g.fillStyle(0x1e2a3a, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
    g.lineStyle(1, GRID, 0.12);
    for (let x = r.x + 12; x < r.x + r.w; x += 12 * ui) g.lineBetween(x, r.y + 6, x, r.y + r.h - 6);
    for (let y = r.y + 10; y < r.y + r.h; y += 12 * ui) g.lineBetween(r.x + 6, y, r.x + r.w - 6, y);
    const x0 = r.x + 14 * ui, x1 = r.x + r.w - 70 * ui, cy = r.y + r.h * 0.58, n = Math.max(1, this.total), step = (x1 - x0) / n, amp = Math.min(r.h * 0.34, 22 * ui);
    g.lineStyle(2.5, PULSE, 1); g.beginPath(); g.moveTo(x0, cy);
    for (let i = 0; i < n; i++) {
      const bx = x0 + i * step;
      if (i < s.bench.length) { g.lineTo(bx + step * 0.3, cy); g.lineTo(bx + step * 0.4, cy - amp); g.lineTo(bx + step * 0.5, cy + amp * 0.6); g.lineTo(bx + step * 0.6, cy); }
      g.lineTo(bx + step, cy);
    }
    g.strokePath();
    g.fillStyle(PULSE, 1); g.fillCircle(x0 + Math.min(n, s.bench.length) * step, cy, 3 * ui);
    this.add.text(r.x + r.w - 12 * ui, r.y + r.h / 2, `❤️ ${s.bench.length}`, { fontFamily: FONT, fontSize: Math.round(14 * ui) + 'px', color: '#ffffff', fontStyle: WEIGHT.bold }).setOrigin(1, 0.5);
    s.bench.forEach((b, i) => { if (b.pic) this.add.text(x0 + i * step + step * 0.45, r.y + r.h - 4 * ui, b.pic, { fontSize: Math.round(Math.min(11 * ui, step * 0.7)) + 'px' }).setOrigin(0.5, 1); });
  }

  benchItem(q) {
    const first = q.answer.split(' ')[0], emoji = /\p{Extended_Pictographic}/u.test(first) ? first : null;
    return { pic: emoji || (q.pics && q.pics[0] && q.pics[0].length <= 4 ? q.pics[0] : null) };
  }

  afterRight() { Sfx.pop(); }
}

export { FOOD_GROUPS };
