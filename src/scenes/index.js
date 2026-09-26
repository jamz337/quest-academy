import { BootScene } from './BootScene.js';
import { ProfileScene } from './ProfileScene.js';
import { ModeSelectScene } from './ModeSelectScene.js';
import { WorldScene } from './WorldScene.js';
import { HudScene } from './HudScene.js';
import { ChallengeMenuScene } from './ChallengeMenuScene.js';
import { LevelSelectScene } from './LevelSelectScene.js';
import { ResultsScene } from './ResultsScene.js';
import { PauseScene } from './PauseScene.js';
import { AccountScene } from './AccountScene.js';
import { LeaderboardScene } from './LeaderboardScene.js';
import { NumberDash } from './minigames/math/NumberDash.js';
import { FractionPizza } from './minigames/math/FractionPizza.js';
import { PatternBridge } from './minigames/math/PatternBridge.js';
import { WordBuilder } from './minigames/english/WordBuilder.js';
import { GrammarGate } from './minigames/english/GrammarGate.js';
import { WordMatch } from './minigames/english/WordMatch.js';
import { RoboMaze } from './minigames/coding/RoboMaze.js';
import { BugHunt } from './minigames/coding/BugHunt.js';
import { PredictRobot } from './minigames/coding/PredictRobot.js';
import { BossBattle } from './minigames/BossBattle.js';

// Order matters for render depth: later scenes draw on top when several are active.
export const scenes = [
  BootScene, ProfileScene, ModeSelectScene, WorldScene, HudScene, ChallengeMenuScene, LevelSelectScene,
  NumberDash, FractionPizza, PatternBridge, WordBuilder, GrammarGate, WordMatch,
  RoboMaze, BugHunt, PredictRobot, BossBattle,
  ResultsScene, PauseScene, AccountScene, LeaderboardScene
];
