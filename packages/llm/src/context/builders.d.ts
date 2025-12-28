import type { GameState } from '@aiwolf/shared';
import type { LLMMessage } from '../types.js';
/**
 * Build public context visible to all players
 */
export declare class PublicContextBuilder {
    build(state: GameState, playerId: string): string;
    private formatPhase;
}
/**
 * Build private context for individual player (includes role)
 */
export declare class PrivateContextBuilder {
    private publicBuilder;
    constructor();
    build(state: GameState, playerId: string): string;
}
/**
 * Build wolf chat context (for werewolves only)
 */
export declare class WolfChatContextBuilder {
    private publicBuilder;
    constructor();
    build(state: GameState, wolfId: string, isLeader: boolean): string;
}
/**
 * Build messages array for LLM
 */
export declare class MessageBuilder {
    buildMessages(systemPrompt: string, contextInfo: string): LLMMessage[];
    addChatHistory(messages: LLMMessage[], history: Array<{
        speaker: string;
        text: string;
    }>): LLMMessage[];
}
//# sourceMappingURL=builders.d.ts.map