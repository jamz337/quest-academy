export const TILE = 32;

// PICO-8 inspired palette, kept as hex numbers for Phaser and strings for canvas.
export const C = {
  navy: 0x1d2b53, purple: 0x7e2553, green: 0x008751, brown: 0xab5236,
  dark: 0x5f574f, grey: 0xc2c3c7, white: 0xfff1e8, red: 0xff004d,
  orange: 0xffa300, yellow: 0xffec27, lime: 0x00e436, blue: 0x29adff,
  lavender: 0x83769c, pink: 0xff77a8, peach: 0xffccaa, black: 0x000000,
  panel: 0x2a3a6b, panelDark: 0x14203f
};
export const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export const SUBJECTS = {
  math: { id: 'math', title: 'Math', color: C.blue, zone: 'Math Meadow' },
  words: { id: 'words', title: 'English', color: C.lime, zone: 'Word Woods' },
  code: { id: 'code', title: 'Coding', color: C.orange, zone: 'Code Cove' }
};

export const GRADES = [2, 3, 4, 5, 6, 7, 8];
export const AVATAR_COUNT = 8;

export const SCENES = {
  Boot: 'Boot', Profile: 'Profile', ModeSelect: 'ModeSelect', World: 'World', Hud: 'Hud',
  ChallengeMenu: 'ChallengeMenu', LevelSelect: 'LevelSelect', Results: 'Results', Pause: 'Pause',
  Account: 'Account', Leaderboard: 'Leaderboard'
};

export const SAVE_KEY = 'qa.save';
export const SAVE_BACKUP_KEY = 'qa.save.bak';
export const SAVE_VERSION = 1;
