import type { GameState, GameEvent, TransitionResult } from '@aiwolf/shared';

/**
 * Handle LAST_WILL phase - executed player's final statement
 */
export async function handleLastWillPhase(state: GameState, event: GameEvent): Promise<TransitionResult> {
  console.log('[LastWillHandler] ⚖️ Last will phase complete, moving to victory check...');
  
  // Clear executed player ID after last will
  state.executedPlayerId = undefined;
  
  return {
    nextState: {
      ...state,
      phase: 'CHECK_END',
      phaseStartTime: Date.now(),
    },
    events: [
      {
        type: 'CHECK_VICTORY',
        timestamp: Date.now(),
      },
    ],
    broadcast: [],
  };
}

