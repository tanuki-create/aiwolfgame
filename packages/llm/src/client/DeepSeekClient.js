import { LLMError } from '../types.js';
/**
 * DeepSeek API client with OpenAI-compatible interface
 */
export class DeepSeekClient {
    baseURL;
    apiKey;
    model;
    timeout;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
        this.model = config.model || 'deepseek-chat';
        this.timeout = config.timeout || 8000; // 8 seconds default
    }
    /**
     * Make a chat completion request
     */
    async chat(messages, tools, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    tools,
                    temperature: options?.temperature ?? 0.7,
                    max_tokens: options?.max_tokens ?? 2000,
                    top_p: options?.top_p,
                    frequency_penalty: options?.frequency_penalty,
                    presence_penalty: options?.presence_penalty,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 429) {
                    throw new LLMError('Rate limit exceeded', 'RATE_LIMIT', { status: response.status });
                }
                const errorData = await response.json().catch(() => ({}));
                throw new LLMError(`API error: ${response.statusText}`, 'NETWORK', errorData);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new LLMError(`Request timeout after ${this.timeout}ms`, 'TIMEOUT', error);
            }
            if (error instanceof LLMError) {
                throw error;
            }
            throw new LLMError('Unknown error occurred', 'UNKNOWN', error);
        }
    }
    /**
     * Make a chat request with automatic retry
     */
    async chatWithRetry(messages, tools, options, maxRetries = 3) {
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.chat(messages, tools, options);
            }
            catch (error) {
                if (error instanceof LLMError) {
                    lastError = error;
                    // Don't retry on timeout or invalid response
                    if (error.code === 'TIMEOUT' || error.code === 'INVALID_RESPONSE') {
                        throw error;
                    }
                    // Exponential backoff for rate limits and network errors
                    if (attempt < maxRetries - 1) {
                        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                throw error;
            }
        }
        throw lastError || new LLMError('Max retries exceeded', 'UNKNOWN');
    }
    /**
     * Extract text content from response
     */
    getContent(response) {
        return response.choices[0]?.message?.content || '';
    }
    /**
     * Extract tool calls from response
     */
    getToolCalls(response) {
        const toolCalls = response.choices[0]?.message?.tool_calls;
        if (!toolCalls)
            return [];
        return toolCalls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
        }));
    }
    /**
     * Check if response has tool calls
     */
    hasToolCalls(response) {
        return !!(response.choices[0]?.message?.tool_calls?.length);
    }
}
