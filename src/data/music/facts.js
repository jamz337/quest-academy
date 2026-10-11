// Melody Market: the facts its four games draw on, from Pre-K sounds to Grade 8 vocabulary. Pure data, no Phaser.
// Sounds are descriptors the scenes play through systems/Audio.js's Music: { kind: 'notes', notes: [...] } or
// { kind: 'rhythm', beats: [...] }.

// ---- Instruments (Instrument Families, and the pictures the other games borrow) ------------------------------

export const FAMILIES = [
  { id: 'percussion', name: 'percussion', pic: '🥁', how: 'hit or shaken', tells: 'Percussion instruments are hit, tapped or shaken.' },
  { id: 'strings', name: 'strings', pic: '🎻', how: 'plucked or bowed', tells: 'String instruments have strings that are plucked, strummed or bowed.' },
  { id: 'wind', name: 'wind', pic: '🎺', how: 'blown', tells: 'Wind instruments are blown: the air inside them makes the sound.' },
  { id: 'keys', name: 'keyboard', pic: '🎹', how: 'pressed', tells: 'Keyboard instruments are played by pressing keys.' }
];
export const familyOf = (id) => FAMILIES.find((f) => f.id === id);

/** `how` is the verb for the youngest; `group` is the orchestra's family for older players (brass or woodwind for wind). */
export const INSTRUMENTS = [
  { name: 'drum', pic: '🥁', family: 'percussion', how: 'hit', group: 'percussion', fact: 'A drum is a skin stretched tight over a hollow body; hit it and the skin shakes.' },
  { name: 'bongos', pic: '🥁', family: 'percussion', how: 'hit', group: 'percussion', fact: 'Bongos are two small drums joined together, played with the hands.' },
  { name: 'tambourine', pic: '🪘', family: 'percussion', how: 'shake', group: 'percussion', fact: 'A tambourine has little metal jingles round its rim.' },
  { name: 'maracas', pic: '🎶', family: 'percussion', how: 'shake', group: 'percussion', fact: 'Maracas are rattles: seeds or beads inside a hollow shell. In Barbados they are called shak-shaks.' },
  { name: 'triangle', pic: '🔺', family: 'percussion', how: 'hit', group: 'percussion', fact: 'A triangle is a bent steel rod that rings when you tap it with a beater.' },
  { name: 'xylophone', pic: '🎵', family: 'percussion', how: 'hit', group: 'percussion', fact: 'A xylophone has wooden bars, each a different length, so each plays a different note.' },
  { name: 'steelpan', pic: '🛢️', family: 'percussion', how: 'hit', group: 'percussion', fact: 'The steelpan was invented in Trinidad and Tobago, hammered out of old oil drums.' },
  { name: 'cowbell', pic: '🔔', family: 'percussion', how: 'hit', group: 'percussion', fact: 'A cowbell keeps the beat in calypso and soca bands.' },
  { name: 'guitar', pic: '🎸', family: 'strings', how: 'strum', group: 'strings', fact: 'A guitar has six strings; press them against the neck to change the notes.' },
  { name: 'violin', pic: '🎻', family: 'strings', how: 'bow', group: 'strings', fact: 'A violin is played with a bow drawn across its four strings.' },
  { name: 'cello', pic: '🎻', family: 'strings', how: 'bow', group: 'strings', fact: 'A cello is a big violin that stands on the floor and plays low notes.' },
  { name: 'banjo', pic: '🪕', family: 'strings', how: 'strum', group: 'strings', fact: 'A banjo has a round body covered with a skin, like a drum with strings.' },
  { name: 'ukulele', pic: '🎸', family: 'strings', how: 'strum', group: 'strings', fact: 'A ukulele is a small four-string guitar from Hawaii.' },
  { name: 'harp', pic: '🎶', family: 'strings', how: 'pluck', group: 'strings', fact: 'A harp has dozens of strings, each one a different note, plucked with the fingers.' },
  { name: 'double bass', pic: '🎻', family: 'strings', how: 'pluck', group: 'strings', fact: 'The double bass is the biggest string instrument and plays the lowest notes.' },
  { name: 'trumpet', pic: '🎺', family: 'wind', how: 'blow', group: 'brass', fact: 'A trumpet is brass: you buzz your lips into the mouthpiece and press three valves.' },
  { name: 'trombone', pic: '🎺', family: 'wind', how: 'blow', group: 'brass', fact: 'A trombone has a slide you push in and out to change the notes.' },
  { name: 'tuba', pic: '🎺', family: 'wind', how: 'blow', group: 'brass', fact: 'The tuba is the biggest brass instrument and plays the lowest notes.' },
  { name: 'flute', pic: '🎶', family: 'wind', how: 'blow', group: 'woodwind', fact: 'A flute is played by blowing across a hole, like blowing across a bottle top.' },
  { name: 'recorder', pic: '🎶', family: 'wind', how: 'blow', group: 'woodwind', fact: 'A recorder is the first wind instrument many children learn.' },
  { name: 'clarinet', pic: '🎶', family: 'wind', how: 'blow', group: 'woodwind', fact: 'A clarinet has a thin reed that buzzes when you blow.' },
  { name: 'saxophone', pic: '🎷', family: 'wind', how: 'blow', group: 'woodwind', fact: 'A saxophone is made of brass but counts as woodwind, because it has a reed.' },
  { name: 'penny whistle', pic: '🎶', family: 'wind', how: 'blow', group: 'woodwind', fact: 'The penny whistle plays the tune in a Barbados tuk band.' },
  { name: 'piano', pic: '🎹', family: 'keys', how: 'press', group: 'keyboard', fact: 'A piano has 88 keys; each one makes a little hammer strike a string inside.' },
  { name: 'accordion', pic: '🪗', family: 'keys', how: 'press', group: 'keyboard', fact: 'An accordion is squeezed to push air past its reeds while you press the keys.' },
  { name: 'organ', pic: '🎹', family: 'keys', how: 'press', group: 'keyboard', fact: 'A church organ pushes air through pipes, some taller than a house.' }
];
export const instrumentsIn = (family) => INSTRUMENTS.filter((i) => i.family === family);
export const HOW_WORDS = { hit: 'hit it', shake: 'shake it', strum: 'strum it', bow: 'play it with a bow', pluck: 'pluck it', blow: 'blow into it', press: 'press its keys' };
export const GROUPS = ['percussion', 'strings', 'brass', 'woodwind', 'keyboard'];

export const CARIBBEAN_FACTS = [
  { q: 'Where was the steelpan invented?', a: 'Trinidad and Tobago', pool: ['Jamaica', 'Barbados', 'England'], explain: 'Steelpans were first hammered out of oil drums in Trinidad in the 1930s and 40s.', band: 'B' },
  { q: 'Which instrument plays the tune in a Barbados tuk band?', a: 'the penny whistle', pool: ['the piano', 'the violin', 'the trumpet'], explain: 'A tuk band is a kettle drum, a bass drum, a triangle and a penny whistle.', band: 'B' },
  { q: 'Reggae music comes from…', a: 'Jamaica', pool: ['Barbados', 'Cuba', 'Brazil'], explain: 'Reggae grew up in Jamaica in the 1960s; Bob Marley made it famous around the world.', band: 'B' },
  { q: 'Calypso and soca come from…', a: 'Trinidad and Tobago', pool: ['Canada', 'Spain', 'Japan'], explain: 'Calypso began in Trinidad; soca, its faster cousin, powers Carnival and Crop Over.', band: 'B' },
  { q: 'Spouge is a music style born in…', a: 'Barbados', pool: ['Jamaica', 'Guyana', 'Haiti'], explain: 'Jackie Opel created spouge in Barbados in the 1960s.', band: 'C' },
  { q: 'What are shak-shaks?', a: 'rattles, like maracas', pool: ['small drums', 'bamboo flutes', 'bells on a stick'], explain: 'Shak-shaks are gourds filled with seeds, shaken to keep the beat.', band: 'B' },
  { q: 'The big Barbados festival full of music and costumes is…', a: 'Crop Over', pool: ['Thanksgiving', 'Diwali', 'Hogmanay'], explain: 'Crop Over celebrates the end of the sugar-cane harvest and ends with Grand Kadooment.', band: 'B' },
  { q: 'Which Barbadian singer became one of the most famous in the world?', a: 'Rihanna', pool: ['Adele', 'Shakira', 'Beyoncé'], explain: 'Rihanna, from Saint Michael, Barbados, is a National Hero of Barbados.', band: 'C' },
  { q: 'The tamboo bamboo bands of Trinidad made music with…', a: 'lengths of bamboo pounded on the ground', pool: ['glass bottles', 'church bells', 'electric guitars'], explain: 'When drums were banned, people played bamboo; later they found that oil drums rang even better.', band: 'C' },
  { q: 'What is a conch shell used as?', a: 'a horn to blow', pool: ['a drum', 'a guitar', 'a rattle'], explain: 'Fishermen blew conch shells to call people to the beach when the boats came in.', band: 'C' }
];

// ---- Rhythm Repeat -------------------------------------------------------------------------------------------

export const BEAT_WORDS = { boom: 'boom', tak: 'tak', shake: 'shh', ding: 'ding', '-': 'rest' };
export const BEAT_PICS = { boom: '🥁', tak: '👏', shake: '🎶', ding: '🔔', '-': '🤫' };
/** Short patterns for the youngest to hear and find; `name` is how they are written. */
export const PATTERNS = [
  ['boom', 'tak', 'tak'], ['tak', 'tak', 'boom'], ['boom', 'boom', 'tak'], ['tak', 'boom', 'tak'],
  ['boom', 'tak', 'boom', 'tak'], ['boom', 'boom', 'tak', 'tak'], ['tak', 'tak', 'tak', 'boom'], ['boom', '-', 'boom', 'tak'],
  ['tak', '-', 'tak', '-'], ['boom', 'tak', '-', 'tak']
];
export const patternWords = (beats) => beats.map((b) => BEAT_WORDS[b]).join(' ');

export const NOTE_VALUES = [
  { name: 'crotchet', sign: '♩', beats: 1, also: 'quarter note' },
  { name: 'minim', sign: '𝅗𝅥', beats: 2, also: 'half note' },
  { name: 'semibreve', sign: '𝅝', beats: 4, also: 'whole note' },
  { name: 'quaver', sign: '♪', beats: 0.5, also: 'eighth note' }
];
export const beatsWord = (b) => (b === 0.5 ? 'half a beat' : b === 1 ? 'one beat' : `${b === 2 ? 'two' : 'four'} beats`);

export const TEMPO_WORDS = [
  { word: 'tempo', means: 'how fast or slow the music goes', band: 'B' },
  { word: 'beat', means: 'the steady pulse you tap your foot to', band: 'B' },
  { word: 'rhythm', means: 'the pattern of long and short sounds', band: 'B' },
  { word: 'allegro', means: 'fast and lively', band: 'C' },
  { word: 'adagio', means: 'slow', band: 'C' },
  { word: 'bar', means: 'one group of beats, marked off by a line', band: 'B' },
  { word: 'rest', means: 'a silence counted like a note', band: 'B' },
  { word: 'syncopation', means: 'putting the accent on the off-beat', band: 'C' },
  { word: 'metronome', means: 'a machine that ticks a steady beat', band: 'C' }
];

// ---- Note Match ---------------------------------------------------------------------------------------------

export const NOTE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const SOLFEGE = ['do', 're', 'mi', 'fa', 'so', 'la', 'ti'];
export const SCALE_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

export const NOTE_WORDS = [
  { word: 'staff (stave)', means: 'the five lines music is written on', band: 'B' },
  { word: 'treble clef', means: 'the curly sign at the start of a line of high notes', band: 'B' },
  { word: 'bass clef', means: 'the sign at the start of a line of low notes', band: 'C' },
  { word: 'melody', means: 'the tune: the notes you hum', band: 'B' },
  { word: 'harmony', means: 'notes played together that sound good', band: 'C' },
  { word: 'scale', means: 'notes going up or down in order', band: 'B' },
  { word: 'chord', means: 'three or more notes played at once', band: 'C' },
  { word: 'forte', means: 'loud', band: 'B' },
  { word: 'piano (the word)', means: 'soft', band: 'B' },
  { word: 'crescendo', means: 'getting gradually louder', band: 'C' },
  { word: 'staccato', means: 'short and detached notes', band: 'C' },
  { word: 'legato', means: 'smooth, joined-up notes', band: 'C' }
];

export const MUSIC_FACTS = [
  { q: 'How many lines does a music staff have?', a: 'five', pool: ['three', 'four', 'six'], explain: 'Notes sit on the five lines and in the four spaces between them.', band: 'B' },
  { q: 'Which letters does the music alphabet use?', a: 'A to G', pool: ['A to Z', 'A to M', 'C to K'], explain: 'After G the letters start again at A, an octave higher.', band: 'B' },
  { q: 'How many beats are in a bar of 4/4 time?', a: 'four', pool: ['two', 'three', 'eight'], explain: 'The top number of a time signature says how many beats each bar has.', band: 'B' },
  { q: 'A waltz is counted in…', a: 'threes', pool: ['twos', 'fours', 'fives'], explain: 'ONE two three, ONE two three: waltz time is 3/4.', band: 'C' },
  { q: 'Who stands in front of an orchestra and keeps everyone together?', a: 'the conductor', pool: ['the drummer', 'the singer', 'the manager'], explain: 'The conductor beats time with a baton and shows the players when to come in.', band: 'B' },
  { q: 'A group of singers is called…', a: 'a choir', pool: ['a band', 'an orchestra', 'a troupe'], explain: 'A choir sings; an orchestra plays instruments.', band: 'B' },
  { q: 'Singing with no instruments at all is called…', a: 'a cappella', pool: ['allegro', 'solo', 'legato'], explain: 'A cappella means "in the chapel style", where voices sang alone.', band: 'C' },
  { q: 'Two people playing or singing together are a…', a: 'duet', pool: ['solo', 'trio', 'quartet'], explain: 'Solo is one, duet two, trio three, quartet four.', band: 'B' },
  { q: 'The national anthem of Barbados begins…', a: '"In plenty and in time of need"', pool: ['"God save the King"', '"O Canada"', '"Jamaica, land we love"'], explain: 'The anthem was written by Irving Burgie and Roland Edwards for independence in 1966.', band: 'C' },
  { q: 'What does a composer do?', a: 'writes music', pool: ['sells tickets', 'tunes pianos', 'dances'], explain: 'Composers write the notes down so others can play them.', band: 'B' },
  { q: 'The part of a song that repeats after each verse is the…', a: 'chorus', pool: ['bridge', 'intro', 'coda'], explain: 'Verses tell the story; the chorus is the bit everyone sings along to.', band: 'B' },
  { q: 'An eight-note scale ends on the same letter it began, one…', a: 'octave higher', pool: ['beat later', 'bar later', 'chord higher'], explain: 'Do re mi fa so la ti do: the last do is an octave above the first.', band: 'C' }
];

// ---- High & Low -------------------------------------------------------------------------------------------

export const HIGH_LOW = [
  { name: 'bird', pic: '🐦', pitch: 'high', note: 'C6' }, { name: 'mouse', pic: '🐭', pitch: 'high', note: 'B5' }, { name: 'kitten', pic: '🐱', pitch: 'high', note: 'A5' },
  { name: 'whistle', pic: '🎶', pitch: 'high', note: 'G5' }, { name: 'bell', pic: '🔔', pitch: 'high', note: 'E5' }, { name: 'flute', pic: '🎶', pitch: 'high', note: 'F5' },
  { name: 'cow', pic: '🐄', pitch: 'low', note: 'C3' }, { name: 'lion', pic: '🦁', pitch: 'low', note: 'D3' }, { name: 'frog', pic: '🐸', pitch: 'low', note: 'E3' },
  { name: 'tuba', pic: '🎺', pitch: 'low', note: 'F3' }, { name: 'big drum', pic: '🥁', pitch: 'low', note: 'C3' }, { name: 'thunder', pic: '⛈️', pitch: 'low', note: 'D3' }
];

export const VOICES = [
  { name: 'soprano', means: 'the highest singing voice, usually a woman or a child', band: 'B' },
  { name: 'alto', means: 'a lower woman\'s voice', band: 'C' },
  { name: 'tenor', means: 'a high man\'s voice', band: 'C' },
  { name: 'bass', means: 'the lowest singing voice, a deep man\'s voice', band: 'B' }
];
export const PITCH_WORDS = [
  { word: 'pitch', means: 'how high or low a sound is', band: 'B' },
  { word: 'octave', means: 'the gap to the next note with the same name, eight notes up', band: 'C' },
  { word: 'interval', means: 'the distance between two notes', band: 'C' },
  { word: 'sharp', means: 'a note raised a little (half a step higher)', band: 'C' },
  { word: 'flat', means: 'a note lowered a little (half a step lower)', band: 'C' },
  { word: 'treble', means: 'the high notes', band: 'B' },
  { word: 'bass', means: 'the low notes', band: 'B' },
  { word: 'unison', means: 'everyone singing the very same notes', band: 'C' }
];
