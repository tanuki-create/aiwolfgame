import type { LLMMessage, Tool, ChatResponse, ChatOptions } from '../types.js';
/**
 * DeepSeek API client with OpenAI-compatible interface
 */
export declare class DeepSeekClient {
    private baseURL;
    private apiKey;
    private model;
    private timeout;
    constructor(config: {
        apiKey: string;
        baseURL?: string;
        model?: string;
        timeout?: number;
    });
    /**
     * Make a chat completion request
     */
    chat(messages: LLMMessage[], tools?: Tool[], options?: ChatOptions): Promise<ChatResponse>;
    /**
     * Make a chat request with automatic retry
     */
    chatWithRetry(messages: LLMMessage[], tools?: Tool[], options?: ChatOptions, maxRetries?: number): Promise<ChatResponse>;
    /**
     * Extract text content from response
     */
    getContent(response: ChatResponse): string;
    /**
     * Extract tool calls from response
     */
    getToolCalls(response: ChatResponse): any[];
    /**
     * Check if response has tool calls
     */
    hasToolCalls(response: ChatResponse): boolean;
}
//# sourceMappingURL=DeepSeekClient.d.ts.map