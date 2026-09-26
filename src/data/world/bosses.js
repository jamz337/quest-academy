// One boss guards each zone. Beating it clears the zone and opens the next gate (see quests.js).
// `look` follows data/avatars.js so the world sprite and the battle portrait come from the same generators.
export const BOSSES = [
  {
    id: 'boss-math', zone: 'math', subject: 'math', name: 'Count Chaos', title: 'Terror of the Times Tables',
    look: { hair: '#2d2a4a', skin: '#b8794a', top: '#7e2553', legs: '#2d2a4a', bg: '#7e2553' },
    hp: 8, hearts: 3, questionTimeMs: 14000,
    intro: ['So YOU are the one collecting stars in my meadow.', 'Numbers obey ME here. Answer wrong and you lose a heart.', 'Beat me and Word Woods is yours. Ready?'],
    locked: ['Not yet, little student. Finish every task in Math Meadow first.', 'Then come back and we will see who really rules the numbers.'],
    taunts: ['Is that all?', 'My abacus is faster than you!', 'Ha! Wrong!'],
    beaten: ['Bah! You beat me fair and square.', 'The gate to Word Woods is open. Want a rematch some day?'],
    win: 'Count Chaos is defeated!', lose: 'Count Chaos wins this round…', unlocks: 'words'
  },
  {
    id: 'boss-words', zone: 'words', subject: 'words', name: 'The Grammar Gremlin', title: 'Muddler of Sentences',
    look: { hair: '#2ec46a', skin: '#8fe07c', top: '#625f7e', legs: '#2d2a4a', bg: '#2f8a3a' },
    hp: 8, hearts: 3, questionTimeMs: 16000,
    intro: ['Hee hee! I mix up every word in these woods.', 'Think you can un-muddle them faster than I muddle?', 'Beat me and the road to Code Cove opens. Let us play!'],
    locked: ['Hee hee, not so fast! The woods still have tasks for you.', 'Meet everyone, earn your stars, then come find me.'],
    taunts: ['Muddled again!', 'Words are MY toys!', 'Tee hee, wrong!'],
    beaten: ['Oh no, you un-muddled me!', 'Code Cove is open now. Come back for a rematch whenever you like.'],
    win: 'The Grammar Gremlin is defeated!', lose: 'The Grammar Gremlin muddled you…', unlocks: 'code'
  },
  {
    id: 'boss-code', zone: 'code', subject: 'code', name: 'Glitch the Bug King', title: 'Crasher of Programs',
    look: { hair: '#ff5c6c', skin: '#d6cfc4', top: '#2d2a4a', legs: '#625f7e', bg: '#1d2b53' },
    hp: 8, hearts: 3, questionTimeMs: 20000,
    intro: ['BZZT. A new programmer in my cove?', 'Read my programs and predict what my robots do. Get it wrong and… BZZT!', 'Beat me and you are the champion of Quest Academy. Begin!'],
    locked: ['BZZT. Access denied. Complete the cove tasks first.', 'Then return and face the Bug King.'],
    taunts: ['BZZT. Error!', 'Your logic has a bug!', 'Segfault!'],
    beaten: ['System… crashing… you win!', 'You are the champion of Quest Academy! Rematch any time.'],
    win: 'Glitch the Bug King is defeated!', lose: 'Glitch crashed your program…', unlocks: null
  }
];

export const getBoss = (id) => BOSSES.find((b) => b.id === id) || null;
export const bossForZone = (zone) => BOSSES.find((b) => b.zone === zone) || null;
