import type { GameState, NightAction } from '@aiwolf/shared';
import { SeededRNG } from '@aiwolf/shared';

/**
 * Fallback engine for timeouts and missing actions
 */
export class ActionFallbackEngine {
  /**
   * Generate fallback vote when player doesn't vote
   */
  generateFallbackVote(state: GameState, playerId: string): string {
    const player = state.players.find(p => p.id === playerId);
    
    // Priority 1: Use stated belief if available
    if (player?.lastBelief) {
      return player.lastBelief.suspectId;
    }

    // Priority 2: Seeded random
    return this.randomTarget(state, playerId, 'vote');
  }

  /**
   * Generate fallback night action
   */
  generateFallbackNightAction(state: GameState, playerId: string): NightAction | null {
    const role = state.roleAssignments.get(playerId);
    if (!role) return null;

    const gameId = state.gameId;
    const timestamp = Date.now();

    switch (role) {
      case 'SEER': {
        const target = this.randomTarget(state, playerId, 'seer');
        return {
          gameId,
          playerId,
          actionType: 'DIVINE',
          targetPlayerId: target,
          timestamp,
        };
      }

      case 'KNIGHT': {
        const target = this.randomTarget(state, playerId, 'knight');
        return {
          gameId,
          playerId,
          actionType: 'PROTECT',
          targetPlayerId: target,
          timestamp,
        };
      }

      default:
        return null;
    }
  }

  /**
   * Generate fallback wolf attack
   */
  generateFallbackWolfAttack(state: GameState, leaderId: string): string {
    return this.randomTarget(state, leaderId, 'wolf_attack', true);
  }

  /**
   * Select random target (deterministic with seed)
   */
  private randomTarget(
    state: GameState,
    playerId: string,
    action: string,
    excludeWolves: boolean = false
  ): string {
    const rng = new SeededRNG(
      state.seeds.turns + 
      state.dayNumber + 
      playerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) +
      action.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    );

    let candidates = Array.from(state.alivePlayers);

    // Exclude self
    candidates = candidates.filter(id => id !== playerId);

    // Exclude wolves if needed
    if (excludeWolves) {
      candidates = candidates.filter(id => {
        const role = state.roleAssignments.get(id);
        return role !== 'WEREWOLF' && role !== 'WHITE_WOLF';
      });
    }

    if (candidates.length === 0) {
      // Fallback: include self if no other options
      candidates = [playerId];
    }

    return rng.choice(candidates);
  }
}

