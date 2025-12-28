/**
 * Base roles in the 11-player game
 */
export type BaseRole = 
  | 'VILLAGER'
  | 'WEREWOLF'
  | 'SEER'
  | 'MEDIUM'
  | 'MADMAN'
  | 'KNIGHT';

/**
 * Pack-specific roles
 */
export type PackRole = 
  | 'FOX'           // Third-party faction
  | 'BETRAYER'      // Fox team supporter, dies when fox dies
  | 'CAT'           // Retaliates when attacked
  | 'FREEMASON'     // Shared information role
  | 'HUNTER'        // Chain reaction on death
  | 'FANATIC'       // Judgment modifier
  | 'WHITE_WOLF';   // Judgment modifier + werewolf variant

/**
 * All possible roles
 */
export type Role = BaseRole | PackRole;

/**
 * Pack identifiers
 */
export type Pack = 'FOX' | 'FREEMASON' | 'HUNTER' | 'FANATIC' | 'WHITE_WOLF';

/**
 * Pack constraint types
 */
export type PackConstraintType = 
  | 'THIRD_PARTY_EXCLUSIVE'    // Only one third-party faction allowed
  | 'JUDGMENT_EXCLUSIVE'       // Only one judgment modifier allowed
  | 'WEIGHT_REDUCTION';        // Combination reduces selection weight

export interface PackConstraint {
  type: PackConstraintType;
  conflictsWith?: Pack[];
  description: string;
}

/**
 * Configuration for each pack
 */
export interface PackConfig {
  pack: Pack;
  replaces: BaseRole[];        // Which base roles this pack replaces
  newRoles: PackRole[];        // What roles are added
  constraints: PackConstraint[];
  description: string;
}

/**
 * Base role counts for 11-player game
 * Default: WEREWOLF×2, SEER×1, MEDIUM×1, MADMAN×1, KNIGHT×1, VILLAGER×5
 */
export const BASE_ROLES_11: BaseRole[] = [
  'WEREWOLF',
  'WEREWOLF',
  'SEER',
  'MEDIUM',
  'MADMAN',
  'KNIGHT',
  'VILLAGER',
  'VILLAGER',
  'VILLAGER',
  'VILLAGER',
  'VILLAGER',
];

/**
 * Team/faction for each role
 */
export type Team = 'VILLAGE' | 'WEREWOLF' | 'FOX';

export const ROLE_TEAMS: Record<Role, Team> = {
  VILLAGER: 'VILLAGE',
  SEER: 'VILLAGE',
  MEDIUM: 'VILLAGE',
  KNIGHT: 'VILLAGE',
  FREEMASON: 'VILLAGE',
  HUNTER: 'VILLAGE',
  CAT: 'VILLAGE',
  WEREWOLF: 'WEREWOLF',
  WHITE_WOLF: 'WEREWOLF',
  MADMAN: 'WEREWOLF',
  FANATIC: 'WEREWOLF',
  FOX: 'FOX',
  BETRAYER: 'FOX',
};

/**
 * Divination results (what the seer sees)
 */
export type DivinationResult = 'WEREWOLF' | 'HUMAN';

/**
 * Medium results (what the medium learns about executed players)
 */
export type MediumResult = 'WEREWOLF' | 'HUMAN';

