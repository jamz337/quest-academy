import { TouchPlay } from '../TouchPlay.js';
import { HEALTH_PLAY_SETS } from '../../../data/health/play.js';

/**
 * The Hospital for Pre-K: touch and learn. Eyes and ears, legs and teeth find what they do; apples and sweets sort
 * into every-day and sometimes foods; soap and sneezes into germ zappers and germ spreaders; hugs, beds and
 * footballs into happy, rest and getting active.
 */
export class HealthPlay extends TouchPlay {
  constructor() { super('MG_HealthPlay', HEALTH_PLAY_SETS, 'helper'); }
}
