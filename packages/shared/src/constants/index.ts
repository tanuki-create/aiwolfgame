import type { PhaseTimers } from '../types/game.js';
import type { PackConfig } from '../types/roles.js';

/**
 * Default phase timers (in milliseconds)
 */
export const DEFAULT_TIMERS: PhaseTimers = {
  dayFreeTalk: 5 * 60 * 1000,    // 5 minutes
  dayVote: 2 * 60 * 1000,        // 2 minutes
  dayRevoteTalk: 30 * 1000,      // 30 seconds for tied players' final statement
  dayRevote: 60 * 1000,          // 1 minute for revote
  lastWill: 30 * 1000,           // 30 seconds for executed player's last will
  nightWolfChat: 3 * 60 * 1000,  // 3 minutes
  nightActions: 1 * 60 * 1000,   // 1 minute
  dawn: 10 * 1000,               // 10 seconds
};

/**
 * LLM timeout (per request)
 */
export const LLM_TIMEOUT = 8000; // 8 seconds

/**
 * AI speaking tempo configuration
 */
export const TEMPO_CONFIG = {
  minDelay: 500,              // Minimum delay before speaking (ms)
  charsPerMs: 100,            // Characters processed per typing delay unit
  msPerTypingUnit: 50,        // Typing delay per unit
  maxDelay: 3000,             // Maximum typing delay (ms)
  cooldown: 2000,             // Minimum time between same AI's messages (ms)
};

/**
 * Pack configurations
 */
export const PACK_CONFIGS: Record<string, PackConfig> = {
  FOX: {
    pack: 'FOX',
    replaces: ['VILLAGER'],
    newRoles: ['FOX'],
    constraints: [
      {
        type: 'THIRD_PARTY_EXCLUSIVE',
        description: 'Only one third-party faction allowed per game',
      },
    ],
    description: 'Third-party faction that wins if alive when either village or wolves win',
  },
  FREEMASON: {
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
    description: 'Two villagers who know each other\'s identity',
  },
  HUNTER: {
    pack: 'HUNTER',
    replaces: ['VILLAGER'],
    newRoles: ['HUNTER'],
    constraints: [],
    description: 'Takes one player with them when killed',
  },
  FANATIC: {
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
    description: 'Madman who appears as WEREWOLF to seer',
  },
  WHITE_WOLF: {
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
    description: 'Werewolf who appears as HUMAN to seer',
  },
};

/**
 * Skill level distribution target
 * Target: 20% beginner, 60% intermediate, 20% advanced
 */
export const SKILL_DISTRIBUTION = {
  BEGINNER: 0.2,
  INTERMEDIATE: 0.6,
  ADVANCED: 0.2,
};

/**
 * Game constants
 */
export const GAME_CONSTANTS = {
  NUM_PLAYERS: 11,
  MIN_WOLVES_FOR_CHAT: 2,
  MAX_MESSAGES_PER_PHASE: 100,  // Safety limit
};

