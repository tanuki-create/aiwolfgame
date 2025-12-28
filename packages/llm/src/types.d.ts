/**
 * LLM Error types
 */
export declare class LLMError extends Error {
    code: 'TIMEOUT' | 'RATE_LIMIT' | 'NETWORK' | 'INVALID_RESPONSE' | 'UNKNOWN';
    originalError?: any | undefined;
    constructor(message: string, code: 'TIMEOUT' | 'RATE_LIMIT' | 'NETWORK' | 'INVALID_RESPONSE' | 'UNKNOWN', originalError?: any | undefined);
}
/**
 * Message format for LLM
 */
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}
/**
 * Tool call format
 */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
/**
 * Tool definition format
 */
export interface Tool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required: string[];
        };
    };
}
/**
 * Chat completion response
 */
export interface ChatResponse {
    id: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string | null;
            tool_calls?: ToolCall[];
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
/**
 * Chat completion options
 */
export interface ChatOptions {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}
//# sourceMappingURL=types.d.ts.map