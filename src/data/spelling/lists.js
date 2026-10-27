// Spelling lists by grade: the class words the children are learning. The game shows a word (with its
// syllables), reads it aloud with its sentence, hides it and asks for it back, and keeps score per word.
//
// Each entry is { w: 'co-co-nut', pic: '🥥', s: 'A sentence read aloud after the word.' }, optionally with its own
// memory trick { trick: '…', tricky: 'letters to watch' } (built-in ones live in tricks.js). Hyphens in `w` mark the
// syllable chunks and are stripped to get the word. A word that really contains a hyphen can give its
// chunks separately: { w: 'ice-cream', syl: 'ice-cream', s: '…' }. Plain strings ('co-co-nut') work too.
// Capital letters are kept ('Car-ib-be-an' is spelt with a capital C) and the child has to type them.
import { gradeOf } from '../grades.js';

export const SPELLING_LISTS = {
  // Kindergarten: sight words, then short words that sound out letter by letter.
  0: [
    { id: 'k-1', title: 'Sight words', words: [
      { w: 'the', pic: '🌞', s: 'The sun is hot.' },
      { w: 'I', pic: '🙋', s: 'I like to play.' },
      { w: 'a', pic: '🐱', s: 'I see a cat.' },
      { w: 'is', pic: '🐶', s: 'The dog is big.' },
      { w: 'can', pic: '🏃', s: 'I can run fast.' },
      { w: 'see', pic: '👀', s: 'I see a bird.' },
      { w: 'and', pic: '🍞', s: 'I like bread and jam.' },
      { w: 'my', pic: '🎒', s: 'This is my bag.' }
    ] },
    { id: 'k-2', title: 'Short words', words: [
      { w: 'cat', pic: '🐱', s: 'The cat is on the mat.' },
      { w: 'dog', pic: '🐶', s: 'My dog can run.' },
      { w: 'sun', pic: '☀️', s: 'The sun is up.' },
      { w: 'hat', pic: '👒', s: 'I have a red hat.' },
      { w: 'pig', pic: '🐷', s: 'The pig is pink.' },
      { w: 'bus', pic: '🚌', s: 'We go on the bus.' },
      { w: 'yam', pic: '🍠', s: 'Mum cooks a yam.' },
      { w: 'cup', pic: '🥤', s: 'I drink from a cup.' }
    ] }
  ],
  // Grade 1: short-vowel and blended words, vowel teams, and common words to know by sight.
  1: [
    { id: 'g1-1', title: 'Words 1–8', words: [
      { w: 'big', pic: '🐘', s: 'An elephant is big.' },
      { w: 'red', pic: '🟥', s: 'The apple is red.' },
      { w: 'run', pic: '🏃', s: 'I run to the beach.' },
      { w: 'jump', pic: '🦘', s: 'Frogs can jump high.' },
      { w: 'play', pic: '⚽', s: 'We play in the yard.' },
      { w: 'look', pic: '👀', s: 'Look at the boat.' },
      { w: 'said', pic: '💬', s: 'Mum said it is time to eat.' },
      { w: 'was', pic: '🕰️', s: 'It was a sunny day.' }
    ] },
    { id: 'g1-2', title: 'Words 9–16', words: [
      { w: 'boat', pic: '⛵', s: 'The boat is on the sea.' },
      { w: 'shell', pic: '🐚', s: 'I found a shell on the sand.' },
      { w: 'crab', pic: '🦀', s: 'A crab walks sideways.' },
      { w: 'rain', pic: '🌧️', s: 'The rain makes puddles.' },
      { w: 'tree', pic: '🌳', s: 'A bird sits in the tree.' },
      { w: 'they', pic: '👫', s: 'They go to school together.' },
      { w: 'come', pic: '👋', s: 'Come and see the fish.' },
      { w: 'have', pic: '🎁', s: 'I have a new book.' }
    ] }
  ],
  2: [
    { id: 'g2-1', title: 'Words 1–8', words: [
      { w: 'school', pic: '🏫', s: 'We walk to school in the morning.' },
      { w: 'teach-er', pic: '👩‍🏫', s: 'My teacher reads us a story every day.' },
      { w: 'learn', pic: '📖', s: 'I want to learn how to swim.' },
      { w: 'e-lev-en', pic: '🕚', s: 'There are eleven players on the team.' },
      { w: 'mat-ter', pic: '🤷', s: 'It does not matter who wins the game.' },
      { w: 'home', pic: '🏠', s: 'We go home after school.' },
      { w: 'fam-i-ly', pic: '👨‍👩‍👧‍👦', s: 'My family eats dinner together.' },
      { w: 'gen-der', pic: '👧👦', s: 'Children of any gender can join the club.' }
    ] }
  ],
  4: [
    { id: 'g4-1', title: 'Words 16–22', words: [
      { w: 'co-co-nut', pic: '🥥', s: 'A coconut fell from the tall palm tree.' },
      { w: 'trop-i-cal', pic: '🌴', s: 'Jamaica has a warm, tropical climate.' },
      { w: 'coun-tries', pic: '🌍', s: 'Ships from many countries come to our port.' },
      { w: 'sea-shore', pic: '🏖️', s: 'We picked up shells along the seashore.' },
      { w: 'cul-ti-va-ted', pic: '🚜', s: 'The farmers cultivated the land to grow yams.' },
      { w: 'plan-ta-tions', pic: '🌾', s: 'Sugar cane grows on large plantations.' },
      { w: 'Car-ib-be-an', pic: '🏝️', s: 'The Caribbean Sea is warm and blue.' }
    ] },
    { id: 'g4-2', title: 'Words 23–30', words: [
      { w: 'use-ful', pic: '🧰', s: 'A map is useful when you travel.' },
      { w: 're-fresh-ing', pic: '🥤', s: 'A cold drink is refreshing on a hot day.' },
      { w: 'in-dus-tries', pic: '🏭', s: 'Tourism and farming are important industries.' },
      { w: 'tour-ists', pic: '🧳', s: 'Tourists come to enjoy our beaches.' },
      { w: 'in-hab-i-tants', pic: '🏘️', s: 'The inhabitants of the village are friendly.' },
      { w: 'nu-tri-tious', pic: '🥗', s: 'Fruit and vegetables are nutritious foods.' },
      { w: 'ven-dors', pic: '🧺', s: 'The vendors sell mangoes at the market.' },
      { w: 'de-ter-gents', pic: '🧼', s: 'We use detergents to wash our clothes.' }
    ] },
    // The fish-farming list: everyday words first, then the words of the hatchery.
    { id: 'g4-3', title: 'Fish farm words 1–15', words: [
      { w: 'a-bout', pic: '📖', s: 'This story is about a fish farm.' },
      { w: 'be-come', pic: '🐟', s: 'The tiny fish will become big ones.' },
      { w: 'big-ger', pic: '📏', s: 'Every week the fish grow bigger.' },
      { w: 'bring', pic: '🪣', s: 'Please bring a bucket of water.' },
      { w: 'called', pic: '🏷️', s: 'Baby fish are called fry.' },
      { w: 'liv-ing', pic: '🌊', s: 'Fish are living things that need clean water.' },
      { w: 'moth-er', pic: '👩', s: 'The mother fish lays hundreds of eggs.' },
      { w: 'mon-ey', pic: '💵', s: 'The farmer earns money by selling fish.' },
      { w: 'peo-ple', pic: '🧑‍🤝‍🧑', s: 'Many people in Barbados eat fish.' },
      { w: 'start', pic: '🏁', s: 'We start the farm with a few fish.' },
      { w: 'through', pic: '🚪', s: 'Water flows through the pipe into the pond.' },
      { w: 'to-geth-er', pic: '🤝', s: 'The fish swim together in a shoal.' },
      { w: 'types', pic: '🐠', s: 'Tilapia and catfish are two types of farm fish.' },
      { w: 'which', pic: '❓', s: 'Which fish grows fastest?' },
      { w: 'where', pic: '📍', s: 'Where is the hatchery?' }
    ] },
    { id: 'g4-4', title: 'Fish farm words 16–30', words: [
      { w: 'ba-sic', pic: '🧱', s: 'A pond and clean water are the basic needs of a fish farm.' },
      { w: 'or-na-men-tal', pic: '🐡', s: 'Ornamental fish are kept for their beauty, not for food.' },
      { w: 'pop-u-lar', pic: '⭐', s: 'Tilapia is a popular fish to farm.' },
      { w: 'breed-ing', pic: '🥚', s: 'The breeding fish are kept in their own tank.' },
      { w: 'a-vail-a-ble', pic: '🛒', s: 'Fresh fish are available at the market on Fridays.' },
      { w: 'reared', pic: '🐣', s: 'The young fish are reared in warm, clean water.' },
      { w: 'spawn', pic: '🫧', s: 'Fish spawn when they lay their eggs.' },
      { w: 'hatch', pic: '🐥', s: 'The eggs hatch after a few days.' },
      { w: 'pur-chas-ing', pic: '🧾', s: 'Purchasing good feed keeps the fish healthy.' },
      { w: 'se-lect', pic: '✅', s: 'We select the strongest fish for breeding.' },
      { w: 'a-quar-i-um', pic: '🐠', s: 'The ornamental fish live in a glass aquarium.' },
      { w: 'hatch-er-y', pic: '🏭', s: 'A hatchery is where fish eggs are kept until they hatch.' },
      { w: 'pro-tein', pic: '🍽️', s: 'Fish is a good source of protein.' },
      { w: 'va-ri-e-ty', pic: '🌈', s: 'The farm keeps a variety of fish.' },
      { w: 'fin-ger-lings', pic: '🐟', s: 'Fingerlings are young fish about as long as a finger.' }
    ] },
    // The Rabbit story list: Rabbit and his friends share a basket of carrots. Rabbit is a name, so it keeps its capital.
    { id: 'g4-5', title: 'Rabbit story words 1–10', words: [
      { w: 'Rab-bit', pic: '🐰', s: 'Rabbit lives in a burrow under the old tree.' },
      { w: 'cleaned', pic: '🧹', s: 'Rabbit cleaned his burrow before his friends came.' },
      { w: 'an-i-mals', pic: '🦔', s: 'All the animals came to Rabbit\'s party.' },
      { w: 'hugged', pic: '🤗', s: 'Rabbit hugged each friend at the door.' },
      { w: 'health-y', pic: '🥕', s: 'Carrots are a healthy snack.' },
      { w: 'hap-py', pic: '😊', s: 'Everyone was happy to see the basket of carrots.' },
      { w: 'be-cause', pic: '❓', s: 'They cheered because the carrots were sweet.' },
      { w: 'big-gest', pic: '🥇', s: 'Hedgehog found the biggest carrot of all.' },
      { w: 'per-haps', pic: '🤔', s: 'Perhaps there are enough carrots for everyone.' },
      { w: 'share', pic: '🤝', s: 'Rabbit said, "Let us share the carrots."' }
    ] },
    { id: 'g4-6', title: 'Rabbit story words 11–20', words: [
      { w: 'e-qual-ly', pic: '⚖️', s: 'They shared the carrots equally, three each.' },
      { w: 'fin-ish', pic: '🏁', s: 'Tortoise was the last to finish his carrot.' },
      { w: 'no-ticed', pic: '👀', s: 'Rabbit noticed that Mouse had none left.' },
      { w: 'de-cid-ed', pic: '💡', s: 'Rabbit decided to give Mouse half of his.' },
      { w: 'a-mount', pic: '🔢', s: 'Now every friend had the same amount.' },
      { w: 'ex-plained', pic: '🗣️', s: 'Owl explained why sharing is kind.' },
      { w: 'nod-ded', pic: '👍', s: 'The animals nodded and smiled.' },
      { w: 'bowed', pic: '🙇', s: 'Rabbit bowed to thank his friends.' },
      { w: 'un-der-stood', pic: '💭', s: 'Everyone understood that sharing makes friends.' },
      { w: 'thin-ner', pic: '📏', s: 'The carrot was thinner at the end.' }
    ] }
  ]
};

/** The grades that have lists, lowest first. */
export const SPELLING_GRADES = Object.keys(SPELLING_LISTS).map(Number).sort((a, b) => a - b);

/** The list grade a player uses: their own grade if it has lists, else the nearest one below (or the lowest). */
export function spellingGradeFor(grade) {
  const g = gradeOf(grade, SPELLING_GRADES[0]);
  const below = SPELLING_GRADES.filter((x) => x <= g);
  return below.length ? below[below.length - 1] : SPELLING_GRADES[0];
}

export const listsForGrade = (grade) => SPELLING_LISTS[spellingGradeFor(grade)] || [];
export const getList = (id) => Object.values(SPELLING_LISTS).flat().find((l) => l.id === id) || null;

/** Normalised entries of a list: [{ w (the word, capitals kept), syl (chunks, 'co-co-nut'), s (sentence or null), pic (emoji or null) }]. */
export function listWords(list) {
  return (list ? list.words : []).map((x) => {
    const raw = typeof x === 'string' ? x : String(x.w);
    const marked = raw.trim();
    const syl = typeof x === 'object' && x.syl ? String(x.syl).trim() : marked;
    const w = typeof x === 'object' && x.syl ? marked : marked.replace(/-/g, '');
    const out = { w, syl, s: (typeof x === 'object' && x.s) || null, pic: (typeof x === 'object' && x.pic) || null };
    if (typeof x === 'object' && x.trick) out.trick = x.trick;   // a list's own memory trick (see tricks.js)
    if (typeof x === 'object' && x.tricky) out.tricky = x.tricky;
    return out;
  });
}
