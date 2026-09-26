// One boss guards each zone: it fights once the zone's quests are done (see quests.js) and beating it clears the zone.
// `look` follows data/avatars.js so the world sprite and the battle portrait come from the same generators.
export const BOSSES = [
  {
    id: 'boss-math', voice: 'male', pitch: 0.75, rate: 0.95, zone: 'math', subject: 'math', name: 'Count Chaos', title: 'Terror of the Times Tables',
    look: { hair: '#2d2a4a', skin: '#b8794a', top: '#7e2553', legs: '#2d2a4a', bg: '#7e2553' },
    hp: 8, hearts: 3, questionTimeMs: 14000,
    intro: ['So YOU are the one collecting stars in my meadow.', 'Numbers obey ME here. Answer wrong and you lose a heart.', 'Beat me and the meadow is truly yours. Ready?'],
    locked: ['Not yet, little student. Finish every task in Math Meadow first.', 'Then come back and we will see who really rules the numbers.'],
    taunts: ['Is that all?', 'My abacus is faster than you!', 'Ha! Wrong!'],
    beaten: ['Bah! You beat me fair and square.', 'The meadow is yours now. Want a rematch some day?'],
    win: 'Count Chaos is defeated!', lose: 'Count Chaos wins this round…', unlocks: null
  },
  {
    id: 'boss-words', voice: 'female', pitch: 1.4, rate: 1.15, zone: 'words', subject: 'words', name: 'The Grammar Gremlin', title: 'Muddler of Sentences',
    look: { hair: '#2ec46a', skin: '#8fe07c', top: '#625f7e', legs: '#2d2a4a', bg: '#2f8a3a' },
    hp: 8, hearts: 3, questionTimeMs: 16000,
    intro: ['Hee hee! I mix up every word in these woods.', 'Think you can un-muddle them faster than I muddle?', 'Beat me and the woods are yours. Let us play!'],
    locked: ['Hee hee, not so fast! The woods still have tasks for you.', 'Meet everyone, earn your stars, then come find me.'],
    taunts: ['Muddled again!', 'Words are MY toys!', 'Tee hee, wrong!'],
    beaten: ['Oh no, you un-muddled me!', 'The woods are yours now. Come back for a rematch whenever you like.'],
    win: 'The Grammar Gremlin is defeated!', lose: 'The Grammar Gremlin muddled you…', unlocks: null
  },
  {
    id: 'boss-code', voice: 'male', pitch: 1.2, rate: 1.1, zone: 'code', subject: 'code', name: 'Glitch the Bug King', title: 'Crasher of Programs',
    look: { hair: '#ff5c6c', skin: '#d6cfc4', top: '#2d2a4a', legs: '#625f7e', bg: '#1d2b53' },
    hp: 8, hearts: 3, questionTimeMs: 20000,
    intro: ['BZZT. A new programmer in my cove?', 'Read my programs and predict what my robots do. Get it wrong and… BZZT!', 'Beat me and you are the champion of Quest Academy. Begin!'],
    locked: ['BZZT. Access denied. Complete the cove tasks first.', 'Then return and face the Bug King.'],
    taunts: ['BZZT. Error!', 'Your logic has a bug!', 'Segfault!'],
    beaten: ['System… crashing… you win!', 'The cove is yours now. Rematch any time.'],
    win: 'Glitch the Bug King is defeated!', lose: 'Glitch crashed your program…', unlocks: null
  },
  {
    id: 'boss-bible', voice: 'male', pitch: 0.5, rate: 0.85, zone: 'bible', subject: 'bible', name: 'Goliath', title: 'Giant of Gath', scale: 1.6,
    look: { hair: '#2d2a4a', skin: '#c98a5a', top: '#b08d3a', legs: '#6b4630', bg: '#7a4a2a' },
    hp: 8, hearts: 3, questionTimeMs: 22000,
    intro: ['WHO dares to stand before Goliath? You are only a child!', 'A shepherd boy once faced me with a sling. You will face me with what you know.', 'Answer my questions about the Book, or run home. Well?'],
    locked: ['Ha! You have not even walked the village yet.', 'Meet the villagers, learn their stories, then come and face me.'],
    taunts: ['Is that your best?', 'You do not know the stories!', 'Ha! Wrong!'],
    beaten: ['Beaten... by a child... again!', 'You are the champion of Quest Academy! Come back for a rematch whenever you like.'],
    win: 'Goliath is defeated!', lose: 'Goliath wins this round…', unlocks: null
  }
];

export const getBoss = (id) => BOSSES.find((b) => b.id === id) || null;
export const bossForZone = (zone) => BOSSES.find((b) => b.zone === zone) || null;
