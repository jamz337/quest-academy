import { nextUnsolvedLevel } from '../coding/levels.js';

// The villagers of Quest Academy. `gameId` links to data/minigames.js; the signpost has none.
// `pickContext(profile, band)` may add extra launch context (e.g. a coding level id).
export const NPCS = [
  {
    id: 'signpost', name: 'Signpost Sam', sprite: 'npc8', gameId: null, zone: 'hub',
    lines: [
      'Welcome to Quest Academy! Walk around and talk to friends to play games.',
      'Math Meadow is to the west. Word Woods is up in the north-east, and Code Cove is down south by the sea.',
      'Each land has quests: meet the villagers, earn a star in every game and find the hidden coins.',
      'Finish them all and the boss of that land will fight you. Beat the boss to open the next gate!',
      'Check your quests any time from the pause menu.'
    ],
    playPrompt: null
  },
  {
    id: 'prof-plus', name: 'Professor Plus', sprite: 'npc0', gameId: 'math-dash', zone: 'math',
    lines: ['Ah, a new student! I love numbers that add up fast.', 'Quick sums make quick thinkers. Ready to race the clock?'],
    playPrompt: 'Want to play Number Dash?'
  },
  {
    id: 'chef-fraction', name: 'Chef Fraction', sprite: 'npc1', gameId: 'math-pizza', zone: 'math',
    lines: ['Welcome to my kitchen! Every pizza here is cut into perfect slices.', 'Can you shade exactly the right amount? Let us find out!'],
    playPrompt: 'Want to play Fraction Pizza?'
  },
  {
    id: 'bridge-keeper', name: 'Bridge Keeper', sprite: 'npc2', gameId: 'math-bridge', zone: 'math',
    lines: ['Halt! Some planks on my bridge are missing.', 'The numbers follow a pattern. Spot it, and the bridge will hold.'],
    playPrompt: 'Want to play Pattern Bridge?'
  },
  {
    id: 'owl-librarian', name: 'Owl Librarian', sprite: 'npc3', gameId: 'eng-builder', zone: 'words',
    lines: ['Hoo goes there? Shh, this is a library!', 'My letters got all jumbled up. Help me build the words again.'],
    playPrompt: 'Want to play Word Builder?'
  },
  {
    id: 'gate-guard', name: 'Gate Guard', sprite: 'npc4', gameId: 'eng-grammar', zone: 'words',
    lines: ['Nobody passes my gate with sloppy sentences!', 'Fill in the blanks with the right words and I will let you through.'],
    playPrompt: 'Want to play Grammar Gate?'
  },
  {
    id: 'safari-ranger', name: 'Safari Ranger', sprite: 'npc5', gameId: 'eng-match', zone: 'words',
    lines: ['Careful, the words in these woods travel in pairs.', 'Match each word with its partner before they wander off!'],
    playPrompt: 'Want to play Word Match?'
  },
  {
    id: 'robo-mechanic', name: 'Robo Mechanic', sprite: 'npc6', gameId: 'code-maze', zone: 'code',
    lines: ['Beep boop! My robot needs instructions to reach the goal.', 'Snap blocks together to write a program. The fewer, the better!'],
    playPrompt: 'Want to play Robo Maze?',
    // The lead wires nextUnsolvedLevel(profile, band) from data/coding/levels.js here.
    // RoboMaze falls back to the next unsolved level when levelId is undefined.
    pickContext: (profile, band) => ({ levelId: nextUnsolvedLevel(profile, band)?.id })
  },
  {
    id: 'bug-catcher', name: 'Bug Catcher', sprite: 'npc7', gameId: 'code-bug', zone: 'code',
    lines: ['Got my net ready! There are bugs hiding in these programs.', 'Find the broken block and swap it out. Squash that bug!'],
    playPrompt: 'Want to play Bug Hunt?'
  },
  {
    id: 'fortune-teller', name: 'Fortune Teller', sprite: 'npc9', gameId: 'code-predict', zone: 'code',
    lines: ['I see... a robot... and a program...', 'Read the code and predict where the robot ends up. Can you see the future?'],
    playPrompt: 'Want to play Predict the Robot?'
  }
];

export const getNpc = (id) => NPCS.find((n) => n.id === id);
