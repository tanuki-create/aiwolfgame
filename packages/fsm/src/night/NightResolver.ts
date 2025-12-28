import type { 
  GameState, 
  NightAction, 
  NightResult,
  DivinationResultDetail,
  MediumResultDetail,
  ProtectionResult,
  Role
} from '@aiwolf/shared';
import { RoleBuilder } from '../roles/RoleBuilder.js';
import { SeededRNG } from '@aiwolf/shared';

/**
 * Night action collector
 */
interface NightActions {
  divinations: Map<string, string>;  // seerId -> targetId
  protections: Map<string, string>;  // knightId -> targetId
  attack?: string;                   // targetId (only one attack per night)
}

/**
 * Night resolver handles all night actions and their resolutions
 */
export class NightResolver {
  private roleBuilder: RoleBuilder;
  private actions: NightActions;

  constructor() {
    this.roleBuilder = new RoleBuilder();
    this.actions = {
      divinations: new Map(),
      protections: new Map(),
    };
  }

  /**
   * Submit a night action
   */
  submitAction(action: NightAction): void {
    switch (action.actionType) {
      case 'DIVINE':
        this.actions.divinations.set(action.playerId, action.targetPlayerId);
        break;
      case 'PROTECT':
        this.actions.protections.set(action.playerId, action.targetPlayerId);
        break;
      case 'ATTACK':
        this.actions.attack = action.targetPlayerId;
        break;
    }
  }

  /**
   * Set wolf attack target
   */
  setWolfAttack(targetId: string): void {
    this.actions.attack = targetId;
  }

  /**
   * Check if action submitted
   */
  hasAction(playerId: string, actionType: string): boolean {
    switch (actionType) {
      case 'DIVINE':
        return this.actions.divinations.has(playerId);
      case 'PROTECT':
        return this.actions.protections.has(playerId);
      case 'ATTACK':
        return this.actions.attack !== undefined;
      default:
        return false;
    }
  }

  /**
   * Resolve all night actions
   */
  resolve(state: GameState): NightResult {
    // 1. Resolve divinations
    const divinationResults = this.resolveDivinations(state);

    // 2. Resolve protections (determine who is protected)
    const protectedPlayers = this.resolveProtections(state);

    // 3. Resolve attack (check if protected, handle CAT retaliation)
    const attackResult = this.resolveAttack(state, protectedPlayers);

    // 4. Resolve betrayer death if fox died
    const betrayerDeaths = this.resolveBetrayer(state, attackResult.deaths);

    // 5. Resolve hunter chain reaction (if hunter died)
    const hunterVictims = this.resolveHunter(state, [...attackResult.deaths, ...betrayerDeaths]);

    // 6. Resolve medium (for yesterday's execution)
    const mediumResults = this.resolveMedium(state);

    // Combine all deaths
    const allDeaths = [...attackResult.deaths, ...betrayerDeaths, ...hunterVictims];

    return {
      deaths: allDeaths,
      hunterVictims: hunterVictims.length > 0 ? hunterVictims : undefined,
      divinationResults,
      mediumResults,
      protectionResults: attackResult.protectionResults,
    };
  }

  /**
   * Resolve divinations (seer actions)
   */
  private resolveDivinations(state: GameState): Map<string, DivinationResultDetail> {
    const results = new Map<string, DivinationResultDetail>();

    for (const [seerId, targetId] of this.actions.divinations) {
      // Get target's role
      const targetRole = state.roleAssignments.get(targetId);
      if (!targetRole) continue;

      // Determine divination result based on role
      const result = this.roleBuilder.getDivinationResult(targetRole);

      results.set(seerId, {
        playerId: seerId,
        targetPlayerId: targetId,
        result,
      });
    }

    return results;
  }

  /**
   * Resolve protections (knight actions)
   */
  private resolveProtections(state: GameState): Set<string> {
    const protectedPlayers = new Set<string>();

    for (const [_, targetId] of this.actions.protections) {
      protectedPlayers.add(targetId);
    }

    return protectedPlayers;
  }

  /**
   * Resolve attack (werewolf action)
   */
  private resolveAttack(
    state: GameState,
    protectedPlayers: Set<string>
  ): {
    deaths: string[];
    protectionResults: Map<string, ProtectionResult>;
  } {
    const deaths: string[] = [];
    const protectionResults = new Map<string, ProtectionResult>();

    if (!this.actions.attack) {
      return { deaths, protectionResults };
    }

    const targetId = this.actions.attack;
    const wasProtected = protectedPlayers.has(targetId);

    // Record protection results for knights
    for (const [knightId, protectedId] of this.actions.protections) {
      const success = protectedId === targetId;
      protectionResults.set(knightId, {
        playerId: knightId,
        targetPlayerId: protectedId,
        success,
      });
    }

    // Kill target if not protected
    if (!wasProtected && state.alivePlayers.has(targetId)) {
      deaths.push(targetId);

      // Special: Fox dies if attacked
      const targetRole = state.roleAssignments.get(targetId);
      if (targetRole === 'FOX') {
        // Fox is killed by attack (but survives divination kills them instead)
      }
      
      // Special: CAT retaliates when attacked
      if (targetRole === 'CAT') {
        const rng = new SeededRNG(state.seeds.turns + state.dayNumber + 1000);
        const alivePlayers = Array.from(state.alivePlayers).filter(
          id => id !== targetId && !deaths.includes(id)
        );
        
        if (alivePlayers.length > 0) {
          const retaliationVictim = rng.choice(alivePlayers);
          deaths.push(retaliationVictim);
          console.log(`CAT ${targetId} retaliated and killed ${retaliationVictim}`);
        }
      }
    }

    return { deaths, protectionResults };
  }

  /**
   * Resolve betrayer death when fox dies
   */
  private resolveBetrayer(state: GameState, deaths: string[]): string[] {
    const betrayerDeaths: string[] = [];
    
    // Check if any fox died
    const foxDied = deaths.some(deadId => {
      const role = state.roleAssignments.get(deadId);
      return role === 'FOX';
    });
    
    if (foxDied) {
      // Find all alive betrayers and kill them
      for (const [playerId, role] of state.roleAssignments) {
        if (role === 'BETRAYER' && state.alivePlayers.has(playerId) && !deaths.includes(playerId)) {
          betrayerDeaths.push(playerId);
          console.log(`BETRAYER ${playerId} dies because fox died`);
        }
      }
    }
    
    return betrayerDeaths;
  }

  /**
   * Resolve hunter chain reaction
   */
  private resolveHunter(state: GameState, deaths: string[]): string[] {
    const hunterVictims: string[] = [];

    for (const deadPlayerId of deaths) {
      const role = state.roleAssignments.get(deadPlayerId);
      
      if (role === 'HUNTER' && state.alivePlayers.has(deadPlayerId)) {
        // Hunter kills random alive player (deterministic with seed)
        const rng = new SeededRNG(state.seeds.turns + state.dayNumber + 2000);
        const alivePlayers = Array.from(state.alivePlayers).filter(
          id => id !== deadPlayerId && !deaths.includes(id) && !hunterVictims.includes(id)
        );
        
        if (alivePlayers.length > 0) {
          const victim = rng.choice(alivePlayers);
          hunterVictims.push(victim);
        }
      }
    }

    return hunterVictims;
  }

  /**
   * Resolve medium (check yesterday's execution)
   */
  private resolveMedium(state: GameState): Map<string, MediumResultDetail> {
    const results = new Map<string, MediumResultDetail>();

    // Get yesterday's executed player
    // This should be passed in state or tracked separately
    // For now, placeholder implementation
    
    // Find all mediums
    const mediums = Array.from(state.roleAssignments.entries())
      .filter(([playerId, role]) => role === 'MEDIUM' && state.alivePlayers.has(playerId))
      .map(([playerId, _]) => playerId);

    // If there's a recent execution, mediums learn about it
    // Implementation depends on how we track execution history in state
    
    return results;
  }

  /**
   * Fill missing actions with random fallbacks
   */
  fillMissingActions(state: GameState): void {
    const rng = new SeededRNG(state.seeds.turns + state.dayNumber + 3000);
    const alivePlayers = Array.from(state.alivePlayers);

    // Fill missing divinations
    for (const [playerId, role] of state.roleAssignments) {
      if (!state.alivePlayers.has(playerId)) continue;

      if (role === 'SEER' && !this.actions.divinations.has(playerId)) {
        const validTargets = alivePlayers.filter(id => id !== playerId);
        if (validTargets.length > 0) {
          const target = rng.choice(validTargets);
          this.actions.divinations.set(playerId, target);
        }
      }

      if (role === 'KNIGHT' && !this.actions.protections.has(playerId)) {
        if (alivePlayers.length > 0) {
          const target = rng.choice(alivePlayers);
          this.actions.protections.set(playerId, target);
        }
      }
    }

    // Fill missing wolf attack
    if (!this.actions.attack) {
      const wolves = Array.from(state.roleAssignments.entries())
        .filter(([id, role]) => 
          (role === 'WEREWOLF' || role === 'WHITE_WOLF') && state.alivePlayers.has(id)
        )
        .map(([id, _]) => id);

      if (wolves.length > 0) {
        const nonWolves = alivePlayers.filter(id => !wolves.includes(id));
        if (nonWolves.length > 0) {
          const target = rng.choice(nonWolves);
          this.actions.attack = target;
        }
      }
    }
  }

  /**
   * Clear all actions (for next night)
   */
  clear(): void {
    this.actions = {
      divinations: new Map(),
      protections: new Map(),
    };
  }
}

