import type { GameState, NightAction } from '@aiwolf/shared';
/**
 * Fallback engine for timeouts and missing actions
 */
export declare class ActionFallbackEngine {
    /**
     * Generate fallback vote when player doesn't vote
     */
    generateFallbackVote(state: GameState, playerId: string): string;
    /**
     * Generate fallback night action
     */
    generateFallbackNightAction(state: GameState, playerId: string): NightAction | null;
    /**
     * Generate fallback wolf attack
     */
    generateFallbackWolfAttack(state: GameState, leaderId: string): string;
    /**
     * Select random target (deterministic with seed)
     */
    private randomTarget;
}
//# sourceMappingURL=ActionFallbackEngine.d.ts.map