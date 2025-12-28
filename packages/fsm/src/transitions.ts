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
    VOTE: 'DAY_VOTE', // Stay in DAY_VOTE when receiving votes
    VOTE_COMPLETE: 'LAST_WILL', // Go to last will phase after voting
    START_NIGHT: 'NIGHT_WOLF_CHAT',
  },
  DAY_REVOTE_TALK: {
    START_VOTE: 'DAY_REVOTE', // Move to revote after tied players speak
  },
  DAY_REVOTE: {
    VOTE: 'DAY_REVOTE', // Stay in DAY_REVOTE when receiving votes
    VOTE_COMPLETE: 'LAST_WILL', // Go to last will phase after revoting
    START_NIGHT: 'NIGHT_WOLF_CHAT',
  },
  LAST_WILL: {
    LAST_WILL_COMPLETE: 'CHECK_END', // After last will, check victory
  },
  NIGHT_WOLF_CHAT: {
    WOLF_CHAT_MESSAGE: 'NIGHT_WOLF_CHAT', // Stay in NIGHT_WOLF_CHAT when receiving messages
    START_NIGHT_ACTIONS: 'NIGHT_ACTIONS',
    NIGHT_COMPLETE: 'NIGHT_ACTIONS',
  },
  NIGHT_ACTIONS: {
    NIGHT_ACTION: 'NIGHT_ACTIONS', // Stay in NIGHT_ACTIONS when receiving actions
    WOLF_ATTACK: 'NIGHT_ACTIONS', // Stay in NIGHT_ACTIONS when receiving wolf attacks
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

