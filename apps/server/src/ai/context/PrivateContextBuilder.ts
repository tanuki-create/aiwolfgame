import type { GameState, Player, Role } from '@aiwolf/shared';
import type { PublicMessage } from '@aiwolf/shared';

/**
 * Private Context Builder
 * Builds context for AI that includes private information (divination results, medium results, etc.)
 */
export class PrivateContextBuilder {
  /**
   * Build private context for a player with their role-specific information
   */
  build(
    state: GameState,
    player: Player,
    role: Role,
    privateInfo: {
      divinationResults?: Array<{ targetName: string; targetId: string; isWerewolf: boolean; dayNumber: number }>;
      mediumResults?: Array<{ targetName: string; targetId: string; isWerewolf: boolean; dayNumber: number }>;
      protectionResults?: Array<{ targetName: string; success: boolean; dayNumber: number }>;
    }
  ): string {
    let context = `# Game State (Day ${state.dayNumber}, Phase: ${state.phase})\n\n`;
    
    // Basic information
    context += `You are ${player.name}, playing as ${role}.\n\n`;
    
    // Alive players
    const alivePlayers = state.players.filter(p => state.alivePlayers.has(p.id));
    context += `## Alive Players (${alivePlayers.length})\n`;
    for (const p of alivePlayers) {
      context += `- ${p.name}${p.id === player.id ? ' (YOU)' : ''}\n`;
    }
    context += '\n';
    
    // Dead players
    const deadPlayers = state.players.filter(p => !state.alivePlayers.has(p.id));
    if (deadPlayers.length > 0) {
      context += `## Dead Players (${deadPlayers.length})\n`;
      for (const p of deadPlayers) {
        context += `- ${p.name}\n`;
      }
      context += '\n';
    }
    
    // Private Information Section
    context += `# Private Information (Only you know this)\n\n`;
    context += `Your secret role: **${role}**\n\n`;
    
    // Role-specific private information
    if (role === 'SEER' && privateInfo.divinationResults && privateInfo.divinationResults.length > 0) {
      context += `## Your Divination Results\n`;
      for (const result of privateInfo.divinationResults) {
        const verdict = result.isWerewolf ? '🐺 WEREWOLF' : '👤 HUMAN';
        context += `- Day ${result.dayNumber}: ${result.targetName} → ${verdict}\n`;
      }
      context += '\n';
    }
    
    if (role === 'MEDIUM' && privateInfo.mediumResults && privateInfo.mediumResults.length > 0) {
      context += `## Your Medium Results (About executed players)\n`;
      for (const result of privateInfo.mediumResults) {
        const verdict = result.isWerewolf ? '🐺 WEREWOLF' : '👤 HUMAN';
        context += `- Day ${result.dayNumber}: ${result.targetName} → ${verdict}\n`;
      }
      context += '\n';
    }
    
    if (role === 'KNIGHT' && privateInfo.protectionResults && privateInfo.protectionResults.length > 0) {
      context += `## Your Protection Results\n`;
      for (const result of privateInfo.protectionResults) {
        const outcome = result.success ? '✅ Protected from attack!' : '❌ No attack on this target';
        context += `- Day ${result.dayNumber}: Protected ${result.targetName} → ${outcome}\n`;
      }
      context += '\n';
    }
    
    if (role === 'WEREWOLF' || role === 'WHITE_WOLF') {
      const wolves = Array.from(state.roleAssignments.entries())
        .filter(([_, r]) => r === 'WEREWOLF' || r === 'WHITE_WOLF')
        .map(([id]) => state.players.find(p => p.id === id))
        .filter(p => p && state.alivePlayers.has(p.id));
      
      context += `## Your Pack (Fellow Werewolves)\n`;
      for (const wolf of wolves) {
        if (wolf) {
          context += `- ${wolf.name}${wolf.id === player.id ? ' (YOU)' : ''}\n`;
        }
      }
      context += '\n';
    }
    
    // Strategy guidance based on role
    context += `## Your Objective\n`;
    switch (role) {
      case 'VILLAGER':
        context += `- Find and execute all werewolves\n- Trust the seer and medium if they reveal themselves\n- Analyze behavior patterns to identify suspicious players\n`;
        break;
      case 'SEER':
        context += `- Divine players each night to identify werewolves\n- Strategically reveal your findings to help the village\n- Be careful not to be targeted by werewolves\n`;
        break;
      case 'MEDIUM':
        context += `- Learn the true role of executed players\n- Share your findings to build trust and identify liars\n- Help the village make informed decisions\n`;
        break;
      case 'KNIGHT':
        context += `- Protect key players (seer, confirmed villagers) from werewolf attacks\n- Your successful protection might reveal who was targeted\n`;
        break;
      case 'WEREWOLF':
      case 'WHITE_WOLF':
        context += `- Eliminate villagers without being discovered\n- Coordinate with your pack in night chat\n- Blend in during day discussions\n- Vote strategically to eliminate threats\n`;
        break;
      case 'MADMAN':
        context += `- You win with the werewolves, but you don't know who they are\n- Create chaos and confusion to help werewolves\n- Avoid being executed too early\n`;
        break;
      case 'FOX':
        context += `- Survive until all werewolves are eliminated or werewolves win\n- You are a third-party - neither village nor werewolf\n- Avoid divination (it will kill you)\n- Stay under the radar\n`;
        break;
    }
    
    return context;
  }
  
  /**
   * Build a shorter context for quick actions
   */
  buildQuickContext(state: GameState, player: Player, role: Role): string {
    let context = `You are ${player.name} (${role}), Day ${state.dayNumber}.\n`;
    context += `Alive: ${Array.from(state.alivePlayers).length} players.\n`;
    
    if (role === 'WEREWOLF' || role === 'WHITE_WOLF') {
      const wolves = Array.from(state.roleAssignments.entries())
        .filter(([_, r]) => r === 'WEREWOLF' || r === 'WHITE_WOLF')
        .map(([id]) => state.players.find(p => p.id === id)?.name)
        .filter(Boolean);
      context += `Your pack: ${wolves.join(', ')}.\n`;
    }
    
    return context;
  }
}

