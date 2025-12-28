import type { GameState, GameEvent, GameEventType, GamePhase, TransitionResult } from '@aiwolf/shared';
import { handleStartGame, handleRolesAssigned } from './lobbyHandlers.js';
import { handleVotePhase, handleVoteSubmission } from './voteHandlers.js';
import { handleNightActionSubmission, handleNightResolution, handleWolfAttack } from './nightHandlers.js';
import { handleCheckVictory } from './victoryHandlers.js';
import { handleWolfChatMessage, handleWolfChatPhase, handleStartNightPhase } from './wolfChatHandlers.js';

/**
 * Handler function type
 */
export type PhaseHandler = (state: GameState, event: GameEvent) => Promise<TransitionResult>;

/**
 * Handler registry for FSM
 * Maps (phase, eventType) -> handler function
 */
export class HandlerRegistry {
  private handlers: Map<string, PhaseHandler> = new Map();

  /**
   * Register a handler for a specific phase and event type
   */
  register(phase: GamePhase, eventType: GameEventType, handler: PhaseHandler): void {
    const key = this.makeKey(phase, eventType);
    this.handlers.set(key, handler);
  }

  /**
   * Get handler for a specific phase and event type
   */
  getHandler(phase: GamePhase, eventType: GameEventType): PhaseHandler | undefined {
    const key = this.makeKey(phase, eventType);
    return this.handlers.get(key);
  }

  /**
   * Create a unique key for (phase, eventType) combination
   */
  private makeKey(phase: GamePhase, eventType: GameEventType): string {
    return `${phase}:${eventType}`;
  }

  /**
   * Register all default handlers
   */
  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register all default handlers for game phases
   */
  private registerDefaultHandlers(): void {
    // Lobby -> Init handlers
    this.register('LOBBY', 'START_GAME', handleStartGame);
    this.register('INIT', 'ROLES_ASSIGNED', handleRolesAssigned);

    // Day phase handlers (placeholder for now)
    this.register('ASSIGN_ROLES', 'START_DAY', async (state, event) => {
      return {
        nextState: { 
          ...state, 
          phase: 'DAY_FREE_TALK', 
          dayNumber: 1,
          phaseStartTime: Date.now(),
          phaseDeadline: Date.now() + state.config.timers.dayFreeTalk,
        },
        events: [],
        broadcast: [
          {
            type: 'PHASE_CHANGE',
            payload: {
              phase: 'DAY_FREE_TALK',
              dayNumber: 1,
              message: 'Day 1 has begun! Discuss and find the werewolves.',
            },
          },
          {
            type: 'SYSTEM_MESSAGE',
            payload: {
              message: '🌅 Day 1 begins. All players wake up and gather in the village square.',
              timestamp: Date.now(),
            },
          },
        ],
      };
    });

    // Day free talk -> vote transition
    this.register('DAY_FREE_TALK', 'START_VOTE', async (state, event) => {
      return {
        nextState: {
          ...state,
          phase: 'DAY_VOTE',
          phaseStartTime: Date.now(),
          phaseDeadline: Date.now() + state.config.timers.dayVote,
        },
        events: [],
        broadcast: [
          {
            type: 'PHASE_CHANGE',
            payload: {
              phase: 'DAY_VOTE',
              dayNumber: state.dayNumber,
              message: '🗳️ Voting phase begins. Choose who to execute.',
            },
          },
        ],
      };
    });

    // Vote handlers
    this.register('DAY_VOTE', 'VOTE', handleVoteSubmission);
    this.register('DAY_VOTE', 'VOTE_COMPLETE', handleVotePhase);
    
    // Check end phase
    this.register('CHECK_END', 'CHECK_VICTORY', handleCheckVictory);
    this.register('CHECK_END', 'START_NIGHT', handleStartNightPhase);

    // Night wolf chat phase handlers
    this.register('NIGHT_WOLF_CHAT', 'WOLF_CHAT_MESSAGE', handleWolfChatMessage);
    this.register('NIGHT_WOLF_CHAT', 'ENTER_PHASE', handleWolfChatPhase);

    // Night wolf chat -> actions
    this.register('NIGHT_WOLF_CHAT', 'START_NIGHT_ACTIONS', async (state, event) => {
      return {
        nextState: {
          ...state,
          phase: 'NIGHT_ACTIONS',
          phaseStartTime: Date.now(),
          phaseDeadline: Date.now() + state.config.timers.nightActions,
        },
        events: [],
        broadcast: [
          {
            type: 'PHASE_CHANGE',
            payload: {
              phase: 'NIGHT_ACTIONS',
              dayNumber: state.dayNumber,
              message: '🌑 Night action phase. Special roles, make your moves.',
            },
          },
        ],
      };
    });

    // Night action handlers
    this.register('NIGHT_ACTIONS', 'NIGHT_ACTION', handleNightActionSubmission);
    this.register('NIGHT_ACTIONS', 'WOLF_ATTACK', handleWolfAttack);
    this.register('NIGHT_ACTIONS', 'RESOLVE_NIGHT', handleNightResolution);

    // Dawn -> Check victory
    this.register('DAWN', 'DAWN_COMPLETE', handleCheckVictory);

    // More handlers will be added as needed
  }
}

