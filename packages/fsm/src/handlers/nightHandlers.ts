import type { GameState, GameEvent, TransitionResult } from '@aiwolf/shared';
import { NightResolver } from '../night/NightResolver.js';

/**
 * Handle night action submission
 */
export async function handleNightActionSubmission(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const { playerId, actionType, targetId } = event.payload;
  
  // Validate action
  if (!state.alivePlayers.has(playerId)) {
    throw new Error('Dead players cannot act');
  }

  const role = state.roleAssignments.get(playerId);
  if (!role) {
    throw new Error('Player has no role');
  }

  // Store night action
  state.nightActions.set(playerId, {
    playerId,
    actionType,
    targetId,
    timestamp: Date.now(),
  });

  return {
    nextState: state,
    events: [],
    broadcast: [
      {
        type: 'NIGHT_ACTION_RECORDED',
        targetPlayerId: playerId,
        payload: {
          message: 'Your action has been recorded.',
        },
      },
    ],
  };
}

/**
 * Handle resolving all night actions
 */
export async function handleNightResolution(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const resolver = new NightResolver();
  
  // Resolve night (NightResolver now reads from state directly)
  const result = resolver.resolve(state);

  // Apply deaths
  for (const playerId of result.deaths) {
    const player = state.players.find(p => p.id === playerId);
    if (player) {
      player.isAlive = false;
      state.alivePlayers.delete(playerId);
    }
  }

  // Record deaths (convert player IDs to full death objects)
  const fullDeaths = result.deaths.map(playerId => {
    const player = state.players.find(p => p.id === playerId);
    return {
      playerId,
      playerName: player?.name || 'Unknown',
      dayNumber: state.dayNumber,
      deathType: 'ATTACK' as const,
      timestamp: Date.now(),
    };
  });
  state.deaths.push(...fullDeaths);

  // Clear night actions for next night
  state.nightActions.clear();
  state.wolfAttacks.clear();

  // Prepare broadcast messages
  const broadcasts: any[] = [
    {
      type: 'PHASE_CHANGE',
      payload: {
        phase: 'DAWN',
        dayNumber: state.dayNumber,
        message: '🌅 Dawn breaks...',
      },
    },
  ];

  // Add death announcements
  if (result.deaths.length > 0) {
    for (const playerId of result.deaths) {
      const player = state.players.find(p => p.id === playerId);
      broadcasts.push({
        type: 'SYSTEM_MESSAGE',
        payload: {
          message: `💀 ${player?.name || 'A player'} was found dead.`,
          timestamp: Date.now(),
        },
      });
    }
  } else {
    broadcasts.push({
      type: 'SYSTEM_MESSAGE',
      payload: {
        message: '✨ No one died last night.',
        timestamp: Date.now(),
      },
    });
  }

  // Send private results to players
  for (const [playerId, divinationResult] of result.divinationResults) {
    broadcasts.push({
      type: 'DIVINATION_RESULT',
      targetPlayerId: playerId,
      payload: {
        targetId: divinationResult.targetPlayerId,
        result: divinationResult.result,
        message: `Your divination reveals: ${divinationResult.result}`,
      },
    });
  }

  for (const [playerId, mediumResult] of result.mediumResults) {
    broadcasts.push({
      type: 'MEDIUM_RESULT',
      targetPlayerId: playerId,
      payload: {
        targetId: mediumResult.targetPlayerId,
        result: mediumResult.result,
        message: `The spirit reveals: ${mediumResult.result}`,
      },
    });
  }

  return {
    nextState: {
      ...state,
      phase: 'DAWN',
      phaseStartTime: Date.now(),
      phaseDeadline: Date.now() + state.config.timers.dawn,
    },
    events: [
      {
        type: 'DAWN_COMPLETE',
        timestamp: Date.now() + 100, // Short delay
      },
    ],
    broadcast: broadcasts,
  };
}

/**
 * Handle wolf attack submission
 */
export async function handleWolfAttack(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const { attackerId, targetId } = event.payload;
  
  // Validate attacker is a werewolf
  const role = state.roleAssignments.get(attackerId);
  if (role !== 'WEREWOLF' && role !== 'WHITE_WOLF') {
    throw new Error('Only werewolves can attack');
  }

  // Store wolf attack
  state.wolfAttacks.set(attackerId, targetId);

  return {
    nextState: state,
    events: [],
    broadcast: [
      {
        type: 'WOLF_ATTACK_RECORDED',
        payload: {
          message: 'Attack target recorded.',
        },
      },
    ],
  };
}

