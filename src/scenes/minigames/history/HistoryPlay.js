import { TouchPlay } from '../TouchPlay.js';
import { HISTORY_PLAY_SETS } from '../../../data/history/play.js';
import { flagImage } from '../../../ui/Flags.js';

/**
 * History Harbor for Pre-K: touch and learn. The sunrise, the compass and the penguin find their directions,
 * helpers go to where they work, flags (drawn, never emoji) find their islands and big countries, and candles
 * and cars sort into long ago and today.
 */
export class HistoryPlay extends TouchPlay {
  constructor() { super('MG_HistoryPlay', HISTORY_PLAY_SETS, 'explorer'); }

  picture(x, y, px, item) { return item.flag ? flagImage(this, x, y, px * 1.6, px * 1.07, item.flag) : super.picture(x, y, px, item); }
}
