import type { GameState, GameEvent, TransitionResult } from '@aiwolf/shared';
import { RoleAssigner } from '../roles/RoleAssigner.js';
import { RoleBuilder } from '../roles/RoleBuilder.js';

/**
 * Handle START_GAME event from LOBBY
 * Moves to INIT phase (AI roster generation happens at server level)
 */
export async function handleStartGame(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const nextState: GameState = {
    ...state,
    phase: 'INIT',
    phaseStartTime: Date.now(),
  };

  return {
    nextState,
    events: [
      {
        type: 'ROLES_ASSIGNED',
        timestamp: Date.now(),
      },
    ],
    broadcast: [
      {
        type: 'GAME_STARTED',
        payload: {
          message: 'Game is starting! Roles are being assigned...',
        },
      },
    ],
  };
}

/**
 * Handle ROLES_ASSIGNED event from INIT
 * Assigns roles to all players and moves to ASSIGN_ROLES phase
 * Note: Roles should already be built in game state config
 */
export async function handleRolesAssigned(state: GameState, event: GameEvent): Promise<TransitionResult> {
  // Get roles from game state (built during room creation)
  // For now, we'll build them here - this should be passed from createRoom
  const roleAssigner = new RoleAssigner();
  const roleBuilder = new RoleBuilder();
  
  let roles: any[];
  
  if (state.config.randomStart) {
    const result = roleBuilder.buildRandomRoles(state.seeds.packs);
    roles = result.roles;
  } else {
    roles = roleBuilder.buildRoles(state.config.packs, state.seeds.packs);
  }
  
  const roleAssignments = roleAssigner.assign(state.players, roles, state.seeds.roles);

  const nextState: GameState = {
    ...state,
    phase: 'ASSIGN_ROLES',
    roleAssignments,
    phaseStartTime: Date.now(),
  };

  // Notify players of their roles (private events)
  const privateEvents = Array.from(roleAssignments.entries()).map(([playerId, role]) => ({
    type: 'ROLE_ASSIGNED' as const,
    targetPlayerId: playerId, // Mark who should receive this
    payload: {
      role,
      message: `You are: ${role}`,
    },
  }));

  return {
    nextState,
    events: [
      {
        type: 'START_DAY',
        timestamp: Date.now() + 2000, // Give 2 seconds to read role
      },
    ],
    broadcast: [
      {
        type: 'PHASE_CHANGE',
        payload: {
          phase: 'ASSIGN_ROLES',
          message: 'Roles have been assigned!',
        },
      },
      ...privateEvents,
    ],
  };
}

