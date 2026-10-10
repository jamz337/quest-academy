// Why an answer is what it is, in short child-sized steps. Generators keep their prompts; this module reads
// them back (arithmetic prompts are regular) or falls back to a per-skill explanation. Every explanation is
// a list of steps (one short sentence each) so the worked-example card can show them one per line; the
// one-string forms join the steps for places with less room.
import { skillLabel } from './skills.js';

const n = (s) => Number(String(s).replace(/[()]/g, ''));
const fmt = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));
const neg = (v) => (v < 0 ? `(${fmt(v)})` : fmt(v));
const list = (arr) => arr.map(fmt).join(', ');
/** Counting on or back from `from` by 1 for `count` steps, at most `max` numbers shown. */
const countList = (from, count, dir, max = 10) => { const out = []; for (let i = 1; i <= Math.min(count, max); i++) out.push(from + dir * i); return out.join(', ') + (count > max ? '…' : ''); };
/** Split a number into its big part (hundreds or tens) and the rest, for adding or taking away in two goes. */
function chunk(y) {
  if (y >= 100) return [y - (y % 100), y % 100];
  if (y >= 10) return [y - (y % 10), y % 10];
  return [y, 0];
}

/** Arithmetic steps: parse the prompt ("12 × 3", "x + 4 = 9\nx = ?", "25% of 80" …). Null when it is not one we know. */
export function mathSteps(prompt, answer) {
  const p = String(prompt || '').replace(/\s+/g, ' ').trim();
  const a = String(answer);
  let m;
  const N = '(\\(?-?[\\d.]+\\)?)';   // an operand: 12, 3.5, -4 or (-4)
  const re = (s) => new RegExp('^' + s.replace(/N/g, N) + '$');
  if ((m = p.match(re('N \\+ N × N')))) {
    const [x, y, z] = [n(m[1]), n(m[2]), n(m[3])];
    return [`Do the times first: ${y} × ${z} = ${y * z}.`, `Then add: ${x} + ${y * z} = ${a}.`, `So ${x} + ${y} × ${z} = ${a}.`];
  }
  if ((m = p.match(re('N \\+ N')))) {
    const [x, y] = [n(m[1]), n(m[2])];
    if (y < 0) return ['Adding a minus number means taking away.', `${neg(x)} + ${neg(y)} is the same as ${neg(x)} − ${fmt(-y)}.`, `So the answer is ${a}.`];
    if (x < 0) return [`Start at ${neg(x)} on the number line.`, `Move ${fmt(y)} to the right.`, `You land on ${a}.`];
    if (!Number.isInteger(x) || !Number.isInteger(y)) return ['Line up the decimal points.', `Add like whole numbers: ${fmt(x)} + ${fmt(y)} = ${a}.`, 'Keep the point in the same place.'];
    if (x + y <= 20) return [`Start at ${x}.`, `Count on ${y} more: ${countList(x, y, 1)}.`, `So ${x} + ${y} = ${a}.`];
    if (y < 10) {
      // Adding ones: just the ones change, or fill up to the next ten and add what is left.
      const xo = x % 10, up = 10 - xo;
      if (xo + y < 10) return [`Add the ones: ${xo} + ${y} = ${xo + y}.`, `The tens stay the same, so ${x - xo} + ${xo + y} = ${a}.`, `So ${x} + ${y} = ${a}.`];
      const fill = `Make the next ten: ${x} + ${up} = ${x + up}.`;
      return y === up ? [fill, `So ${x} + ${y} = ${a}.`] : [fill, `Add the other ${y - up}: ${x + up} + ${y - up} = ${a}.`, `So ${x} + ${y} = ${a}.`];
    }
    if (y % 10 === 0 && y < 100) return [`Count on in tens: ${countList(x, y / 10, 10)}.`, `So ${x} + ${y} = ${a}.`];
    const [big, rest] = chunk(y);
    if (rest === 0) return [`Add ${big} in one go: ${x} + ${big} = ${a}.`, `So ${x} + ${y} = ${a}.`];
    return [`Add ${big} first: ${x} + ${big} = ${x + big}.`, `Now add ${rest}: ${x + big} + ${rest} = ${a}.`, `So ${x} + ${y} = ${a}.`];
  }
  if ((m = p.match(re('N − N')))) {
    const [x, y] = [n(m[1]), n(m[2])];
    if (y < 0) return ['Taking away a minus number means adding.', `${neg(x)} − ${neg(y)} is the same as ${neg(x)} + ${fmt(-y)}.`, `So the answer is ${a}.`];
    if (x < 0) return [`Start at ${neg(x)} on the number line.`, `Move ${fmt(y)} to the left.`, `You land on ${a}.`];
    if (!Number.isInteger(x) || !Number.isInteger(y)) return ['Line up the decimal points.', `Take away like whole numbers: ${fmt(x)} − ${fmt(y)} = ${a}.`, 'Keep the point in the same place.'];
    if (x <= 20) return [`Start at ${x}.`, `Count back ${y}: ${countList(x, y, -1)}.`, `So ${x} − ${y} = ${a}.`, `Check it: ${a} + ${y} = ${x}.`];
    const check = [`So ${x} − ${y} = ${a}.`, `Check it: ${a} + ${y} = ${x}.`];
    if (y < 10) {
      // Taking away ones: just the ones change, or go back to the ten first and take away what is left.
      const xo = x % 10;
      if (xo >= y) return [`Take away the ones: ${xo} − ${y} = ${xo - y}.`, xo === y ? `No ones are left, just the tens: ${a}.` : `The tens stay the same, so ${x - xo} + ${xo - y} = ${a}.`, ...check];
      if (xo === 0) return [`Start at ${x}.`, `Count back ${y}: ${countList(x, y, -1)}.`, ...check];
      return [`Go back to the ten: ${x} − ${xo} = ${x - xo}.`, `Take away the other ${y - xo}: ${x - xo} − ${y - xo} = ${a}.`, ...check];
    }
    if (y % 10 === 0 && y < 100) return [`Count back in tens: ${countList(x, y / 10, -10)}.`, ...check];
    const [big, rest] = chunk(y);
    const steps = rest === 0
      ? [`Take away ${big}: ${x} − ${big} = ${a}.`]
      : [`Take away ${big} first: ${x} − ${big} = ${x - big}.`, `Now take away ${rest}: ${x - big} − ${rest} = ${a}.`];
    return [...steps, `So ${x} − ${y} = ${a}.`, `Check it: ${a} + ${y} = ${x}.`];
  }
  if ((m = p.match(re('N × N')))) {
    const [x, y] = [n(m[1]), n(m[2])];
    if (x < 0 || y < 0) {
      const same = (x < 0) === (y < 0);
      return [same ? 'Both signs are the same, so the answer is plus.' : 'The signs are different, so the answer is minus.', `${fmt(Math.abs(x))} × ${fmt(Math.abs(y))} = ${fmt(Math.abs(x * y))}.`, `So ${neg(x)} × ${neg(y)} = ${a}.`];
    }
    const groups = Math.min(Math.abs(y), 10);
    const shown = Array.from({ length: groups }, (_, i) => x * (i + 1));
    return [`${x} × ${y} means ${y} group${y === 1 ? '' : 's'} of ${x}.`, `Count in ${x}s: ${list(shown)}${Math.abs(y) > 10 ? '…' : ''}.`, `So ${x} × ${y} = ${a}.`];
  }
  if ((m = p.match(/^(\d+) ÷ (\d+)$/))) {
    const [x, y] = [n(m[1]), n(m[2])];
    const jumps = Math.min(Math.round(x / y), 10);
    const shown = Array.from({ length: jumps }, (_, i) => y * (i + 1));
    return [`${x} ÷ ${y} asks: how many ${y}s make ${x}?`, `Count in ${y}s: ${list(shown)}${x / y > 10 ? '…' : ''}.`, `That is ${a} jumps, and ${y} × ${a} = ${x}.`, `So ${x} ÷ ${y} = ${a}.`];
  }
  if ((m = p.match(/^(\d+)% of (\d+)$/))) {
    const [pc, base] = [n(m[1]), n(m[2])];
    if (pc === 50) return ['50% means a half.', `Half of ${base} is ${base} ÷ 2 = ${a}.`];
    if (pc === 25) return ['25% means a quarter.', `A quarter of ${base} is ${base} ÷ 4 = ${a}.`];
    if (pc === 75) return ['75% means three quarters.', `A quarter of ${base} is ${fmt(base / 4)}.`, `Three of those: 3 × ${fmt(base / 4)} = ${a}.`];
    if (pc % 10 === 0) return [`10% of ${base} is ${fmt(base / 10)}.`, `${pc}% is ${pc / 10} lots of 10%: ${pc / 10} × ${fmt(base / 10)} = ${a}.`];
    return [`1% of ${base} is ${fmt(base / 100)}.`, `${pc}% is ${pc} lots of 1%: ${pc} × ${fmt(base / 100)} = ${a}.`];
  }
  if ((m = p.match(/^x \+ (\d+) = (\d+) x = \?$/))) return [`x + ${m[1]} = ${m[2]} asks: what plus ${m[1]} makes ${m[2]}?`, `Take ${m[1]} away from ${m[2]}: ${m[2]} − ${m[1]} = ${a}.`, `So x = ${a}.`];
  if ((m = p.match(/^(\d+)x = (\d+) x = \?$/))) return [`${m[1]}x = ${m[2]} means ${m[1]} lots of x make ${m[2]}.`, `Share ${m[2]} into ${m[1]}: ${m[2]} ÷ ${m[1]} = ${a}.`, `So x = ${a}.`];
  if ((m = p.match(/^(\d+)²$/))) return [`${m[1]}² means ${m[1]} × ${m[1]}.`, `${m[1]} × ${m[1]} = ${a}.`, `So ${m[1]}² = ${a}.`];
  return null;
}

/** Arithmetic working as one string (the steps joined), or null. */
export function mathExplanation(prompt, answer) { const s = mathSteps(prompt, answer); return s ? s.join(' ') : null; }

/** Number pattern steps: from the round's terms, step and rule. */
export function patternSteps(r) {
  if (!r || !r.terms) return null;
  const shown = r.terms.map((t, j) => (j === r.missingIndex ? '?' : t)).join(', ');
  const look = `Look at the numbers: ${shown}.`;
  if (r.rule) return [look, `The rule is: ${r.rule.replace('Find term 5', '').trim()}`, `Put n = ${r.missingIndex + 1} into the rule.`, `You get ${r.answer}.`];
  const step = r.terms[1] - r.terms[0];
  const before = r.missingIndex > 0 ? r.terms[r.missingIndex - 1] : null;
  if (r.skill === 'doubling') return [look, 'Each number is double the one before.', before !== null ? `${before} × 2 = ${r.answer}, so the missing one is ${r.answer}.` : `So the missing one is ${r.answer}.`];
  if (r.skill === 'geometric') { const k = r.terms[1] / r.terms[0]; return [look, `Each number is ${k} times the one before.`, before !== null ? `${before} × ${k} = ${r.answer}, so the missing one is ${r.answer}.` : `So the missing one is ${r.answer}.`]; }
  if (r.skill === 'squares') return [look, 'These are square numbers: 1×1, 2×2, 3×3 and so on.', `${r.missingIndex + 1} × ${r.missingIndex + 1} = ${r.answer}, so the missing one is ${r.answer}.`];
  if (r.skill === 'sequence' && r.terms.length > 2 && r.terms[2] - r.terms[1] !== step) return [look, 'The pattern goes up and down by turns.', `So the missing one is ${r.answer}.`];
  const dir = step >= 0 ? 'up' : 'down';
  return [look, `Each number goes ${dir} by ${Math.abs(step)}.`, before !== null ? `${before} ${step >= 0 ? '+' : '−'} ${Math.abs(step)} = ${r.answer}, so the missing one is ${r.answer}.` : `So the missing one is ${r.answer}.`];
}

/** Number pattern working as one string, or null. */
export function patternExplanation(r) { const s = patternSteps(r); return s ? s.join(' ') : null; }

// Per-skill explanations for banks that have no working to show, as steps. {a} is the correct answer.
const BY_SKILL = {
  verb: ['One person or thing gets an -s: she runs.', 'More than one gets no -s: they run.', 'Here it is "{a}".'],
  article: ['Use "an" before a vowel sound: an apple.', 'Use "a" before other sounds: a bike.', 'Here it is "{a}".'],
  pronoun: ['A pronoun stands in for a name.', 'Use I, he, she or they for the one doing it.', 'Use me, him, her or them for the one it happens to.', 'Here it is "{a}".'],
  homophone: ['These words sound the same but mean different things.', 'Think about what the sentence means.', 'Here it is "{a}".'],
  tense: ['Past tense tells what already happened: walked.', 'Present tense tells what happens now: walks.', 'Here it is "{a}".'],
  adjective: ['An adjective describes a thing: a red hat.', 'Here it is "{a}".'],
  adverb: ['An adverb tells how something is done.', 'It often ends in -ly: walked slowly.', 'Here it is "{a}".'],
  agreement: ['One thing goes with a "one" verb: the dog barks.', 'Many things go with a "many" verb: the dogs bark.', 'Here it is "{a}".'],
  vocab: ['Read the whole sentence.', 'Pick the word that makes it make sense.', 'Here it is "{a}".'],
  punctuation: ['A question ends with a ?', 'A big feeling ends with a !', 'Most sentences end with a full stop.', 'Here it is "{a}".'],
  plural: ['Most plurals add -s or -es: cats, boxes.', 'Some change: child becomes children.', 'Here it is "{a}".'],
  spelling: ['Say the word slowly.', 'Listen for each sound.', 'It is spelt "{a}".'],
  synonym: ['Synonyms mean the same thing.', 'The pair here is "{a}".'],
  antonym: ['Antonyms are opposites.', 'The pair here is "{a}".'],
  definition: ['Match the word to what it means.', 'Here it is "{a}".'],
  fractions: ['The bottom number says how many equal slices.', 'The top number says how many to take.', 'The answer is {a}.'],
  equivalent: ['Times or divide the top and bottom by the same number.', 'The fraction stays the same size.', 'The answer is {a}.'],
  compare: ['Same bottom number? The bigger top wins.', 'Different bottoms? Make them the same first.', 'The answer is {a}.'],
  'fraction-add': ['Make the bottom numbers the same.', 'Then add the tops.', 'The answer is {a}.'],
  convert: ['Divide the top by the bottom to get a decimal.', 'Times by 100 for a percent.', 'The answer is {a}.'],
  sequence_code: ['Read the program one block at a time.', 'Act out each move.', 'The answer is {a}.'],
  repeat: ['A Repeat block runs its inside that many times.', 'Count the moves inside, then times by the repeats.', 'The answer is {a}.'],
  conditional: ['An If block only runs when its check is true.', 'The answer is {a}.'],
  people: ['Remember who did what.', 'The answer is {a}.'],
  stories: ['Think back to the story.', 'The answer is {a}.'],
  places: ['Picture where the story happens.', 'The answer is {a}.'],
  books: ['Remember the order and names of the books.', 'The answer is {a}.'],
  verses: ['Say the verse out loud a few times.', 'The missing word will stick.', 'The word is "{a}".']
};

/** Steps for any question: { prompt, answer, skill, terms?, ref?, explain? }. Never empty. */
export function explainSteps(q, subject = null) {
  if (!q) return [];
  if (q.explain) return Array.isArray(q.explain) ? q.explain : [String(q.explain)];
  if (q.terms) return patternSteps(q) || [];
  const math = (subject === 'math' || /[+−×÷²%]|x = \?/.test(q.prompt || '')) ? mathSteps(q.prompt, q.answer) : null;
  if (math) return math;
  const base = BY_SKILL[q.skill];
  const out = base ? base.map((s) => s.replace('{a}', String(q.answer))) : [`The answer is ${q.answer}.`];
  if (q.ref) out.push(`\u{1F4D6} ${q.ref}`);
  return out;
}

/** Explanation for any question as one string. Never empty. */
export function explainQuestion(q, subject = null) { return explainSteps(q, subject).join(' '); }

/** What a parent can do at home about a weak skill. */
export const SKILL_TIPS = {
  add: 'Add up the shopping or the dice at board games.', sub: 'Ask "how many more?" when sharing snacks.', mult: 'Skip-count out loud in the car: 3, 6, 9, 12…',
  div: 'Share sweets equally between family members and count the groups.', decimal: 'Read prices and add two items together.', integers: 'Talk about temperatures below zero.',
  'order-of-operations': 'Say the rule together: multiply before you add.', percent: 'Find 10% of the bill first, then work up.', equations: 'Play "I am thinking of a number".',
  squares: 'Build squares with blocks: 2×2, 3×3, 4×4.', fractions: 'Cut a pizza or a sandwich and name the parts.', equivalent: 'Show that half a pizza is the same as two quarters.',
  compare: 'Ask which is more: a third or a quarter of a cake?', 'fraction-add': 'Add slices of the same pizza together.', convert: 'Turn coins into decimals of a dollar or pound.',
  'skip-count': 'Count in twos, fives and tens while climbing stairs.', doubling: 'Double the numbers on a car’s number plate.', sequence: 'Spot patterns in house numbers.',
  geometric: 'Fold paper in half again and again and count the layers.', rule: 'Make a number machine: "put a number in, I add 3".',
  spelling: 'Play hangman or a word game at bedtime.', verb: 'Catch each other saying "he run" instead of "he runs".', article: 'Point at things: "an apple, a banana".',
  pronoun: 'Retell a story swapping names for he, she and they.', homophone: 'Hunt for their/there/they’re in a book.', tense: 'Tell what you did today, then what you will do tomorrow.',
  adjective: 'Describe a pet with five words.', adverb: 'Act out walking quickly, slowly, quietly.', agreement: 'Read sentences aloud and listen for what sounds right.',
  vocab: 'Read together and talk about new words.', punctuation: 'Read aloud with big pauses at full stops and rising voices at questions.', plural: 'Count things: one child, two children.',
  synonym: 'Play "say it another way".', antonym: 'Play the opposites game: hot… cold!', definition: 'Guess a word from its meaning.',
  sequence_code: 'Give each other step-by-step directions to the kitchen.', repeat: 'Say "clap three times" and count the claps.', conditional: 'Play "if it is raining, take an umbrella".',
  people: 'Tell a Bible story at bedtime and ask who was in it.', stories: 'Read one story a night and retell it in the morning.', places: 'Find the places on a Bible map.',
  books: 'Sing a books-of-the-Bible song.', verses: 'Put the verse on the fridge and say it at breakfast.',
  habitats: 'Watch a nature programme and ask where each animal lives.', adaptations: 'Spot one thing about a pet or bird that helps it live where it does.',
  'food-chains': 'Ask what a cat eats, then what that eats, back to a plant.', 'ecology-words': 'Use the words on a walk: habitat, predator, camouflage.', biomes: 'Find a desert, a rainforest and the poles on a globe.',
  'plant-needs': 'Grow a bean in a jar on the windowsill and give it water.', 'plant-parts': 'Pull up a weed and name its roots, stem, leaves and flower.', 'life-cycle': 'Cut open a fruit and find the seeds.',
  'seed-travel': 'Blow a dandelion clock and watch the seeds fly.', 'plant-science': 'Put a leaf in sunlight and a leaf in a cupboard for a week and compare.',
  'sink-float': 'Fill the sink and test ten things from the kitchen.', density: 'Float an egg in salty water and in plain water.',
  states: 'Find a solid, a liquid and a gas in the kitchen.', 'changes-of-state': 'Watch an ice cube melt and a kettle steam.', 'matter-facts': 'Measure the temperature of ice water and boiling water together.',
  directions: 'Find where the sun rises from your window, then point north, south, east and west.', 'map-reading': 'Draw a map of your street with north at the top.',
  'compass-degrees': 'Open a phone compass and call out the bearing of the front door.', 'geography-lines': 'Find the equator and the poles on a globe.',
  helpers: 'On a walk, spot the helpers: the bus driver, the postal worker, the police officer.', 'helper-tools': 'Play "whose tool is this?" with a spoon, a stethoscope and a hammer.',
  community: 'Talk about what the town pays for together: roads, schools, the fire service.', flags: 'Spot flags on buildings and cars and name the countries.',
  capitals: 'Pick a country at dinner and find its capital on a map.', continents: 'Name the seven continents with a song or a globe.', 'world-geography': 'Trace the Nile and the Amazon on a map.',
  'then-now': 'Ask a grandparent what they used before phones and fridges.', timeline: 'Make a timeline of the family: who was born when.',
  'history-words': 'Visit the museum and find an artefact.', 'history-facts': 'Read about Independence Day and Bussa together.'
};

export const skillTip = (id) => SKILL_TIPS[id] || `Practise ${skillLabel(id)} together for a few minutes.`;
