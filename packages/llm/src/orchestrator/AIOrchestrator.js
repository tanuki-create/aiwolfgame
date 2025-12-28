import { TEMPO_CONFIG } from '@aiwolf/shared';
import { AsyncQueue, sleep } from '../utils/queue.js';
/**
 * AI Orchestrator manages AI speech with tempo control
 */
export class AIOrchestrator {
    client;
    speakQueue;
    cooldowns;
    processing = false;
    onMessage;
    constructor(client) {
        this.client = client;
        this.speakQueue = new AsyncQueue();
        this.cooldowns = new Map();
    }
    /**
     * Set message callback
     */
    setMessageCallback(callback) {
        this.onMessage = callback;
    }
    /**
     * Schedule an AI to speak
     */
    async scheduleSpeech(playerId, playerName, context, tools) {
        await this.speakQueue.enqueue({
            playerId,
            playerName,
            context,
            tools,
            timestamp: Date.now(),
        });
        // Start processing if not already
        if (!this.processing) {
            this.startProcessing();
        }
    }
    /**
     * Start processing the speak queue
     */
    async startProcessing() {
        if (this.processing)
            return;
        this.processing = true;
        while (true) {
            try {
                const request = await this.speakQueue.dequeue();
                await this.processSpeakRequest(request);
            }
            catch (error) {
                console.error('Error processing speak request:', error);
            }
        }
    }
    /**
     * Process a single speak request
     */
    async processSpeakRequest(request) {
        // Enforce cooldown
        await this.enforceCooldown(request.playerId);
        try {
            // Call LLM with timeout
            const response = await Promise.race([
                this.client.chatWithRetry(request.context, request.tools, { temperature: 0.8 }),
                this.createTimeoutPromise(),
            ]);
            const content = this.client.getContent(response);
            const toolCalls = this.client.hasToolCalls(response)
                ? this.client.getToolCalls(response)
                : undefined;
            // Calculate typing delay
            const delay = this.calculateTypingDelay(content);
            await sleep(delay);
            // Emit message
            this.emitMessage({
                playerId: request.playerId,
                content,
                toolCalls,
            });
            // Update cooldown
            this.cooldowns.set(request.playerId, Date.now());
        }
        catch (error) {
            console.error(`AI ${request.playerName} failed to respond:`, error);
            // Emit fallback message
            this.emitMessage({
                playerId: request.playerId,
                content: this.generateFallbackMessage(request.playerName),
            });
        }
    }
    /**
     * Enforce cooldown period
     */
    async enforceCooldown(playerId) {
        const lastSpeak = this.cooldowns.get(playerId);
        if (!lastSpeak)
            return;
        const elapsed = Date.now() - lastSpeak;
        const remaining = TEMPO_CONFIG.cooldown - elapsed;
        if (remaining > 0) {
            await sleep(remaining);
        }
    }
    /**
     * Calculate typing delay based on content length
     */
    calculateTypingDelay(content) {
        const baseDelay = TEMPO_CONFIG.minDelay;
        const contentDelay = Math.floor((content.length / TEMPO_CONFIG.charsPerMs) * TEMPO_CONFIG.msPerTypingUnit);
        const totalDelay = baseDelay + contentDelay;
        return Math.min(totalDelay, TEMPO_CONFIG.maxDelay);
    }
    /**
     * Create timeout promise
     */
    async createTimeoutPromise() {
        await sleep(8000); // 8 second timeout
        throw new Error('LLM request timeout');
    }
    /**
     * Generate fallback message on error
     */
    generateFallbackMessage(playerName) {
        const fallbacks = [
            'I need more time to think about this...',
            'Let me observe for now.',
            'I\'m still analyzing the situation.',
            'I\'ll share my thoughts soon.',
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    /**
     * Emit message via callback
     */
    emitMessage(result) {
        if (this.onMessage) {
            this.onMessage(result);
        }
    }
    /**
     * Clear queue
     */
    clear() {
        this.speakQueue.clear();
        this.cooldowns.clear();
    }
}
