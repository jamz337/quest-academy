// Colour styles for the 8 player avatars and 10 villagers. Pure data, no Phaser: the parent dashboard
// draws the same faces from these values so it needs no game assets.
export const OUTLINE = '#2d2a4a';
export const MOUTH = '#e0567a';
export const BOOTS = '#3b2f2f';

export const CHARACTER_STYLES = [
  { hair: '#a8613a', skin: '#ffd6b3', top: '#3d8bff', legs: '#2d2a4a' },
  { hair: '#2d2a4a', skin: '#b8794a', top: '#ff6fae', legs: '#7c5cff' },
  { hair: '#ffc531', skin: '#ffd6b3', top: '#2ec46a', legs: '#229c53' },
  { hair: '#625f7e', skin: '#ffd6b3', top: '#ff8f3f', legs: '#625f7e' },
  { hair: '#ff5c6c', skin: '#ffd6b3', top: '#8b7fd6', legs: '#2d2a4a' },
  { hair: '#2d2a4a', skin: '#ffd6b3', top: '#ffc531', legs: '#3d8bff' },
  { hair: '#7c5cff', skin: '#b8794a', top: '#d6cfc4', legs: '#2d2a4a' },
  { hair: '#d6cfc4', skin: '#ffd6b3', top: '#ff5c6c', legs: '#2d2a4a' }
];

// Extra NPC looks so villagers do not all resemble the player avatars.
export const NPC_STYLES = [
  { hair: '#ffffff', skin: '#ffd6b3', top: '#7c5cff', legs: '#2d2a4a' },
  { hair: '#a8613a', skin: '#ffd6b3', top: '#ffffff', legs: '#ff5c6c' },
  { hair: '#2d2a4a', skin: '#b8794a', top: '#ffc531', legs: '#625f7e' },
  { hair: '#625f7e', skin: '#ffd6b3', top: '#229c53', legs: '#a8613a' },
  { hair: '#ff8f3f', skin: '#ffd6b3', top: '#3d8bff', legs: '#ffffff' },
  { hair: '#8b7fd6', skin: '#b8794a', top: '#ff6fae', legs: '#2d2a4a' },
  { hair: '#2ec46a', skin: '#ffd6b3', top: '#625f7e', legs: '#3d8bff' },
  { hair: '#d6cfc4', skin: '#ffd6b3', top: '#a8613a', legs: '#7c5cff' },
  { hair: '#ff5c6c', skin: '#b8794a', top: '#2ec46a', legs: '#2d2a4a' },
  { hair: '#ffc531', skin: '#ffd6b3', top: '#8b7fd6', legs: '#229c53' }
];
