import { TouchPlay } from '../TouchPlay.js';
import { PLAY_SETS } from '../../../data/science/play.js';

/**
 * Science Springs for Pre-K: touch and learn, no questions. Animals float to their homes (the sea, the desert…),
 * things sink or float, items sort into solid, liquid or gas, and a plant's needs and parts find their panels.
 */
export class SciencePlay extends TouchPlay {
  constructor() { super('MG_SciencePlay', PLAY_SETS, 'scientist'); }
}
