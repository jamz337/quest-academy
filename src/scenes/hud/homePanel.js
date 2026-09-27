// The player's house: a trophy room with level, streak, stars, bosses, errands and badges, plus a shortcut
// to the look editor. `hud` is the HudScene.
import { SCENES } from '../../constants.js';
import { THEME } from '../../ui/theme.js';
import { T, text } from '../../ui/TextStyles.js';
import { button } from '../../ui/Button.js';
import { modal } from '../../ui/Modal.js';
import * as Store from '../../systems/Store.js';
import { ERRANDS, errandsDone } from '../../data/world/errands.js';
import { BOSSES } from '../../data/world/bosses.js';
import { getBadge } from '../../data/badges.js';
import { levelFromXp } from '../../systems/SaveSystem.js';
import { currentStreak } from '../../systems/Streak.js';
import { houseStars } from '../../systems/Progression.js';
import { MINIGAMES } from '../../data/minigames.js';
import { exploredStats, ensureExplored } from '../../data/world/explore.js';

export function buildHome(hud) {
  const { w, ui } = hud;
  const p = Store.getProfile();
  if (!p) return;
  const badges = (p.badges || []).map((id) => getBadge(id)).filter(Boolean);
  const rows = Math.min(badges.length, 6);
  const m = modal(hud, { w: 420 * ui, h: (326 + rows * 24) * ui, title: `${p.name}'s house`, accent: THEME.pink, depth: 600, dimAlpha: 0.45 });
  let y = m.contentTop + 4 * ui;
  const stars = MINIGAMES.reduce((sum, g) => sum + houseStars(p, g.id), 0);
  const bosses = Object.values(p.world.bosses || {}).filter((b) => b.defeated).length;
  const streak = currentStreak(p);
  const line = (label, value) => {
    text(hud, m.x + 24, y, label, T.body(hud, THEME.ink2)).setOrigin(0, 0.5).setDepth(603);
    text(hud, m.x + m.w - 24, y, value, T.bodyBold(hud)).setOrigin(1, 0.5).setDepth(603);
    y += 26 * ui;
  };
  line('Level', `${levelFromXp(p.xp)}  (${p.xp} XP)`);
  line('Coins', String(p.coins));
  line('Streak', streak > 1 ? `🔥 ${streak} days` : 'none yet');
  line('House stars', `⭐ ${stars} of ${MINIGAMES.length * 3}`);
  line('Bosses beaten', `${bosses} of ${BOSSES.length}`);
  line('Errands done', `${errandsDone(p)} of ${ERRANDS.length}`);
  line('Map explored', `${Math.round(exploredStats(ensureExplored(p)).share * 100)}%`);
  y += 4 * ui;
  text(hud, m.x + 24, y, badges.length ? 'BADGES' : 'No badges yet — play a game to earn your first!', T.caption(hud)).setOrigin(0, 0.5).setDepth(603); y += 22 * ui;
  badges.slice(0, 6).forEach((b) => { text(hud, m.x + 24, y, `🏅 ${b.title}${m.w > 380 ? ` — ${b.desc}` : ''}`, T.small(hud, THEME.ink2)).setOrigin(0, 0.5).setDepth(603); y += 24 * ui; });
  if (badges.length > 6) { text(hud, m.x + 24, y, `…and ${badges.length - 6} more`, T.small(hud, THEME.ink3)).setOrigin(0, 0.5).setDepth(603); }
  const bw = Math.min((m.w - 72) / 2, 180 * ui), bh = 46 * ui, by = m.y + m.h - 36 * ui;
  button(hud, w / 2 - bw / 2 - 8, by, bw, bh, 'Change my look', { variant: 'secondary', fontSize: 15, onClick: () => { hud.state.home = false; hud.scene.stop(SCENES.World); hud.scene.start(SCENES.Profile, { edit: p.id }); } }).setDepth(603);
  button(hud, w / 2 + bw / 2 + 8, by, bw, bh, 'Back outside', { variant: 'primary', fontSize: 15, onClick: () => hud.closeHome() }).setDepth(603);
}
