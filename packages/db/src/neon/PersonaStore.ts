import postgres from 'postgres';
import type { Persona, SkillLevel } from '@aiwolf/shared';

/**
 * Persona Store for pre-generated AI personas
 */
export class PersonaStore {
  private sql: ReturnType<typeof postgres>;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString);
  }

  /**
   * Initialize personas table
   */
  async initialize(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS ai_personas (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        personality TEXT NOT NULL,
        speaking_style TEXT NOT NULL,
        skill_level TEXT NOT NULL,
        play_style TEXT NOT NULL,
        used_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS idx_personas_skill ON ai_personas(skill_level)
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS idx_personas_usage ON ai_personas(used_count)
    `;

    console.log('✅ PersonaStore initialized');
  }

  /**
   * Save a persona to the database
   */
  async savePersona(persona: Persona): Promise<void> {
    await this.sql`
      INSERT INTO ai_personas (
        name, personality, speaking_style, skill_level, play_style
      ) VALUES (
        ${persona.name},
        ${persona.personality},
        ${persona.speakingStyle},
        ${persona.skillLevel},
        ${persona.playStyle}
      )
      ON CONFLICT (name) DO UPDATE SET
        personality = EXCLUDED.personality,
        speaking_style = EXCLUDED.speaking_style,
        skill_level = EXCLUDED.skill_level,
        play_style = EXCLUDED.play_style
    `;
  }

  /**
   * Get random personas with balanced skill distribution
   */
  async getRandomPersonas(count: number): Promise<Persona[]> {
    // Calculate distribution (same as RosterGenerator)
    const beginnerCount = Math.round(count * 0.3);
    const advancedCount = Math.round(count * 0.2);
    const intermediateCount = count - beginnerCount - advancedCount;

    const personas: Persona[] = [];

    // Get beginners
    const beginners = await this.getRandomBySkill('BEGINNER', beginnerCount);
    personas.push(...beginners);

    // Get intermediates
    const intermediates = await this.getRandomBySkill('INTERMEDIATE', intermediateCount);
    personas.push(...intermediates);

    // Get advanced
    const advanced = await this.getRandomBySkill('ADVANCED', advancedCount);
    personas.push(...advanced);

    // Mark as used
    for (const persona of personas) {
      await this.markUsed(persona.name);
    }

    return personas;
  }

  /**
   * Get random personas by skill level
   */
  private async getRandomBySkill(skillLevel: SkillLevel, count: number): Promise<Persona[]> {
    const results = await this.sql<Array<{
      id: number;
      name: string;
      personality: string;
      speaking_style: string;
      skill_level: SkillLevel;
      play_style: string;
    }>>`
      SELECT id, name, personality, speaking_style, skill_level, play_style
      FROM ai_personas
      WHERE skill_level = ${skillLevel}
      ORDER BY used_count ASC, RANDOM()
      LIMIT ${count}
    `;

    return results.map((row: any) => ({
      name: row.name,
      personality: row.personality,
      speakingStyle: row.speaking_style,
      skillLevel: row.skill_level as SkillLevel,
      playStyle: row.play_style,
    }));
  }

  /**
   * Mark a persona as used
   */
  private async markUsed(name: string): Promise<void> {
    await this.sql`
      UPDATE ai_personas
      SET used_count = used_count + 1
      WHERE name = ${name}
    `;
  }

  /**
   * Get total persona count
   */
  async getCount(): Promise<number> {
    const result = await this.sql`
      SELECT COUNT(*) as count FROM ai_personas
    `;
    return Number(result[0].count);
  }

  /**
   * Get personas by skill level count
   */
  async getCountBySkill(): Promise<Record<SkillLevel, number>> {
    const results = await this.sql<Array<{ skill_level: SkillLevel; count: string }>>`
      SELECT skill_level, COUNT(*) as count
      FROM ai_personas
      GROUP BY skill_level
    `;

    const counts: Record<SkillLevel, number> = {
      BEGINNER: 0,
      INTERMEDIATE: 0,
      ADVANCED: 0,
    };

    for (const row of results) {
      counts[row.skill_level as SkillLevel] = Number(row.count);
    }

    return counts;
  }

  /**
   * Delete all personas (for reset)
   */
  async deleteAll(): Promise<void> {
    await this.sql`DELETE FROM ai_personas`;
  }

  /**
   * Get persona statistics
   */
  async getStats(): Promise<{
    total: number;
    bySkill: Record<SkillLevel, number>;
    mostUsed: Array<{ name: string; usedCount: number }>;
    leastUsed: Array<{ name: string; usedCount: number }>;
  }> {
    const total = await this.getCount();
    const bySkill = await this.getCountBySkill();

    const mostUsed = await this.sql<Array<{ name: string; used_count: number }>>`
      SELECT name, used_count
      FROM ai_personas
      ORDER BY used_count DESC
      LIMIT 10
    `;

    const leastUsed = await this.sql<Array<{ name: string; used_count: number }>>`
      SELECT name, used_count
      FROM ai_personas
      ORDER BY used_count ASC
      LIMIT 10
    `;

    return {
      total,
      bySkill,
      mostUsed: mostUsed.map((p: any) => ({ name: p.name, usedCount: p.used_count })),
      leastUsed: leastUsed.map((p: any) => ({ name: p.name, usedCount: p.used_count })),
    };
  }

  /**
   * Get all personas (for batch operations)
   */
  async getAllPersonas(): Promise<Array<{
    id: number;
    name: string;
    personality: string;
    speaking_style: string;
    skill_level: string;
    play_style: string;
  }>> {
    const results = await this.sql<Array<{
      id: number;
      name: string;
      personality: string;
      speaking_style: string;
      skill_level: string;
      play_style: string;
    }>>`
      SELECT id, name, personality, speaking_style, skill_level, play_style
      FROM ai_personas
      ORDER BY id ASC
    `;

    return results;
  }

  /**
   * Update personality traits for a persona
   */
  async updatePersonalityTraits(
    id: number,
    personality: string,
    speakingStyle: string
  ): Promise<void> {
    await this.sql`
      UPDATE ai_personas
      SET personality = ${personality},
          speaking_style = ${speakingStyle}
      WHERE id = ${id}
    `;
  }

  /**
   * Count total personas
   */
  async countPersonas(): Promise<number> {
    return await this.getCount();
  }
}

