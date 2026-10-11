import { PictureQuiz } from '../PictureQuiz.js';
import { artSet, artQuestion } from '../../../generators/art/questions.js';
import { COLOURS, colourOf } from '../../../data/art/facts.js';
import { THEME, hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { Sfx } from '../../../systems/Audio.js';

const CANVAS = 0xfffdf7, FRAME = 0xa06a3c, FRAME_DARK = 0x5a3a22, MIRROR = 0xbfe3f2, MIRROR_DARK = 0x4a8fb0;
const PALETTE = COLOURS.filter((c) => !['black', 'white', 'grey'].includes(c.name)).map((c) => c.swatch);
const num = (s) => parseInt(s.slice(1), 16);
const shade = (n, k = 0.6) => (((n >> 16) * k) << 16) | ((((n >> 8) & 255) * k) << 8) | (((n & 255) * k) | 0);

/**
 * Studio Summit's four games in one quiz: Color Mixer, Symmetry Painter, Sculpting Shapes and Gallery Guide.
 * Colours are painted, never left to the device's emoji: a colour question shows real paint blobs, a mixing
 * question two blobs and a plus, and a mirror question its row of dots beside a standing mirror. The bench is a
 * canvas on an easel that gains a dab of paint for every right answer, so a finished game is a little painting.
 */
export class ArtQuiz extends PictureQuiz {
  constructor() { super('MG_ArtQuiz'); }

  get hasBench() { return true; }
  makeSet(n, targets) { return artSet(this.gameId, this.payload.grade, this.rng, n, targets); }
  /** New Skill pages are words only, so their examples come from the kinds that paint nothing. */
  makeOne(d) { return artQuestion(this.gameId, this.payload.grade, this.rng, d, { drawn: false }); }

  promptHeight(area, q) { return q.mirror ? Math.min(area.h * 0.46, 176 * this.ui) : q.swatches ? Math.min(area.h * 0.44, 160 * this.ui) : super.promptHeight(area, q); }

  drawPicture(cx, y, size, q) {
    if (q.swatches) return this.drawSwatches(cx, y, size, q.swatches);
    if (q.mirror) return this.drawMirror(cx, y, size, q.mirror);
    return super.drawPicture(cx, y, size, q);
  }

  /** One or two blobs of paint (two with a plus between them), each outlined in its own darker shade. */
  drawSwatches(cx, y, size, swatches) {
    const c = this.add.container(cx, y), g = this.add.graphics(), r = Math.min(size * 0.42, 34 * this.ui), step = r * 2.9, pluses = [];
    const x0 = -((swatches.length - 1) * step) / 2;
    swatches.forEach((s, i) => {
      const col = num(s), x = x0 + i * step;
      g.fillStyle(shade(col, 0.5), 0.25); g.fillEllipse(x, r * 0.95, r * 2.1, r * 0.5);   // its shadow on the table
      g.lineStyle(3, shade(col), 1); g.fillStyle(col, 1);
      g.fillCircle(x, 0, r); g.strokeCircle(x, 0, r);
      g.fillStyle(0xffffff, 0.45); g.fillEllipse(x - r * 0.3, -r * 0.35, r * 0.7, r * 0.4);   // a wet highlight
      if (i > 0) pluses.push(this.add.text(x - step / 2, 0, '+', { fontFamily: FONT, fontSize: Math.round(r * 1.1) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5));
    });
    c.add([g, ...pluses]);
    return c;
  }

  /** The row of dots with a standing mirror at its end, so the child sees which dot is nearest the glass. */
  drawMirror(cx, y, size, dots) {
    const c = this.add.container(cx, y), g = this.add.graphics(), r = Math.min(size * 0.17, 13 * this.ui), step = r * 2.6;
    const look = { '🔴': 0xe5383b, '🔵': 0x3d7be0, '🟡': 0xffd23f, '🟢': 0x3fb24d };
    const w = dots.length * step, x0 = -w / 2 - r;
    dots.forEach((d, i) => { const col = look[d] || 0x888888; g.lineStyle(2, shade(col), 1); g.fillStyle(col, 1); g.fillCircle(x0 + i * step + step / 2, 0, r); g.strokeCircle(x0 + i * step + step / 2, 0, r); });
    const mx = x0 + w + r * 0.9;
    g.fillStyle(FRAME, 1); g.fillRoundedRect(mx - r * 0.45, -r * 2.4, r * 0.9, r * 4.8, 3);
    g.fillStyle(MIRROR, 1); g.fillRect(mx - r * 0.2, -r * 2.1, r * 0.4, r * 4.2);
    g.lineStyle(1.5, MIRROR_DARK, 0.8); g.lineBetween(mx, -r * 2.1, mx, r * 2.1);
    c.add(g);
    c.add(this.add.text(mx, r * 2.6, 'mirror', { fontFamily: FONT, fontSize: Math.round(11 * this.ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0));
    return c;
  }

  /** The bench: a canvas on its easel, gaining a dab of paint for every right answer. */
  drawBench(r) {
    const ui = this.ui, s = this.state, g = this.add.graphics();
    g.fillStyle(this.subject.soft, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
    const pad = 10 * ui, cw = Math.min(r.w - 90 * ui, 260 * ui), ch = r.h - pad * 2, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    // The easel's legs and the frame.
    g.lineStyle(3, FRAME_DARK, 1); g.lineBetween(cx - cw * 0.42, cy - ch * 0.4, cx - cw * 0.5, r.y + r.h); g.lineBetween(cx + cw * 0.42, cy - ch * 0.4, cx + cw * 0.5, r.y + r.h);
    g.fillStyle(FRAME_DARK, 1); g.fillRoundedRect(cx - cw / 2 - 3, cy - ch / 2 - 3, cw + 6, ch + 6, 4);
    g.fillStyle(FRAME, 1); g.fillRoundedRect(cx - cw / 2 - 2, cy - ch / 2 - 2, cw + 4, ch + 4, 3);
    g.fillStyle(CANVAS, 1); g.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const n = Math.max(1, this.total), step = (cw - 20 * ui) / n;
    s.bench.forEach((b, i) => {
      const col = num(b.colour || PALETTE[i % PALETTE.length]), x = cx - cw / 2 + 10 * ui + i * step + step / 2, y = cy + ((i % 3) - 1) * ch * 0.22;
      const rad = Math.min(step * 0.45, ch * 0.26);
      g.lineStyle(2, shade(col), 1); g.fillStyle(col, 1); g.fillCircle(x, y, rad); g.strokeCircle(x, y, rad);
      g.fillStyle(col, 0.7); g.fillCircle(x + rad * 0.9, y + rad * 0.6, rad * 0.35);   // a drip
      if (b.pic) this.add.text(x, y, b.pic, { fontSize: Math.round(Math.min(12 * ui, rad * 1.1)) + 'px' }).setOrigin(0.5);
    });
    this.add.text(r.x + r.w - 10 * ui, r.y + 8 * ui, `${s.bench.length} right`, { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(1, 0);
  }

  /** A dab in the answer's colour when it names one, else from the swatches shown, else the palette in turn. */
  benchItem(q) {
    const named = colourOf(q.answer.split(' ').pop());
    const colour = named ? named.swatch : q.swatches ? q.swatches[0] : null;
    const first = q.answer.split(' ')[0], emoji = /\p{Extended_Pictographic}/u.test(first) && !named ? first : null;
    return { colour, pic: emoji || (!colour && q.pics && q.pics[0] && q.pics[0].length <= 4 ? q.pics[0] : null) };
  }

  afterRight() { Sfx.pop(); }
}
