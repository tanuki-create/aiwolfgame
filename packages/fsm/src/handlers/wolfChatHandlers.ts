import type { GameState, GameEvent, TransitionResult } from '@aiwolf/shared';
import type { PhaseHandler } from './registry.js';

/**
 * Handle wolf chat message during NIGHT_WOLF_CHAT phase
 */
export const handleWolfChatMessage: PhaseHandler = async (state, event) => {
  const { playerId, content } = event.payload;
  const player = state.players.find(p => p.id === playerId);
  const role = state.roleAssignments.get(playerId);
  
  // Validate: player must be werewolf
  if (role !== 'WEREWOLF') {
    throw new Error('Only werewolves can send wolf chat messages');
  }
  
  if (!player) {
    throw new Error('Player not found');
  }
  
  const broadcasts = [{
    type: 'WOLF_CHAT_MESSAGE' as const,
    payload: {
      playerId,
      playerName: player.name,
      content,
      timestamp: Date.now(),
    },
    targetRoles: ['WEREWOLF' as const], // Only werewolves receive
  }];
  
  return { nextState: state, events: [], broadcast: broadcasts };
};

/**
 * Handle entering NIGHT_WOLF_CHAT phase
 * Triggered when transitioning from CHECK_END to NIGHT_WOLF_CHAT
 */
export const handleWolfChatPhase: PhaseHandler = async (state, event) => {
  // Get all werewolves
  const wolves = Array.from(state.roleAssignments.entries())
    .filter(([_, role]) => role === 'WEREWOLF')
    .map(([id]) => state.players.find(p => p.id === id)!)
    .filter(p => p !== undefined);
  
  const broadcasts = [
    {
      type: 'WOLF_CHAT_START' as const,
      payload: { 
        wolves: wolves.map(w => ({ id: w.id, name: w.name })),
        dayNumber: state.dayNumber,
      },
      targetRoles: ['WEREWOLF' as const], // Only werewolves receive this
    },
    {
      type: 'PHASE_CHANGE' as const,
      payload: {
        phase: 'NIGHT_WOLF_CHAT',
        dayNumber: state.dayNumber,
        message: '🐺 Werewolves gather in secret to discuss their strategy.',
      },
    },
  ];
  
  return { 
    nextState: state, 
    events: [],
    broadcast: broadcasts,
  };
};

/**
 * Handle the transition from CHECK_END to NIGHT_WOLF_CHAT
 * This happens when voting completes and game continues
 */
export const handleStartNightPhase: PhaseHandler = async (state, event) => {
  const nextState: GameState = {
    ...state,
    phase: 'NIGHT_WOLF_CHAT',
    phaseStartTime: Date.now(),
    phaseDeadline: Date.now() + state.config.timers.nightWolfChat,
  };
  
  // Trigger wolf chat phase handler
  return handleWolfChatPhase(nextState, event);
};

