import type { Player } from './player.js';
import type { Role, Pack } from './roles.js';

/**
 * Game phases (FSM states)
 */
export type GamePhase =
  | 'LOBBY'              // Waiting for players, configuration
  | 'INIT'               // Initializing game state
  | 'ASSIGN_ROLES'       // Generating and assigning roles
  | 'DAY_FREE_TALK'      // Free discussion phase
  | 'DAY_VOTE'           // Voting phase
  | 'NIGHT_WOLF_CHAT'    // Wolves discuss privately (if 2+ wolves alive)
  | 'NIGHT_ACTIONS'      // Night actions (seer, knight, attack)
  | 'DAWN'               // Reveal night results
  | 'CHECK_END'          // Check victory conditions
  | 'GAME_OVER';         // Game ended

/**
 * Seeds for deterministic random generation
 */
export interface GameSeeds {
  roster: number;      // AI personality generation
  roles: number;       // Role assignment shuffle
  packs: number;       // Pack combination selection (for random start)
  turns: number;       // Random votes, action fallbacks
  wolfLeader: number;  // Night leader selection
}

/**
 * Phase timer configuration
 */
export interface PhaseTimers {
  dayFreeTalk: number;    // Free discussion time (ms)
  dayVote: number;        // Voting time (ms)
  nightWolfChat: number;  // Wolf chat time (ms)
  nightActions: number;   // Night action time (ms)
  dawn: number;           // Dawn announcement time (ms)
}

/**
 * Game configuration
 */
export interface GameConfig {
  numPlayers: number;
  numAI: number;
  packs: Pack[];              // Selected packs (empty for base game)
  timers: PhaseTimers;
  randomStart: boolean;       // If true, packs were randomly selected
}

/**
 * Game state
 */
export interface GameState {
  gameId: string;
  phase: GamePhase;
  dayNumber: number;
  players: Player[];
  alivePlayers: Set<string>;  // Player IDs
  roleAssignments: Map<string, Role>;  // playerId -> role (server-only)
  phaseStartTime: number;
  phaseDeadline: number;
  seeds: GameSeeds;
  config: GameConfig;
  winner?: 'VILLAGE' | 'WEREWOLF' | 'FOX';
  createdAt: number;
  endedAt?: number;
  
  // Action tracking
  votes: Map<string, string>;  // voterId -> targetId
  nightActions: Map<string, any>;  // playerId -> action
  wolfAttacks: Map<string, string>;  // attackerId -> targetId
  deaths: any[];  // Death records
}

/**
 * Game events (FSM transitions)
 */
export type GameEventType =
  | 'START_GAME'
  | 'ROLES_ASSIGNED'
  | 'START_DAY'
  | 'START_VOTE'
  | 'VOTE'
  | 'VOTE_COMPLETE'
  | 'CHECK_VICTORY'
  | 'START_NIGHT'
  | 'WOLF_CHAT_MESSAGE'
  | 'ENTER_PHASE'
  | 'START_NIGHT_ACTIONS'
  | 'NIGHT_ACTION'
  | 'WOLF_ATTACK'
  | 'RESOLVE_NIGHT'
  | 'NIGHT_COMPLETE'
  | 'START_DAWN'
  | 'DAWN_COMPLETE'
  | 'GAME_END';

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  payload?: any;
}

/**
 * Transition result
 */
export interface TransitionResult {
  nextState: GameState;
  events: GameEvent[];
  broadcast?: any[];  // Messages to broadcast to clients
}

/**
 * Room information
 */
export interface Room {
  id: string;
  gameState: GameState;
  createdBy: string;
  createdAt: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
}

