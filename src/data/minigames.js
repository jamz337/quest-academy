// Registry of every mini-game. Scenes are registered in scenes/index.js; ids are stable keys in the save file.
export const MINIGAMES = [
  { id: 'math-dash', subject: 'math', title: 'Number Dash', sceneKey: 'MG_NumberDash', icon: '⚡', npc: 'prof-plus',
    description: 'Quick-fire sums against the clock.' },
  { id: 'math-pizza', subject: 'math', title: 'Fraction Pizza', sceneKey: 'MG_FractionPizza', icon: '🍕', npc: 'chef-fraction',
    description: 'Slice and shade pizzas to match fractions.' },
  { id: 'math-bridge', subject: 'math', title: 'Pattern Bridge', sceneKey: 'MG_PatternBridge', icon: '🌉', npc: 'bridge-keeper',
    description: 'Find the missing plank in the number pattern.' },
  { id: 'math-balloons', subject: 'math', title: 'Balloon Pop', sceneKey: 'MG_BalloonPop', icon: '🎈', npc: 'balloon-seller',
    description: 'Pop the balloon with the right answer before it floats away.' },
  { id: 'eng-builder', subject: 'words', title: 'Word Builder', sceneKey: 'MG_WordBuilder', icon: '🔤', npc: 'owl-librarian',
    description: 'Unscramble the letters to build the word.' },
  { id: 'eng-grammar', subject: 'words', title: 'Grammar Gate', sceneKey: 'MG_GrammarGate', icon: '🚪', npc: 'gate-guard',
    description: 'Fill the blank with the right word.' },
  { id: 'eng-match', subject: 'words', title: 'Word Match', sceneKey: 'MG_WordMatch', icon: '🔗', npc: 'safari-ranger',
    description: 'Pair up words that belong together.' },
  { id: 'eng-frog', subject: 'words', title: 'Frog Hop', sceneKey: 'MG_FrogHop', icon: '🐸', npc: 'frog-friend',
    description: 'Hop across the pond on the lily pad with the right word.' },
  { id: 'code-maze', subject: 'code', title: 'Robo Maze', sceneKey: 'MG_RoboMaze', icon: '🤖', npc: 'robo-mechanic', usesLevels: true,
    description: 'Build a program to guide the robot to the goal.' },
  { id: 'code-bug', subject: 'code', title: 'Bug Hunt', sceneKey: 'MG_BugHunt', icon: '🐛', npc: 'bug-catcher',
    description: 'Find and fix the broken block.' },
  { id: 'code-predict', subject: 'code', title: 'Predict the Robot', sceneKey: 'MG_PredictRobot', icon: '🔮', npc: 'fortune-teller',
    description: 'Read the program. Where will the robot end up?' },
  { id: 'code-dance', subject: 'code', title: 'Robot Dance', sceneKey: 'MG_RobotDance', icon: '🕺', npc: 'dj-bot',
    description: 'Watch the robot dance, then pick the program it followed.' },
  { id: 'bible-quiz', subject: 'bible', title: 'Bible Quiz', sceneKey: 'MG_BibleQuiz', icon: '📖', npc: 'shepherd',
    description: 'Who, what and where in the Bible.' },
  { id: 'bible-verse', subject: 'bible', title: 'Verse Builder', sceneKey: 'MG_BibleQuiz', icon: '✨', npc: 'scribe',
    description: 'Fill in the missing word of the verse.' },
  { id: 'bible-match', subject: 'bible', title: 'Who Am I?', sceneKey: 'MG_WordMatch', icon: '🐑', npc: 'fisherman',
    description: 'Match each Bible person to their story.' },
  { id: 'bible-ark', subject: 'bible', title: 'All Aboard the Ark', sceneKey: 'MG_ArkAnimals', icon: '🛶', npc: 'ark-builder',
    description: 'Answer questions to bring the animals aboard two by two.' }
];

export const getGame = (id) => MINIGAMES.find((g) => g.id === id);
export const gamesForSubject = (subject) => MINIGAMES.filter((g) => g.subject === subject);
