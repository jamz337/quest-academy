import { BaseScene } from './BaseScene.js';
import { SCENES, GRADES, AVATAR_COUNT } from '../constants.js';
import { THEME } from '../ui/theme.js';
import * as Store from '../systems/Store.js';
import { levelFromXp } from '../systems/SaveSystem.js';
import { grid, safeArea } from '../systems/Layout.js';
import { T, text } from '../ui/TextStyles.js';
import { button, iconButton } from '../ui/Button.js';
import { background } from '../ui/Panel.js';
import { card } from '../ui/Card.js';
import { modal } from '../ui/Modal.js';
import { textInput } from '../ui/Input.js';
import { enter } from '../ui/motion.js';
import { Sfx } from '../systems/Audio.js';

/** Pick, create, edit or delete local player profiles. */
export class ProfileScene extends BaseScene {
  constructor() { super(SCENES.Profile); this.fade = true; }

  init() {
    this.state = { mode: 'list', editing: null, draft: null, confirmDelete: false };
  }

  build() {
    background(this, { accent: THEME.primary, accent2: THEME.pink });
    if (this.state.mode === 'form') return this.buildForm();
    this.buildList();
  }

  buildList() {
    const { w, h, ui } = this;
    const top0 = safeArea().top;
    const title = text(this, w / 2, top0 + 50 * ui, 'Quest Academy', T.display(this));
    const sub = text(this, w / 2, top0 + 50 * ui + 36 * ui, 'Who is playing?', T.body(this, THEME.ink2));
    enter(this, [title, sub], { from: 'down', distance: 12 });
    const profiles = Store.listProfiles();
    const items = [...profiles, { isNew: true }];
    const cols = this.portrait ? 2 : Math.min(4, items.length);
    const rows = Math.ceil(items.length / cols);
    const top = top0 + 50 * ui + 70 * ui;
    const areaW = Math.min(w - 32, 220 * ui * cols + 12 * (cols - 1));
    const cellH = Math.min(150 * ui, (h - top - 24 - 12 * (rows - 1)) / rows);
    const cells = grid({ x: (w - areaW) / 2, y: top, w: areaW, h: (cellH + 12) * rows - 12 }, cols, rows, 12);
    const cards = [];
    items.forEach((p, i) => {
      const c = cells[i]; if (!c) return;
      cards.push(p.isNew ? this.newCard(c) : this.profileCard(p, c));
    });
    enter(this, cards, { from: 'up', delay: 100, stagger: 60 });
  }

  profileCard(p, c) {
    const { ui } = this;
    const k = card(this, c.x, c.y, c.w, c.h, { stroke: THEME.line, onTap: () => { Store.setActiveProfile(p.id); this.go(SCENES.ModeSelect); } });
    const disc = this.add.circle(0, -c.h * 0.22, 36 * ui, THEME.primarySoft);
    const img = this.add.image(0, -c.h * 0.22, 'avatar', p.avatar).setDisplaySize(56 * ui, 56 * ui);
    const name = this.add.text(0, c.h * 0.14, p.name, T.bodyBold(this)).setOrigin(0.5);
    const meta = this.add.text(0, c.h * 0.32, `Grade ${p.grade}  ·  Lv ${levelFromXp(p.xp)}`, T.small(this, THEME.ink2)).setOrigin(0.5);
    k.add([disc, img, name, meta]);
    const edit = iconButton(this, c.x + c.w / 2 - 22 * ui, c.y - c.h / 2 + 22 * ui, 32 * ui, '✎', { variant: 'ghost', onClick: () => this.openForm(p) });
    edit.setDepth(2);
    return k;
  }

  newCard(c) {
    const { ui } = this;
    const k = card(this, c.x, c.y, c.w, c.h, { color: THEME.sunken, stroke: THEME.lineStrong, shadow: 'none', onTap: () => this.openForm(null) });
    const plus = this.add.text(0, -12 * ui, '+', T.big(this, THEME.primary)).setOrigin(0.5);
    const lbl = this.add.text(0, 30 * ui, 'New player', T.bodyBold(this, THEME.primary)).setOrigin(0.5);
    k.add([plus, lbl]);
    return k;
  }

  openForm(profile) {
    this.state.mode = 'form';
    this.state.editing = profile;
    this.state.confirmDelete = false;
    this.state.draft = profile ? { name: profile.name, avatar: profile.avatar, grade: profile.grade } : { name: '', avatar: Math.floor(Math.random() * AVATAR_COUNT), grade: 3 };
    this.buildCount = 0;   // animate the form in
    this.rebuild();
  }

  buildForm() {
    const { w, ui } = this;
    const d = this.state.draft;
    const editing = !!this.state.editing;
    const pw = Math.min(w - 24, 520 * ui);
    const aSize = Math.min(52 * ui, (pw - 48) / AVATAR_COUNT - 6);
    const aCols = this.portrait && pw < 400 ? 4 : AVATAR_COUNT;
    const aRows = Math.ceil(AVATAR_COUNT / aCols);
    const extra = editing ? 22 * ui + (this.state.confirmDelete ? 76 * ui : 20 * ui) : 0;
    const need = 68 * ui + 90 * ui + 18 * ui + aRows * (aSize + 12) + 16 * ui + 92 * ui + 48 * ui + extra + 26 * ui;
    const m = modal(this, { w: pw, h: need, title: editing ? 'Edit player' : 'New player', accent: THEME.primary, dim: false });
    const label = (str, y) => text(this, m.x + 24, y, str, T.caption(this)).setOrigin(0, 0.5);
    let y = m.contentTop;

    // Name (DOM input so the on-screen keyboard works on Android)
    label('NAME', y); y += 22 * ui;
    textInput(this, w / 2, y + 22 * ui, m.w - 48, 44 * ui, {
      value: d.name, placeholder: 'Type a name', maxLength: 14, autocapitalize: 'words', fontSize: 18,
      onInput: (v) => { d.name = v; }, onEnter: () => this.saveForm()
    });
    y += 44 * ui + 24 * ui;

    // Avatar picker
    label('AVATAR', y); y += 18 * ui;
    const cells = grid({ x: m.x + 24, y, w: m.w - 48, h: aRows * (aSize + 12) }, aCols, aRows, 6);
    for (let i = 0; i < AVATAR_COUNT; i++) {
      const c = cells[i];
      const sel = i === d.avatar;
      this.add.circle(c.x, c.y, aSize / 2 + 5, sel ? THEME.gold : THEME.sunken);
      const img = this.add.image(c.x, c.y, 'avatar', i).setDisplaySize(aSize, aSize).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => { Sfx.pop(); d.avatar = i; this.rebuild(); });
      if (!sel) img.setAlpha(0.8);
    }
    y += aRows * (aSize + 12) + 16 * ui;

    // Grade picker
    label('GRADE', y); y += 20 * ui;
    const gcells = grid({ x: m.x + 24, y, w: m.w - 48, h: 44 * ui }, GRADES.length, 1, 6);
    GRADES.forEach((g, i) => {
      const c = gcells[i];
      button(this, c.x, c.y + c.h / 2, c.w, c.h, String(g), {
        variant: 'secondary', selected: g === d.grade, fontSize: 17, radius: THEME.radius.sm,
        onClick: () => { d.grade = g; this.rebuild(); }
      });
    });
    y += 44 * ui + 28 * ui;

    // Actions
    const bw = Math.min(200 * ui, (m.w - 72) / 2), bh = 48 * ui;
    button(this, w / 2 - bw / 2 - 8, y + bh / 2, bw, bh, 'Cancel', { variant: 'ghost', onClick: () => { this.state.mode = 'list'; this.buildCount = 0; this.rebuild(); } });
    button(this, w / 2 + bw / 2 + 8, y + bh / 2, bw, bh, 'Save', { variant: 'primary', onClick: () => this.saveForm() });

    if (editing) {
      y += bh + 22 * ui;
      if (!this.state.confirmDelete) {
        const del = text(this, w / 2, y, 'Delete this player', T.small(this, THEME.danger)).setInteractive({ useHandCursor: true });
        del.on('pointerup', () => { this.state.confirmDelete = true; this.rebuild(); });
      } else {
        text(this, w / 2, y, 'Delete all progress for ' + this.state.editing.name + '?', T.small(this, THEME.danger));
        button(this, w / 2, y + 36 * ui, bw, 40 * ui, 'Yes, delete', {
          variant: 'danger', fontSize: 15, onClick: () => { Store.deleteProfile(this.state.editing.id); this.state.mode = 'list'; this.rebuild(); }
        });
      }
    }
  }

  saveForm() {
    const d = this.state.draft;
    const name = (d.name || '').trim() || 'Player';
    if (this.state.editing) {
      Store.setActiveProfile(this.state.editing.id);
      Store.updateProfile((p) => { p.name = name; p.avatar = d.avatar; p.grade = d.grade; });
    } else {
      Store.createProfile({ name, avatar: d.avatar, grade: d.grade });
    }
    Sfx.correct();
    this.go(SCENES.ModeSelect);
  }
}
