import type { GameState, Player, WolfMessage } from '@aiwolf/shared';

/**
 * Wolf Chat Context Builder
 * Builds context specifically for werewolves during night chat phase
 */
export class WolfChatContextBuilder {
  /**
   * Build context for wolf chat phase
   */
  build(
    state: GameState,
    player: Player,
    wolfChatHistory: WolfMessage[]
  ): string {
    let context = `# 🐺 Werewolf Secret Chat (Night ${state.dayNumber})\n\n`;
    
    context += `You are ${player.name}, a **WEREWOLF**.\n`;
    context += `This is a private conversation that only werewolves can see.\n\n`;
    
    // List wolf pack members
    const wolves = Array.from(state.roleAssignments.entries())
      .filter(([_, role]) => role === 'WEREWOLF' || role === 'WHITE_WOLF')
      .map(([id]) => state.players.find(p => p.id === id))
      .filter(p => p && state.alivePlayers.has(p.id));
    
    context += `## Your Pack\n`;
    for (const wolf of wolves) {
      if (wolf) {
        context += `- ${wolf.name}${wolf.id === player.id ? ' (YOU)' : ''}\n`;
      }
    }
    context += '\n';
    
    // List potential targets (non-wolves)
    const alivePlayers = state.players.filter(p => state.alivePlayers.has(p.id));
    const potentialTargets = alivePlayers.filter(p => {
      const role = state.roleAssignments.get(p.id);
      return role !== 'WEREWOLF' && role !== 'WHITE_WOLF';
    });
    
    context += `## Potential Targets Tonight\n`;
    for (const target of potentialTargets) {
      context += `- ${target.name}\n`;
    }
    context += '\n';
    
    // Wolf chat history
    if (wolfChatHistory.length > 0) {
      context += `## Conversation History\n`;
      for (const msg of wolfChatHistory) {
        context += `**${msg.playerName}**: ${msg.content}\n`;
      }
      context += '\n';
    } else {
      context += `## Conversation History\n`;
      context += `(No messages yet. Start the discussion!)\n\n`;
    }
    
    // Strategy guidance
    context += `## Discussion Objectives\n`;
    context += `1. **Choose tonight's target**: Decide which villager to attack\n`;
    context += `2. **Identify threats**: Discuss who might be the Seer or Knight\n`;
    context += `3. **Plan tomorrow**: Coordinate your strategy for tomorrow's discussion\n`;
    context += `4. **Cover stories**: Prepare explanations for tomorrow's accusations\n\n`;
    
    context += `## Important Notes\n`;
    context += `- This chat is PRIVATE - villagers cannot see it\n`;
    context += `- Coordinate with your pack to make smart decisions\n`;
    context += `- Consider who poses the biggest threat to your victory\n`;
    context += `- Think about who might have special roles (Seer, Knight, Medium)\n`;
    
    return context;
  }
  
  /**
   * Build a quick summary for wolf chat
   */
  buildQuickSummary(state: GameState, wolfChatHistory: WolfMessage[]): string {
    let summary = `Night ${state.dayNumber} Wolf Chat:\n`;
    
    const wolves = Array.from(state.roleAssignments.entries())
      .filter(([_, role]) => role === 'WEREWOLF' || role === 'WHITE_WOLF')
      .filter(([id]) => state.alivePlayers.has(id))
      .map(([id]) => state.players.find(p => p.id === id)?.name)
      .filter(Boolean);
    
    summary += `Pack: ${wolves.join(', ')}.\n`;
    summary += `Messages: ${wolfChatHistory.length}.\n`;
    
    return summary;
  }
  
  /**
   * Build context for wolf attack decision (for the leader)
   */
  buildAttackDecisionContext(
    state: GameState,
    player: Player,
    wolfChatHistory: WolfMessage[]
  ): string {
    let context = this.build(state, player, wolfChatHistory);
    
    context += `\n\n---\n\n`;
    context += `# 🎯 Attack Decision Time\n\n`;
    context += `You are the pack leader. Based on the discussion above, decide who to attack tonight.\n`;
    context += `Consider:\n`;
    context += `- Strategic threats (suspected Seer, confirmed villagers)\n`;
    context += `- Pack consensus from the chat\n`;
    context += `- Long-term strategy for winning the game\n\n`;
    context += `Make your final decision using the attack tool.\n`;
    
    return context;
  }
}

