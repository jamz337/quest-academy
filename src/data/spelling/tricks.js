// Memory tricks and tricky parts. Most of a word follows its sounds, so the child learns just the part that does
// not: `tricky` is the letters to watch (ringed on the flash card), `trick` a short way to remember them. Keys are
// lowercase. The class list words come first, then common words that trip children up. A list entry can also carry
// its own { trick, tricky } (see lists.js), which wins.
export const TRICKS = {
  // Grade 2 list
  school: { tricky: 'ch', trick: 'S, C, H: the h is hiding after the c, and the oo says "oo".' },
  teacher: { tricky: 'ea', trick: 'A teacher drinks tea: t-e-a is at the start.' },
  learn: { tricky: 'ear', trick: 'You learn with your ear: e-a-r is in the middle.' },
  eleven: { tricky: 'e', trick: 'Eleven has three e\'s: e-l-e-v-e-n.' },
  matter: { tricky: 'tt', trick: 'Double t in the middle: mat-ter.' },
  home: { tricky: 'e', trick: 'The silent e at the end makes the o say its name.' },
  family: { tricky: 'ily', trick: 'I am in my famILY.' },
  gender: { tricky: 'g', trick: 'A soft g that sounds like j.' },
  // Grade 4 lists
  coconut: { tricky: 'coco', trick: 'Co-co-nut: say "co" twice.' },
  tropical: { tricky: 'cal', trick: 'Ends in c-a-l, not k-l.' },
  countries: { tricky: 'ies', trick: 'One country, two countries: the y turns into ies.' },
  seashore: { tricky: 'sea', trick: 'Two words glued together: sea + shore.' },
  cultivated: { tricky: 'va', trick: 'Cul-ti-va-ted: clap the four beats.' },
  plantations: { tricky: 'tion', trick: 'Plant + a + tions: t-i-o-n says "shun".' },
  caribbean: { tricky: 'bb', trick: 'Capital C, one r, two b\'s: Car-ib-be-an.' },
  useful: { tricky: 'ful', trick: 'Use + ful: "full of use", but ful has only one l.' },
  refreshing: { tricky: 'ing', trick: 'Re + fresh + ing: three chunks.' },
  industries: { tricky: 'ies', trick: 'One industry, two industries: the y turns into ies.' },
  tourists: { tricky: 'our', trick: 'Tourists go on a tour: t-o-u-r.' },
  inhabitants: { tricky: 'ants', trick: 'Ants live there too: inhabit + ants.' },
  nutritious: { tricky: 'tious', trick: 'Ends like delicious: t-i-o-u-s says "shus".' },
  vendors: { tricky: 'ors', trick: 'A vendor sells: o-r-s at the end, like doctors.' },
  detergents: { tricky: 'gents', trick: 'De-ter-gents: the gents wash their clothes.' },
  // Common hard words
  because: { tricky: 'au', trick: 'Big Elephants Can Always Understand Small Elephants.' },
  said: { tricky: 'ai', trick: 'Sally Anne Is Dancing.' },
  friend: { tricky: 'ie', trick: 'A friend is there to the END: fri-END.' },
  people: { tricky: 'eo', trick: 'People Eat Odd Pink Lollipops Everywhere.' },
  beautiful: { tricky: 'eau', trick: 'Big Elephants Are Ugly (but they are beautiful).' },
  believe: { tricky: 'lie', trick: 'Never believe a LIE.' },
  necessary: { tricky: 'c', trick: 'One collar, two sleeves: one c, two s\'s.' },
  separate: { tricky: 'par', trick: 'There is A RAT in sep-A-RAT-e.' },
  island: { tricky: 's', trick: 'An island IS LAND: the s is silent.' },
  wednesday: { tricky: 'dnes', trick: 'Say it slowly: Wed-nes-day.' },
  february: { tricky: 'br', trick: 'Feb-RU-ary: there is an r after the b.' },
  ocean: { tricky: 'ce', trick: 'Only Cats\' Eyes Are Narrow.' },
  rhythm: { tricky: 'rh', trick: 'Rhythm Helps Your Two Hips Move.' },
  could: { tricky: 'oul', trick: 'O U Lucky Duck: could, would, should.' },
  would: { tricky: 'oul', trick: 'O U Lucky Duck: could, would, should.' },
  should: { tricky: 'oul', trick: 'O U Lucky Duck: could, would, should.' },
  there: { tricky: 'here', trick: 'There has "here" in it: both are places.' },
  their: { tricky: 'ei', trick: 'Their has "heir" in it: something they own.' },
  where: { tricky: 'here', trick: 'Where has "here" in it: it asks about a place.' },
  piece: { tricky: 'pie', trick: 'A piece of PIE.' },
  hear: { tricky: 'ear', trick: 'You hear with your EAR.' },
  here: { tricky: 'ere', trick: 'Here, there and where all end in e-r-e.' },
  knife: { tricky: 'k', trick: 'The k is silent at the start.' },
  laugh: { tricky: 'augh', trick: 'Laugh And U Get Happy.' },
  enough: { tricky: 'ough', trick: 'Enough: o-u-g-h says "uff".' },
  thought: { tricky: 'ough', trick: 'Thought: o-u-g-h says "aw".' },
  together: { tricky: 'get', trick: 'To + get + her.' },
  different: { tricky: 'ff', trick: 'Double f, and say every beat: dif-fer-ent.' },
  across: { tricky: 'c', trick: 'One c, two s\'s: a-cross.' },
  until: { tricky: 'l', trick: 'Until has one l at the end.' },
  always: { tricky: 'al', trick: 'One l: al-ways.' }
};

/** Index of a tricky part inside the word (case ignored), or -1. */
export function trickyIndex(word, tricky) {
  if (!tricky) return -1;
  return String(word).toLowerCase().indexOf(String(tricky).toLowerCase());
}

/** The built-in { trick, tricky } for a word (a list entry's own fields win), or null. */
export function trickFor(word, entry = null) {
  const own = entry && (entry.trick || entry.tricky) ? { trick: entry.trick || null, tricky: entry.tricky || null } : null;
  const known = TRICKS[String(word).toLowerCase()] || null;
  if (!own && !known) return null;
  return { trick: (own && own.trick) || (known && known.trick) || null, tricky: (own && own.tricky) || (known && known.tricky) || null };
}
