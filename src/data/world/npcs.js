import { nextUnsolvedLevel } from '../coding/levels.js';

// The villagers of Quest Academy. `gameId` links to data/minigames.js; the signpost has none.
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
    id: 'prof-plus', pitch: 0.85, rate: 0.9, voice: 'male', name: 'Professor Plus', sprite: 'npc0', gameId: 'math-dash', zone: 'math',
    lines: ['Ah, a new student! I love numbers that add up fast.', 'Quick sums make quick thinkers. Ready to race the clock?'],
    playPrompt: 'Want to play Number Dash?'
  },
  {
    id: 'chef-fraction', pitch: 1.15, rate: 1.05, voice: 'female', name: 'Chef Fraction', sprite: 'npc1', gameId: 'math-pizza', zone: 'math',
    lines: ['Welcome to my kitchen! Every pizza here is cut into perfect slices.', 'Can you shade exactly the right amount? Let us find out!'],
    playPrompt: 'Want to play Fraction Pizza?'
  },
  {
    id: 'bridge-keeper', pitch: 0.8, rate: 0.9, voice: 'male', name: 'Bridge Keeper', sprite: 'npc2', gameId: 'math-bridge', zone: 'math',
    lines: ['Halt! Some planks on my bridge are missing.', 'The numbers follow a pattern. Spot it, and the bridge will hold.'],
    playPrompt: 'Want to play Pattern Bridge?'
  },
  {
    id: 'owl-librarian', pitch: 1.2, rate: 0.9, voice: 'female', name: 'Owl Librarian', sprite: 'npc3', gameId: 'eng-builder', zone: 'words',
    lines: ['Hoo goes there? Shh, this is a library!', 'My letters got all jumbled up. Help me build the words again.'],
    playPrompt: 'Want to play Word Builder?'
  },
  {
    id: 'gate-guard', pitch: 0.7, rate: 0.95, voice: 'male', name: 'Gate Guard', sprite: 'npc4', gameId: 'eng-grammar', zone: 'words',
    lines: ['Nobody passes my gate with sloppy sentences!', 'Fill in the blanks with the right words and I will let you through.'],
    playPrompt: 'Want to play Grammar Gate?'
  },
  {
    id: 'safari-ranger', pitch: 1.05, rate: 1.1, voice: 'female', name: 'Safari Ranger', sprite: 'npc5', gameId: 'eng-match', zone: 'words',
    lines: ['Careful, the words in these woods travel in pairs.', 'Match each word with its partner before they wander off!'],
    playPrompt: 'Want to play Word Match?'
  },
  {
    id: 'robo-mechanic', pitch: 1.3, rate: 1, voice: 'female', name: 'Robo Mechanic', sprite: 'npc6', gameId: 'code-maze', zone: 'code',
    lines: ['Beep boop! My robot needs instructions to reach the goal.', 'Snap blocks together to write a program. The fewer, the better!'],
    playPrompt: 'Want to play Robo Maze?',
    // The lead wires nextUnsolvedLevel(profile, band) from data/coding/levels.js here.
    // RoboMaze falls back to the next unsolved level when levelId is undefined.
    pickContext: (profile, band) => ({ levelId: nextUnsolvedLevel(profile, band)?.id })
  },
  {
    id: 'bug-catcher', pitch: 1.1, rate: 1.15, voice: 'male', name: 'Bug Catcher', sprite: 'npc7', gameId: 'code-bug', zone: 'code',
    lines: ['Got my net ready! There are bugs hiding in these programs.', 'Find the broken block and swap it out. Squash that bug!'],
    playPrompt: 'Want to play Bug Hunt?'
  },
  {
    id: 'fortune-teller', pitch: 0.9, rate: 0.8, voice: 'female', name: 'Fortune Teller', sprite: 'npc9', gameId: 'code-predict', zone: 'code',
    lines: ['I see... a robot... and a program...', 'Read the code and predict where the robot ends up. Can you see the future?'],
    playPrompt: 'Want to play Predict the Robot?'
  },
  {
    id: 'shepherd', pitch: 0.85, rate: 0.95, voice: 'male', name: 'Shepherd Eli', sprite: 'npc10', gameId: 'bible-quiz', zone: 'bible',
    lines: ['Welcome to the village, friend! My sheep know my voice, and I know the old stories.', 'Who built the ark? Who beat the giant? Let us see how well you know them.'],
    playPrompt: 'Want to play Bible Quiz?'
  },
  {
    id: 'scribe', pitch: 1.1, rate: 0.95, voice: 'female', name: 'Scribe Miriam', sprite: 'npc11', gameId: 'bible-verse', zone: 'bible',
    lines: ['Careful, the ink is still wet! I copy verses all day long.', 'Some of my scrolls have a word missing. Can you fill in the blanks?'],
    playPrompt: 'Want to play Verse Builder?'
  },
  {
    id: 'fisherman', pitch: 0.9, rate: 1.05, voice: 'male', name: 'Fisherman Andrew', sprite: 'npc12', gameId: 'bible-match', zone: 'bible',
    lines: ['Just back from the lake with a full net!', 'Every person in the Bible has a story. Can you match each one to what they did?'],
    playPrompt: 'Want to play Who Am I?'
  }
];

export const getNpc = (id) => NPCS.find((n) => n.id === id);
