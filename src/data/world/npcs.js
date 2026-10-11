import { nextUnsolvedLevel } from '../coding/levels.js';

// The villagers of Quest Academy. `gameId` links to data/minigames.js; the signpost has none.
// `duel` is the villager's prop and lines for a duel (see data/world/duels.js); every villager with a game has one.
// `voice` is the sex of the voice that reads the villager's lines aloud, `pitch`/`rate` shape it into a character
// (1 is normal; see systems/Speech.js). They are used even when the device has only one voice.
// `pickContext(profile, band)` may add extra launch context (e.g. a coding level id).
export const NPCS = [
  {
    id: 'signpost', pitch: 1, rate: 1, voice: 'male', name: 'Signpost Sam', sprite: 'npc8', art: 'sam', gameId: null, zone: 'hub',
    lines: [
      'Welcome to Quest Academy! Walk around and talk to friends to play games.',
      'Science Springs is up north: take the road at the top of the plaza, through the archway, and follow the stream.',
      'Math Meadow is to the west. Word Woods is up in the north-east, Code Cove is down south by the sea, and Bible Village is over to the east.',
      'Each land has quests: meet the villagers, earn a star in every game and find the hidden coins.',
      'Finish them all and the boss of that land will come out of its castle to fight you!',
      'Check your quests any time from the pause menu.'
    ],
    playPrompt: null
  },
  {
    // The mentor of the Academy Bell story: her lines come from data/world/story.js (see WorldScene.talk).
    id: 'hope', pitch: 1.0, rate: 0.95, voice: 'female', name: 'Headmistress Hope', sprite: 'npc17', art: 'hope', gameId: null, zone: 'hub', story: 'mentor',
    lines: ['Come and see me whenever you want to know where the story stands.'],
    playPrompt: null
  },
  {
    // The market vendor: talking to her opens the Cheapside market (see WorldScene.talk).
    id: 'vendor', pitch: 1.08, rate: 1.02, voice: 'female', name: 'Auntie Vee', sprite: 'npc18', art: 'vee', gameId: null, zone: 'hub', market: true,
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
  },
  // Science Springs
  {
    id: 'botanist', duel: { prop: '🌱', challenge: 'Think you know plants? Duel me and find out!', win: 'Professor Fern is out-grown!', lose: 'Professor Fern wins this round. Back to the greenhouse!' }, pitch: 1.05, rate: 0.95, voice: 'female', name: 'Professor Fern', sprite: 'npc19', gameId: 'sci-plants', zone: 'science',
    lines: ['Welcome to the greenhouses! Everything green in here started as a tiny seed.', 'Sunlight, water, air and soil: give a plant those and watch it grow.'],
    playPrompt: 'Want to play Plant Power?'
  },
  {
    id: 'ranger-rio', duel: { prop: '🦁', challenge: 'I know every animal from here to the sea. Duel me!', win: 'Ranger Rio is out-tracked!', lose: 'Ranger Rio wins this round. Keep exploring!' }, pitch: 0.95, rate: 1.05, voice: 'male', name: 'Ranger Rio', sprite: 'npc20', gameId: 'sci-habitat', zone: 'science',
    lines: ['Every animal has a home that fits it, from the icy poles to the deep blue sea.', 'Can you match each one to where it lives? Let us find out!'],
    playPrompt: 'Want to play Habitat Match?'
  },
  {
    id: 'captain-cork', duel: { prop: '⚓', challenge: 'Sink or swim, sailor: duel me!', win: 'Captain Cork is sunk!', lose: 'Captain Cork stays afloat this round.' }, pitch: 0.8, rate: 1.0, voice: 'male', name: 'Captain Cork', sprite: 'npc21', gameId: 'sci-float', zone: 'science',
    lines: ['Ahoy! Some things float and some things sink, and it is not about how heavy they are.', 'Guess first, then drop it in the tub. The water never lies!'],
    playPrompt: 'Want to play Sink or Float?'
  },
  {
    id: 'dr-misty', duel: { prop: '🧊', challenge: 'Solid, liquid or gas: duel me if you dare!', win: 'Dr Misty is melted!', lose: 'Dr Misty wins this round. Cool off and try again!' }, pitch: 1.15, rate: 0.9, voice: 'female', name: 'Dr Misty', sprite: 'npc22', gameId: 'sci-matter', zone: 'science',
    lines: ['Ice, water, steam: the same stuff in three states!', 'Heat it, cool it, and watch it change. Shall we experiment?'],
    playPrompt: 'Want to play States of Matter?'
  },
  // History Harbor
  {
    id: 'captain-compass', duel: { prop: '🧭', challenge: 'North, south, east or west: duel me and find your bearings!', win: 'Captain Compass is off course!', lose: 'Captain Compass holds his course this round.' }, pitch: 0.75, rate: 1.0, voice: 'male', name: 'Captain Compass', sprite: 'npc23', gameId: 'his-compass', zone: 'history',
    lines: ['Welcome to the harbour, sailor! A map is no use until you know which way is north.', 'The sun rises in the east and sets in the west. Learn that and you will never be lost.'],
    playPrompt: 'Want to play Compass Quest?'
  },
  {
    id: 'mayor-marigold', duel: { prop: '🏛️', challenge: 'Do you know who keeps this town running? Duel me!', win: 'Mayor Marigold is out-voted!', lose: 'Mayor Marigold wins this round. Town hall stands!' }, pitch: 0.95, rate: 1.0, voice: 'female', name: 'Mayor Marigold', sprite: 'npc24', gameId: 'his-helpers', zone: 'history',
    lines: ['I am the mayor of this harbour town, and I could not run it alone.', 'Doctors, firefighters, teachers, the postal worker: every helper matters. Do you know what they all do?'],
    playPrompt: 'Want to play Community Helpers?'
  },
  {
    id: 'flora', duel: { prop: '🏁', challenge: 'Every flag in the world is on my boat. Duel me!', win: 'Flora lowers her flags!', lose: 'Flora keeps her flags flying this round.' }, pitch: 1.25, rate: 1.1, voice: 'female', name: 'Flora of the Flags', sprite: 'npc25', gameId: 'his-flags', zone: 'history',
    lines: ['Ships from all over the world tie up here, and every one flies its flag.', 'Blue, gold and the trident: that is ours. Can you spot the others?'],
    playPrompt: 'Want to play Flag Finder?'
  },
  {
    id: 'old-tom', duel: { prop: '🕰️', challenge: 'I have seen a thing or two in my time. Duel me, young one!', win: 'Old Tom tips his cap to you!', lose: 'Old Tom wins this round. Long memory, see?' }, pitch: 0.7, rate: 0.85, voice: 'male', name: 'Old Tom the Lighthouse Keeper', sprite: 'npc26', gameId: 'his-time', zone: 'history',
    lines: ['When I was a boy there were no cars on this quay, only horses and carts.', 'Long ago and today: things change, and that is what history is. Come and see.'],
    playPrompt: 'Want to play Past & Present?'
  },
  // Melody Market
  {
    id: 'drummer', duel: { prop: '🥁', challenge: 'Can you keep up with my beat? Duel me!', win: 'Kofi drops a stick!', lose: 'Kofi keeps the beat this round.' }, pitch: 0.85, rate: 1.1, voice: 'male', name: 'Kofi the Drummer', sprite: 'npc27', gameId: 'mus-rhythm', zone: 'music',
    lines: ['Boom, tak, tak! Every song starts with a beat, and the beat starts with a drum.', 'Listen close and clap it back. Can you feel it in your feet?'],
    playPrompt: 'Want to play Rhythm Repeat?'
  },
  {
    id: 'note-seller', duel: { prop: '🎵', challenge: 'Do re mi, duel with me!', win: 'Nina hits a wrong note!', lose: 'Nina stays in tune this round.' }, pitch: 1.0, rate: 1.1, voice: 'female', name: 'Nina Notes', sprite: 'npc28', gameId: 'mus-notes', zone: 'music',
    lines: ['Notes, notes, lovely notes! Long ones, short ones, all written on five little lines.', 'Count them, name them, sing them: do re mi fa so la ti do!'],
    playPrompt: 'Want to play Note Match?'
  },
  {
    id: 'singer', duel: { prop: '🎤', challenge: 'High or low, which way will it go? Duel me!', win: 'Lark is lost for words!', lose: 'Lark holds the high note this round.' }, pitch: 1.35, rate: 1.05, voice: 'female', name: 'Lark the Singer', sprite: 'npc29', gameId: 'mus-pitch', zone: 'music',
    lines: ['La la LA! A bird sings high and a bullfrog sings low. Every sound has its place.', 'Close your eyes and listen: did that go up, or down?'],
    playPrompt: 'Want to play High & Low?'
  },
  {
    id: 'luthier', duel: { prop: '🎸', challenge: 'Strings, drums, horns or keys: duel me and name them all!', win: 'Uncle Strings is out of tune!', lose: 'Uncle Strings wins this round. Back to the workbench!' }, pitch: 0.8, rate: 1.1, voice: 'male', name: 'Uncle Strings', sprite: 'npc30', gameId: 'mus-instruments', zone: 'music',
    lines: ['I mend guitars, violins and the odd banjo. Every instrument belongs to a family.', 'Some you hit, some you blow, some you pluck. And the steelpan? That one is ours, from right here in the Caribbean.'],
    playPrompt: 'Want to play Instrument Families?'
  }
];

export const getNpc = (id) => NPCS.find((n) => n.id === id);
