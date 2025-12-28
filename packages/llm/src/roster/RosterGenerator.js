import { SKILL_DISTRIBUTION } from '@aiwolf/shared';
import { SeededRNG } from '@aiwolf/shared';
/**
 * Generate AI roster with personalities
 */
export class RosterGenerator {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     * Generate AI personas for a game
     */
    async generate(numAI, seed) {
        // Calculate skill distribution
        const distribution = this.calculateSkillDistribution(numAI);
        // Generate personas
        const personas = [];
        const usedNames = new Set();
        for (let i = 0; i < numAI; i++) {
            const skillLevel = this.selectSkillLevel(distribution, i);
            const persona = await this.generatePersona(skillLevel, usedNames, seed + i);
            personas.push(persona);
            usedNames.add(persona.name);
        }
        return personas;
    }
    /**
     * Calculate skill distribution based on target ratios
     */
    calculateSkillDistribution(numAI) {
        const beginner = Math.round(numAI * SKILL_DISTRIBUTION.BEGINNER);
        const advanced = Math.round(numAI * SKILL_DISTRIBUTION.ADVANCED);
        const intermediate = numAI - beginner - advanced;
        return { beginner, intermediate, advanced };
    }
    /**
     * Select skill level for AI at index
     */
    selectSkillLevel(distribution, index) {
        if (index < distribution.beginner)
            return 'BEGINNER';
        if (index < distribution.beginner + distribution.intermediate)
            return 'INTERMEDIATE';
        return 'ADVANCED';
    }
    /**
     * Generate a single persona
     */
    async generatePersona(skillLevel, usedNames, seed) {
        const prompt = this.buildPersonaPrompt(skillLevel, usedNames);
        try {
            const response = await this.client.chat([
                { role: 'system', content: 'You are a character designer for a werewolf game.' },
                { role: 'user', content: prompt },
            ]);
            const content = this.client.getContent(response);
            const persona = this.parsePersona(content, skillLevel);
            // Validate name uniqueness
            if (usedNames.has(persona.name)) {
                persona.name = `${persona.name}_${seed % 100}`;
            }
            return persona;
        }
        catch (error) {
            // Fallback to template-based generation
            return this.generateFallbackPersona(skillLevel, seed, usedNames);
        }
    }
    /**
     * Build prompt for persona generation
     */
    buildPersonaPrompt(skillLevel, usedNames) {
        const usedNamesStr = Array.from(usedNames).join(', ');
        return `Generate a unique character for a werewolf game with the following:
- Skill level: ${skillLevel}
- A unique name (not: ${usedNamesStr || 'none'})
- Personality traits (2-3 key traits)
- Speaking style (how they communicate)
- Play style (strategic approach fitting their skill level)

Format your response as JSON:
{
  "name": "Character Name",
  "personality": "Brief personality description",
  "speakingStyle": "How they speak",
  "playStyle": "Their strategic approach"
}`;
    }
    /**
     * Parse LLM response into Persona
     */
    parsePersona(content, skillLevel) {
        try {
            const data = JSON.parse(content);
            return {
                name: data.name,
                personality: data.personality,
                speakingStyle: data.speakingStyle,
                skillLevel,
                playStyle: data.playStyle,
            };
        }
        catch {
            throw new Error('Failed to parse persona from LLM response');
        }
    }
    /**
     * Generate fallback persona if LLM fails
     */
    generateFallbackPersona(skillLevel, seed, usedNames) {
        const rng = new SeededRNG(seed);
        const names = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
        let name = rng.choice(names);
        while (usedNames.has(name)) {
            name = `${name}_${rng.nextInt(1, 100)}`;
        }
        const personalities = {
            BEGINNER: 'Cautious and observant',
            INTERMEDIATE: 'Analytical and balanced',
            ADVANCED: 'Strategic and perceptive',
        };
        return {
            name,
            personality: personalities[skillLevel],
            speakingStyle: 'Clear and direct',
            skillLevel,
            playStyle: skillLevel === 'BEGINNER' ? 'Follow others' : skillLevel === 'INTERMEDIATE' ? 'Build logical cases' : 'Lead discussions',
        };
    }
    /**
     * Generate system prompt for a persona with role
     */
    generateSystemPrompt(persona, role, isWolf) {
        const basePrompt = `You are ${persona.name}, playing in a Werewolf game.

PERSONALITY: ${persona.personality}
SPEAKING STYLE: ${persona.speakingStyle}
PLAY STYLE: ${persona.playStyle}
SKILL LEVEL: ${persona.skillLevel}

YOUR ROLE: ${role}
${this.getRoleDescription(role)}

${isWolf ? this.getWolfChatProtocol() : ''}

GAME RULES:
- During day discussion, share your thoughts and suspicions
- During voting, use the vote function to cast your vote
- ${role === 'SEER' || role === 'KNIGHT' ? 'During night, use night_action to perform your role ability' : ''}
- Stay in character and play strategically according to your skill level

SKILL LEVEL GUIDANCE:
${this.getSkillGuidance(persona.skillLevel)}`;
        return basePrompt;
    }
    /**
     * Get role description
     */
    getRoleDescription(role) {
        const descriptions = {
            VILLAGER: 'You are a regular villager. Your goal is to identify and eliminate all werewolves.',
            WEREWOLF: 'You are a werewolf. You know who the other wolves are. Coordinate attacks at night and hide during the day.',
            SEER: 'You can divine one player each night to learn if they are WEREWOLF or HUMAN.',
            MEDIUM: 'You learn the true identity (WEREWOLF or HUMAN) of each executed player.',
            KNIGHT: 'You can protect one player each night from werewolf attacks.',
            MADMAN: 'You are on the werewolf team but don\'t know who they are. Help them win without revealing yourself.',
            FOX: 'You are a third-party. You win if you\'re alive when either village or wolves win. You die if divined by seer.',
            FREEMASON: 'You and one other player are Freemasons. You know each other\'s identities and are both villagers.',
            HUNTER: 'If you die (by any means), you take one random player with you.',
            FANATIC: 'Like Madman, but you appear as WEREWOLF to the seer.',
            WHITE_WOLF: 'You are a werewolf who appears as HUMAN to the seer.',
        };
        return descriptions[role] || '';
    }
    /**
     * Get wolf chat protocol
     */
    getWolfChatProtocol() {
        return `
WOLF CHAT PROTOCOL:
- During night, you can chat privately with other wolves
- The wolf leader (highest skill level) submits the final attack using submit_wolf_attack function
- Coordinate your target and tomorrow's strategy
- Keep discussions focused and efficient`;
    }
    /**
     * Get skill-specific guidance
     */
    getSkillGuidance(skill) {
        const guidance = {
            BEGINNER: '- Focus on observing and learning\n- Ask questions when confused\n- Follow experienced players\' leads\n- Make simple deductions',
            INTERMEDIATE: '- Make logical deductions from information\n- Build cases with evidence\n- Balance aggression and caution\n- Consider multiple possibilities',
            ADVANCED: '- Lead discussions and strategy\n- Make complex multi-step deductions\n- Catch inconsistencies and lies\n- Manipulate information strategically',
        };
        return guidance[skill];
    }
}
