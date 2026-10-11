// One boss guards each zone: it fights once the zone's quests are done (see quests.js) and beating it clears the zone.
// `look` follows data/avatars.js so the world sprite and the battle portrait come from the same generators.
export const BOSSES = [
  {
    id: 'boss-math', voice: 'male', pitch: 0.75, rate: 0.95, zone: 'math', subject: 'math', name: 'Count Chaos', title: 'Terror of the Times Tables',
    look: { sex: 'boy', skin: 'bronze', hairStyle: 'spiked', hair: 'black', topStyle: 'polo', top: 'maroon', bottomStyle: 'pants', bottom: 'black', shoes: 'black', eyes: 'red', bg: '#7e2553' },
    hp: 8, hearts: 3, questionTimeMs: 14000,
    intro: ['So YOU are the one collecting stars in my meadow.', 'Numbers obey ME here. Answer wrong and you lose a heart.', 'Beat me and the meadow is truly yours. Ready?'],
    locked: ['Not yet, little student. Finish every task in Math Meadow first.', 'Then come back and we will see who really rules the numbers.'],
    taunts: ['Is that all?', 'My abacus is faster than you!', 'Ha! Wrong!'],
    beaten: ['Bah! You beat me fair and square.', 'The meadow is yours now. Want a rematch some day?'],
    win: 'Count Chaos is defeated!', lose: 'Count Chaos wins this round…', unlocks: null
  },
  {
    id: 'boss-words', voice: 'female', pitch: 1.4, rate: 1.15, zone: 'words', subject: 'words', name: 'The Grammar Gremlin', title: 'Muddler of Sentences',
    look: { sex: 'girl', skin: 'green', hairStyle: 'high_ponytail', hair: 'green', topStyle: 'tshirt', top: 'slate', bottomStyle: 'skirt', bottom: 'black', shoes: 'black', eyes: 'purple', bg: '#2f8a3a' },
    hp: 8, hearts: 3, questionTimeMs: 16000,
    intro: ['Hee hee! I mix up every word in these woods.', 'Think you can un-muddle them faster than I muddle?', 'Beat me and the woods are yours. Let us play!'],
    locked: ['Hee hee, not so fast! The woods still have tasks for you.', 'Meet everyone, earn your stars, then come find me.'],
    taunts: ['Muddled again!', 'Words are MY toys!', 'Tee hee, wrong!'],
    beaten: ['Oh no, you un-muddled me!', 'The woods are yours now. Come back for a rematch whenever you like.'],
    win: 'The Grammar Gremlin is defeated!', lose: 'The Grammar Gremlin muddled you…', unlocks: null
  },
  {
    id: 'boss-code', voice: 'male', pitch: 1.2, rate: 1.1, zone: 'code', subject: 'code', name: 'Glitch the Bug King', title: 'Crasher of Programs',
    look: { sex: 'boy', skin: 'blue', hairStyle: 'spiked', hair: 'red', topStyle: 'tshirt', top: 'black', bottomStyle: 'pants', bottom: 'gray', shoes: 'black', eyes: 'yellow', bg: '#1d2b53' },
    hp: 8, hearts: 3, questionTimeMs: 20000,
    intro: ['BZZT. A new programmer in my cove?', 'Read my programs and predict what my robots do. Get it wrong and… BZZT!', 'Beat me and you are the champion of Quest Academy. Begin!'],
    locked: ['BZZT. Access denied. Complete the cove tasks first.', 'Then return and face the Bug King.'],
    taunts: ['BZZT. Error!', 'Your logic has a bug!', 'Segfault!'],
    beaten: ['System… crashing… you win!', 'The cove is yours now. Rematch any time.'],
    win: 'Glitch the Bug King is defeated!', lose: 'Glitch crashed your program…', unlocks: null
  },
  {
    id: 'boss-bible', voice: 'male', pitch: 0.5, rate: 0.85, zone: 'bible', subject: 'bible', name: 'Goliath', title: 'Giant of Gath', scale: 1.6,
    look: { sex: 'boy', skin: 'taupe', hairStyle: 'curly_short', hair: 'black', topStyle: 'tshirt', top: 'tan', bottomStyle: 'pants', bottom: 'brown', shoes: 'brown', eyes: 'brown', bg: '#7a4a2a' },
    hp: 8, hearts: 3, questionTimeMs: 22000,
    intro: ['WHO dares to stand before Goliath? You are only a child!', 'A shepherd boy once faced me with a sling. You will face me with what you know.', 'Answer my questions about the Book, or run home. Well?'],
    locked: ['Ha! You have not even walked the village yet.', 'Meet the villagers, learn their stories, then come and face me.'],
    taunts: ['Is that your best?', 'You do not know the stories!', 'Ha! Wrong!'],
    beaten: ['Beaten... by a child... again!', 'You are the champion of Quest Academy! Come back for a rematch whenever you like.'],
    win: 'Goliath is defeated!', lose: 'Goliath wins this round…', unlocks: null
  },
  {
    id: 'boss-science', voice: 'male', pitch: 0.6, rate: 0.9, zone: 'science', subject: 'science', name: 'The Fog Fiend', title: 'Muddler of Matter',
    look: { sex: 'boy', skin: 'green', hairStyle: 'plain', hair: 'white', topStyle: 'polo', top: 'teal', bottomStyle: 'pants', bottom: 'gray', shoes: 'black', eyes: 'gray', bg: '#0c7d88' },
    hp: 8, hearts: 3, questionTimeMs: 18000,
    intro: ['Hisss. A curious child in MY springs?', 'I fog up every fact. Answer wrong and the mist takes a heart.', 'Clear my fog and the Springs are yours. Begin!'],
    locked: ['Not yet, little scientist. The Springs still have work for you.', 'Meet everyone, earn your stars, then come and clear my fog.'],
    taunts: ['Foggy thinking!', 'The mist thickens!', 'Hisss. Wrong!'],
    beaten: ['The fog... is lifting...', 'The Springs are yours. Come back for a rematch when the mist returns.'],
    win: 'The Fog Fiend is cleared!', lose: 'The Fog Fiend fogged you…', unlocks: null
  },
  {
    id: 'boss-history', voice: 'male', pitch: 0.65, rate: 1.0, zone: 'history', subject: 'history', name: 'Admiral Amnesia', title: 'Forgetter of the Ages',
    look: { sex: 'boy', skin: 'taupe', hairStyle: 'plain', hair: 'white', topStyle: 'polo', top: 'navy', bottomStyle: 'pants', bottom: 'white', shoes: 'black', eyes: 'blue', bg: '#1f3d75' },
    hp: 8, hearts: 3, questionTimeMs: 18000,
    intro: ['Avast! Who comes aboard my harbour uninvited?', 'I make everyone forget: where they are, who helps them, what came before. Answer wrong and a heart goes overboard.', 'Remember everything and the harbour is yours. All hands!'],
    locked: ['Not yet, cabin kid. The harbour folk have tasks for you first.', 'Meet everyone, earn your stars, then come and test your memory against mine.'],
    taunts: ['Forgotten already?', 'Lost at sea!', 'Ha! Wrong heading!'],
    beaten: ['I… remember now. You beat me.', 'The harbour is yours. Come back when the tide turns for a rematch.'],
    win: 'Admiral Amnesia is all at sea!', lose: 'Admiral Amnesia sent you overboard…', unlocks: null
  },
  {
    id: 'boss-music', voice: 'male', pitch: 0.55, rate: 1.0, zone: 'music', subject: 'music', name: 'Maestro Mayhem', title: 'The Off-Key Ogre',
    look: { sex: 'boy', skin: 'olive', hairStyle: 'spiked', hair: 'purple', topStyle: 'polo', top: 'black', bottomStyle: 'pants', bottom: 'purple', shoes: 'black', eyes: 'green', bg: '#9f1f62' },
    hp: 8, hearts: 3, questionTimeMs: 18000,
    intro: ['WRONG note! Wrong note! Ha! I play everything off-key, and I LIKE it.', 'Answer wrong and you lose a heart. Answer right and you spoil my racket.', 'Let us see if you have any music in you. BEGIN!'],
    locked: ['Not yet, little songbird. The market folk have tunes for you to learn first.', 'Meet everyone, earn your stars, then come and put my music right.'],
    taunts: ['Off-key!', 'That was flat!', 'Ha! No rhythm!'],
    beaten: ['Oh… that… actually sounds lovely.', 'The market is yours. Come back for an encore some day.'],
    win: 'Maestro Mayhem is in tune at last!', lose: 'Maestro Mayhem drowned you out…', unlocks: null
  },
  {
    id: 'boss-studio', voice: 'male', pitch: 0.6, rate: 1.05, zone: 'studio', subject: 'studio', name: 'Baron Blot', title: 'The Smudge of the Summit',
    look: { sex: 'boy', skin: 'light', hairStyle: 'long', hair: 'black', topStyle: 'polo', top: 'black', bottomStyle: 'pants', bottom: 'gray', shoes: 'black', eyes: 'brown', bg: '#a3461c' },
    hp: 8, hearts: 3, questionTimeMs: 18000,
    intro: ['SPLAT! Another masterpiece ruined. I am Baron Blot, and I smudge everything I touch.', 'Answer wrong and you lose a heart. Answer right and you wipe away a smudge.', 'Colours, shapes, symmetry: let us see if you know your art. BEGIN!'],
    locked: ['Not yet, little dauber. The artists of the summit have lessons for you first.', 'Meet everyone, earn your stars, then come and clean up my mess.'],
    taunts: ['Smudged!', 'What a blot!', 'Ha! Outside the lines!'],
    beaten: ['Oh… that is… rather beautiful, actually.', 'The summit is yours. Come back when the paint is dry for a rematch.'],
    win: 'Baron Blot has been wiped clean!', lose: 'Baron Blot smudged you out…', unlocks: null
  }
];

export const getBoss = (id) => BOSSES.find((b) => b.id === id) || null;
export const bossForZone = (zone) => BOSSES.find((b) => b.zone === zone) || null;
