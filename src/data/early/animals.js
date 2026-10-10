// The ark's animals for the youngest players (Pre-K). Each has a recorded call (public/sounds/animals/<key>.mp3,
// from Pixabay) with a code-made stand-in (`sound`, see Audio.ANIMAL_SOUNDS), a noise word the voice can say, what
// to tell about it, and whether it is a clean animal: Genesis 7:2-3 has seven pairs of every clean animal and bird
// going in, and one pair of the others. Animals with `pic` have a picture (public/sprites/ark/animals/<key>.png,
// cut from the approved mock-up) and are the ones a game can use; the rest wait for their pictures. Pure data.

export const GENESIS_REF = 'Genesis 7:2-3';
export const GENESIS_LESSON = 'Clean animals went in by sevens, the others two by two.';
/** Pairs of an animal that boarded: seven for the clean ones, one for the rest. */
export const pairsOf = (a) => (a.clean ? 7 : 1);

export const ARK_ANIMALS = [
  { key: 'lion', name: 'lion', plural: 'lions', noise: 'Roar', sound: 'roar', clean: false, pic: true },
  { key: 'parrot', name: 'parrot', plural: 'parrots', noise: 'Squawk', sound: 'squawk', clean: true, pic: true },
  { key: 'bear', name: 'bear', plural: 'bears', noise: 'Grrr', sound: 'growl', clean: false, pic: true },
  { key: 'frog', name: 'frog', plural: 'frogs', noise: 'Ribbit', sound: 'ribbit', clean: false, pic: true },
  { key: 'duck', name: 'duck', plural: 'ducks', noise: 'Quack', sound: 'quack', clean: true, pic: true },
  { key: 'rhino', name: 'rhino', plural: 'rhinos', noise: 'Snort', sound: 'thump', clean: false, pic: true },
  { key: 'giraffe', name: 'giraffe', plural: 'giraffes', noise: null, sound: 'hum', clean: true, pic: true, quiet: 'Giraffes are very quiet. They hum softly.' },
  { key: 'snake', name: 'snake', plural: 'snakes', noise: 'Hiss', sound: 'hiss', clean: false, pic: true },
  { key: 'elephant', name: 'elephant', plural: 'elephants', noise: 'Toot', sound: 'trumpet', clean: false },
  { key: 'monkey', name: 'monkey', plural: 'monkeys', noise: 'Ooh ooh ah ah', sound: 'chatter', clean: false },
  { key: 'cow', name: 'cow', plural: 'cows', noise: 'Moo', sound: 'moo', clean: true },
  { key: 'zebra', name: 'zebra', plural: 'zebras', noise: 'Hee-haw', sound: 'neigh', clean: false },
  { key: 'owl', name: 'owl', plural: 'owls', noise: 'Hoot hoot', sound: 'hoot', clean: false },
  { key: 'penguin', name: 'penguin', plural: 'penguins', noise: 'Squawk', sound: 'squawk', clean: true },
  { key: 'pig', name: 'pig', plural: 'pigs', noise: 'Oink', sound: 'oink', clean: false },
  { key: 'dog', name: 'dog', plural: 'dogs', noise: 'Woof', sound: 'woof', clean: false },
  { key: 'horse', name: 'horse', plural: 'horses', noise: 'Neigh', sound: 'neigh', clean: false },
  { key: 'chicken', name: 'chicken', plural: 'chickens', noise: 'Cluck cluck', sound: 'cluck', clean: true },
  { key: 'goat', name: 'goat', plural: 'goats', noise: 'Maa', sound: 'baa', clean: true },
  { key: 'gorilla', name: 'gorilla', plural: 'gorillas', noise: 'Hoo hoo', sound: 'growl', clean: false },
  { key: 'hippo', name: 'hippo', plural: 'hippos', noise: 'Honk', sound: 'moo', clean: false },
  { key: 'crocodile', name: 'crocodile', plural: 'crocodiles', noise: 'Hisss', sound: 'hiss', clean: false },
  { key: 'rabbit', name: 'rabbit', plural: 'rabbits', noise: null, sound: 'sniff', clean: false, quiet: 'Rabbits are quiet. Their little noses twitch.' }
];
export const ARK_PICTURED = ARK_ANIMALS.filter((a) => a.pic);
export const animalByKey = (key) => ARK_ANIMALS.find((a) => a.key === key) || null;

/** "a lion", "an owl". */
export const aAn = (name) => (/^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`);
export const capital = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * `n` pictured animals for one game, no two with the same noise word or the same stand-in sound (so "Which animal
 * says Neigh?" has one answer), the lion always among them.
 */
export function pickAnimals(rng, n = 8) {
  const pool = ARK_PICTURED;
  const out = [pool[0]];
  for (const a of rng.shuffle(pool.slice(1))) {
    if (out.length >= n) break;
    if (out.some((b) => (a.noise && b.noise === a.noise) || b.sound === a.sound)) continue;
    out.push(a);
  }
  return rng.shuffle(out);
}

/** The first thing Noah says when an animal is touched: its noise and its name. */
export const nameLine = (a) => (a.noise ? `${a.noise}! ${capital(aAn(a.name))}.` : `${capital(aAn(a.name))}. ${a.quiet}`);
/** ...and, once they have walked up, how many went in (Genesis 7:2-3). */
export const twoLine = (a) => (a.clean ? `Fourteen ${a.plural} went into the ark: seven pairs!` : `Two ${a.plural} went into the ark: one pair.`);
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
