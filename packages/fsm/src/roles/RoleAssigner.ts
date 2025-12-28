import type { Role, Player } from '@aiwolf/shared';
import { SeededRNG } from '@aiwolf/shared';

/**
 * Role assignment result
 */
export interface RoleAssignment {
  playerId: string;
  role: Role;
}

/**
 * Role assigner with deterministic seeded assignment
 */
export class RoleAssigner {
  /**
   * Assign roles to players (including user)
   * Uses seeded random to ensure reproducibility
   */
  assign(players: Player[], roles: Role[], seed: number): Map<string, Role> {
    if (players.length !== roles.length) {
      throw new Error(
        `Player count (${players.length}) must match role count (${roles.length})`
      );
    }

    const rng = new SeededRNG(seed);
    
    // Shuffle roles
    const shuffledRoles = rng.shuffle(roles);
    
    // Assign to players in order
    const assignments = new Map<string, Role>();
    for (let i = 0; i < players.length; i++) {
      assignments.set(players[i].id, shuffledRoles[i]);
    }

    return assignments;
  }

  /**
   * Get players by role
   */
  getPlayersByRole(assignments: Map<string, Role>, role: Role): string[] {
    return Array.from(assignments.entries())
      .filter(([_, r]) => r === role)
      .map(([playerId, _]) => playerId);
  }

  /**
   * Get role for player
   */
  getRoleForPlayer(assignments: Map<string, Role>, playerId: string): Role | undefined {
    return assignments.get(playerId);
  }

  /**
   * Get werewolves (including white wolf)
   */
  getWerewolves(assignments: Map<string, Role>): string[] {
    return Array.from(assignments.entries())
      .filter(([_, role]) => role === 'WEREWOLF' || role === 'WHITE_WOLF')
      .map(([playerId, _]) => playerId);
  }

  /**
   * Get freemason pair
   */
  getFreemasons(assignments: Map<string, Role>): string[] {
    return this.getPlayersByRole(assignments, 'FREEMASON');
  }

  /**
   * Check if player has role
   */
  hasRole(assignments: Map<string, Role>, playerId: string, role: Role): boolean {
    return assignments.get(playerId) === role;
  }

  /**
   * Export assignments for logging
   */
  exportAssignments(assignments: Map<string, Role>): RoleAssignment[] {
    return Array.from(assignments.entries()).map(([playerId, role]) => ({
      playerId,
      role,
    }));
  }
}

