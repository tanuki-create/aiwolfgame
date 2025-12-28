import type { PackConfig } from '@aiwolf/shared';

export const FANATIC_CONFIG: PackConfig = {
  pack: 'FANATIC',
  replaces: ['MADMAN'],
  newRoles: ['FANATIC'],
  constraints: [
    {
      type: 'JUDGMENT_EXCLUSIVE',
      conflictsWith: ['WHITE_WOLF'],
      description: 'Only one judgment modifier allowed per game',
    },
    {
      type: 'WEIGHT_REDUCTION',
      conflictsWith: ['FREEMASON'],
      description: 'Combination with FREEMASON reduces selection probability',
    },
  ],
  description: 'Madman who appears as WEREWOLF to seer. Wins with werewolves but doesn\'t know who they are.',
};

