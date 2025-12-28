import type { Tool } from '../types.js';
/**
 * Vote tool - for daytime voting
 */
export declare const VOTE_TOOL: Tool;
/**
 * Night action tool - for seer and knight
 */
export declare const NIGHT_ACTION_TOOL: Tool;
/**
 * Wolf attack submission tool - for wolf leader only
 */
export declare const WOLF_ATTACK_TOOL: Tool;
/**
 * Get tools for a specific context
 */
export declare function getToolsForContext(context: 'vote' | 'night_action' | 'wolf_attack'): Tool[];
//# sourceMappingURL=index.d.ts.map