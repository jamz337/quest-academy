// The ark's animals for the youngest players (Pre-K): each has a picture, a name, the noise it makes (a word the
// voice can say, and a sound the speaker can play, see Audio.ANIMAL_SOUNDS) and what to tell about it. Quiet
// animals have a line about their quietness instead of a noise. Pure data and text, no Phaser.

export const ARK_ANIMALS = [
  { pic: '🦁', name: 'lion', plural: 'lions', noise: 'Roar', sound: 'roar' },
  { pic: '🐘', name: 'elephant', plural: 'elephants', noise: 'Toot', sound: 'trumpet' },
  { pic: '🦒', name: 'giraffe', plural: 'giraffes', noise: null, sound: 'hum', quiet: 'Giraffes are very quiet. They hum softly.' },
  { pic: '🐒', name: 'monkey', plural: 'monkeys', noise: 'Ooh ooh ah ah', sound: 'chatter' },
  { pic: '🐑', name: 'sheep', plural: 'sheep', noise: 'Baa', sound: 'baa' },
  { pic: '🐄', name: 'cow', plural: 'cows', noise: 'Moo', sound: 'moo' },
  { pic: '🦓', name: 'zebra', plural: 'zebras', noise: 'Neigh', sound: 'neigh' },
  { pic: '🐰', name: 'rabbit', plural: 'rabbits', noise: null, sound: 'sniff', quiet: 'Rabbits are quiet. Their little noses twitch.' },
  { pic: '🦉', name: 'owl', plural: 'owls', noise: 'Hoot hoot', sound: 'hoot' },
  { pic: '🐢', name: 'turtle', plural: 'turtles', noise: null, sound: 'tick', quiet: 'Turtles are quiet, slow and steady.' },
  { pic: '🐧', name: 'penguin', plural: 'penguins', noise: 'Squawk', sound: 'squawk' },
  { pic: '🦘', name: 'kangaroo', plural: 'kangaroos', noise: 'Thump thump', sound: 'thump' },
  { pic: '🐷', name: 'pig', plural: 'pigs', noise: 'Oink', sound: 'oink' },
  { pic: '🦊', name: 'fox', plural: 'foxes', noise: 'Yip', sound: 'yip' },
  { pic: '🐶', name: 'dog', plural: 'dogs', noise: 'Woof', sound: 'woof' },
  { pic: '🐱', name: 'cat', plural: 'cats', noise: 'Meow', sound: 'meow' },
  { pic: '🦆', name: 'duck', plural: 'ducks', noise: 'Quack', sound: 'quack' },
  { pic: '🐸', name: 'frog', plural: 'frogs', noise: 'Ribbit', sound: 'ribbit' },
  { pic: '🐴', name: 'horse', plural: 'horses', noise: 'Neigh', sound: 'neigh' },
  { pic: '🐻', name: 'bear', plural: 'bears', noise: 'Grrr', sound: 'growl' },
  { pic: '🐔', name: 'chicken', plural: 'chickens', noise: 'Cluck cluck', sound: 'cluck' },
  { pic: '🐐', name: 'goat', plural: 'goats', noise: 'Maa', sound: 'baa' },
  { pic: '🐍', name: 'snake', plural: 'snakes', noise: 'Hiss', sound: 'hiss' },
  { pic: '🐯', name: 'tiger', plural: 'tigers', noise: 'Roar', sound: 'roar' }
];

/** "a lion", "an owl". */
export const aAn = (name) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);
export const capital = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * `n` animals for one game, no two with the same noise word or the same sound (so "Which animal says Neigh?" has one
 * answer), the lion always among them.
 */
export function pickAnimals(rng, n = 8) {
  const out = [ARK_ANIMALS[0]];
  for (const a of rng.shuffle(ARK_ANIMALS.slice(1))) {
    if (out.length >= n) break;
    if (out.some((b) => (a.noise && b.noise === a.noise) || b.sound === a.sound)) continue;
    out.push(a);
  }
  return rng.shuffle(out);
}

/** What the voice says when an animal is touched. */
export function animalLine(a) {
  const two = `Two ${a.plural} went into the ark, two by two.`;
  return a.noise ? `${a.noise}! ${capital(aAn(a.name))}. ${two}` : `${capital(aAn(a.name))}. ${a.quiet} ${two}`;
}

/**
 * The gentle asks after every animal is aboard: `n` different animals, turn and turn about "find the lion" and
 * "which animal says Moo" (an animal with no noise is always asked for by name).
 */
export function makeAsks(animals, rng, n = 4) {
  return rng.shuffle(animals).slice(0, n).map((animal, i) => ({ animal, kind: i % 2 === 1 && animal.noise ? 'noise' : 'find' }));
}

export const askLine = (ask) => (ask.kind === 'noise' ? `Which animal says ${ask.animal.noise}?` : `Can you find the ${ask.animal.name}?`);

/** The right animal was touched. */
export const foundLine = (a) => `Yes! The ${a.name}. ${a.noise ? a.noise + '!' : a.quiet}`;

/** A different animal was touched: it is named (never "wrong"), and the ask is repeated. */
export const otherLine = (a, ask) => `That is the ${a.name}. ${a.noise ? a.noise + '! ' : ''}${askLine(ask)}`;
