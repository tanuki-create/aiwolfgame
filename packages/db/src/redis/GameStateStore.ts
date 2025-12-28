import Redis from 'ioredis';
import type { GameState } from '@aiwolf/shared';

/**
 * Redis-based game state store
 */
export class GameStateStore {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  /**
   * Save game state
   */
  async saveState(gameId: string, state: GameState): Promise<void> {
    // Convert Sets and Maps to serializable format
    const serializable = {
      ...state,
      alivePlayers: Array.from(state.alivePlayers),
      roleAssignments: Array.from(state.roleAssignments.entries()),
    };

    await this.redis.set(
      `game:${gameId}:state`,
      JSON.stringify(serializable),
      'EX',
      24 * 60 * 60 // 24 hour expiry
    );
  }

  /**
   * Load game state
   */
  async loadState(gameId: string): Promise<GameState | null> {
    const data = await this.redis.get(`game:${gameId}:state`);
    if (!data) return null;

    const parsed = JSON.parse(data);
    
    // Restore Sets and Maps
    return {
      ...parsed,
      alivePlayers: new Set(parsed.alivePlayers),
      roleAssignments: new Map(parsed.roleAssignments),
    };
  }

  /**
   * Delete game state
   */
  async deleteState(gameId: string): Promise<void> {
    await this.redis.del(`game:${gameId}:state`);
  }

  /**
   * List all active games
   */
  async listGames(): Promise<string[]> {
    const keys = await this.redis.keys('game:*:state');
    return keys.map(k => k.split(':')[1]);
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

