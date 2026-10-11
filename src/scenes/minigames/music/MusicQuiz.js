import { PictureQuiz } from '../PictureQuiz.js';
import { musicSet, musicQuestion } from '../../../generators/music/questions.js';
import { THEME, hex } from '../../../ui/theme.js';
import { FONT, WEIGHT } from '../../../ui/TextStyles.js';
import { Music, Sfx } from '../../../systems/Audio.js';

const SKY = 0xfbeaf3, STAFF = 0x7a4a6a, NOTE_COLS = [0xd8368a, 0xf6c343, 0x3d8bff, 0x2ec46a, 0x8b5cf6];

/**
 * Melody Market's four games in one quiz: Rhythm Repeat, Note Match, High & Low and Instrument Families. A question
 * with a sound shows a big ▶ that plays it (and it plays once by itself when the question appears). The bench is a
 * music staff that gains a coloured note for every right answer, so a finished game is a little tune.
 */
export class MusicQuiz extends PictureQuiz {
  constructor() { super('MG_MusicQuiz'); }

  get hasBench() { return true; }
  makeSet(n, targets) { return musicSet(this.gameId, this.payload.grade, this.rng, n, targets); }
  /** New Skill pages are words only, so their examples come from the kinds without a sound. */
  makeOne(d) { return musicQuestion(this.gameId, this.payload.grade, this.rng, d, { drawn: false }); }

  /** A sound question's card is a little taller, so the play button and its label sit inside it. */
  promptHeight(area, q) { return q.sound ? Math.min(area.h * 0.46, 178 * this.ui) : super.promptHeight(area, q); }

  /** The question's sound: a round play button; it also plays itself the first time the question is shown. */
  drawPicture(cx, y, size, q) {
    if (!q.sound) return super.drawPicture(cx, y, size, q);
    const ui = this.ui, r = Math.min(size * 0.5, 30 * ui);
    const c = this.add.container(cx, y - 10 * ui);
    const g = this.add.graphics();
    const paint = (pressed) => {
      g.clear();
      g.fillStyle(this.subject.dark, 0.25); g.fillCircle(0, 4, r);
      g.fillStyle(pressed ? this.subject.dark : this.subject.accent, 1); g.fillCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.35); g.fillEllipse(0, -r * 0.45, r * 1.2, r * 0.55);
      g.fillStyle(0xffffff, 1); g.fillTriangle(-r * 0.32, -r * 0.42, -r * 0.32, r * 0.42, r * 0.48, 0);
    };
    paint(false);
    const tag = this.add.text(0, r + 6 * ui, 'Play it again', { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(0.5, 0);
    c.add([g, tag]);
    c.setSize(r * 2, r * 2);
    c.setInteractive({ useHandCursor: true });
    c.label = { text: 'Play it again' };
    c.on('pointerdown', () => { paint(true); c.setScale(0.94); });
    const up = () => { paint(false); c.setScale(1); };
    c.on('pointerout', up);
    c.on('pointerup', () => { up(); this.playSound(q); });
    c.pulse = () => { if (this.tweens) this.tweens.add({ targets: c, scale: 1.08, duration: 120, yoyo: true }); };
    this.playButton = c;
    if (this.playedFor !== this.state.idx && this.state.picked === null) { this.playedFor = this.state.idx; this.time.delayedCall(450, () => { if (c.active) this.playSound(q); }); }
    return c;
  }

  playSound(q) {
    if (!q || !q.sound) return;
    Music.play(q.sound);
    if (this.playButton && this.playButton.active && this.playButton.pulse) this.playButton.pulse();
  }

  /** Words for the answer's 🔊: pictures of beats are read as their drum words. */
  choiceWords(q, choice) {
    if (q.skill === 'rhythm' && /[🥁👏🤫]/u.test(choice)) return choice.replace(/🥁/gu, 'boom ').replace(/👏/gu, 'tak ').replace(/🤫/gu, 'rest ').trim();
    return choice;
  }

  /** The bench: a staff with a note for each right answer, in the colours of the market's bunting. */
  drawBench(r) {
    const ui = this.ui, s = this.state, g = this.add.graphics();
    g.fillStyle(SKY, 1); g.fillRoundedRect(r.x, r.y, r.w, r.h, 16);
    g.lineStyle(2, this.subject.soft, 1); g.strokeRoundedRect(r.x, r.y, r.w, r.h, 16);
    const x0 = r.x + 46 * ui, x1 = r.x + r.w - 16 * ui, gap = Math.min(7 * ui, (r.h - 20 * ui) / 5), top = r.y + r.h / 2 - gap * 2;
    g.lineStyle(1.2, STAFF, 0.7);
    for (let i = 0; i < 5; i++) g.lineBetween(x0, top + i * gap, x1, top + i * gap);
    this.add.text(r.x + 12 * ui, r.y + r.h / 2, '𝄞', { fontSize: Math.round(gap * 5.2) + 'px', color: hex(STAFF) }).setOrigin(0, 0.52);
    const n = Math.max(1, this.total), step = (x1 - x0 - 24 * ui) / n;
    s.bench.forEach((b, i) => {
      const x = x0 + 16 * ui + i * step + step / 2, line = b.line ?? (i * 3) % 8, y = top + gap * 4 - (line * gap) / 2;
      const col = NOTE_COLS[i % NOTE_COLS.length];
      g.fillStyle(col, 1); g.fillEllipse(x, y, gap * 1.5, gap * 1.05);
      g.lineStyle(1.6, col, 1); g.lineBetween(x + gap * 0.7, y, x + gap * 0.7, y - gap * 3.2);
      if (b.pic && b.pic !== '🔊') this.add.text(x, r.y + r.h - 6 * ui, b.pic, { fontSize: Math.round(Math.min(12 * ui, step * 0.8)) + 'px' }).setOrigin(0.5, 1);
    });
    this.add.text(x1, r.y + 8 * ui, `${s.bench.length} right`, { fontFamily: FONT, fontSize: Math.round(12 * ui) + 'px', color: hex(THEME.ink2), fontStyle: WEIGHT.bold }).setOrigin(1, 0);
  }

  benchItem(q) {
    const first = q.answer.split(' ')[0], emoji = /\p{Extended_Pictographic}/u.test(first) ? first : null;
    return { pic: emoji || (q.pics && q.pics[0] !== '🔊' ? q.pics[0] : null), line: this.rng.int(0, 8) };
  }

  afterRight(q) {
    // The right answer plays itself once more, as a little reward, after the chime.
    if (q.sound) this.time.delayedCall(500, () => Music.play(q.sound));
    else Sfx.pop();
  }
}
