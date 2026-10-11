import { BootScene } from './BootScene.js';
import { ProfileScene } from './ProfileScene.js';
import { ModeSelectScene } from './ModeSelectScene.js';
import { WorldScene } from './WorldScene.js';
import { HouseScene } from './HouseScene.js';
import { HouseRoomScene } from './HouseRoomScene.js';
import { ChurchScene } from './ChurchScene.js';
import { ChurchLessonScene } from './ChurchLessonScene.js';
import { FxScene } from './FxScene.js';
import { MarketScene } from './MarketScene.js';
import { CreditsScene } from './CreditsScene.js';
import { HudScene } from './HudScene.js';
import { ChallengeMenuScene } from './ChallengeMenuScene.js';
import { LevelSelectScene } from './LevelSelectScene.js';
import { ResultsScene } from './ResultsScene.js';
import { PauseScene } from './PauseScene.js';
import { AccountScene } from './AccountScene.js';
import { LeaderboardScene } from './LeaderboardScene.js';
import { SkillsScene } from './SkillsScene.js';
import { SpellingScene } from './SpellingScene.js';
import { SpellingGameScene } from './SpellingGameScene.js';
import { SpellingLearnScene } from './SpellingLearnScene.js';
import { NumberDash } from './minigames/math/NumberDash.js';
import { FractionPizza } from './minigames/math/FractionPizza.js';
import { PatternBridge } from './minigames/math/PatternBridge.js';
import { WordBuilder } from './minigames/english/WordBuilder.js';
import { GrammarGate } from './minigames/english/GrammarGate.js';
import { WordMatch } from './minigames/english/WordMatch.js';
import { RoboMaze } from './minigames/coding/RoboMaze.js';
import { BugHunt } from './minigames/coding/BugHunt.js';
import { PredictRobot } from './minigames/coding/PredictRobot.js';
import { DuelScene } from './minigames/DuelScene.js';
import { BibleQuiz } from './minigames/bible/BibleQuiz.js';
import { BalloonPop } from './minigames/math/BalloonPop.js';
import { FrogHop } from './minigames/english/FrogHop.js';
import { RobotDance } from './minigames/coding/RobotDance.js';
import { ArkAnimals } from './minigames/bible/ArkAnimals.js';
import { ArkPlay } from './minigames/bible/ArkPlay.js';
import { ScienceLab } from './minigames/science/ScienceLab.js';
import { SciencePlay } from './minigames/science/SciencePlay.js';
import { HistoryQuiz } from './minigames/history/HistoryQuiz.js';
import { HistoryPlay } from './minigames/history/HistoryPlay.js';
import { MusicQuiz } from './minigames/music/MusicQuiz.js';
import { MusicPlay } from './minigames/music/MusicPlay.js';
import { ArtQuiz } from './minigames/art/ArtQuiz.js';
import { ArtPlay } from './minigames/art/ArtPlay.js';
import { CountIt } from './minigames/math/CountIt.js';
import { LetterTrace } from './minigames/english/LetterTrace.js';

// Order matters for render depth: later scenes draw on top when several are active.
export const scenes = [
  BootScene, ProfileScene, ModeSelectScene, WorldScene, HouseScene, ChurchScene, HudScene, ChallengeMenuScene, LevelSelectScene,
  NumberDash, FractionPizza, PatternBridge, BalloonPop, CountIt, WordBuilder, GrammarGate, WordMatch, FrogHop, LetterTrace,
  RoboMaze, BugHunt, PredictRobot, RobotDance, DuelScene, BibleQuiz, ArkAnimals, ArkPlay, ScienceLab, SciencePlay, HistoryQuiz, HistoryPlay, MusicQuiz, MusicPlay, ArtQuiz, ArtPlay,
  ResultsScene, PauseScene, AccountScene, LeaderboardScene, SkillsScene, SpellingScene, SpellingLearnScene, SpellingGameScene, HouseRoomScene, ChurchLessonScene, MarketScene, CreditsScene, FxScene   // last: celebrations draw over everything
];
