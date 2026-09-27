import { nextUnsolvedLevel } from '../coding/levels.js';

// The villagers of Quest Academy. `gameId` links to data/minigames.js; the signpost has none.
// `duel` is the villager's prop and lines for a duel (see data/world/duels.js); every villager with a game has one.
// `voice` is the sex of the voice that reads the villager's lines aloud, `pitch`/`rate` shape it into a character
// (1 is normal; see systems/Speech.js). They are used even when the device has only one voice.
// `pickContext(profile, band)` may add extra launch context (e.g. a coding level id).
export const NPCS = [
  {
    id: 'signpost', pitch: 1, rate: 1, voice: 'male', name: 'Signpost Sam', sprite: 'npc8', gameId: null, zone: 'hub',
    lines: [
      'Welcome to Quest Academy! Walk around and talk to friends to play games.',
      'Math Meadow is to the west. Word Woods is up in the north-east, Code Cove is down south by the sea, and Bible Village is over to the east.',
      'Each land has quests: meet the villagers, earn a star in every game and find the hidden coins.',
      'Finish them all and the boss of that land will come out of its castle to fight you!',
      'Check your quests any time from the pause menu.'
    ],
    playPrompt: null
  },
  {
    // The mentor of the Academy Bell story: her lines come from data/world/story.js (see WorldScene.talk).
    id: 'hope', pitch: 1.0, rate: 0.95, voice: 'female', name: 'Headmistress Hope', sprite: 'npc17', gameId: null, zone: 'hub', story: 'mentor',
    lines: ['Come and see me whenever you want to know where the story stands.'],
    playPrompt: null
  },
  {
    // The market vendor: talking to her opens the Cheapside market (see WorldScene.talk).
    id: 'vendor', pitch: 1.08, rate: 1.02, voice: 'female', name: 'Auntie Vee', sprite: 'npc18', gameId: null, zone: 'hub', market: true,
    lines: ['Mangoes, coconuts, and something for you! Every coin you earn can buy a treat here.', 'Hats and glasses to wear, paint for your house, and cards that teach you about Barbados.'],
    playPrompt: null
  },
  {
    id: 'prof-plus', duel: { prop: '🧮', challenge: 'Think you can out-count me? Then duel me!', win: 'Professor Plus is out-counted!', lose: 'Professor Plus wins this round. Count again!' }, pitch: 0.85, rate: 0.9, voice: 'male', name: 'Professor Plus', sprite: 'npc0', gameId: 'math-dash', zone: 'math',
    lines: ['Ah, a new student! I love numbers that add up fast.', 'Quick sums make quick thinkers. Ready to race the clock?'],
    playPrompt: 'Want to play Number Dash?'
  },
  {
    id: 'chef-fraction', duel: { prop: '🍕', challenge: 'Fancy a slice of a duel? My pizzas never lose!', win: 'Chef Fraction is sliced up!', lose: 'Chef Fraction wins this round. Back to the kitchen!' }, pitch: 1.15, rate: 1.05, voice: 'female', name: 'Chef Fraction', sprite: 'npc1', gameId: 'math-pizza', zone: 'math',
    lines: ['Welcome to my kitchen! Every pizza here is cut into perfect slices.', 'Can you shade exactly the right amount? Let us find out!'],
    playPrompt: 'Want to play Fraction Pizza?'
  },
  {
    id: 'bridge-keeper', duel: { prop: '🔨', challenge: 'Nobody crosses without beating me in a duel!', win: 'The Bridge Keeper steps aside!', lose: 'The Bridge Keeper holds the bridge this time.' }, pitch: 0.8, rate: 0.9, voice: 'male', name: 'Bridge Keeper', sprite: 'npc2', gameId: 'math-bridge', zone: 'math',
    lines: ['Halt! Some planks on my bridge are missing.', 'The numbers follow a pattern. Spot it, and the bridge will hold.'],
    playPrompt: 'Want to play Pattern Bridge?'
  },
  {
    id: 'owl-librarian', duel: { prop: '📚', challenge: 'Shh… a quiet duel, then? Hoo dares?', win: 'The Owl Librarian hoots in defeat!', lose: 'The Owl Librarian wins. Back to the books!' }, pitch: 1.2, rate: 0.9, voice: 'female', name: 'Owl Librarian', sprite: 'npc3', gameId: 'eng-builder', zone: 'words',
    lines: ['Hoo goes there? Shh, this is a library!', 'My letters got all jumbled up. Help me build the words again.'],
    playPrompt: 'Want to play Word Builder?'
  },
  {
    id: 'gate-guard', duel: { prop: '🛡️', challenge: 'Halt! Only a duel winner passes my gate!', win: 'The Gate Guard salutes you!', lose: 'The Gate Guard keeps the gate shut.' }, pitch: 0.7, rate: 0.95, voice: 'male', name: 'Gate Guard', sprite: 'npc4', gameId: 'eng-grammar', zone: 'words',
    lines: ['Nobody passes my gate with sloppy sentences!', 'Fill in the blanks with the right words and I will let you through.'],
    playPrompt: 'Want to play Grammar Gate?'
  },
  {
    id: 'safari-ranger', duel: { prop: '🔭', challenge: 'Careful, I have spotted a duel coming!', win: 'The Safari Ranger is out-tracked!', lose: 'The Safari Ranger wins this hunt.' }, pitch: 1.05, rate: 1.1, voice: 'female', name: 'Safari Ranger', sprite: 'npc5', gameId: 'eng-match', zone: 'words',
    lines: ['Careful, the words in these woods travel in pairs.', 'Match each word with its partner before they wander off!'],
    playPrompt: 'Want to play Word Match?'
  },
  {
    id: 'robo-mechanic', duel: { prop: '🔧', challenge: 'Beep! My circuits say: duel!', win: 'The Robo Mechanic powers down!', lose: 'The Robo Mechanic wins. Reboot and retry!' }, pitch: 1.3, rate: 1, voice: 'female', name: 'Robo Mechanic', sprite: 'npc6', gameId: 'code-maze', zone: 'code',
    lines: ['Beep boop! My robot needs instructions to reach the goal.', 'Snap blocks together to write a program. The fewer, the better!'],
    playPrompt: 'Want to play Robo Maze?',
    // The lead wires nextUnsolvedLevel(profile, band) from data/coding/levels.js here.
    // RoboMaze falls back to the next unsolved level when levelId is undefined.
    pickContext: (profile, band) => ({ levelId: nextUnsolvedLevel(profile, band)?.id })
  },
  {
    id: 'bug-catcher', duel: { prop: '🥅', challenge: 'Got my net ready for a duel!', win: 'The Bug Catcher is caught out!', lose: 'The Bug Catcher nets this round.' }, pitch: 1.1, rate: 1.15, voice: 'male', name: 'Bug Catcher', sprite: 'npc7', gameId: 'code-bug', zone: 'code',
    lines: ['Got my net ready! There are bugs hiding in these programs.', 'Find the broken block and swap it out. Squash that bug!'],
    playPrompt: 'Want to play Bug Hunt?'
  },
  {
    id: 'fortune-teller', duel: { prop: '🔮', challenge: 'I foresee… a duel! Do you dare?', win: 'The Fortune Teller did not see that coming!', lose: 'The Fortune Teller foresaw her win.' }, pitch: 0.9, rate: 0.8, voice: 'female', name: 'Fortune Teller', sprite: 'npc9', gameId: 'code-predict', zone: 'code',
    lines: ['I see... a robot... and a program...', 'Read the code and predict where the robot ends up. Can you see the future?'],
    playPrompt: 'Want to play Predict the Robot?'
  },
  {
    id: 'shepherd', duel: { prop: '🐑', challenge: 'A friendly duel, friend? My sheep will watch.', win: 'Shepherd Eli tips his hat to you!', lose: 'Shepherd Eli wins this round.' }, pitch: 0.85, rate: 0.95, voice: 'male', name: 'Shepherd Eli', sprite: 'npc10', gameId: 'bible-quiz', zone: 'bible',
    lines: ['Welcome to the village, friend! My sheep know my voice, and I know the old stories.', 'Who built the ark? Who beat the giant? Let us see how well you know them.'],
    playPrompt: 'Want to play Bible Quiz?'
  },
  {
    id: 'scribe', duel: { prop: '📜', challenge: 'Ink is ready. Care for a duel of words?', win: 'Scribe Miriam writes down your win!', lose: 'Scribe Miriam wins. The ink is dry!' }, pitch: 1.1, rate: 0.95, voice: 'female', name: 'Scribe Miriam', sprite: 'npc11', gameId: 'bible-verse', zone: 'bible',
    lines: ['Careful, the ink is still wet! I copy verses all day long.', 'Some of my scrolls have a word missing. Can you fill in the blanks?'],
    playPrompt: 'Want to play Verse Builder?'
  },
  {
    id: 'fisherman', duel: { prop: '🎣', challenge: 'Cast a line and duel me!', win: 'Fisherman Andrew is reeled in!', lose: 'Fisherman Andrew lands this one.' }, pitch: 0.9, rate: 1.05, voice: 'male', name: 'Fisherman Andrew', sprite: 'npc12', gameId: 'bible-match', zone: 'bible',
    lines: ['Just back from the lake with a full net!', 'Every person in the Bible has a story. Can you match each one to what they did?'],
    playPrompt: 'Want to play Who Am I?'
  },
  {
    id: 'balloon-seller', duel: { prop: '🎈', challenge: 'Duel me and I might just float away!', win: 'Balloon Bea is popped!', lose: 'Balloon Bea floats off with the win.' }, pitch: 1.2, rate: 1.05, voice: 'female', name: 'Balloon Bea', sprite: 'npc13', gameId: 'math-balloons', zone: 'math',
    lines: ['Balloons! Get your balloons! Every one has a number on it.', 'Pop the balloon with the right answer before it floats away over the meadow!'],
    playPrompt: 'Want to play Balloon Pop?'
  },
  {
    id: 'frog-friend', duel: { prop: '🐸', challenge: 'Ribbit! Hop into a duel with me!', win: 'Lily Pad Lou hops away beaten!', lose: 'Lily Pad Lou wins with one big hop.' }, pitch: 1.1, rate: 1, voice: 'female', name: 'Lily Pad Lou', sprite: 'npc14', gameId: 'eng-frog', zone: 'words',
    lines: ['Ribbit! My frog Hopper needs help crossing the pond.', 'Hop to the lily pad with the right word. Pick a wrong one and… splash!'],
    playPrompt: 'Want to play Frog Hop?'
  },
  {
    id: 'dj-bot', duel: { prop: '🎧', challenge: 'Drop the beat and duel me!', win: 'DJ Bolt is scratched!', lose: 'DJ Bolt spins the winning tune.' }, pitch: 1.25, rate: 1.1, voice: 'male', name: 'DJ Bolt', sprite: 'npc15', gameId: 'code-dance', zone: 'code',
    lines: ['Bzzt! Welcome to the dance floor!', 'Watch my robot bust a move, then pick the program that made it dance.'],
    playPrompt: 'Want to play Robot Dance?'
  },
  {
    id: 'ark-builder', duel: { prop: '🪚', challenge: 'Hammer and nails ready: duel me!', win: 'Japheth downs his tools!', lose: 'Japheth wins. Back to building!' }, pitch: 0.9, rate: 0.95, voice: 'male', name: 'Japheth the Builder', sprite: 'npc16', gameId: 'bible-ark', zone: 'bible',
    lines: ['Hammer and nails! Father Noah says the rain is coming.', 'Answer a question and another pair of animals climbs aboard. Fill the ark before the flood!'],
    playPrompt: 'Want to play All Aboard the Ark?'
  }
];

export const getNpc = (id) => NPCS.find((n) => n.id === id);
