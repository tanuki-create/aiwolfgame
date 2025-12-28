import type { PackConfig } from '@aiwolf/shared';

export const FOX_CONFIG: PackConfig = {
  pack: 'FOX',
  replaces: ['VILLAGER'],
  newRoles: ['FOX'],
  constraints: [
    {
      type: 'THIRD_PARTY_EXCLUSIVE',
      description: 'Only one third-party faction allowed per game',
    },
  ],
  description: 'Third-party faction. Wins if alive when either village or wolves win. Dies if divined by seer.',
};

