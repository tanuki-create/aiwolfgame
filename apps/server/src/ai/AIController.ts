import type { GameState, Player, Role } from '@aiwolf/shared';
import { DeepSeekClient, VOTE_TOOL, NIGHT_ACTION_TOOL, WOLF_ATTACK_TOOL } from '@aiwolf/llm';
import { ActionFallbackEngine } from '@aiwolf/llm';
import type { WSServer } from '../ws/WSServer.js';
import type { LogStore } from '@aiwolf/db';

/**
 * AI Controller manages AI player actions
 */
export class AIController {
  private deepseekClient: DeepSeekClient;
  private fallbackEngine: ActionFallbackEngine;
  private wsServer: WSServer;
  private logStore: LogStore;
  private roomId: string;
  private speakingInterval?: Timer;
  private actionTimeouts: Map<string, Timer> = new Map();

  constructor(
    roomId: string,
    deepseekClient: DeepSeekClient,
    wsServer: WSServer,
    logStore: LogStore
  ) {
    this.roomId = roomId;
    this.deepseekClient = deepseekClient;
    this.fallbackEngine = new ActionFallbackEngine();
    this.wsServer = wsServer;
    this.logStore = logStore;
  }

  /**
   * Start AI speech for day phase
   */
  async startDaySpeech(state: GameState): Promise<void> {
    // Stop any existing speech
    this.stopSpeech();

    // Get AI players who are alive
    const aiPlayers = state.players.filter(p => p.isAI && p.isAlive);
    
    if (aiPlayers.length === 0) return;

    // Schedule speeches at random intervals
    this.scheduleSpeechLoop(state, aiPlayers);
  }

  /**
   * Schedule speech loop
   */
  private scheduleSpeechLoop(state: GameState, aiPlayers: Player[]): void {
    const speakNext = () => {
      if (state.phase !== 'DAY_FREE_TALK' && state.phase !== 'NIGHT_WOLF_CHAT') {
        this.stopSpeech();
        return;
      }

      // Select random AI player
      const player = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
      
      if (player.persona) {
        // Get role for this player
        const role = state.roleAssignments.get(player.id);
        
        if (role) {
          // Schedule AI speech
          this.speakAsAI(state, player, role);
        }
      }

      // Schedule next speech (1-4 seconds interval for natural conversation)
      const delay = 1000 + Math.random() * 3000;
      this.speakingInterval = setTimeout(() => speakNext(), delay);
    };

    // Start with small delay
    this.speakingInterval = setTimeout(() => speakNext(), 2000);
  }

  /**
   * Make AI speak
   */
  private async speakAsAI(state: GameState, player: Player, role: Role): Promise<void> {
    try {
      // Try to use LLM first, fallback to simple message if it fails
      let content: string;
      
      try {
        content = await this.generateLLMMessage(state, player, role);
      } catch (llmError) {
        console.warn(`LLM generation failed for ${player.name}, using fallback:`, llmError);
        content = this.generateSimpleMessage(player, role, state);
      }
      
      if (!content) return;

      // Simulate typing delay based on skill level
      const typingDelay = this.getTypingDelay(player.persona?.skillLevel || 'INTERMEDIATE');
      
      await new Promise(resolve => setTimeout(resolve, typingDelay));

      // Broadcast message
      const messageId = `ai_msg_${Date.now()}_${player.id}`;
      
      this.wsServer.broadcast(this.roomId, {
        type: 'MESSAGE',
        payload: {
          id: messageId,
          playerName: player.name,
          content,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      // Save to log
      await this.logStore.savePublicMessage({
        id: messageId,
        gameId: this.roomId,
        playerId: player.id,
        playerName: player.name,
        content,
        timestamp: Date.now(),
        dayNumber: state.dayNumber,
      });
    } catch (error) {
      console.error('AI speech error:', error);
    }
  }

  /**
   * Generate message using LLM
   */
  private async generateLLMMessage(state: GameState, player: Player, role: Role): Promise<string> {
    // Build context for the AI
    const recentMessages = await this.logStore.getPublicMessages(this.roomId);
    const last5Messages = recentMessages.slice(-5);
    
    const context = {
      playerName: player.name,
      role: role,
      personality: player.persona?.personality || 'analytical and cautious',
      dayNumber: state.dayNumber,
      alivePlayers: Array.from(state.alivePlayers).length,
      recentMessages: last5Messages.map(m => `${m.playerName}: ${m.content}`).join('\n'),
    };

    const prompt = `You are ${context.playerName}, playing Werewolf game.
Your role: ${context.role}
Your personality: ${context.personality}
Day: ${context.dayNumber}
Alive players: ${context.alivePlayers}

Recent conversation:
${context.recentMessages || '(No messages yet)'}

Generate a single short message (1-2 sentences) that ${context.playerName} would say in this situation. 
Be natural and stay in character. Don't reveal your role directly if you're a werewolf.
Respond ONLY with the message text, no quotes or formatting:`;

    const messages = [
      { role: 'system' as const, content: 'You are a helpful AI that generates natural conversation for a Werewolf game character.' },
      { role: 'user' as const, content: prompt }
    ];

    const response = await this.deepseekClient.chatWithRetry(messages, undefined, { 
      temperature: 0.8, 
      maxTokens: 100 
    });

    return this.deepseekClient.getContent(response).trim();
  }

  /**
   * Generate simple message (fallback)
   */
  private generateSimpleMessage(player: Player, role: Role, state: GameState): string {
    const skillLevel = player.persona?.skillLevel || 'INTERMEDIATE';
    const dayNumber = state.dayNumber;
    
    // Simple message templates based on role and skill
    const templates: Record<string, string[]> = {
      VILLAGER: [
        "Let's think carefully about who might be suspicious.",
        "I'm just a regular villager trying to help.",
        "Has anyone noticed anything unusual?",
        "We need to work together to find the werewolves.",
      ],
      SEER: [
        "I have some information that might help us.",
        "Based on what I know, let's discuss our options.",
        "I want to share my thoughts about someone.",
      ],
      KNIGHT: [
        "I'll do my best to protect the village.",
        "We should be strategic about our choices.",
      ],
      WEREWOLF: [
        "I agree, we need to find the werewolves quickly.",
        "That's suspicious behavior, we should investigate.",
        "I think we should focus on finding evidence.",
      ],
      MADMAN: [
        "The werewolves are definitely among us!",
        "We can't trust anyone right now.",
      ],
    };

    const roleTemplates = templates[role] || templates.VILLAGER;
    const template = roleTemplates[Math.floor(Math.random() * roleTemplates.length)];
    
    return template;
  }

  /**
   * Get typing delay based on skill level
   */
  private getTypingDelay(skillLevel: string): number {
    switch (skillLevel) {
      case 'BEGINNER':
        return 800 + Math.random() * 400;
      case 'ADVANCED':
        return 300 + Math.random() * 200;
      default:
        return 500 + Math.random() * 300;
    }
  }

  /**
   * Handle AI voting
   */
  async handleAIVoting(state: GameState): Promise<void> {
    const aiPlayers = state.players.filter(p => p.isAI && p.isAlive);
    
    for (const player of aiPlayers) {
      const role = state.roleAssignments.get(player.id);
      if (!role) continue;

      let targetId: string;

      try {
        // Try to use LLM with tool calling for voting decision
        targetId = await this.generateVoteWithLLM(state, player, role);
      } catch (error) {
        console.warn(`LLM vote generation failed for ${player.name}, using fallback:`, error);
        // Fallback to rule-based voting
        const vote = this.fallbackEngine.generateFallbackVote(
          player.id,
          state.alivePlayers,
          role,
          state.seeds.turns + state.dayNumber
        );
        targetId = vote.targetId;
      }

      // Emit vote event (will be handled by vote system)
      this.wsServer.broadcast(this.roomId, {
        type: 'AI_VOTE',
        payload: {
          playerId: player.id,
          targetId,
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Generate vote using LLM with tool calling
   */
  private async generateVoteWithLLM(state: GameState, player: Player, role: Role): Promise<string> {
    const recentMessages = await this.logStore.getPublicMessages(this.roomId);
    const last10Messages = recentMessages.slice(-10);
    
    const alivePlayers = Array.from(state.alivePlayers);
    const alivePlayerNames = alivePlayers
      .map(id => {
        const p = state.players.find(pl => pl.id === id);
        return p ? `${p.name} (ID: ${p.id})` : null;
      })
      .filter(Boolean)
      .join(', ');

    const prompt = `You are ${player.name}, playing Werewolf game.
Your role: ${role}
Day: ${state.dayNumber}

Alive players: ${alivePlayerNames}

Recent conversation:
${last10Messages.map(m => `${m.playerName}: ${m.content}`).join('\n') || '(No messages yet)'}

You must vote to execute one player. Analyze the situation and make a strategic decision.
${role === 'WEREWOLF' ? 'Remember: you are a werewolf, so vote for a villager to eliminate them.' : ''}
${role === 'SEER' ? 'Use your divination knowledge to make an informed decision.' : ''}

Use the vote tool to cast your vote.`;

    const messages = [
      { role: 'system' as const, content: 'You are an AI playing Werewolf. Use the provided tools to make decisions.' },
      { role: 'user' as const, content: prompt }
    ];

    const response = await this.deepseekClient.chatWithRetry(messages, [VOTE_TOOL], { temperature: 0.7 });

    if (this.deepseekClient.hasToolCalls(response)) {
      const toolCalls = this.deepseekClient.getToolCalls(response);
      const voteCall = toolCalls.find(tc => tc.name === 'vote');
      
      if (voteCall && voteCall.arguments.target_player_id) {
        return voteCall.arguments.target_player_id;
      }
    }

    throw new Error('LLM did not return a vote');
  }

  /**
   * Handle AI night actions
   */
  async handleAINightActions(state: GameState): Promise<void> {
    const aiPlayers = state.players.filter(p => p.isAI && p.isAlive);
    
    for (const player of aiPlayers) {
      const role = state.roleAssignments.get(player.id);
      if (!role) continue;

      if (role === 'SEER' || role === 'KNIGHT') {
        let targetId: string;
        let actionType: 'DIVINE' | 'PROTECT';

        try {
          // Try LLM with tool calling
          const result = await this.generateNightActionWithLLM(state, player, role);
          targetId = result.targetId;
          actionType = result.actionType;
        } catch (error) {
          console.warn(`LLM night action failed for ${player.name}, using fallback:`, error);
          // Fallback to rule-based action
          const action = this.fallbackEngine.generateFallbackNightAction(
            player.id,
            role,
            state.alivePlayers,
            state.seeds.turns + state.dayNumber
          );
          targetId = action.targetId;
          actionType = action.actionType;
        }

        // Emit night action event
        this.wsServer.broadcast(this.roomId, {
          type: 'AI_NIGHT_ACTION',
          payload: {
            playerId: player.id,
            actionType,
            targetId,
          },
          timestamp: Date.now(),
        });
      }
    }

    // Handle werewolf attack
    const werewolves = aiPlayers.filter(p => {
      const role = state.roleAssignments.get(p.id);
      return role === 'WEREWOLF' || role === 'WHITE_WOLF';
    });

    if (werewolves.length > 0) {
      const leader = werewolves[0]; // Simple leader selection
      let targetId: string;

      try {
        // Try LLM with tool calling for wolf attack
        targetId = await this.generateWolfAttackWithLLM(state, leader);
      } catch (error) {
        console.warn(`LLM wolf attack failed, using fallback:`, error);
        const attack = this.fallbackEngine.generateFallbackWolfAttack(
          leader.id,
          state.alivePlayers,
          werewolves.map(w => w.id),
          state.seeds.turns + state.dayNumber
        );
        targetId = attack.targetId;
      }

      this.wsServer.broadcast(this.roomId, {
        type: 'AI_WOLF_ATTACK',
        payload: {
          attackerId: leader.id,
          targetId,
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Generate night action using LLM with tool calling
   */
  private async generateNightActionWithLLM(
    state: GameState, 
    player: Player, 
    role: Role
  ): Promise<{ targetId: string; actionType: 'DIVINE' | 'PROTECT' }> {
    const alivePlayers = Array.from(state.alivePlayers);
    const alivePlayerNames = alivePlayers
      .map(id => {
        const p = state.players.find(pl => pl.id === id);
        return p ? `${p.name} (ID: ${p.id})` : null;
      })
      .filter(Boolean)
      .join(', ');

    const actionDesc = role === 'SEER' ? 'divine (check if someone is a werewolf)' : 'protect (guard someone from werewolf attack)';
    
    const prompt = `You are ${player.name}, a ${role} in Werewolf game.
Day: ${state.dayNumber}
Alive players: ${alivePlayerNames}

Tonight you can ${actionDesc}. Choose wisely based on the day's discussion.
Use the night_action tool to perform your action.`;

    const messages = [
      { role: 'system' as const, content: 'You are an AI playing Werewolf. Use the provided tools to make decisions.' },
      { role: 'user' as const, content: prompt }
    ];

    const response = await this.deepseekClient.chatWithRetry(messages, [NIGHT_ACTION_TOOL], { temperature: 0.7 });

    if (this.deepseekClient.hasToolCalls(response)) {
      const toolCalls = this.deepseekClient.getToolCalls(response);
      const actionCall = toolCalls.find(tc => tc.name === 'night_action');
      
      if (actionCall && actionCall.arguments.target_player_id) {
        const actionType = role === 'SEER' ? 'DIVINE' : 'PROTECT';
        return {
          targetId: actionCall.arguments.target_player_id,
          actionType: actionType as 'DIVINE' | 'PROTECT',
        };
      }
    }

    throw new Error('LLM did not return a night action');
  }

  /**
   * Generate wolf attack using LLM with tool calling
   */
  private async generateWolfAttackWithLLM(state: GameState, leader: Player): Promise<string> {
    const wolfChatMessages = await this.logStore.getWolfMessages(this.roomId, state.dayNumber);
    
    const alivePlayers = Array.from(state.alivePlayers);
    const nonWolves = alivePlayers.filter(id => {
      const role = state.roleAssignments.get(id);
      return role !== 'WEREWOLF' && role !== 'WHITE_WOLF';
    });
    
    const targetNames = nonWolves
      .map(id => {
        const p = state.players.find(pl => pl.id === id);
        return p ? `${p.name} (ID: ${p.id})` : null;
      })
      .filter(Boolean)
      .join(', ');

    const prompt = `You are ${leader.name}, a werewolf and the pack leader.
Day: ${state.dayNumber}

Your pack's discussion:
${wolfChatMessages.map(m => `${m.playerName}: ${m.content}`).join('\n') || '(No discussion yet)'}

Possible targets: ${targetNames}

Decide who to attack tonight. Use the submit_wolf_attack tool to finalize your decision.`;

    const messages = [
      { role: 'system' as const, content: 'You are a werewolf leader. Make the final attack decision.' },
      { role: 'user' as const, content: prompt }
    ];

    const response = await this.deepseekClient.chatWithRetry(messages, [WOLF_ATTACK_TOOL], { temperature: 0.7 });

    if (this.deepseekClient.hasToolCalls(response)) {
      const toolCalls = this.deepseekClient.getToolCalls(response);
      const attackCall = toolCalls.find(tc => tc.name === 'submit_wolf_attack');
      
      if (attackCall && attackCall.arguments.target_player_id) {
        return attackCall.arguments.target_player_id;
      }
    }

    throw new Error('LLM did not return a wolf attack');
  }

  /**
   * Stop speech
   */
  stopSpeech(): void {
    if (this.speakingInterval) {
      clearTimeout(this.speakingInterval);
      this.speakingInterval = undefined;
    }

    // Clear all action timeouts
    for (const timeout of this.actionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.actionTimeouts.clear();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopSpeech();
  }
}


