import type { Persona, Role } from '@aiwolf/shared';
import { DeepSeekClient } from '../client/DeepSeekClient.js';
/**
 * Generate AI roster with personalities
 */
export declare class RosterGenerator {
    private client;
    constructor(client: DeepSeekClient);
    /**
     * Generate AI personas for a game
     */
    generate(numAI: number, seed: number): Promise<Persona[]>;
    /**
     * Calculate skill distribution based on target ratios
     */
    private calculateSkillDistribution;
    /**
     * Select skill level for AI at index
     */
    private selectSkillLevel;
    /**
     * Generate a single persona
     */
    private generatePersona;
    /**
     * Build prompt for persona generation
     */
    private buildPersonaPrompt;
    /**
     * Parse LLM response into Persona
     */
    private parsePersona;
    /**
     * Generate fallback persona if LLM fails
     */
    private generateFallbackPersona;
    /**
     * Generate system prompt for a persona with role
     */
    generateSystemPrompt(persona: Persona, role: Role, isWolf: boolean): string;
    /**
     * Get role description
     */
    private getRoleDescription;
    /**
     * Get wolf chat protocol
     */
    private getWolfChatProtocol;
    /**
     * Get skill-specific guidance
     */
    private getSkillGuidance;
}
//# sourceMappingURL=RosterGenerator.d.ts.map