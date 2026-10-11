import { TouchPlay } from '../TouchPlay.js';
import { MUSIC_PLAY_SETS } from '../../../data/music/play.js';
import { Music } from '../../../systems/Audio.js';

/**
 * Melody Market for Pre-K: touch and learn, with a sound for everything. Drums boom and shakers rattle, long and
 * short sounds find their panels, high and low voices sort themselves, and each instrument plays as it is named.
 */
export class MusicPlay extends TouchPlay {
  constructor() { super('MG_MusicPlay', MUSIC_PLAY_SETS, 'musician'); }

  onTap(item) { if (item && item.sound) Music.play(item.sound); }
}
