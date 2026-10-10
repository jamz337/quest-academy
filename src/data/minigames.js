// Registry of every mini-game. Scenes are registered in scenes/index.js; ids are stable keys in the save file.
// `minGrade` hides a game from younger players (Pre-K = -1, K = 0): it needs reading or typing they cannot do yet.
// `playSceneKey` is the game's Pre-K version: learning and touching instead of questions (the launcher picks it).
// MINIGAMES are the games of the world, its quests and badges; EARLY_GAMES are extra games for Pre-K to Grade 1
// (`maxGrade`) that only the Challenge menu shows.
import { gradeOf } from './grades.js';

export const MINIGAMES = [
  { id: 'math-dash', subject: 'math', title: 'Number Dash', sceneKey: 'MG_NumberDash', icon: '⚡', npc: 'prof-plus',
    description: 'Quick-fire sums against the clock.' },
  { id: 'math-pizza', subject: 'math', title: 'Fraction Pizza', sceneKey: 'MG_FractionPizza', icon: '🍕', npc: 'chef-fraction', minGrade: 1,
    description: 'Slice and shade pizzas to match fractions.' },
  { id: 'math-bridge', subject: 'math', title: 'Pattern Bridge', sceneKey: 'MG_PatternBridge', icon: '🌉', npc: 'bridge-keeper',
    description: 'Find the missing plank in the number pattern.' },
  { id: 'math-balloons', subject: 'math', title: 'Balloon Pop', sceneKey: 'MG_BalloonPop', icon: '🎈', npc: 'balloon-seller',
    description: 'Pop the balloon with the right answer before it floats away.' },
  { id: 'eng-builder', subject: 'words', title: 'Word Builder', sceneKey: 'MG_WordBuilder', icon: '🔤', npc: 'owl-librarian', minGrade: 0,
    description: 'Unscramble the letters to build the word.' },
  { id: 'eng-grammar', subject: 'words', title: 'Grammar Gate', sceneKey: 'MG_GrammarGate', icon: '🚪', npc: 'gate-guard', minGrade: 1,
    description: 'Fill the blank with the right word.' },
  { id: 'eng-match', subject: 'words', title: 'Word Match', sceneKey: 'MG_WordMatch', icon: '🔗', npc: 'safari-ranger',
    description: 'Pair up words that belong together.' },
  { id: 'eng-frog', subject: 'words', title: 'Frog Hop', sceneKey: 'MG_FrogHop', icon: '🐸', npc: 'frog-friend',
    description: 'Hop across the pond on the lily pad with the right word.' },
  { id: 'code-maze', subject: 'code', title: 'Robo Maze', sceneKey: 'MG_RoboMaze', icon: '🤖', npc: 'robo-mechanic', usesLevels: true,
    description: 'Build a program to guide the robot to the goal.' },
  { id: 'code-bug', subject: 'code', title: 'Bug Hunt', sceneKey: 'MG_BugHunt', icon: '🐛', npc: 'bug-catcher', minGrade: 1,
    description: 'Find and fix the broken block.' },
  { id: 'code-predict', subject: 'code', title: 'Predict the Robot', sceneKey: 'MG_PredictRobot', icon: '🔮', npc: 'fortune-teller', minGrade: 1,
    description: 'Read the program. Where will the robot end up?' },
  { id: 'code-dance', subject: 'code', title: 'Robot Dance', sceneKey: 'MG_RobotDance', icon: '🕺', npc: 'dj-bot',
    description: 'Watch the robot dance, then pick the program it followed.' },
  { id: 'bible-quiz', subject: 'bible', title: 'Bible Quiz', sceneKey: 'MG_BibleQuiz', icon: '📖', npc: 'shepherd',
    description: 'Who, what and where in the Bible.' },
  { id: 'bible-verse', subject: 'bible', title: 'Verse Builder', sceneKey: 'MG_BibleQuiz', icon: '✨', npc: 'scribe', minGrade: 1,
    description: 'Fill in the missing word of the verse.' },
  { id: 'bible-match', subject: 'bible', title: 'Who Am I?', sceneKey: 'MG_WordMatch', icon: '🐑', npc: 'fisherman',
    description: 'Match each Bible person to their story.' },
  { id: 'bible-ark', subject: 'bible', title: 'All Aboard the Ark', sceneKey: 'MG_ArkAnimals', playSceneKey: 'MG_ArkPlay', icon: '🛶', npc: 'ark-builder',
    description: 'Answer questions to bring the animals aboard two by two.', playDescription: 'Touch the animals, hear their real calls, and bring them aboard two by two.' },
  { id: 'sci-habitat', subject: 'science', title: 'Habitat Match', sceneKey: 'MG_ScienceLab', playSceneKey: 'MG_SciencePlay', icon: '🌴', npc: 'ranger-rio',
    description: 'Match each animal to the place it calls home, and learn what helps it live there.', playDescription: 'Touch an animal to hear where it lives.' },
  { id: 'sci-plants', subject: 'science', title: 'Plant Power', sceneKey: 'MG_ScienceLab', playSceneKey: 'MG_SciencePlay', icon: '🌱', npc: 'botanist',
    description: 'What a plant needs, its parts and its life, from seed to fruit.', playDescription: 'Touch the sun, the water and the leaves to learn about plants.' },
  { id: 'sci-float', subject: 'science', title: 'Sink or Float', sceneKey: 'MG_ScienceLab', playSceneKey: 'MG_SciencePlay', icon: '🛟', npc: 'captain-cork',
    description: 'Guess, then drop it in: which things sink, which float, and why.', playDescription: 'Touch something to drop it in the water.' },
  { id: 'sci-matter', subject: 'science', title: 'States of Matter', sceneKey: 'MG_ScienceLab', playSceneKey: 'MG_SciencePlay', icon: '🧊', npc: 'dr-misty',
    description: 'Solids, liquids and gases, and how heat and cold change them.', playDescription: 'Touch ice, water and steam to find out what they are.' }
];

/** Games only for the youngest players (Pre-K to Grade 1), shown first in their Challenge menu. */
export const EARLY_GAMES = [
  { id: 'math-count', subject: 'math', title: 'Count It', sceneKey: 'MG_CountIt', icon: '🥭', maxGrade: 1,
    description: 'Count the pictures, find the number, spot the shape.' },
  { id: 'eng-trace', subject: 'words', title: 'Letter Trace', sceneKey: 'MG_LetterTrace', icon: '✏️', maxGrade: 1,
    description: 'Trace each letter with your finger and hear its sound.' }
];

export const ALL_GAMES = [...MINIGAMES, ...EARLY_GAMES];
export const getGame = (id) => ALL_GAMES.find((g) => g.id === id);
/** The world's games for a subject (quests, badges and grade-ups count these). */
export const gamesForSubject = (subject) => MINIGAMES.filter((g) => g.subject === subject);

/** May a player of `grade` play this game? */
export const playableAt = (game, grade) => { const g = gradeOf(grade); return g >= (game.minGrade ?? -Infinity) && g <= (game.maxGrade ?? Infinity); };

/** The games a player of `grade` sees for a subject: the early-years games first, then the world's games they can play. */
export const gamesForGrade = (subject, grade) => [...EARLY_GAMES, ...MINIGAMES].filter((g) => g.subject === subject && playableAt(g, grade));
