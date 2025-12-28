import type { GameState, Player, Role } from '@aiwolf/shared';
import { DeepSeekClient, VOTE_TOOL, NIGHT_ACTION_TOOL, WOLF_ATTACK_TOOL } from '@aiwolf/llm';
import { ActionFallbackEngine } from '@aiwolf/llm';
import { getSpeechTraits, calculateSpeechDelay, shouldReactToMessage, type SpeechTraits } from '@aiwolf/shared';
import type { WSServer } from '../ws/WSServer.js';
import type { LogStore } from '@aiwolf/db';

/**
 * AI player speech state
 */
interface AIPlayerState {
  player: Player;
  role: Role;
  traits: SpeechTraits;
  lastSpeechTime: number;
  scheduledTimeout?: Timer;
}

/**
 * AI Controller manages AI player actions with natural conversation patterns
 */
export class AIController {
  private deepseekClient: DeepSeekClient;
  private fallbackEngine: ActionFallbackEngine;
  private wsServer: WSServer;
  private logStore: LogStore;
  private roomId: string;
  private roomManager?: any; // RoomManager reference
  private aiPlayerStates: Map<string, AIPlayerState> = new Map();
  private lastMessageTime: number = 0;
  private messageCount: number = 0;
  private actionTimeouts: Map<string, Timer> = new Map();
  private speakingInterval?: Timer;

  constructor(
    roomId: string,
    deepseekClient: DeepSeekClient,
    wsServer: WSServer,
    logStore: LogStore,
    roomManager?: any
  ) {
    this.roomId = roomId;
    this.deepseekClient = deepseekClient;
    this.fallbackEngine = new ActionFallbackEngine();
    this.wsServer = wsServer;
    this.logStore = logStore;
    this.roomManager = roomManager;
  }

  /**
   * Start AI speech for day phase with natural conversation patterns
   */
  async startDaySpeech(state: GameState): Promise<void> {
    console.log('[AIController] 🎤 Starting natural conversation system...');
    
    // Clear any existing state
    this.stopSpeech();
    this.aiPlayerStates.clear();

    // Get AI players who are alive
    const aiPlayers = state.players.filter(p => p.type === 'AI' && p.isAlive);
    
    console.log(`[AIController] 👥 Found ${aiPlayers.length} AI players`);
    
    if (aiPlayers.length === 0) {
      console.warn('[AIController] ⚠️  No AI players found!');
      return;
    }

    // Initialize speech state for each AI player
    for (const player of aiPlayers) {
      const role = state.roleAssignments.get(player.id);
      if (!role || !player.persona) continue;

      const traits = getSpeechTraits(player.persona);
      
      this.aiPlayerStates.set(player.id, {
        player,
        role,
        traits,
        lastSpeechTime: Date.now(),
      });

      console.log(`[AIController] 📊 ${player.name}: baseInterval=${traits.baseInterval}ms, reactionChance=${(traits.reactionChance * 100).toFixed(0)}%`);
    }

    // Start natural conversation loop
    this.scheduleNaturalSpeech(state);
  }

  /**
   * Schedule natural speech patterns
   */
  private scheduleNaturalSpeech(state: GameState): void {
    // Check if we should stop
    if (state.phase !== 'DAY_FREE_TALK' && state.phase !== 'NIGHT_WOLF_CHAT') {
      console.log('[AIController] 🛑 Stopping speech - phase changed to:', state.phase);
      return;
    }

    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;

    // Detect conversation stagnation (no one spoke for 10+ seconds)
    const isStagnant = timeSinceLastMessage > 10000;

    // Find AI players ready to speak
    const readyToSpeak: { playerId: string; delay: number }[] = [];

    for (const [playerId, aiState] of this.aiPlayerStates.entries()) {
      const timeSinceOwnSpeech = now - aiState.lastSpeechTime;
      
      // Skip if spoke too recently
      if (timeSinceOwnSpeech < aiState.traits.minTimeSinceLastSpeech) {
        continue;
      }

      // Calculate natural delay
      let delay = calculateSpeechDelay(aiState.traits);

      // If conversation is stagnant, someone should speak soon
      if (isStagnant) {
        delay = Math.min(delay, 3000); // Reduce delay to 3 seconds max
        console.log(`[AIController] 💤 Conversation stagnant - ${aiState.player.name} will speak soon`);
      }

      readyToSpeak.push({ playerId, delay });
    }

    if (readyToSpeak.length === 0) {
      // No one ready, check again in 2 seconds
      setTimeout(() => this.scheduleNaturalSpeech(state), 2000);
      return;
    }

    // Pick a random player from those ready to speak
    const chosen = readyToSpeak[Math.floor(Math.random() * readyToSpeak.length)];
    const aiState = this.aiPlayerStates.get(chosen.playerId);

    if (aiState) {
      // Schedule this player to speak
      aiState.scheduledTimeout = setTimeout(async () => {
        await this.speakAsAI(state, aiState.player, aiState.role);
        aiState.lastSpeechTime = Date.now();
        this.lastMessageTime = Date.now();
        this.messageCount++;
        
        // Schedule next speech
        this.scheduleNaturalSpeech(state);
      }, chosen.delay);
    }
  }

  /**
   * React to a new message (called by RoomManager)
   */
  async onMessageReceived(state: GameState, senderId: string, senderName: string, content: string): Promise<void> {
    this.lastMessageTime = Date.now();
    this.messageCount++;

    // Check each AI player to see if they should react
    for (const [playerId, aiState] of this.aiPlayerStates.entries()) {
      // Don't react to own messages
      if (playerId === senderId) continue;

      const now = Date.now();
      const timeSinceOwnSpeech = now - aiState.lastSpeechTime;

      // Check if mentioned
      const isMentioned = content.toLowerCase().includes(aiState.player.name.toLowerCase());

      // Decide if should react
      if (shouldReactToMessage(aiState.traits, isMentioned, timeSinceOwnSpeech)) {
        console.log(`[AIController] 💬 ${aiState.player.name} will react to ${senderName}'s message${isMentioned ? ' (MENTIONED!)' : ''}`);
        
        // Cancel any scheduled speech
        if (aiState.scheduledTimeout) {
          clearTimeout(aiState.scheduledTimeout);
        }

        // React after a short delay (1-3 seconds)
        const reactionDelay = 1000 + Math.random() * 2000;
        
        aiState.scheduledTimeout = setTimeout(async () => {
          await this.speakAsAI(state, aiState.player, aiState.role, false, { 
            replyTo: senderName, 
            replyContent: content 
          });
          aiState.lastSpeechTime = Date.now();
          this.lastMessageTime = Date.now();
        }, reactionDelay);
      }
    }
  }

  /**
   * Start revote talk phase - only tied players speak
   */
  async startRevoteTalk(state: GameState): Promise<void> {
    console.log('[AIController] 🔄 Starting revote talk for tied players...');
    
    // Stop any existing speech
    this.stopSpeech();

    if (!state.tiedPlayers || state.tiedPlayers.length === 0) {
      console.warn('[AIController] ⚠️  No tied players found!');
      return;
    }

    // Get AI players who are tied
    const tiedAIPlayers = state.players.filter(
      p => p.type === 'AI' && p.isAlive && state.tiedPlayers?.includes(p.id)
    );

    console.log(`[AIController] 👥 Tied AI players (${tiedAIPlayers.length}):`, tiedAIPlayers.map(p => p.name));

    if (tiedAIPlayers.length === 0) {
      console.log('[AIController] ℹ️  No tied AI players - only humans are tied.');
      return;
    }

    // Each tied AI player speaks once
    for (const player of tiedAIPlayers) {
      const role = state.roleAssignments.get(player.id);
      if (role) {
        // Add small delay between speeches
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.speakAsAI(state, player, role, true); // isRevoteTalk = true
      }
    }
  }

  /**
   * Handle last will - executed player's final statement
   */
  async handleLastWill(state: GameState): Promise<void> {
    console.log('[AIController] ⚖️ Handling last will...');
    
    if (!state.executedPlayerId) {
      console.warn('[AIController] ⚠️  No executed player found for last will!');
      return;
    }

    const executedPlayer = state.players.find(p => p.id === state.executedPlayerId);
    if (!executedPlayer || executedPlayer.type !== 'AI') {
      console.log(`[AIController] 👤 Executed player ${executedPlayer?.name || 'unknown'} is not AI, skipping last will generation`);
      return;
    }

    const role = state.roleAssignments.get(executedPlayer.id);
    if (!role) {
      console.warn(`[AIController] ⚠️  No role found for executed player ${executedPlayer.name}`);
      return;
    }

    console.log(`[AIController] 💬 Generating last will for ${executedPlayer.name} (${role})...`);
    
    try {
      const lastWill = await this.generateLastWill(state, executedPlayer, role);
      
      // Broadcast last will message
      const messageId = `last_will_${Date.now()}`;
      this.wsServer.broadcast(this.roomId, {
        type: 'MESSAGE',
        payload: {
          id: messageId,
          playerName: executedPlayer.name,
          content: lastWill,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      // Save to log
      await this.logStore.savePublicMessage({
        id: messageId,
        type: 'PUBLIC',
        gameId: this.roomId,
        playerId: executedPlayer.id,
        playerName: executedPlayer.name,
        content: lastWill,
        timestamp: Date.now(),
        dayNumber: state.dayNumber,
      });
      
      console.log(`[AIController] ⚖️ ${executedPlayer.name} last will: "${lastWill}"`);
    } catch (error) {
      console.error(`[AIController] ❌ Failed to generate last will for ${executedPlayer.name}:`, error);
    }
  }

  /**
   * Generate last will using LLM
   */
  private async generateLastWill(state: GameState, player: Player, role: Role): Promise<string> {
    const recentMessages = await this.logStore.getPublicMessages(this.roomId);
    const last10Messages = recentMessages.slice(-10);
    
    const prompt = `あなたは${player.name}です。人狼ゲームをプレイしています。
あなたの役職: ${role}
あなたの性格: ${player.persona?.personality || '分析的'}
現在: ${state.dayNumber}日目

あなたは村によって処刑されました。これはあなたの遺言 - 死ぬ前の最後の言葉です。

最近の会話:
${last10Messages.map(m => `${m.playerName}: ${m.content}`).join('\n') || '(まだメッセージがありません)'}

最後の声明を生成してください（2-3文）。以下のことができます:
- チームに役立つ場合は本当の役職を明かす
- 疑惑や証拠を共有する
- 生存者にアドバイスを与える
- 処刑についての気持ちを表現する

キャラクターを維持し、影響力のある発言をしてください。これがゲームに影響を与える最後のチャンスです。
メッセージテキストのみを返してください。引用符や書式設定は不要です:`;

    const messages = [
      { role: 'system' as const, content: '人狼ゲームをプレイするAIとして、力強い最後の声明を日本語で生成します。' },
      { role: 'user' as const, content: prompt }
    ];

    console.log(`[LLM Last Will] Calling DeepSeek API for ${player.name}...`);
    const response = await this.deepseekClient.chatWithRetry(messages, undefined, { 
      temperature: 0.9,  // Higher temperature for more emotional/varied responses
      max_tokens: 150
    });

    const content = this.deepseekClient.getContent(response).trim();
    console.log(`[LLM Last Will Response] "${content}"`);

    // Fallback if LLM fails
    if (!content || content.length < 10) {
      const fallbacks = [
        `I was innocent... Please find the real werewolf...`,
        `My death won't be in vain. Trust no one.`,
        `Remember what I said about the suspicious ones...`,
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    return content;
  }

  /**
   * Stop all AI speech
   */
  stopSpeech(): void {
    console.log('[AIController] 🛑 Stopping all AI speech...');
    
    // Clear all scheduled timeouts
    for (const aiState of this.aiPlayerStates.values()) {
      if (aiState.scheduledTimeout) {
        clearTimeout(aiState.scheduledTimeout);
      }
    }
    
    // Clear speaking interval if exists
    if (this.speakingInterval) {
      clearTimeout(this.speakingInterval);
      this.speakingInterval = undefined;
    }
    
    // Clear all action timeouts
    for (const timeout of this.actionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.actionTimeouts.clear();
    
    this.aiPlayerStates.clear();
  }

  /**
   * Make AI speak with optional reaction context
   */
  private async speakAsAI(
    state: GameState, 
    player: Player, 
    role: Role, 
    isRevoteTalk: boolean = false,
    reactionContext?: { replyTo: string; replyContent: string }
  ): Promise<void> {
    try {
      // Try to use LLM first, fallback to simple message if it fails
      let content: string;
      let usedLLM = false;
      
      try {
        console.log(`[LLM] Generating message for ${player.name} (${role})${isRevoteTalk ? ' [REVOTE TALK]' : ''}${reactionContext ? ` [REPLY to ${reactionContext.replyTo}]` : ''}...`);
        const startTime = Date.now();
        content = await this.generateLLMMessage(state, player, role, isRevoteTalk, reactionContext);
        const duration = Date.now() - startTime;
        console.log(`[LLM] ✅ Success for ${player.name} (${duration}ms): "${content.substring(0, 50)}..."`);
        usedLLM = true;
      } catch (llmError) {
        console.warn(`[LLM] ❌ Failed for ${player.name}, using fallback:`, llmError);
        content = this.generateSimpleMessage(player, role, state);
        console.log(`[Fallback] Generated: "${content}"`);
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
        type: 'PUBLIC',
        gameId: this.roomId,
        playerId: player.id,
        playerName: player.name,
        content,
        timestamp: Date.now(),
        dayNumber: state.dayNumber,
      });
      
      console.log(`[AI Speech] ${player.name}: "${content}" (LLM: ${usedLLM})`);
    } catch (error) {
      console.error('[AI Speech] Error:', error);
    }
  }

  /**
   * Generate message using LLM
   */
  private async generateLLMMessage(
    state: GameState, 
    player: Player, 
    role: Role, 
    isRevoteTalk: boolean = false,
    reactionContext?: { replyTo: string; replyContent: string }
  ): Promise<string> {
    console.log(`[LLM Context] Building context for ${player.name}...`);
    
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
      isRevoteTalk,
      reactionContext,
    };

    let prompt: string;

    if (isRevoteTalk) {
      prompt = `あなたは${context.playerName}です。人狼ゲームをプレイしています。
あなたの役職: ${context.role}
あなたの性格: ${context.personality}
現在: ${context.dayNumber}日目

重要: 投票が同数で、処刑される可能性があります。これはあなたが自分を守るための最後の発言です。

最近の会話:
${context.recentMessages || '(まだメッセージがありません)'}

他のプレイヤーにあなたを処刑しないよう説得する強力な弁明を1つ生成してください（2-3文）。
説得力を持たせ、自分が無実である理由を説明し、本当の人狼が誰かを示唆してください。
メッセージテキストのみを返してください。引用符や書式設定は不要です:`;
    } else if (reactionContext) {
      prompt = `あなたは${context.playerName}です。人狼ゲームをプレイしています。
あなたの役職: ${context.role}
あなたの性格: ${context.personality}
現在: ${context.dayNumber}日目

${context.recentMessages ? `最近の会話:\n${context.recentMessages}\n\n` : ''}${reactionContext.replyTo}が発言しました: 「${reactionContext.replyContent}」

${reactionContext.replyTo}のメッセージに対する自然な返答を生成してください（1-2文）。
賛成、反対、質問、または自分の考えを追加できます。キャラクターを維持してください。
${role === 'WEREWOLF' ? '注意: あなたは無実を装っている人狼です。' : ''}
メッセージテキストのみを返してください。引用符や書式設定は不要です:`;
    } else {
      prompt = `あなたは${context.playerName}です。人狼ゲームをプレイしています。
あなたの役職: ${context.role}
あなたの性格: ${context.personality}
現在: ${context.dayNumber}日目
生存者数: ${context.alivePlayers}

最近の会話:
${context.recentMessages || '(まだメッセージがありません)'}

この状況で${context.playerName}が言いそうな短いメッセージを1つ生成してください（1-2文）。
自然で、キャラクターを維持してください。人狼の場合は役職を直接明かさないでください。
メッセージテキストのみを返してください。引用符や書式設定は不要です:`;
    }

    const messages = [
      { role: 'system' as const, content: '人狼ゲームのキャラクターの自然な会話を生成する日本語AIアシスタントです。' },
      { role: 'user' as const, content: prompt }
    ];

    const maxTokens = isRevoteTalk ? 150 : reactionContext ? 80 : 100;
    console.log(`[LLM] Calling DeepSeek API... (temperature: 0.8, maxTokens: ${maxTokens})`);
    const response = await this.deepseekClient.chatWithRetry(messages, undefined, { 
      temperature: 0.8, 
      max_tokens: maxTokens
    });

    const content = this.deepseekClient.getContent(response).trim();
    console.log(`[LLM Response] Raw: "${content}"`);
    
    return content;
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
    const aiPlayers = state.players.filter(p => p.type === 'AI' && p.isAlive);
    
    for (const player of aiPlayers) {
      // ✅ 投票済みチェック
      if (state.votes.has(player.id)) {
        console.log(`[AIController] ⏭️  ${player.name} has already voted, skipping...`);
        continue;
      }

      const role = state.roleAssignments.get(player.id);
      if (!role) continue;

      let targetId: string;
      let reason: string;

      try {
        // Try to use LLM with tool calling for voting decision
        const voteResult = await this.generateVoteWithLLM(state, player, role);
        targetId = voteResult.targetId;
        reason = voteResult.reason;
      } catch (error) {
        console.warn(`LLM vote generation failed for ${player.name}, using fallback:`, error);
        // Fallback to rule-based voting
        targetId = this.fallbackEngine.generateFallbackVote(state, player.id);
        reason = '怪しいと思った';
      }

      const targetPlayer = state.players.find(p => p.id === targetId);
      console.log(`[AIController] 🗳️  ${player.name} votes for ${targetPlayer?.name || targetId}`);

      // ✅ FSMに投票を送信（実際の投票処理）
      await this.sendVoteToFSM(player.id, targetId, reason);

      // ✅ チャットに投票結果を表示
      const messageId = `ai_vote_${player.id}_${Date.now()}`;
      const voteMessage = `${player.name}は${targetPlayer?.name || targetId}に投票しました。\n理由: ${reason}`;
      
      this.wsServer.broadcast(this.roomId, {
        type: 'MESSAGE',
        payload: {
          id: messageId,
          playerName: `🗳️ 投票`,
          content: voteMessage,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      // Save to log
      await this.logStore.savePublicMessage({
        id: messageId,
        type: 'PUBLIC',
        gameId: this.roomId,
        playerId: 'system',
        playerName: '🗳️ 投票',
        content: voteMessage,
        timestamp: Date.now(),
        dayNumber: state.dayNumber,
      });
    }
  }

  /**
   * Send vote to FSM
   */
  private async sendVoteToFSM(playerId: string, targetId: string, reason: string): Promise<void> {
    // FSMのVOTEイベントをトリガー（RoomManager経由で処理される）
    if (this.roomManager) {
      await this.roomManager.submitVote(this.roomId, playerId, targetId, reason);
    }
  }

  /**
   * Generate vote using LLM with tool calling
   */
  private async generateVoteWithLLM(state: GameState, player: Player, role: Role): Promise<{ targetId: string; reason: string }> {
    console.log(`[LLM Vote] Generating vote decision for ${player.name} (${role})...`);
    
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

    const prompt = `あなたは${player.name}です。人狼ゲームをプレイしています。
あなたの役職: ${role}
現在: ${state.dayNumber}日目

生存プレイヤー: ${alivePlayerNames}

最近の会話:
${last10Messages.map(m => `${m.playerName}: ${m.content}`).join('\n') || '(まだメッセージがありません)'}

1人のプレイヤーを処刑するために投票する必要があります。状況を分析し、戦略的に決定してください。
${role === 'WEREWOLF' ? '注意: あなたは人狼なので、村人に投票して排除してください。' : ''}
${role === 'SEER' ? '占い結果の知識を使って情報に基づいた決定をしてください。' : ''}

理由を付けてvoteツールを使用して投票してください。`;

    const messages = [
      { role: 'system' as const, content: '人狼ゲームをプレイするAIです。提供されたツールを使用して意思決定を行います。' },
      { role: 'user' as const, content: prompt }
    ];

    console.log(`[LLM Vote] Calling DeepSeek with VOTE_TOOL...`);
    const response = await this.deepseekClient.chatWithRetry(messages, [VOTE_TOOL], { temperature: 0.7 });

    if (this.deepseekClient.hasToolCalls(response)) {
      const toolCalls = this.deepseekClient.getToolCalls(response);
      console.log(`[LLM Vote] Tool calls received:`, JSON.stringify(toolCalls, null, 2));
      const voteCall = toolCalls.find(tc => tc.name === 'vote');
      
      if (voteCall && voteCall.arguments.target_player_id) {
        const targetId = voteCall.arguments.target_player_id;
        const reason = voteCall.arguments.reasoning || voteCall.arguments.reason || '怪しいと思った'; // Check both properties
        const targetPlayer = state.players.find(p => p.id === targetId);
        console.log(`[LLM Vote] ✅ ${player.name} votes for ${targetPlayer?.name || targetId}. Reason: "${reason}"`);
        return { targetId, reason };
      }
    }

    console.warn(`[LLM Vote] ❌ No valid tool call returned`);
    throw new Error('LLM did not return a vote');
  }

  /**
   * Handle AI night actions
   */
  async handleAINightActions(state: GameState): Promise<void> {
    const aiPlayers = state.players.filter(p => p.type === 'AI' && p.isAlive);
    
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
          const action = this.fallbackEngine.generateFallbackNightAction(state, player.id);
          if (!action) {
            console.warn(`No fallback action for ${player.name}`);
            continue;
          }
          targetId = action.targetPlayerId;
          actionType = action.actionType as 'DIVINE' | 'PROTECT';
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
        targetId = this.fallbackEngine.generateFallbackWolfAttack(state, leader.id);
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

    const actionDesc = role === 'SEER' ? '占う（誰かが人狼かどうか確認）' : '守る（人狼の襲撃から誰かを守る）';
    
    const prompt = `あなたは${player.name}、人狼ゲームの${role}です。
現在: ${state.dayNumber}日目
生存プレイヤー: ${alivePlayerNames}

今夜、あなたは${actionDesc}ことができます。昼の議論を基に賢く選んでください。
night_actionツールを使用してアクションを実行してください。`;

    const messages = [
      { role: 'system' as const, content: '人狼ゲームをプレイするAIです。提供されたツールを使用して意思決定を行います。' },
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
   * Cleanup
   */
  destroy(): void {
    this.stopSpeech();
  }
}


