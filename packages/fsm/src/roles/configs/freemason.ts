import type { PackConfig } from '@aiwolf/shared';

export const FREEMASON_CONFIG: PackConfig = {
  pack: 'FREEMASON',
  replaces: ['VILLAGER', 'VILLAGER'],
  newRoles: ['FREEMASON', 'FREEMASON'],
  constraints: [
    {
      type: 'WEIGHT_REDUCTION',
      conflictsWith: ['FANATIC'],
      description: 'Combination with FANATIC reduces selection probability',
    },
  ],
  description: 'Two villagers who know each other\'s identity at game start.',
};

