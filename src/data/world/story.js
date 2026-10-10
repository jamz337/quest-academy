// The Academy Bell: the main mission that ties Explore mode together. Long ago the Academy's great bell rang
// every morning and kept the lands friendly, until the bosses each stole a piece of it. Headmistress
// Hope, who waits by the player's house, sets the task; Mango the green monkey tags along and cheers each
// mini mission; each land is a chapter whose missions lead to the castle, and every beaten boss gives back a
// piece of the bell. Pure data and functions over the profile (profile.story = { started, announced, finale }).
import { ZONE_ORDER, zoneQuests, bossReady, bossDefeated, activeZone } from './quests.js';
import { NPCS } from './npcs.js';
import { ERRANDS, errandFor, errandState } from './errands.js';
import { bossForZone } from './bosses.js';
import { ZONE_NAMES } from './map.js';
import { gradeOf } from '../grades.js';

export const MENTOR_ID = 'hope';
export const COMPANION = { id: 'mango', name: 'Mango', key: 'monkey' };
export const FINALE_COINS = 100;
export const MISSION_ORDER = ['guide', 'meet', 'stars', 'duels', 'errand', 'coins', 'boss'];

/** One chapter per land, in the order the story tells them. `piece` is the part of the bell its boss stole. */
export const CHAPTERS = [
  {
    zone: 'math', guide: 'prof-plus', piece: 'crown', pieceName: 'the crown of the bell', title: 'The Meadow Piece',
    intro: ['Ah, the bell! Count Chaos took its crown and hid it in his castle up north.', 'The Meadow folk will help you, but they need to know you first. Say hello to everyone, and show each house what you can do.'],
    lines: {
      guide: 'Professor Plus is on our side! He says the castle only opens for a true friend of the Meadow.',
      meet: 'Everyone in Math Meadow knows your name now!',
      stars: 'Every house in the Meadow has all its stars. The villagers are cheering!',
      duels: 'Every villager in the Meadow has lost a duel to you. Count Chaos is getting nervous!',
      errand: 'The Professor has his abacus back. That is how you win a Meadow heart!',
      coins: 'The last hidden coin! Count Chaos cannot hide from us now.',
      ready: 'The castle gates are creaking open. Count Chaos is waiting, friend!',
      piece: 'The crown of the bell! One piece is home. Headmistress Hope will be so proud.'
    }
  },
  {
    zone: 'science', guide: 'botanist', piece: 'yoke', pieceName: 'the yoke of the bell', title: 'The Springs Piece',
    intro: ['The Fog Fiend crept down from the springs and took the yoke, the beam the bell hangs from.', 'Professor Fern tends the greenhouses up there, through the archway at the top of the plaza. She will know where he lurks.'],
    lines: {
      guide: 'Professor Fern says the Fiend fogs up every experiment. Let us clear the air!',
      meet: 'All of Science Springs has met you. The springs are bubbling with the news!',
      stars: 'Every greenhouse in the Springs is full of stars. What a scientist!',
      duels: 'Everyone in the Springs has lost a duel to you. The Fog Fiend is getting misty-eyed!',
      errand: 'The Professor has her seeds back. The Springs trust you now.',
      coins: 'The last coin by the springs! The Fiend has nowhere left to hide.',
      ready: 'The Fiend\'s castle doors are open. Go and clear the fog!',
      piece: 'The yoke of the bell! Now there is something to hang it from.'
    }
  },
  {
    zone: 'words', guide: 'owl-librarian', piece: 'left', pieceName: 'the left side of the bell', title: 'The Woods Piece',
    intro: ['The Grammar Gremlin flew off with the left side of the bell into Word Woods.', 'The Owl Librarian knows those woods better than anyone. Start with her.'],
    lines: {
      guide: 'The Owl Librarian says the Gremlin muddles every sentence it touches. We will un-muddle them!',
      meet: 'The whole of Word Woods has met you. Even the frogs are talking about it.',
      stars: 'All the stars in Word Woods are lit. What a reader you are!',
      duels: 'Nobody in Word Woods can out-word you now. The Gremlin heard about it!',
      errand: 'The Owl has her book back. She says the trees whisper your name.',
      coins: 'Every coin in the woods is found. The Gremlin is running out of hiding places!',
      ready: 'The Gremlin\'s castle is open. Go and set the words straight!',
      piece: 'The left side of the bell! It hums a little when you hold it.'
    }
  },
  {
    zone: 'code', guide: 'robo-mechanic', piece: 'right', pieceName: 'the right side of the bell', title: 'The Cove Piece',
    intro: ['Glitch the Bug King dragged the right side of the bell down to Code Cove.', 'The Robo Mechanic has been fixing what Glitch breaks. She will know the way.'],
    lines: {
      guide: 'The Robo Mechanic says Glitch crashes every program on the beach. Let us debug the whole cove!',
      meet: 'All of Code Cove has said hello. Beep boop!',
      stars: 'Every house in the Cove shines with stars. Bug-free!',
      duels: 'Every coder in the Cove has lost a duel to you. Glitch is glitching with worry!',
      errand: 'The robot is charged again. The Mechanic says you are a friend of the Cove.',
      coins: 'The last coin on the beach! Glitch has nowhere left to hide.',
      ready: 'Glitch\'s castle is open. Time to squash the Bug King!',
      piece: 'The right side of the bell! Two halves make a whole, nearly.'
    }
  },
  {
    zone: 'bible', guide: 'shepherd', piece: 'clapper', pieceName: 'the clapper of the bell', title: 'The Village Piece',
    intro: ['Only the clapper is missing now, and Goliath keeps it in his castle in Bible Village.', 'Shepherd Eli has faced giants before. Go and find him.'],
    lines: {
      guide: 'Shepherd Eli says a giant is only tall. Courage is taller!',
      meet: 'Everyone in Bible Village has welcomed you.',
      stars: 'Every house in the Village has all its stars. What a story you are writing!',
      duels: 'The whole Village has duelled you and lost. Goliath is not laughing any more!',
      errand: 'The lost lamb is home with Eli. The whole village saw you carry her.',
      coins: 'The last coin in the Village. Goliath is next!',
      ready: 'Goliath has come out of his castle. Do not be afraid!',
      piece: 'The clapper! That is every piece of the Academy Bell. Run and tell Headmistress Hope!'
    }
  }
];

const COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

export const chapterFor = (zone) => CHAPTERS.find((c) => c.zone === zone) || null;
export const chapterNumber = (zone) => CHAPTERS.findIndex((c) => c.zone === zone) + 1;

export function ensureStory(profile) {
  const s = profile.story || (profile.story = {});
  s.started = !!s.started; s.announced ||= []; s.finale = !!s.finale; s.tutorial = !!s.tutorial;
  return s;
}

/** The bell pieces recovered so far, in chapter order. */
export const bellPieces = (profile) => CHAPTERS.filter((c) => bossDefeated(profile, c.zone)).map((c) => c.piece);

/**
 * The chapter's missions in story order, each with `available` (the ones before it are done). Everything but the
 * boss stays playable regardless; `available` only drives what the journal points at.
 */
export function chapterMissions(profile, zone) {
  const ch = chapterFor(zone);
  if (!ch) return [];
  const p = profile || {};
  const guide = NPCS.find((n) => n.id === ch.guide);
  const base = zoneQuests(p, zone);
  const byId = Object.fromEntries(base.map((q) => [q.id, q]));
  const talked = (p.world?.npcsTalked || []).includes(ch.guide);
  const missions = [
    { id: 'guide', title: `Talk to ${guide ? guide.name : 'the guide'}`, count: talked ? 1 : 0, total: 1, done: talked },
    { ...byId.meet, title: `Say hello to everyone in ${ZONE_NAMES[zone]}` },
    { ...byId.stars, title: 'Earn all the stars at every house' },
    { ...byId.duels, title: 'Beat every villager in a duel' },
    byId.errand && { ...byId.errand, title: `Run ${guide ? guide.name + "'s" : 'the'} errand` },
    { ...byId.coins, title: 'Find the hidden coins' },
    { ...byId.boss, title: `Defeat ${bossForZone(zone)?.name || 'the boss'} for ${ch.pieceName}` }
  ].filter(Boolean);
  let open = true;
  for (const m of missions) { m.available = open; if (!m.done) open = false; }
  return missions;
}

/** Where the story stands: { started, pieces, chapter, zone, missions, next, ready, complete }. */
export function storyState(profile) {
  const p = profile || {};
  const s = p.story || {};
  const pieces = bellPieces(p).length;
  const complete = pieces >= CHAPTERS.length;
  const zone = complete ? CHAPTERS[CHAPTERS.length - 1].zone : activeZone(p);
  const missions = chapterMissions(p, zone);
  const next = complete ? null : missions.find((m) => !m.done) || null;
  return { started: !!s.started, pieces, chapter: chapterNumber(zone), zone, missions, next, ready: !complete && bossReady(p, zone), complete, finale: !!s.finale };
}

/** What Headmistress Hope says: the whole tale the first time, then where the story stands. */
export function mentorLines(profile) {
  const st = storyState(profile);
  if (!st.started && gradeOf(profile?.grade, 4) <= 3) {
    return [
      'Hello! I am Headmistress Hope. I run Quest Academy.',
      `Long ago our big bell rang every morning. Then ${COUNT[CHAPTERS.length]} bosses stole it, one piece each.`,
      `Please find the ${COUNT[CHAPTERS.length]} pieces and ring the bell again. The villagers in each land will help you.`,
      'Mango the monkey will pop by to cheer you on. Start in Math Meadow, to the west!'
    ];
  }
  if (!st.started) {
    return [
      'Welcome, student! I am Headmistress Hope, head of Quest Academy. I have been waiting for someone like you.',
      'Long ago the Academy Bell rang every morning from the tower on the plaza, and all the lands were friends.',
      `Then the ${COUNT[CHAPTERS.length]} bosses stole it, a piece each, and hid the pieces in their castles. Without the bell the lands have drifted apart.`,
      `Your mission: bring back all ${COUNT[CHAPTERS.length]} pieces and ring the bell again. Each land is a chapter, and its villagers will show you the way to the castle once they trust you.`,
      'Mango, our green monkey, will pop by to cheer you on and drop clues. Open your journal from the menu any time to see your next step. Off you go, and start with Math Meadow!'
    ];
  }
  if (st.complete) return st.finale ? ['The bell rings every morning again, thanks to you. Listen to it!', 'You are the pride of Quest Academy.'] : ['You have every piece! Come and see, the bell is whole again!'];
  const ch = chapterFor(st.zone);
  const lines = [`Chapter ${st.chapter}: ${ch.title}. You have ${st.pieces} of ${CHAPTERS.length} pieces of the bell.`];
  if (st.next) lines.push(st.next.id === 'boss' ? ch.lines.ready : `Your next step: ${st.next.title.toLowerCase()}.`);
  return lines;
}

/** The chapter guide adds the chapter's opening lines the first time they are spoken to. */
export function guideLines(profile, npcId) {
  const ch = CHAPTERS.find((c) => c.guide === npcId);
  if (!ch) return [];
  const talked = (profile?.world?.npcsTalked || []).includes(npcId);
  return talked ? [] : ch.intro;
}

/** Sam the signpost points at the next step of the story. */
export function signpostLine(profile) {
  const st = storyState(profile);
  if (!st.started) return 'Welcome to Quest Academy! Headmistress Hope, by your house, has something important to tell you.';
  if (st.complete) return 'The Academy Bell is whole again! Every land is open to explore as you like.';
  const ch = chapterFor(st.zone);
  return st.next ? `Chapter ${st.chapter}, ${ZONE_NAMES[st.zone]}: ${st.next.title.toLowerCase()}. ${st.next.id === 'boss' ? ch.lines.ready : ''}`.trim() : `Head to ${ZONE_NAMES[st.zone]}.`;
}

const WAY = { math: 'to the west of the plaza', science: 'up north, through the archway at the top of the plaza', words: 'up in the north-east, through the archway', code: 'down south by the sea', bible: 'over to the east, past the archway' };

/** A clue for the next step of the story, for Mango's visits; null once the bell is whole. */
export function clueFor(profile) {
  const st = storyState(profile);
  if (!st.started || st.complete || !st.next) return null;
  const ch = chapterFor(st.zone), land = ZONE_NAMES[st.zone], way = WAY[st.zone];
  const guide = NPCS.find((n) => n.id === ch.guide);
  const m = st.next;
  switch (m.id) {
    case 'guide': return `${guide ? guide.name : 'The guide'} is waiting in ${land}, ${way}.`;
    case 'meet': return `${m.total - m.count} villager${m.total - m.count === 1 ? '' : 's'} in ${land} still want to say hello. Walk up and press A!`;
    case 'duels': return `${m.total - m.count} villager${m.total - m.count === 1 ? '' : 's'} in ${land} still want a duel. Talk to them and pick Duel!`;
    case 'stars': return `${m.total - m.count} house${m.total - m.count === 1 ? '' : 's'} in ${land} still need all three levels passed. The stars above each house show how far you are.`;
    case 'errand': { const e = errandFor(ch.guide); return e ? `${guide.name} has an errand: the ${e.item} is somewhere in ${ZONE_NAMES[e.zone]}. Ask, then look off the main roads!` : null; }
    case 'coins': return `${m.total - m.count} coin${m.total - m.count === 1 ? '' : 's'} still hidden along the roads of ${land}. Try the lanes off the main path.`;
    case 'boss': return ch.lines.ready;
    default: return null;
  }
}

/**
 * Missions (across every chapter) that are done but have not been announced yet: [{ zone, id, line }].
 * Mango says the chapter's line for each; markAnnounced() records it so it is said once.
 */
export function newlyDone(profile) {
  const s = ensureStory(profile);
  const out = [];
  for (const ch of CHAPTERS) {
    for (const m of chapterMissions(profile, ch.zone)) {
      if (!m.done || m.id === 'boss') continue;
      const key = `${ch.zone}:${m.id}`;
      if (!s.announced.includes(key)) out.push({ zone: ch.zone, id: m.id, key, line: ch.lines[m.id] });
    }
    if (!bossDefeated(profile, ch.zone) && bossReady(profile, ch.zone) && !s.announced.includes(`${ch.zone}:ready`)) out.push({ zone: ch.zone, id: 'ready', key: `${ch.zone}:ready`, line: ch.lines.ready });
    if (bossDefeated(profile, ch.zone) && !s.announced.includes(`${ch.zone}:piece`)) out.push({ zone: ch.zone, id: 'piece', key: `${ch.zone}:piece`, line: ch.lines.piece });
  }
  return out;
}

export function markAnnounced(profile, key) {
  const s = ensureStory(profile);
  if (!s.announced.includes(key)) s.announced.push(key);
}

/** Mark the story as begun (the Headmistress has told the tale). */
export function startStory(profile) { ensureStory(profile).started = true; }

/** The first-steps lesson (walk, then talk to Sam) has been finished. */
export function finishTutorial(profile) { ensureStory(profile).tutorial = true; }
export const tutorialDone = (profile) => !!profile?.story?.tutorial;

/** The finale pays once: coins and the Bell Ringer badge are handled by the caller. Returns true the first time. */
export function claimFinale(profile) {
  const s = ensureStory(profile);
  if (s.finale || bellPieces(profile).length < CHAPTERS.length) return false;
  s.finale = true;
  profile.coins = (profile.coins || 0) + FINALE_COINS;
  return true;
}

/** Sanity: every chapter's guide is a villager of that zone with an errand. */
export const chapterGuideOk = (ch) => { const n = NPCS.find((x) => x.id === ch.guide); return !!n && n.zone === ch.zone && !!errandFor(ch.guide); };
export { ERRANDS, errandState, ZONE_ORDER };
