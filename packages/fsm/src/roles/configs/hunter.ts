import type { PackConfig } from '@aiwolf/shared';

export const HUNTER_CONFIG: PackConfig = {
  pack: 'HUNTER',
  replaces: ['VILLAGER'],
  newRoles: ['HUNTER'],
  constraints: [],
  description: 'Takes one random player with them when killed (execution or attack).',
};

