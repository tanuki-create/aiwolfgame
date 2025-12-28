// Client
export { DeepSeekClient } from './client/DeepSeekClient.js';

// Types
export * from './types.js';

// Tools
export * from './tools/index.js';

// Roster
export { RosterGenerator } from './roster/RosterGenerator.js';

// Context
export * from './context/builders.js';

// Orchestrator
export { AIOrchestrator } from './orchestrator/AIOrchestrator.js';
export type { SpeakRequest, SpeakResult } from './orchestrator/AIOrchestrator.js';

// Fallbacks
export { ActionFallbackEngine } from './fallbacks/ActionFallbackEngine.js';

