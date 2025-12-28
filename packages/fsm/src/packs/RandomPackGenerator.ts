import type { Role, RoleSpec } from '@aiwolf/shared';
import { SeededRNG } from '@aiwolf/shared';

/**
 * Random pack generator
 * Generates a random role distribution for the game
 */
export class RandomPackGenerator {
  /**
   * Generate a random pack with the specified number of players
   * Guarantees: at least 2 werewolves and 3 villagers
   */
  generate(numPlayers: number, seed: number): RoleSpec[] {
    const rng = new SeededRNG(seed);
    
    // All available roles
    const allRoles: Role[] = [
      'VILLAGER', 'WEREWOLF', 'SEER', 'MEDIUM', 
      'KNIGHT', 'MADMAN', 'FOX', 'CAT', 'BETRAYER',
      'FREEMASON', 'HUNTER', 'FANATIC', 'WHITE_WOLF'
    ];
    
    // Minimum guaranteed roles
    const roles: RoleSpec[] = [
      { role: 'WEREWOLF', count: 2 },
      { role: 'VILLAGER', count: 3 },
    ];
    
    let remaining = numPlayers - 5;
    
    // Randomly select additional roles
    while (remaining > 0) {
      const randomRole = rng.choice(allRoles);
      const existing = roles.find(r => r.role === randomRole);
      
      if (existing) {
        existing.count++;
      } else {
        roles.push({ role: randomRole, count: 1 });
      }
      
      remaining--;
    }
    
    return roles;
  }
  
  /**
   * Generate multiple random packs and select the most balanced one
   * Balance is measured by role diversity and team balance
   */
  generateBalanced(numPlayers: number, seed: number, attempts: number = 10): RoleSpec[] {
    let bestPack: RoleSpec[] = [];
    let bestScore = -Infinity;
    
    for (let i = 0; i < attempts; i++) {
      const pack = this.generate(numPlayers, seed + i);
      const score = this.calculateBalanceScore(pack);
      
      if (score > bestScore) {
        bestScore = score;
        bestPack = pack;
      }
    }
    
    return bestPack;
  }
  
  /**
   * Calculate balance score for a pack
   * Higher score means better balance
   */
  private calculateBalanceScore(roles: RoleSpec[]): number {
    let score = 0;
    
    // Reward role diversity (more unique roles = higher score)
    score += roles.length * 10;
    
    // Count teams
    let villageCount = 0;
    let werewolfCount = 0;
    let foxCount = 0;
    
    for (const spec of roles) {
      switch (spec.role) {
        case 'VILLAGER':
        case 'SEER':
        case 'MEDIUM':
        case 'KNIGHT':
        case 'FREEMASON':
        case 'HUNTER':
        case 'CAT':
          villageCount += spec.count;
          break;
        case 'WEREWOLF':
        case 'WHITE_WOLF':
        case 'MADMAN':
        case 'FANATIC':
          werewolfCount += spec.count;
          break;
        case 'FOX':
        case 'BETRAYER':
          foxCount += spec.count;
          break;
      }
    }
    
    // Penalize extreme imbalance
    const totalPlayers = villageCount + werewolfCount + foxCount;
    const werewolfRatio = werewolfCount / totalPlayers;
    
    // Ideal werewolf ratio is 0.18-0.27 (2-3 out of 11 players)
    if (werewolfRatio >= 0.18 && werewolfRatio <= 0.27) {
      score += 50;
    } else {
      score -= Math.abs(werewolfRatio - 0.22) * 200;
    }
    
    // Reward presence of special roles (but not too many)
    const specialRoles = roles.filter(r => 
      !['VILLAGER', 'WEREWOLF'].includes(r.role)
    ).length;
    
    if (specialRoles >= 4 && specialRoles <= 7) {
      score += 30;
    }
    
    return score;
  }
}

