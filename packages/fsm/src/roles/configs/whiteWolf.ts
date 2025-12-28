import type { PackConfig } from '@aiwolf/shared';

export const WHITE_WOLF_CONFIG: PackConfig = {
  pack: 'WHITE_WOLF',
  replaces: ['WEREWOLF'],
  newRoles: ['WHITE_WOLF'],
  constraints: [
    {
      type: 'JUDGMENT_EXCLUSIVE',
      conflictsWith: ['FANATIC'],
      description: 'Only one judgment modifier allowed per game',
    },
  ],
  description: 'Werewolf who appears as HUMAN to seer. Knows other werewolves and participates in night attacks.',
};

