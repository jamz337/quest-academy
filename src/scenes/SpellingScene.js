import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { T, text } from '../ui/TextStyles.js';
import { background } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { button } from '../ui/Button.js';
import { topBar } from '../ui/TopBar.js';
import { StarRow } from '../ui/StarRow.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';
import { SPELLING_LISTS, SPELLING_GRADES, spellingGradeFor, listWords } from '../data/spelling/lists.js';
import { listProgress, isLearned, ensureSpelling, dueWords, nextReviewAt, DAY } from '../systems/Spelling.js';

/**
 * Spelling Bee hub: today's spaced review (the words due back today, from every list), the grade's word lists with
 * how many words are learned, and a card of tricky words to practise.
 */
export class SpellingScene extends BaseScene {
  constructor() { super(SCENES.Spelling); this.fade = true; }

  init(data) { this.grade = data && data.grade ? data.grade : null; }

  create(data) {
    super.create(data);
    this.events.on('resume', () => this.rebuild());
  }

  build() {
    const { w, h, ui } = this;
    const p = Store.getProfile();
    if (!p) return this.scene.start(SCENES.Profile);
    ensureSpelling(p);
    const grade = this.grade || spellingGradeFor(p.grade);
    const lists = SPELLING_LISTS[grade] || [];
    background(this, { accent: THEME.subjects.words.accent, accent2: THEME.gold });
    const bar = topBar(this, { title: '🐝 Spelling Bee', onBack: () => this.go(SCENES.ModeSelect), subtitle: 'Learn it, cover it, write it, check it. A little every day!' });

    // Grade tabs (the lists are written per grade).
    let y = bar.bottom + 14 * ui;
    const tabW = 110 * ui, tabH = 36 * ui, tabs = SPELLING_GRADES;
    const x0 = w / 2 - ((tabs.length - 1) * (tabW + 8)) / 2;
    tabs.forEach((g, i) => button(this, x0 + i * (tabW + 8), y, tabW, tabH, `Grade ${g}`, { variant: g === grade ? 'success' : 'secondary', fontSize: 14, onClick: () => { Sfx.click(); this.grade = g; this.rebuild(); } }));
    y += tabH / 2 + 14 * ui;

    // The lists, two per row when there is room.
    const all = lists.flatMap((l) => listWords(l).map((e) => e.w));
    const learnedAll = all.filter((wd) => isLearned(p, wd)).length;
    const tricky = lists.flatMap((l) => listProgress(p, l).tricky);
    text(this, w / 2, y, `${learnedAll} of ${all.length} words learned`, T.small(this, THEME.ink2)); y += 20 * ui;
    const cols = w >= 640 ? 2 : 1, gap = 12;
    const cw = Math.min((w - 24 - gap * (cols - 1)) / cols, 420 * ui), ch = 104 * ui;
    const left = (w - (cw * cols + gap * (cols - 1))) / 2;
    const cards = [];
    // Spaced review comes first: a few minutes a day on the words that are due back.
    const due = dueWords(p);
    const next = nextReviewAt(p);
    const review = due.length ? { due } : next ? { waitDays: Math.max(1, Math.ceil((next - Date.now()) / DAY)) } : null;
    const items = [...(review ? [{ review }] : []), ...lists.map((l) => ({ list: l })), ...(tricky.length ? [{ tricky }] : [])];
    items.forEach((it, i) => {
      const cx = left + (i % cols) * (cw + gap) + cw / 2, cy = y + Math.floor(i / cols) * (ch + gap) + ch / 2;
      if (cy + ch / 2 > h - 8) return;
      if (it.review) {
        const due = it.review.due;
        const k = card(this, cx, cy, cw, ch, { stroke: THEME.success, color: THEME.successSoft, onTap: due ? () => this.review(due) : null });
        k.add(this.add.text(-cw / 2 + 18, -ch / 2 + 22 * ui, "📅 Today's practice", T.bodyBold(this, THEME.successDark)).setOrigin(0, 0.5));
        if (due) {
          k.add(this.add.text(-cw / 2 + 18, -ch / 2 + 44 * ui, `${due.length} ${due.length === 1 ? 'word is' : 'words are'} due back today: ${due.slice(0, 8).map((e) => e.w).join(' · ')}${due.length > 8 ? ' …' : ''}`, { ...T.small(this, THEME.ink2), wordWrap: { width: cw - 36 } }).setOrigin(0, 0));
          k.add(button(this, -cw / 2 + 18 + 60 * ui, ch / 2 - 18 * ui, 120 * ui, 28 * ui, 'Review now', { variant: 'success', fontSize: 12, onClick: () => this.review(due) }));
        } else {
          k.add(this.add.text(-cw / 2 + 18, -ch / 2 + 50 * ui, `All caught up! Your next review is in ${it.review.waitDays} ${it.review.waitDays === 1 ? 'day' : 'days'}.`, { ...T.small(this, THEME.ink2), wordWrap: { width: cw - 36 } }).setOrigin(0, 0.5));
        }
        cards.push(k);
      } else if (it.list) {
        const pr = listProgress(p, it.list);
        const k = card(this, cx, cy, cw, ch, { stroke: THEME.subjects.words.soft, onTap: () => this.learn(it.list.id) });
        k.add(button(this, -cw / 2 + 18 + 38 * ui, ch / 2 - 18 * ui, 76 * ui, 28 * ui, 'Learn', { variant: 'success', fontSize: 12, onClick: () => this.learn(it.list.id) }));
        k.add(button(this, -cw / 2 + 18 + 76 * ui + 8 + 35 * ui, ch / 2 - 18 * ui, 70 * ui, 28 * ui, 'Practise', { variant: 'secondary', fontSize: 12, onClick: () => this.play(it.list.id) }));
        k.add(this.add.text(-cw / 2 + 18, -ch / 2 + 22 * ui, `${it.list.title}`, T.bodyBold(this)).setOrigin(0, 0.5));
        // The word list wraps to at most two lines inside the card; longer lists end with an ellipsis.
        const words = listWords(it.list).map((e) => e.w);
        const wl = this.add.text(-cw / 2 + 18, -ch / 2 + 36 * ui, words.join(' · '), { ...T.small(this, THEME.ink2), wordWrap: { width: cw - 36 } }).setOrigin(0, 0);
        for (let n = words.length - 1; wl.height > 40 * ui && n > 2; n--) wl.setText(words.slice(0, n).join(' · ') + ' …');
        k.add(wl);
        const learnedChip = chip(this, cw / 2 - 14, -ch / 2 + 22 * ui, { text: `${pr.learned}/${pr.total} learned`, originX: 1, color: pr.learned === pr.total ? THEME.successSoft : THEME.sunken, textColor: pr.learned === pr.total ? THEME.successDark : THEME.ink2, fontSize: 12, height: 24 * ui, shadow: 'none' });
        k.add(learnedChip);
        if (pr.lastTest) k.add(chip(this, cw / 2 - 14 - learnedChip.w - 6, -ch / 2 + 22 * ui, { text: `Test ${pr.lastTest.correct}/${pr.lastTest.total}`, originX: 1, color: THEME.warningSoft, textColor: THEME.warningDark, fontSize: 12, height: 24 * ui, shadow: 'none' }));
        k.add(new StarRow(this, cw / 2 - 14 - 26 * ui, ch / 2 - 18 * ui, pr.best, 12 * ui));
        k.add(button(this, -cw / 2 + 18 + 76 * ui + 8 + 70 * ui + 8 + 48 * ui, ch / 2 - 18 * ui, 96 * ui, 28 * ui, 'Weekly test', { variant: 'warning', fontSize: 12, onClick: () => this.weeklyTest(it.list.id) }));
        cards.push(k);
      } else {
        const k = card(this, cx, cy, cw, ch, { stroke: THEME.warning, color: THEME.warningSoft, onTap: () => this.learn('tricky', it.tricky) });
        k.add(this.add.text(-cw / 2 + 18, -ch / 2 + 22 * ui, '⚡ Tricky words', T.bodyBold(this, THEME.warningDark)).setOrigin(0, 0.5));
        k.add(this.add.text(-cw / 2 + 18, -ch / 2 + 50 * ui, it.tricky.slice(0, 12).join(' · '), { ...T.small(this, THEME.ink2), wordWrap: { width: cw - 36 } }).setOrigin(0, 0.5));
        cards.push(k);
      }
    });
    enter(this, cards, { from: 'up', stagger: 40 });
  }

  /** Practise the words due back today (spaced review). */
  review(entries) {
    this.scene.start(SCENES.SpellingGame, { listId: 'review', listKind: 'review', title: "Today's practice", words: entries, grade: this.grade });
  }

  /** Teach first (flash cards, build it, copy it, cover it), then the test. */
  learn(listId, words = null) {
    this.scene.start(SCENES.SpellingLearn, { listId, words, grade: this.grade });
  }

  /** The weekly test: every word of the list from hearing alone, scored for the parent dashboard. */
  weeklyTest(listId) {
    this.scene.start(SCENES.SpellingGame, { listId, grade: this.grade, test: true });
  }

  /** Straight to the test. */
  play(listId, words = null) {
    this.scene.start(SCENES.SpellingGame, { listId, words, grade: this.grade });
  }
}
