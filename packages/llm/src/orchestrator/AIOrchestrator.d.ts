import { DeepSeekClient } from '../client/DeepSeekClient.js';
import type { LLMMessage } from '../types.js';
export interface SpeakRequest {
    playerId: string;
    playerName: string;
    context: LLMMessage[];
    tools?: any[];
    timestamp: number;
}
export interface SpeakResult {
    playerId: string;
    content: string;
    toolCalls?: any[];
}
/**
 * AI Orchestrator manages AI speech with tempo control
 */
export declare class AIOrchestrator {
    private client;
    private speakQueue;
    private cooldowns;
    private processing;
    private onMessage?;
    constructor(client: DeepSeekClient);
    /**
     * Set message callback
     */
    setMessageCallback(callback: (result: SpeakResult) => void): void;
    /**
     * Schedule an AI to speak
     */
    scheduleSpeech(playerId: string, playerName: string, context: LLMMessage[], tools?: any[]): Promise<void>;
    /**
     * Start processing the speak queue
     */
    private startProcessing;
    /**
     * Process a single speak request
     */
    private processSpeakRequest;
    /**
     * Enforce cooldown period
     */
    private enforceCooldown;
    /**
     * Calculate typing delay based on content length
     */
    private calculateTypingDelay;
    /**
     * Create timeout promise
     */
    private createTimeoutPromise;
    /**
     * Generate fallback message on error
     */
    private generateFallbackMessage;
    /**
     * Emit message via callback
     */
    private emitMessage;
    /**
     * Clear queue
     */
    clear(): void;
}
//# sourceMappingURL=AIOrchestrator.d.ts.map