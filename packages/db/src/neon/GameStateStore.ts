import postgres from 'postgres';
import type { GameState } from '@aiwolf/shared';

/**
 * Neon PostgreSQL-based game state store
 * Replaces Redis for game state management
 */
export class GameStateStore {
  private sql: ReturnType<typeof postgres>;

  constructor(connectionUrl: string) {
    this.sql = postgres(connectionUrl, {
      ssl: 'require',
      max: 10,
    });
  }

  /**
   * Initialize game state table
   */
  async initialize(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS game_states (
        game_id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS idx_game_states_updated 
      ON game_states(updated_at)
    `;
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
      votes: Array.from(state.votes.entries()),
      nightActions: Array.from(state.nightActions.entries()),
      wolfAttacks: Array.from(state.wolfAttacks.entries()),
    };

    await this.sql`
      INSERT INTO game_states (game_id, state, updated_at)
      VALUES (${gameId}, ${JSON.stringify(serializable)}, NOW())
      ON CONFLICT (game_id) 
      DO UPDATE SET 
        state = ${JSON.stringify(serializable)},
        updated_at = NOW()
    `;
  }

  /**
   * Load game state
   */
  async loadState(gameId: string): Promise<GameState | null> {
    const result = await this.sql<Array<{ state: any }>>`
      SELECT state FROM game_states WHERE game_id = ${gameId}
    `;

    if (result.length === 0) return null;

    const parsed = result[0].state;
    
    // Restore Sets and Maps
    return {
      ...parsed,
      alivePlayers: new Set(parsed.alivePlayers || []),
      roleAssignments: new Map(parsed.roleAssignments || []),
      votes: new Map(parsed.votes || []),
      nightActions: new Map(parsed.nightActions || []),
      wolfAttacks: new Map(parsed.wolfAttacks || []),
      deaths: parsed.deaths || [],
    };
  }

  /**
   * Delete game state
   */
  async deleteState(gameId: string): Promise<void> {
    await this.sql`
      DELETE FROM game_states WHERE game_id = ${gameId}
    `;
  }

  /**
   * List all active games
   */
  async listGames(): Promise<string[]> {
    const result = await this.sql<Array<{ game_id: string }>>`
      SELECT game_id FROM game_states 
      ORDER BY updated_at DESC
    `;
    
    return result.map(r => r.game_id);
  }

  /**
   * Clean up old games (older than 24 hours)
   */
  async cleanupOldGames(): Promise<number> {
    const result = await this.sql`
      DELETE FROM game_states 
      WHERE updated_at < NOW() - INTERVAL '24 hours'
      RETURNING game_id
    `;
    
    return result.count;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.sql.end();
  }
}

