import type { Role } from '../types/roles.js';

/**
 * Pack types available in the game
 */
export type PackType = 'BASIC' | 'C_COUNTRY' | 'G_COUNTRY' | 'CUSTOM' | 'RANDOM';

/**
 * Role specification for pack configuration
 */
export interface RoleSpec {
  role: Role;
  count: number;
  minPlayers?: number; // Minimum number of players required for this role to appear
}

/**
 * Pack configuration for game setup
 */
export interface PackConfiguration {
  name: string;
  description: string;
  roles: RoleSpec[];
}

/**
 * Pack definitions for all available packs
 */
export const PACK_DEFINITIONS: Record<PackType, PackConfiguration> = {
  BASIC: {
    name: '基本パック',
    description: '村人/人狼/占い師/霊媒師/騎士/狂人/妖狐',
    roles: [
      { role: 'VILLAGER', count: 4 }, // 11人時: 4人
      { role: 'WEREWOLF', count: 2 },
      { role: 'SEER', count: 1 },
      { role: 'MEDIUM', count: 1 },
      { role: 'KNIGHT', count: 1 },
      { role: 'MADMAN', count: 1 },
      { role: 'FOX', count: 1 },
    ],
  },
  C_COUNTRY: {
    name: 'C国パック',
    description: '基本 + 猫又',
    roles: [
      { role: 'VILLAGER', count: 3 },
      { role: 'WEREWOLF', count: 2 },
      { role: 'SEER', count: 1 },
      { role: 'MEDIUM', count: 1 },
      { role: 'KNIGHT', count: 1 },
      { role: 'MADMAN', count: 1 },
      { role: 'FOX', count: 1 },
      { role: 'CAT', count: 1 }, // 猫又: Attacked cat retaliates by killing 1 random player
    ],
  },
  G_COUNTRY: {
    name: 'G国パック',
    description: '基本 + 妖狐（複数）+ 背徳者',
    roles: [
      { role: 'VILLAGER', count: 3 },
      { role: 'WEREWOLF', count: 2 },
      { role: 'SEER', count: 1 },
      { role: 'MEDIUM', count: 1 },
      { role: 'KNIGHT', count: 1 },
      { role: 'MADMAN', count: 1 },
      { role: 'FOX', count: 1 },
      { role: 'BETRAYER', count: 1 }, // 背徳者: Fox team, dies if fox dies
    ],
  },
  CUSTOM: {
    name: 'カスタムパック',
    description: 'ユーザー定義（デフォルトは基本と同じ）',
    roles: [], // Will be set dynamically
  },
  RANDOM: {
    name: 'ランダムパック',
    description: '全役職からランダム選出',
    roles: [], // Generated at runtime
  },
};

/**
 * Get pack configuration by type
 */
export function getPackConfig(packType: PackType): PackConfiguration {
  return PACK_DEFINITIONS[packType];
}

/**
 * Validate pack configuration
 */
export function validatePackConfig(config: PackConfiguration, numPlayers: number): boolean {
  const totalRoles = config.roles.reduce((sum, spec) => sum + spec.count, 0);
  
  if (totalRoles !== numPlayers) {
    console.error(`Pack configuration mismatch: ${totalRoles} roles for ${numPlayers} players`);
    return false;
  }
  
  // Check minimum werewolf count
  const werewolfCount = config.roles.find(r => r.role === 'WEREWOLF')?.count || 0;
  if (werewolfCount < 1) {
    console.error('Pack must have at least 1 werewolf');
    return false;
  }
  
  return true;
}

