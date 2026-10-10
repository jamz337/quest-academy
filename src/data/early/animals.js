// The ark's animals for the youngest players (Pre-K). Each has a picture (public/sprites/animals/<key>.png from
// Kenney's CC0 Animal Pack, the lion drawn in code to match), a recorded call (public/sounds/animals/<key>.mp3,
// from Pixabay) with a code-made stand-in (`sound`, see Audio.ANIMAL_SOUNDS), a noise word the voice can say, and
// what to tell about it. Quiet animals have a line about their quietness instead of a noise. Pure data, no Phaser.

export const ARK_ANIMALS = [
  { key: 'lion', name: 'lion', plural: 'lions', noise: 'Roar', sound: 'roar' },
  { key: 'elephant', name: 'elephant', plural: 'elephants', noise: 'Toot', sound: 'trumpet' },
  { key: 'giraffe', name: 'giraffe', plural: 'giraffes', noise: null, sound: 'hum', quiet: 'Giraffes are very quiet. They hum softly.' },
  { key: 'monkey', name: 'monkey', plural: 'monkeys', noise: 'Ooh ooh ah ah', sound: 'chatter' },
  { key: 'cow', name: 'cow', plural: 'cows', noise: 'Moo', sound: 'moo' },
  { key: 'zebra', name: 'zebra', plural: 'zebras', noise: 'Hee-haw', sound: 'neigh' },
  { key: 'owl', name: 'owl', plural: 'owls', noise: 'Hoot hoot', sound: 'hoot' },
  { key: 'penguin', name: 'penguin', plural: 'penguins', noise: 'Squawk', sound: 'squawk' },
  { key: 'pig', name: 'pig', plural: 'pigs', noise: 'Oink', sound: 'oink' },
  { key: 'dog', name: 'dog', plural: 'dogs', noise: 'Woof', sound: 'woof' },
  { key: 'duck', name: 'duck', plural: 'ducks', noise: 'Quack', sound: 'quack' },
  { key: 'frog', name: 'frog', plural: 'frogs', noise: 'Ribbit', sound: 'ribbit' },
  { key: 'horse', name: 'horse', plural: 'horses', noise: 'Neigh', sound: 'neigh' },
  { key: 'bear', name: 'bear', plural: 'bears', noise: 'Grrr', sound: 'growl' },
  { key: 'chicken', name: 'chicken', plural: 'chickens', noise: 'Cluck cluck', sound: 'cluck' },
  { key: 'goat', name: 'goat', plural: 'goats', noise: 'Maa', sound: 'baa' },
  { key: 'snake', name: 'snake', plural: 'snakes', noise: 'Hiss', sound: 'hiss' },
  { key: 'gorilla', name: 'gorilla', plural: 'gorillas', noise: 'Hoo hoo', sound: 'growl' },
  { key: 'hippo', name: 'hippo', plural: 'hippos', noise: 'Honk', sound: 'moo' },
  { key: 'crocodile', name: 'crocodile', plural: 'crocodiles', noise: 'Hisss', sound: 'hiss' },
  { key: 'parrot', name: 'parrot', plural: 'parrots', noise: 'Squawk', sound: 'squawk' },
  { key: 'rhino', name: 'rhino', plural: 'rhinos', noise: 'Snort', sound: 'thump' },
  { key: 'rabbit', name: 'rabbit', plural: 'rabbits', noise: null, sound: 'sniff', quiet: 'Rabbits are quiet. Their little noses twitch.' }
];
export const animalByKey = (key) => ARK_ANIMALS.find((a) => a.key === key) || null;

/** "a lion", "an owl". */
export const aAn = (name) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);
export const capital = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * `n` animals for one game, no two with the same noise word or the same stand-in sound (so "Which animal says
 * Neigh?" has one answer), the lion always among them.
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

/** The first thing Noah says when an animal is touched: its noise and its name. */
export const nameLine = (a) => (a.noise ? `${a.noise}! ${capital(aAn(a.name))}.` : `${capital(aAn(a.name))}. ${a.quiet}`);
/** ...and, once the pair has walked up, how many went in. */
export const twoLine = (a) => `Two ${a.plural} went into the ark, two by two.`;
/** Both together (the whole lesson about one animal). */
export const animalLine = (a) => `${nameLine(a)} ${twoLine(a)}`;

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
