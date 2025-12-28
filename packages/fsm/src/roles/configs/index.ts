import type { Pack, PackConfig } from '@aiwolf/shared';
import { FOX_CONFIG } from './fox.js';
import { FREEMASON_CONFIG } from './freemason.js';
import { HUNTER_CONFIG } from './hunter.js';
import { FANATIC_CONFIG } from './fanatic.js';
import { WHITE_WOLF_CONFIG } from './whiteWolf.js';

export const ALL_PACK_CONFIGS: Record<Pack, PackConfig> = {
  FOX: FOX_CONFIG,
  FREEMASON: FREEMASON_CONFIG,
  HUNTER: HUNTER_CONFIG,
  FANATIC: FANATIC_CONFIG,
  WHITE_WOLF: WHITE_WOLF_CONFIG,
};

export { FOX_CONFIG, FREEMASON_CONFIG, HUNTER_CONFIG, FANATIC_CONFIG, WHITE_WOLF_CONFIG };

