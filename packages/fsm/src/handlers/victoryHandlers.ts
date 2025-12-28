import type { GameState, GameEvent, TransitionResult } from '@aiwolf/shared';
import { VictoryChecker } from '../victory/VictoryChecker.js';

/**
 * Handle victory check after day or night
 */
export async function handleCheckVictory(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const checker = new VictoryChecker();
  
  // Check victory conditions
  const result = checker.check(state);

  if (result.hasWinner) {
    // Game is over
    return {
      nextState: {
        ...state,
        phase: 'GAME_OVER',
        phaseStartTime: Date.now(),
      },
      events: [],
      broadcast: [
        {
          type: 'GAME_OVER',
          payload: {
            winner: result.winner,
            message: `${result.winner} wins! ${result.reason}`,
            survivors: Array.from(state.alivePlayers),
            roleAssignments: Array.from(state.roleAssignments.entries()).map(([id, role]) => ({
              playerId: id,
              role,
            })),
          },
        },
      ],
    };
  }

  // Game continues - go to next day or continue night
  if (state.phase === 'CHECK_END') {
    // After vote/execution, go to night
    return {
      nextState: {
        ...state,
        phase: 'NIGHT_WOLF_CHAT',
        phaseStartTime: Date.now(),
        phaseDeadline: Date.now() + state.config.timers.nightWolfChat,
      },
      events: [],
      broadcast: [
        {
          type: 'PHASE_CHANGE',
          payload: {
            phase: 'NIGHT_WOLF_CHAT',
            dayNumber: state.dayNumber,
            message: '🌙 Night falls. Werewolves awaken.',
          },
        },
      ],
    };
  }

  // After dawn, go to next day
  return {
    nextState: {
      ...state,
      phase: 'DAY_FREE_TALK',
      dayNumber: state.dayNumber + 1,
      phaseStartTime: Date.now(),
      phaseDeadline: Date.now() + state.config.timers.dayFreeTalk,
    },
    events: [],
    broadcast: [
      {
        type: 'PHASE_CHANGE',
        payload: {
          phase: 'DAY_FREE_TALK',
          dayNumber: state.dayNumber + 1,
          message: `🌅 Day ${state.dayNumber + 1} begins. Discuss and find the werewolves.`,
        },
      },
      {
        type: 'SYSTEM_MESSAGE',
        payload: {
          message: `📅 Day ${state.dayNumber + 1} has started. All players wake up and gather in the village square.`,
          timestamp: Date.now(),
        },
      },
    ],
  };
}

