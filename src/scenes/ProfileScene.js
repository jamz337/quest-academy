import { BaseScene } from './BaseScene.js';
import { C, hex, SCENES, GRADES, AVATAR_COUNT } from '../constants.js';
import * as Store from '../systems/Store.js';
import { levelFromXp } from '../systems/SaveSystem.js';
import { grid } from '../systems/Layout.js';
import { T, text, FONT } from '../ui/TextStyles.js';
import { button } from '../ui/Button.js';
import { panel, background, dimmer } from '../ui/Panel.js';
import { Sfx } from '../systems/Audio.js';

/** Pick, create, edit or delete local player profiles. */
export class ProfileScene extends BaseScene {
  constructor() { super(SCENES.Profile); }

  init() {
    this.state = { mode: 'list', editing: null, draft: null, confirmDelete: false };
  }

  build() {
    background(this);
    if (this.state.mode === 'form') return this.buildForm();
    this.buildList();
  }

  buildList() {
    const { w, h, ui } = this;
    text(this, w / 2, 40 * ui + 10, 'Quest Academy', T.title(this));
    text(this, w / 2, 40 * ui + 10 + 34 * ui, 'Who is playing?', T.body(this, C.grey));
    const profiles = Store.listProfiles();
    const items = [...profiles, { isNew: true }];
    const cols = this.portrait ? 2 : Math.min(4, items.length);
    const rows = Math.ceil(items.length / cols);
    const top = 40 * ui + 10 + 70 * ui;
    const areaW = Math.min(w - 32, 220 * ui * cols + 12 * (cols - 1));
    const cellH = Math.min(150 * ui, (h - top - 24 - 12 * (rows - 1)) / rows);
    const cells = grid({ x: (w - areaW) / 2, y: top, w: areaW, h: (cellH + 12) * rows - 12 }, cols, rows, 12);
    items.forEach((p, i) => {
      const c = cells[i]; if (!c) return;
      if (p.isNew) return this.newCard(c);
      this.profileCard(p, c);
    });
  }

  profileCard(p, c) {
    const { ui } = this;
    const g = panel(this, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, { color: C.panel, stroke: C.blue });
    const zone = this.add.zone(c.x, c.y, c.w, c.h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => { Sfx.click(); Store.setActiveProfile(p.id); this.scene.start(SCENES.ModeSelect); });
    this.add.image(c.x, c.y - c.h * 0.22, 'avatar', p.avatar).setDisplaySize(56 * ui, 56 * ui);
    text(this, c.x, c.y + c.h * 0.14, p.name, T.bodyBold(this));
    text(this, c.x, c.y + c.h * 0.32, `Grade ${p.grade}  ·  Lv ${levelFromXp(p.xp)}`, T.small(this, C.grey));
    const edit = this.add.text(c.x + c.w / 2 - 14, c.y - c.h / 2 + 14, '✎', { fontSize: Math.round(18 * ui) + 'px', color: hex(C.grey) })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    edit.on('pointerup', (ptr, x, y, ev) => { ev.stopPropagation(); Sfx.click(); this.openForm(p); });
    g.setDepth(0); zone.setDepth(1); edit.setDepth(2);
  }

  newCard(c) {
    const { ui } = this;
    panel(this, c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, { color: C.panelDark, stroke: C.lime });
    text(this, c.x, c.y - 10 * ui, '+', T.big(this, C.lime));
    text(this, c.x, c.y + 30 * ui, 'New player', T.bodyBold(this, C.lime));
    const zone = this.add.zone(c.x, c.y, c.w, c.h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => { Sfx.click(); this.openForm(null); });
  }

  openForm(profile) {
    this.state.mode = 'form';
    this.state.editing = profile;
    this.state.confirmDelete = false;
    this.state.draft = profile ? { name: profile.name, avatar: profile.avatar, grade: profile.grade } : { name: '', avatar: Math.floor(Math.random() * AVATAR_COUNT), grade: 3 };
    this.rebuild();
  }

  buildForm() {
    const { w, h, ui } = this;
    const d = this.state.draft;
    const editing = !!this.state.editing;
    const pw = Math.min(w - 24, 520 * ui), ph = Math.min(h - 24, 560 * ui);
    const px = (w - pw) / 2, py = (h - ph) / 2;
    panel(this, px, py, pw, ph, { color: C.panel, stroke: C.blue });
    let y = py + 34 * ui;
    text(this, w / 2, y, editing ? 'Edit player' : 'New player', T.heading(this, C.yellow));

    // Name (DOM input so the on-screen keyboard works on Android)
    y += 46 * ui;
    text(this, px + 24, y, 'Name', T.small(this, C.grey)).setOrigin(0, 0.5);
    y += 26 * ui;
    const input = document.createElement('input');
    input.type = 'text'; input.maxLength = 14; input.value = d.name; input.placeholder = 'Type a name';
    input.autocapitalize = 'words';
    Object.assign(input.style, {
      width: (pw - 48) + 'px', height: (40 * ui) + 'px', fontSize: Math.round(18 * ui) + 'px', borderRadius: '10px',
      border: '3px solid ' + hex(C.blue), padding: '0 12px', boxSizing: 'border-box', fontFamily: FONT,
      fontWeight: '700', color: hex(C.navy), background: hex(C.white), outline: 'none'
    });
    input.addEventListener('input', () => { d.name = input.value; });
    this.add.dom(w / 2, y + 20 * ui, input);

    // Avatar picker
    y += 62 * ui;
    text(this, px + 24, y, 'Avatar', T.small(this, C.grey)).setOrigin(0, 0.5);
    y += 20 * ui;
    const aSize = Math.min(52 * ui, (pw - 48) / AVATAR_COUNT - 6);
    const aCols = this.portrait && pw < 400 ? 4 : AVATAR_COUNT;
    const aRows = Math.ceil(AVATAR_COUNT / aCols);
    const cells = grid({ x: px + 24, y, w: pw - 48, h: aRows * (aSize + 12) }, aCols, aRows, 6);
    for (let i = 0; i < AVATAR_COUNT; i++) {
      const c = cells[i];
      const sel = i === d.avatar;
      const ring = this.add.circle(c.x, c.y, aSize / 2 + 5, sel ? C.yellow : C.panelDark);
      const img = this.add.image(c.x, c.y, 'avatar', i).setDisplaySize(aSize, aSize).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => { Sfx.pop(); d.avatar = i; this.rebuild(); });
      ring.setAlpha(sel ? 1 : 0.6);
    }
    y += aRows * (aSize + 12) + 18 * ui;

    // Grade picker
    text(this, px + 24, y, 'Grade', T.small(this, C.grey)).setOrigin(0, 0.5);
    y += 22 * ui;
    const gcells = grid({ x: px + 24, y, w: pw - 48, h: 44 * ui }, GRADES.length, 1, 6);
    GRADES.forEach((g, i) => {
      const c = gcells[i];
      button(this, c.x, c.y + c.h / 2, c.w, c.h, String(g), {
        color: g === d.grade ? C.orange : C.lavender, fontSize: 18,
        onClick: () => { d.grade = g; this.rebuild(); }
      });
    });
    y += 44 * ui + 26 * ui;

    // Actions
    const bw = Math.min(200 * ui, (pw - 72) / 2), bh = 48 * ui;
    button(this, w / 2 - bw / 2 - 8, y + bh / 2, bw, bh, 'Cancel', { color: C.dark, onClick: () => { this.state.mode = 'list'; this.rebuild(); } });
    button(this, w / 2 + bw / 2 + 8, y + bh / 2, bw, bh, 'Save', { color: C.lime, textColor: C.navy, onClick: () => this.saveForm() });

    if (editing) {
      y += bh + 18 * ui;
      if (!this.state.confirmDelete) {
        const del = text(this, w / 2, y, 'Delete this player', T.small(this, C.red)).setInteractive({ useHandCursor: true });
        del.on('pointerup', () => { this.state.confirmDelete = true; this.rebuild(); });
      } else {
        text(this, w / 2, y, 'Delete all progress for ' + this.state.editing.name + '?', T.small(this, C.red));
        button(this, w / 2, y + 36 * ui, bw, 40 * ui, 'Yes, delete', {
          color: C.red, fontSize: 16, onClick: () => { Store.deleteProfile(this.state.editing.id); this.state.mode = 'list'; this.rebuild(); }
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
    this.scene.start(SCENES.ModeSelect);
  }
}
