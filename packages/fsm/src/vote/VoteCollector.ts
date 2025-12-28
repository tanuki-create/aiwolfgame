import type { GameState, VoteResult, VoteAction } from '@aiwolf/shared';
import { SeededRNG } from '@aiwolf/shared';

/**
 * Vote collector with random fallback for missing votes
 */
export class VoteCollector {
  private votes: Map<string, string> = new Map(); // voterId -> targetId

  /**
   * Submit a vote
   */
  submitVote(vote: VoteAction): void {
    this.votes.set(vote.playerId, vote.targetPlayerId);
  }

  /**
   * Check if player has voted
   */
  hasVoted(playerId: string): boolean {
    return this.votes.has(playerId);
  }

  /**
   * Get vote for player
   */
  getVote(playerId: string): string | undefined {
    return this.votes.get(playerId);
  }

  /**
   * Finalize votes with random fallback for missing votes
   */
  finalizeVotes(state: GameState): VoteResult {
    // Fill missing votes with random targets
    const completeVotes = this.fillMissingVotes(state, this.votes);

    // Count votes
    const counts = this.countVotes(completeVotes);

    // Find execution target (resolve ties deterministically)
    const executedPlayerId = this.resolveExecution(counts, state.seeds.turns, state.dayNumber);

    return {
      executedPlayerId,
      votes: completeVotes,
      counts,
      tieResolved: this.hasTie(counts),
    };
  }

  /**
   * Fill missing votes with random targets (seeded)
   */
  private fillMissingVotes(state: GameState, votes: Map<string, string>): Map<string, string> {
    const result = new Map(votes);
    const alivePlayers = Array.from(state.alivePlayers);
    const rng = new SeededRNG(state.seeds.turns + state.dayNumber);

    for (const playerId of alivePlayers) {
      if (!result.has(playerId)) {
        // Select random target (excluding self)
        const validTargets = alivePlayers.filter(id => id !== playerId);
        if (validTargets.length > 0) {
          const target = rng.choice(validTargets);
          result.set(playerId, target);
        }
      }
    }

    return result;
  }

  /**
   * Count votes
   */
  private countVotes(votes: Map<string, string>): Map<string, number> {
    const counts = new Map<string, number>();

    for (const targetId of votes.values()) {
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
    }

    return counts;
  }

  /**
   * Resolve execution (handle ties deterministically)
   */
  private resolveExecution(
    counts: Map<string, number>,
    seed: number,
    dayNumber: number
  ): string {
    if (counts.size === 0) {
      throw new Error('No votes to resolve');
    }

    // Find max vote count
    const maxVotes = Math.max(...counts.values());

    // Get all players with max votes
    const candidates = Array.from(counts.entries())
      .filter(([_, count]) => count === maxVotes)
      .map(([playerId, _]) => playerId);

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Tie - resolve deterministically with seed
    const rng = new SeededRNG(seed + dayNumber + 1000);
    return rng.choice(candidates);
  }

  /**
   * Check if there was a tie
   */
  private hasTie(counts: Map<string, number>): boolean {
    if (counts.size === 0) return false;

    const maxVotes = Math.max(...counts.values());
    const maxCount = Array.from(counts.values()).filter(v => v === maxVotes).length;
    
    return maxCount > 1;
  }

  /**
   * Clear all votes (for next round)
   */
  clear(): void {
    this.votes.clear();
  }

  /**
   * Get voting summary for display
   */
  getSummary(): Array<{ voterId: string; targetId: string }> {
    return Array.from(this.votes.entries()).map(([voterId, targetId]) => ({
      voterId,
      targetId,
    }));
  }
}

