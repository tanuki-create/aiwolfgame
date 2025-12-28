import type { Role, BaseRole, Pack, PackConfig } from '@aiwolf/shared';
import { BASE_ROLES_11 } from '@aiwolf/shared';
import { SeededRNG } from '@aiwolf/shared';
import { ALL_PACK_CONFIGS } from './configs/index.js';

/**
 * Validation result for pack combinations
 */
interface PackValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Role builder that handles pack substitutions and constraints
 */
export class RoleBuilder {
  /**
   * Build role list from base roles and selected packs
   */
  buildRoles(packs: Pack[], seed: number): Role[] {
    // Validate pack combination
    const validation = this.validatePacks(packs);
    if (!validation.valid) {
      throw new Error(`Invalid pack combination: ${validation.errors.join(', ')}`);
    }

    // Apply pack substitutions
    let roles: Role[] = [...BASE_ROLES_11];
    
    for (const pack of packs) {
      roles = this.applyPackSubstitution(roles, pack);
    }

    // Verify we still have exactly 11 roles
    if (roles.length !== 11) {
      throw new Error(`Role count mismatch: expected 11, got ${roles.length}`);
    }

    return roles;
  }

  /**
   * Build roles with random pack selection
   */
  buildRandomRoles(seed: number): { roles: Role[]; packs: Pack[] } {
    const rng = new SeededRNG(seed);
    
    // Select random number of packs (0-3)
    const numPacks = rng.nextInt(0, 4);
    
    if (numPacks === 0) {
      return { roles: [...BASE_ROLES_11], packs: [] };
    }

    // Try to select valid pack combination
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidatePacks = this.selectRandomPacks(rng, numPacks);
      const validation = this.validatePacks(candidatePacks);
      
      if (validation.valid) {
        const roles = this.buildRoles(candidatePacks, seed);
        return { roles, packs: candidatePacks };
      }
    }

    // Fallback to base game if no valid combination found
    console.warn('Could not find valid random pack combination, using base game');
    return { roles: [...BASE_ROLES_11], packs: [] };
  }

  /**
   * Select random packs
   */
  private selectRandomPacks(rng: SeededRNG, count: number): Pack[] {
    const allPacks: Pack[] = ['FOX', 'FREEMASON', 'HUNTER', 'FANATIC', 'WHITE_WOLF'];
    return rng.sample(allPacks, count);
  }

  /**
   * Validate pack combination constraints
   */
  validatePacks(packs: Pack[]): PackValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate packs
    const uniquePacks = new Set(packs);
    if (uniquePacks.size !== packs.length) {
      errors.push('Duplicate packs are not allowed');
    }

    // Check third-party exclusive constraint
    const thirdPartyPacks = packs.filter(p => 
      ALL_PACK_CONFIGS[p].constraints.some(c => c.type === 'THIRD_PARTY_EXCLUSIVE')
    );
    if (thirdPartyPacks.length > 1) {
      errors.push(`Only one third-party faction allowed (found: ${thirdPartyPacks.join(', ')})`);
    }

    // Check judgment exclusive constraint
    const judgmentPacks = packs.filter(p =>
      ALL_PACK_CONFIGS[p].constraints.some(c => c.type === 'JUDGMENT_EXCLUSIVE')
    );
    if (judgmentPacks.length > 1) {
      errors.push(`Only one judgment modifier allowed (found: ${judgmentPacks.join(', ')})`);
    }

    // Check weight reduction (warning only)
    if (packs.includes('FREEMASON') && packs.includes('FANATIC')) {
      warnings.push('FREEMASON + FANATIC combination may lead to unbalanced gameplay');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Apply a single pack substitution to role list
   */
  private applyPackSubstitution(roles: Role[], pack: Pack): Role[] {
    const config = ALL_PACK_CONFIGS[pack];
    const result = [...roles];

    // Replace base roles with pack roles
    for (let i = 0; i < config.replaces.length; i++) {
      const toReplace = config.replaces[i];
      const replaceWith = config.newRoles[i];
      
      // Find first occurrence of role to replace
      const index = result.indexOf(toReplace);
      if (index === -1) {
        throw new Error(`Cannot apply pack ${pack}: role ${toReplace} not found`);
      }

      // Replace it
      result[index] = replaceWith;
    }

    return result;
  }

  /**
   * Get divination result for a role (what seer sees)
   */
  getDivinationResult(role: Role): 'WEREWOLF' | 'HUMAN' {
    switch (role) {
      case 'WEREWOLF':
        return 'WEREWOLF';
      case 'WHITE_WOLF':
        return 'HUMAN'; // White wolf appears as human
      case 'FANATIC':
        return 'WEREWOLF'; // Fanatic appears as werewolf
      default:
        return 'HUMAN';
    }
  }

  /**
   * Get medium result for a role (what medium learns)
   */
  getMediumResult(role: Role): 'WEREWOLF' | 'HUMAN' {
    switch (role) {
      case 'WEREWOLF':
      case 'WHITE_WOLF':
        return 'WEREWOLF';
      default:
        return 'HUMAN';
    }
  }

  /**
   * Check if role is a werewolf variant
   */
  isWerewolf(role: Role): boolean {
    return role === 'WEREWOLF' || role === 'WHITE_WOLF';
  }

  /**
   * Check if role can perform night actions
   */
  canPerformNightAction(role: Role): boolean {
    return ['SEER', 'KNIGHT', 'WEREWOLF', 'WHITE_WOLF'].includes(role);
  }
}

