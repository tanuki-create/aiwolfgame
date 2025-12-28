/**
 * LLM Error types
 */
export class LLMError extends Error {
    code;
    originalError;
    constructor(message, code, originalError) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.name = 'LLMError';
    }
}
