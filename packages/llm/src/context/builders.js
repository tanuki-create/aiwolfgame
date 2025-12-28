/**
 * Build public context visible to all players
 */
export class PublicContextBuilder {
    build(state, playerId) {
        const player = state.players.find(p => p.id === playerId);
        if (!player)
            throw new Error('Player not found');
        let context = `=== GAME STATE ===\n`;
        context += `Day: ${state.dayNumber}\n`;
        context += `Phase: ${this.formatPhase(state.phase)}\n\n`;
        context += `=== PLAYERS ===\n`;
        for (const p of state.players) {
            const status = state.alivePlayers.has(p.id) ? '✓ Alive' : '✗ Dead';
            context += `- ${p.name} ${p.id === playerId ? '(YOU)' : ''}: ${status}\n`;
        }
        context += `\nTotal alive: ${state.alivePlayers.size}/${state.players.length}\n`;
        return context;
    }
    formatPhase(phase) {
        return phase.replace(/_/g, ' ').toLowerCase();
    }
}
/**
 * Build private context for individual player (includes role)
 */
export class PrivateContextBuilder {
    publicBuilder;
    constructor() {
        this.publicBuilder = new PublicContextBuilder();
    }
    build(state, playerId) {
        const player = state.players.find(p => p.id === playerId);
        if (!player)
            throw new Error('Player not found');
        const role = state.roleAssignments.get(playerId);
        if (!role)
            throw new Error('Role not assigned');
        let context = this.publicBuilder.build(state, playerId);
        context += `\n=== YOUR PRIVATE INFORMATION ===\n`;
        context += `Your Role: ${role}\n`;
        // Add role-specific private info
        if (role === 'FREEMASON') {
            const masons = Array.from(state.roleAssignments.entries())
                .filter(([id, r]) => r === 'FREEMASON' && id !== playerId)
                .map(([id]) => state.players.find(p => p.id === id)?.name);
            if (masons.length > 0) {
                context += `Your Freemason partner: ${masons.join(', ')}\n`;
            }
        }
        return context;
    }
}
/**
 * Build wolf chat context (for werewolves only)
 */
export class WolfChatContextBuilder {
    publicBuilder;
    constructor() {
        this.publicBuilder = new PublicContextBuilder();
    }
    build(state, wolfId, isLeader) {
        const wolf = state.players.find(p => p.id === wolfId);
        if (!wolf)
            throw new Error('Wolf not found');
        let context = this.publicBuilder.build(state, wolfId);
        context += `\n=== WOLF TEAM ===\n`;
        const wolves = Array.from(state.roleAssignments.entries())
            .filter(([_, role]) => role === 'WEREWOLF' || role === 'WHITE_WOLF')
            .map(([id, role]) => {
            const p = state.players.find(p => p.id === id);
            const isYou = id === wolfId;
            return `- ${p?.name} ${isYou ? '(YOU)' : ''} [${role}]`;
        });
        context += wolves.join('\n') + '\n';
        if (isLeader) {
            context += `\n⭐ You are the WOLF LEADER. You must submit the final attack decision using submit_wolf_attack function.\n`;
        }
        else {
            context += `\nDiscuss with your pack. The leader will submit the final attack.\n`;
        }
        return context;
    }
}
/**
 * Build messages array for LLM
 */
export class MessageBuilder {
    buildMessages(systemPrompt, contextInfo) {
        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contextInfo },
        ];
    }
    addChatHistory(messages, history) {
        if (history.length === 0)
            return messages;
        const historyText = history
            .map(h => `${h.speaker}: ${h.text}`)
            .join('\n');
        return [
            ...messages,
            { role: 'user', content: `\n=== RECENT DISCUSSION ===\n${historyText}` },
        ];
    }
}
