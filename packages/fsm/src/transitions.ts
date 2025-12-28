import type { GamePhase, GameEventType } from '@aiwolf/shared';

/**
 * Valid phase transitions
 * Maps current phase -> allowed events -> next phase
 */
export const PHASE_TRANSITIONS: Record<GamePhase, Partial<Record<GameEventType, GamePhase>>> = {
  LOBBY: {
    START_GAME: 'INIT',
  },
  INIT: {
    ROLES_ASSIGNED: 'ASSIGN_ROLES',
  },
  ASSIGN_ROLES: {
    START_DAY: 'DAY_FREE_TALK',
  },
  DAY_FREE_TALK: {
    START_VOTE: 'DAY_VOTE',
  },
  DAY_VOTE: {
    VOTE_COMPLETE: 'CHECK_END',
    START_NIGHT: 'NIGHT_WOLF_CHAT', // Skips to NIGHT_ACTIONS if not enough wolves
  },
  NIGHT_WOLF_CHAT: {
    NIGHT_COMPLETE: 'NIGHT_ACTIONS',
  },
  NIGHT_ACTIONS: {
    START_DAWN: 'DAWN',
  },
  DAWN: {
    DAWN_COMPLETE: 'CHECK_END',
  },
  CHECK_END: {
    START_DAY: 'DAY_FREE_TALK',
    GAME_END: 'GAME_OVER',
  },
  GAME_OVER: {
    // Terminal state
  },
};

/**
 * Validate if a transition is allowed
 */
export function isValidTransition(currentPhase: GamePhase, eventType: GameEventType): boolean {
  const allowedTransitions = PHASE_TRANSITIONS[currentPhase];
  return allowedTransitions ? eventType in allowedTransitions : false;
}

/**
 * Get next phase for a given event
 */
export function getNextPhase(currentPhase: GamePhase, eventType: GameEventType): GamePhase | null {
  const allowedTransitions = PHASE_TRANSITIONS[currentPhase];
  return allowedTransitions?.[eventType] ?? null;
}

/**
 * Check if phase requires timer enforcement
 */
export function requiresTimer(phase: GamePhase): boolean {
  return [
    'DAY_FREE_TALK',
    'DAY_VOTE',
    'NIGHT_WOLF_CHAT',
    'NIGHT_ACTIONS',
    'DAWN',
  ].includes(phase);
}

