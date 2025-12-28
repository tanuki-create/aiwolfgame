import postgres from 'postgres';
import type { PublicMessage, WolfMessage, InternalEvent } from '@aiwolf/shared';

/**
 * PostgreSQL-based log store
 */
export class LogStore {
  private sql: ReturnType<typeof postgres>;

  constructor(connectionUrl: string) {
    this.sql = postgres(connectionUrl);
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS public_messages (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        content TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS wolf_messages (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        content TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS internal_events (
        id SERIAL PRIMARY KEY,
        game_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        data JSONB NOT NULL,
        visibility TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await this.sql`CREATE INDEX IF NOT EXISTS idx_public_messages_game ON public_messages(game_id)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_wolf_messages_game ON wolf_messages(game_id)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_internal_events_game ON internal_events(game_id)`;
  }

  /**
   * Save public message
   */
  async savePublicMessage(message: PublicMessage): Promise<void> {
    await this.sql`
      INSERT INTO public_messages (id, game_id, player_id, player_name, content, day_number, timestamp)
      VALUES (${message.id}, ${message.gameId}, ${message.playerId}, ${message.playerName}, 
              ${message.content}, ${message.dayNumber}, ${message.timestamp})
    `;
  }

  /**
   * Save wolf message
   */
  async saveWolfMessage(message: WolfMessage): Promise<void> {
    await this.sql`
      INSERT INTO wolf_messages (id, game_id, player_id, player_name, content, day_number, timestamp)
      VALUES (${message.id}, ${message.gameId}, ${message.playerId}, ${message.playerName},
              ${message.content}, ${message.dayNumber}, ${message.timestamp})
    `;
  }

  /**
   * Save internal event
   */
  async saveInternalEvent(event: InternalEvent): Promise<void> {
    await this.sql`
      INSERT INTO internal_events (game_id, event_type, timestamp, data, visibility)
      VALUES (${event.gameId}, ${event.type}, ${event.timestamp}, ${JSON.stringify(event.data)}, ${event.visibility})
    `;
  }

  /**
   * Get public messages for game
   */
  async getPublicMessages(gameId: string): Promise<PublicMessage[]> {
    const results = await this.sql<PublicMessage[]>`
      SELECT * FROM public_messages WHERE game_id = ${gameId} ORDER BY timestamp ASC
    `;
    return results;
  }

  /**
   * Get wolf messages for game (admin only)
   */
  async getWolfMessages(gameId: string, dayNumber?: number): Promise<WolfMessage[]> {
    if (dayNumber !== undefined) {
      const results = await this.sql<WolfMessage[]>`
        SELECT * FROM wolf_messages WHERE game_id = ${gameId} AND day_number = ${dayNumber} ORDER BY timestamp ASC
      `;
      return results;
    }
    const results = await this.sql<WolfMessage[]>`
      SELECT * FROM wolf_messages WHERE game_id = ${gameId} ORDER BY timestamp ASC
    `;
    return results;
  }

  /**
   * Get all wolf chat messages for admin panel
   */
  async getAllWolfChatForAdmin(gameId: string): Promise<WolfMessage[]> {
    return this.getWolfMessages(gameId);
  }

  /**
   * Get internal events for game (admin only)
   */
  async getInternalEvents(gameId: string): Promise<InternalEvent[]> {
    const results = await this.sql<any[]>`
      SELECT * FROM internal_events WHERE game_id = ${gameId} ORDER BY timestamp ASC
    `;
    return results.map(r => ({
      gameId: r.game_id,
      type: r.event_type,
      timestamp: r.timestamp,
      data: r.data,
      visibility: r.visibility,
    }));
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.sql.end();
  }
}

