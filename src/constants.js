import { THEME, hex } from './ui/theme.js';

export const TILE = 32;
export { hex };

// PICO-8 inspired palette for the pixel-art world only (Textures.js, WorldScene). UI code uses THEME from ui/theme.js.
export const C = {
  navy: 0x1d2b53, purple: 0x7e2553, green: 0x008751, brown: 0xab5236,
  dark: 0x5f574f, grey: 0xc2c3c7, white: 0xfff1e8, red: 0xff004d,
  orange: 0xffa300, yellow: 0xffec27, lime: 0x00e436, blue: 0x29adff,
  lavender: 0x83769c, pink: 0xff77a8, peach: 0xffccaa, black: 0x000000,
  panel: 0x2a3a6b, panelDark: 0x14203f
};

export const SUBJECTS = {
  math: { id: 'math', title: 'Math', ...THEME.subjects.math, color: THEME.subjects.math.accent, zone: 'Math Meadow' },
  words: { id: 'words', title: 'English', ...THEME.subjects.words, color: THEME.subjects.words.accent, zone: 'Word Woods' },
  code: { id: 'code', title: 'Coding', ...THEME.subjects.code, color: THEME.subjects.code.accent, zone: 'Code Cove' },
  bible: { id: 'bible', title: 'Bible', ...THEME.subjects.bible, color: THEME.subjects.bible.accent, zone: 'Bible Village' }
};

export const GRADES = [2, 3, 4, 5, 6, 7, 8];
export const AVATAR_COUNT = 8;

export const SCENES = {
  Boot: 'Boot', Profile: 'Profile', ModeSelect: 'ModeSelect', World: 'World', Hud: 'Hud',
  ChallengeMenu: 'ChallengeMenu', LevelSelect: 'LevelSelect', Results: 'Results', Pause: 'Pause',
  Account: 'Account', Leaderboard: 'Leaderboard', Skills: 'Skills', Spelling: 'Spelling', SpellingLearn: 'SpellingLearn', SpellingGame: 'SpellingGame'
};

export const SAVE_KEY = 'qa.save';
export const SAVE_BACKUP_KEY = 'qa.save.bak';
export const SAVE_VERSION = 1;
