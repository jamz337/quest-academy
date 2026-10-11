import { TouchPlay } from '../TouchPlay.js';
import { ART_PLAY_SETS } from '../../../data/art/play.js';

/**
 * Studio Summit for Pre-K: touch and learn. Red, yellow, blue and green things find their colours, butterflies and
 * fish sort into same-both-sides and not, balls and boxes into round, pointy and square, and the tools of the
 * studio into drawing and building.
 */
export class ArtPlay extends TouchPlay {
  constructor() { super('MG_ArtPlay', ART_PLAY_SETS, 'artist'); }
}
