import { BaseScene } from './BaseScene.js';
import { SCENES } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import * as Cloud from '../systems/Cloud.js';
import { T, text } from '../ui/TextStyles.js';
import { background, stripe } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { chip } from '../ui/Chip.js';
import { button, iconButton, speakButton } from '../ui/Button.js';
import { readable } from '../ui/ReadableText.js';
import { answerSpeaker, readQuestionThenAnswers } from '../ui/AnswerSpeech.js';
import { modal } from '../ui/Modal.js';
import { StarRow } from '../ui/StarRow.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { enter, shake } from '../ui/motion.js';
import { fireworks } from '../ui/Fireworks.js';
import { Sfx } from '../systems/Audio.js';
import { cheer, oops } from './FxScene.js';
import { rateFor, stop as stopSpeech } from '../systems/Speech.js';
import { safeArea } from '../systems/Layout.js';
import { Rng } from '../systems/Rng.js';
import { checkBadges } from '../systems/Progression.js';
import { getBadge } from '../data/badges.js';
import { getRoom, roomGameId, pageText } from '../data/social/barbados.js';
import { pictureTexture, isDrawnPicture } from '../ui/Pictures.js';
import { markRead, finishRoom, roomRecord, SOCIAL_SKILL } from '../systems/Social.js';

/**
 * One room of the house: the story, a page at a time with its picture, read aloud; then the quiz of five
 * questions, each explained after it is answered; then the stars, coins and XP. Launched over HouseScene,
 * which is resumed (with a 'room:done' event) when the player leaves.
 */
export class HouseRoomScene extends BaseScene {
  constructor() { super(SCENES.HouseRoom); this.fade = true; }

  init(data) {
    this.roomId = data.roomId;
    this.returnTo = data.returnTo || SCENES.House;
    this.room = getRoom(data.roomId) || { id: 'none', title: 'Room', item: '❓', colour: THEME.pink, story: [], quiz: [] };
    const rng = new Rng();
    // Every question keeps its answer (the first choice) but shows the choices (and their pictures) in a fresh order.
    const quiz = this.room.quiz.map((q) => {
      const order = rng.shuffle(q.choices.map((_, i) => i));
      return { ...q, answer: q.choices[0], choices: order.map((i) => q.choices[i]), pics: Array.isArray(q.pics) ? order.map((i) => q.pics[i]) : null };
    });
    const read = roomRecord(Store.getProfile() || {}, this.room.id).read;
    this.state = { phase: data.quizOnly && read ? 'quiz' : 'story', page: 0, quiz, qIdx: 0, picked: null, right: null, correct: 0, log: [], done: false, reward: null, newBadges: [] };
    this.startedAt = Date.now();
    this.qStartAt = Date.now();
  }

  create(data) {
    super.create(data);
    this.scene.bringToTop();
    const kb = this.input && this.input.keyboard;
    if (kb && typeof kb.on === 'function') {
      this.onKey = (e) => this.keyDown(e);
      kb.on('keydown', this.onKey);
      this.events.once('shutdown', () => { kb.off('keydown', this.onKey); stopSpeech(); });
    }
  }

  get speechRate() { return rateFor(Store.getProfile()?.grade); }
  get question() { return this.state.quiz[this.state.qIdx]; }
  enterKey() { const s = this.state; return s.done ? 'done' : s.phase === 'story' ? `s${s.page}` : `q${s.qIdx}`; }

  build() {
    const { w, h, ui } = this;
    const s = this.state;
    background(this, { accent: this.room.colour, accent2: THEME.gold, dots: false });
    if (s.done) return this.buildSummary();
    const sa = safeArea();
    const cy = sa.top + 28 * ui + 2;
    iconButton(this, 12 + sa.left + 22 * ui, cy, 44 * ui, '←', { onClick: () => this.close() });
    text(this, w / 2, cy, `${this.room.item} ${this.room.title}`, T.heading(this));
    const total = this.room.story.length + s.quiz.length;
    const at = s.phase === 'story' ? s.page : this.room.story.length + s.qIdx;
    chip(this, w - 12 - sa.right, cy, { text: s.phase === 'story' ? `Page ${s.page + 1} / ${this.room.story.length}` : `Quiz ${s.qIdx + 1} / ${s.quiz.length}`, originX: 1, color: THEME.warningSoft, textColor: THEME.warningDark, shadow: 'none' });
    new ProgressBar(this, w / 2, sa.top + 60 * ui, w - 32, 6 * ui, { value: at / Math.max(1, total), color: this.room.colour });
    const area = { x: 14 + sa.left, y: sa.top + 76 * ui, w: w - 28 - sa.left - sa.right, h: h - sa.top - 76 * ui - 14 - sa.bottom };
    if (s.phase === 'story') this.buildStory(area); else this.buildQuiz(area);
  }

  // ---- The story --------------------------------------------------------------------------------

  buildStory(area) {
    const { ui } = this, s = this.state;
    const page = this.room.story[s.page];
    if (!page) return;
    const cx = area.x + area.w / 2;
    const picSize = Math.min(96 * ui, area.h * 0.18);
    const cardH = Math.min(area.h - 70 * ui, 40 * ui + picSize + 16 * ui + 150 * ui);
    const k = card(this, cx, area.y + cardH / 2, area.w, cardH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.room.colour, 5 * ui);
    const pic = this.add.text(cx, area.y + 30 * ui + picSize / 2, page.pic, { fontSize: Math.round(picSize * 0.72) + 'px' }).setOrigin(0.5);
    enter(this, pic, { from: 'pop' });
    const story = pageText(page, Store.getProfile()?.grade);
    const size = story.length > 220 ? 15 : story.length > 160 ? 16 : 18;
    const body = readable(this, cx, area.y + 30 * ui + picSize + 18 * ui, story, T.at(this, size, THEME.ink), { width: area.w - 40, align: 'center', lineGap: 5 * ui });
    body.setOrigin(0.5, 0);
    const how = { rate: this.speechRate };
    const sb = speakButton(this, area.x + area.w - 30 * ui, area.y + 28 * ui, 40 * ui, body, how);
    if (sb) sb.setDepth(5);
    if (Store.getProfile()?.readAloud === 'auto' && this.animateEnter) this.time.delayedCall(350, () => { if (body.active) body.read(how); });
    enter(this, k, { from: 'up', distance: 12 });
    // Page dots, then Back / Next (the last page offers the quiz).
    const dotsY = area.y + cardH + 14 * ui;
    this.room.story.forEach((_, i) => this.add.circle(cx + (i - (this.room.story.length - 1) / 2) * 14 * ui, dotsY, 4 * ui, i === s.page ? this.room.colour : THEME.line, 1));
    const by = dotsY + 38 * ui, bw = Math.min((area.w - 20) / 2, 220 * ui);
    const last = s.page >= this.room.story.length - 1;
    button(this, cx - bw / 2 - 6, by, bw, 48 * ui, s.page === 0 ? 'Leave the room' : '◀ Back', { variant: 'secondary', onClick: () => (s.page === 0 ? this.close() : this.prevPage()) });
    button(this, cx + bw / 2 + 6, by, bw, 48 * ui, last ? 'Take the quiz ▶' : 'Next ▶', { variant: 'go', onClick: () => this.nextPage() });
    if (!last && roomRecord(Store.getProfile() || {}, this.room.id).read) button(this, cx, by + 58 * ui, Math.min(area.w - 40, 220 * ui), 38 * ui, 'Skip to the quiz', { variant: 'ghost', fontSize: 14, onClick: () => this.startQuiz() });
  }

  prevPage() { const s = this.state; if (s.page > 0) { stopSpeech(); s.page -= 1; Sfx.click(); this.rebuild(); } }

  nextPage() {
    const s = this.state;
    stopSpeech();
    if (s.page >= this.room.story.length - 1) return this.startQuiz();
    s.page += 1; Sfx.click(); this.rebuild();
  }

  startQuiz() {
    const s = this.state;
    stopSpeech();
    Store.updateProfile((p) => markRead(p, this.room.id));
    s.phase = 'quiz'; s.qIdx = 0; s.picked = null; s.right = null;
    this.qStartAt = Date.now();
    Sfx.pop();
    this.rebuild();
  }

  // ---- The quiz ---------------------------------------------------------------------------------

  buildQuiz(area) {
    const { ui } = this, s = this.state;
    const q = this.question;
    if (!q) return;
    const cx = area.x + area.w / 2;
    const answered = s.picked !== null;
    const promptH = Math.min(area.h * 0.26, 140 * ui);
    const k = card(this, cx, area.y + promptH / 2, area.w, promptH);
    stripe(this, cx - 24 * ui, area.y + 10 * ui, 48 * ui, this.room.colour, 5 * ui);
    const prompt = readable(this, cx, area.y + promptH / 2 + 6 * ui, q.q, T.at(this, q.q.length > 60 ? 18 : 21, THEME.ink, { fontStyle: '700' }), { width: area.w - 56 });
    const sb = speakButton(this, area.x + area.w - 30 * ui, area.y + 26 * ui, 40 * ui, prompt, { rate: this.speechRate });
    if (sb) sb.setDepth(5);
    if (Store.getProfile()?.readAloud === 'auto' && this.animateEnter) readQuestionThenAnswers(this, prompt, answered ? null : q.choices, { rate: this.speechRate });
    enter(this, k, { from: 'up', distance: 12 });
    // Four answers in a column (two columns when the screen is wide enough for two readable buttons), leaving
    // room underneath for the explanation and the Next button. Picture questions show a 2 x 2 grid of cards.
    const pics = !!q.pics;
    const cols = pics || area.w >= 480 ? 2 : 1, gap = 10 * ui, rows = Math.ceil(4 / cols);
    const reserve = 60 * ui + 66 * ui;
    const bw = (area.w - gap * (cols - 1)) / cols;
    const bh = pics ? Math.max(48 * ui, Math.min(124 * ui, (area.h - promptH - 14 * ui - reserve - gap) / 2)) : Math.max(34 * ui, Math.min(56 * ui, (area.h - promptH - 14 * ui - reserve - gap * (rows - 1)) / rows));
    const top = area.y + promptH + 14 * ui;
    const buttons = pics ? this.pictureCards(q, { area, top, bw, bh, gap, answered }) : q.choices.map((c, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = area.x + col * (bw + gap) + bw / 2, y = top + row * (bh + gap) + bh / 2;
      const isAnswer = c === q.answer, picked = s.picked === i;
      const variant = !answered ? 'secondary' : isAnswer ? 'success' : picked ? 'danger' : 'ghost';
      const b = button(this, x, y, bw, bh, c, { variant, fontSize: c.length > 30 ? 14 : 16, disabled: answered && !isAnswer && !picked, onClick: () => this.pick(i) });
      answerSpeaker(this, b, bw, bh, c, { rate: this.speechRate });
      if (answered && picked && !isAnswer) shake(this, b, 5);
      return b;
    });
    if (!answered) enter(this, buttons, { from: 'up', stagger: 40 });
    if (answered) {
      const ey = top + rows * (bh + gap) + 4 * ui;
      const eh = Math.max(56 * ui, Math.min(area.y + area.h - ey - 66 * ui, 110 * ui));
      const ek = card(this, cx, ey + eh / 2, area.w, eh, { color: s.right ? THEME.successSoft : THEME.dangerSoft, stroke: s.right ? THEME.success : THEME.danger });
      text(this, cx, ey + 18 * ui, s.right ? 'That is right!' : `The answer is ${q.answer}.`, T.bodyBold(this, s.right ? THEME.successDark : THEME.danger));
      text(this, cx, ey + 18 * ui + 24 * ui, q.why, { ...T.small(this, THEME.ink2), wordWrap: { width: area.w - 32 }, align: 'center' }).setOrigin(0.5, 0);
      enter(this, ek, { from: 'up', distance: 10 });
      const last = s.qIdx + 1 >= s.quiz.length;
      button(this, cx, ey + eh + 34 * ui, Math.min(area.w - 40, 240 * ui), 48 * ui, last ? 'See my stars ▶' : 'Next question ▶', { variant: 'go', onClick: () => this.next() });
    }
  }

  /** Picture answers: a card each with the drawn picture or emoji and the label underneath. */
  pictureCards(q, { area, top, bw, bh, gap, answered }) {
    const { ui } = this, s = this.state;
    return q.choices.map((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = area.x + col * (bw + gap) + bw / 2, y = top + row * (bh + gap) + bh / 2;
      const isAnswer = c === q.answer, picked = s.picked === i;
      const stroke = !answered ? THEME.line : isAnswer ? THEME.success : picked ? THEME.danger : THEME.line;
      const fill = !answered ? THEME.surface : isAnswer ? THEME.successSoft : picked ? THEME.dangerSoft : THEME.surface;
      const k = card(this, x, y, bw, bh, { color: fill, stroke, strokeWidth: answered && (isAnswer || picked) ? 3 : 2, onTap: answered ? null : () => this.pick(i) });
      if (answered && !isAnswer && !picked) k.setAlpha(0.45);
      const pic = q.pics[i], picH = bh - 34 * ui;
      const tex = isDrawnPicture(pic) ? pictureTexture(this, pic) : null;
      if (tex) {
        const img = this.add.image(0, -14 * ui, tex);
        const scale = Math.min((bw - 24) / img.width, picH / img.height);
        img.setScale(scale);
        k.add(img);
      } else k.add(this.add.text(0, -14 * ui, pic, { fontSize: Math.round(Math.min(picH * 0.75, 52 * ui)) + 'px' }).setOrigin(0.5));
      k.add(this.add.text(0, bh / 2 - 14 * ui, c, { ...T.small(this, THEME.ink, { fontStyle: '700' }), wordWrap: { width: bw - 16 }, align: 'center' }).setOrigin(0.5));
      if (answered && (isAnswer || picked)) k.add(this.add.text(bw / 2 - 12 * ui, -bh / 2 + 12 * ui, isAnswer ? '✓' : '✗', T.bodyBold(this, isAnswer ? THEME.successDark : THEME.danger)).setOrigin(0.5));
      else answerSpeaker(this, k, bw, bh, c, { rate: this.speechRate });
      if (answered && picked && !isAnswer) shake(this, k, 5);
      return k;
    });
  }

  pick(i) {
    const s = this.state, q = this.question;
    if (!q || s.picked !== null) return;
    s.picked = i; s.right = q.choices[i] === q.answer;
    if (s.right) { s.correct += 1; Sfx.correct(); cheer(this); } else { Sfx.wrong(); oops(this); this.cameras.main.shake(120, 0.004); }
    s.log.push({ skill: SOCIAL_SKILL, right: s.right, ms: Date.now() - this.qStartAt, prompt: q.q.slice(0, 120), answer: q.answer.slice(0, 40), choices: q.choices.slice(0, 4), explain: q.why.slice(0, 200) });
    stopSpeech();
    this.rebuild();
  }

  next() {
    const s = this.state;
    if (s.picked === null) return;
    stopSpeech();
    s.qIdx += 1; s.picked = null; s.right = null;
    this.qStartAt = Date.now();
    if (s.qIdx >= s.quiz.length) return this.finishAll();
    this.rebuild();
  }

  keyDown(e) {
    const s = this.state;
    if (s.done) return;
    const k = String(e.key || '');
    if (s.phase === 'story') { if (k === 'Enter' || k === 'ArrowRight' || k === ' ') this.nextPage(); else if (k === 'ArrowLeft') this.prevPage(); return; }
    if (s.picked !== null) { if (k === 'Enter' || k === ' ') this.next(); return; }
    if (/^[1-4]$/.test(k)) this.pick(Number(k) - 1);
  }

  // ---- The reward -------------------------------------------------------------------------------

  finishAll() {
    const s = this.state;
    let reward = null, newBadges = [];
    Store.updateProfile((p) => {
      reward = finishRoom(p, this.room.id, s.correct, s.quiz.length);
      newBadges = checkBadges(p, { correct: s.correct, total: s.quiz.length, social: true });
    });
    s.reward = reward; s.done = true; s.newBadges = newBadges;
    const p = Store.getProfile();
    if (p && reward) Cloud.postResult(p, { gameId: roomGameId(this.room.id), band: null }, { stars: reward.stars, correct: s.correct, total: s.quiz.length, xp: reward.xp, coins: reward.coins, timeMs: Date.now() - this.startedAt, missedSkills: s.correct < s.quiz.length ? [SOCIAL_SKILL] : [], questions: s.log });
    if (reward && reward.stars >= 2) Sfx.fanfare(); else Sfx.correct();
    this.rebuild();
    if (reward && reward.stars >= 1) this.time.delayedCall(400, () => fireworks(this, this.w / 2, this.h * 0.25, { bursts: 1 + reward.stars, spread: this.w * 0.3 }));
  }

  buildSummary() {
    const { w, ui } = this, s = this.state, r = s.reward || { coins: 0, xp: 0, stars: 0 };
    const m = modal(this, { w: 440 * ui, h: 330 * ui, title: `${this.room.item} ${this.room.title}`, accent: this.room.colour, dim: false });
    let y = m.contentTop + 8 * ui;
    const stars = new StarRow(this, w / 2, y + 14 * ui, 0, 44 * ui);
    if (!this.starsShown) { this.starsShown = true; stars.reveal(r.stars, this); } else stars.set(r.stars);
    y += 52 * ui;
    text(this, w / 2, y, `${s.correct} of ${s.quiz.length} right`, T.heading(this)); y += 30 * ui;
    text(this, w / 2, y, `+${r.coins} coins   +${r.xp} XP`, T.bodyBold(this, THEME.warningDark)); y += 28 * ui;
    text(this, w / 2, y, r.stars === 3 ? 'You know this room by heart!' : r.stars >= 1 ? 'Read the story again to catch the ones you missed.' : 'Have another read of the story, then try again.', { ...T.small(this, THEME.ink2), wordWrap: { width: m.w - 48 }, align: 'center' });
    const bw = Math.min((m.w - 72) / 2, 190 * ui), bh = 48 * ui, by = m.y + m.h - 40 * ui;
    button(this, w / 2 - bw / 2 - 8, by, bw, bh, 'Read again', { variant: 'helper', onClick: () => this.scene.restart({ roomId: this.roomId, returnTo: this.returnTo }) });
    button(this, w / 2 + bw / 2 + 8, by, bw, bh, 'Back to the house', { variant: 'go', onClick: () => this.close() });
  }

  /** Stop this scene, wake the Hud and hand control back to the house with what happened. */
  close() {
    if (this.closing) return;
    this.closing = true;
    stopSpeech();
    const s = this.state, mgr = this.scene, to = this.returnTo;
    const result = s.done && s.reward ? { ...s.reward, correct: s.correct, total: s.quiz.length } : null;
    const badges = (s.newBadges || []).map((id) => getBadge(id)).filter(Boolean);
    mgr.stop(SCENES.HouseRoom);
    if (mgr.isSleeping(SCENES.Hud)) mgr.wake(SCENES.Hud);
    const caller = mgr.get(to);
    if (caller) caller.events.emit('room:done', { roomId: this.room.id, result, newBadges: badges });
    if (mgr.isPaused(to)) mgr.resume(to);
    else if (!mgr.isActive(to)) mgr.start(to);
  }
}
