import type { GameState, Pack, PhaseTimers, Player } from '@aiwolf/shared';
import { DEFAULT_TIMERS } from '@aiwolf/shared';
import { GameStateStore, LogStore, PersonaStore } from '@aiwolf/db';
import { GameFSM } from '@aiwolf/fsm';
import { RoleBuilder } from '@aiwolf/fsm';
import { RosterGenerator, DeepSeekClient } from '@aiwolf/llm';
import { AIController } from '../ai/AIController.js';
import type { WSServer } from '../ws/WSServer.js';

/**
 * Room manager handles game room lifecycle
 */
export class RoomManager {
  private rooms: Map<string, GameFSM> = new Map();
  private aiControllers: Map<string, AIController> = new Map();
  private stateStore: GameStateStore;
  private logStore: LogStore;
  private personaStore: PersonaStore;
  private deepseekClient: DeepSeekClient;
  private rosterGenerator: RosterGenerator;
  private wsServer?: WSServer;
  private usePresetPersonas: boolean = true; // Flag to use preset personas

  constructor(stateStore: GameStateStore, logStore: LogStore, personaStore: PersonaStore) {
    this.stateStore = stateStore;
    this.logStore = logStore;
    this.personaStore = personaStore;
    
    // Initialize DeepSeek client and roster generator (for fallback)
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  DEEPSEEK_API_KEY not found. AI personas will use preset personas only.');
    }
    console.log(`🔑 DeepSeek API Key: ${apiKey ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET'}`);
    
    // Pass config object according to DeepSeek API docs
    this.deepseekClient = new DeepSeekClient({
      apiKey: apiKey || '',
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      timeout: 10000, // 10 seconds
    });
    this.rosterGenerator = new RosterGenerator(this.deepseekClient);
  }

  /**
   * Set WebSocket server reference
   */
  setWSServer(wsServer: WSServer): void {
    this.wsServer = wsServer;
  }

  /**
   * Create a new game room
   */
  async createRoom(config: {
    numPlayers: number;
    numAI: number;
    packs: Pack[];
    randomStart: boolean;
    timers?: PhaseTimers;
  }, progressCallback?: (current: number, total: number, message: string) => void): Promise<{ roomId: string; gameState: GameState }> {
    console.log('[RoomManager] 📝 Creating room...');
    progressCallback?.(1, 10, 'Initializing game room...');
    
    const roomId = this.generateRoomId();
    console.log('[RoomManager] 🆔 Room ID:', roomId);
    
    // Generate seeds
    const seeds = {
      roster: Date.now(),
      roles: Date.now() + 1,
      packs: Date.now() + 2,
      turns: Date.now() + 3,
      wolfLeader: Date.now() + 4,
    };

    // Build roles
    console.log('[RoomManager] 🎲 Building roles...');
    progressCallback?.(2, 10, 'Building role distribution...');
    
    const roleBuilder = new RoleBuilder();
    let roles: any[];
    let finalPacks: Pack[];

    if (config.randomStart) {
      const result = roleBuilder.buildRandomRoles(seeds.packs);
      roles = result.roles;
      finalPacks = result.packs;
    } else {
      roles = roleBuilder.buildRoles(config.packs, seeds.packs);
      finalPacks = config.packs;
    }
    console.log('[RoomManager] ✅ Roles built:', roles);

    // Generate AI players with progress callback
    console.log('[RoomManager] 🤖 Generating AI personas...');
    progressCallback?.(3, 10, 'Generating AI personas...');
    
    let aiPersonas;
    
    // Try to use preset personas from database
    if (this.usePresetPersonas) {
      try {
        console.log('[RoomManager] 📚 Loading personas from database...');
        const personaCount = await this.personaStore.getCount();
        
        if (personaCount >= config.numAI) {
          aiPersonas = await this.personaStore.getRandomPersonas(config.numAI);
          console.log('[RoomManager] ✅ Loaded personas from database:', aiPersonas.length);
          progressCallback?.(8, 10, 'Loaded AI personas from database');
        } else {
          console.warn(`[RoomManager] ⚠️  Only ${personaCount} personas in database (need ${config.numAI}). Generating new ones...`);
          throw new Error('Not enough preset personas');
        }
      } catch (error) {
        console.warn('[RoomManager] ⚠️  Failed to load preset personas, generating new ones:', error);
        this.usePresetPersonas = false; // Fallback to generation for this session
      }
    }
    
    // Fallback: Generate personas using LLM
    if (!aiPersonas) {
      // Set progress callback on roster generator
      this.rosterGenerator.setProgressCallback((current, total, message) => {
        // Map 0-10 AI generation to steps 3-8 out of 10 total steps
        const step = 3 + Math.floor((current / total) * 5);
        progressCallback?.(step, 10, message);
      });
      
      aiPersonas = await this.rosterGenerator.generate(config.numAI, seeds.roster);
      console.log('[RoomManager] ✅ AI personas generated:', aiPersonas.length);
    }
    const aiPlayers: Player[] = aiPersonas.map((persona, idx) => ({
      id: `ai_${idx}`,
      type: 'AI',
      name: persona.name,
      isAlive: true,
      persona,
    }));

    // Create initial game state
    progressCallback?.(9, 10, 'Creating game state...');
    const gameState: GameState = {
      gameId: roomId,
      phase: 'LOBBY',
      dayNumber: 0,
      players: aiPlayers, // Start with AI players
      alivePlayers: new Set(aiPlayers.map(p => p.id)),
      roleAssignments: new Map(),
      phaseStartTime: Date.now(),
      phaseDeadline: Date.now(),
      seeds,
      config: {
        numPlayers: config.numPlayers,
        numAI: config.numAI,
        packs: finalPacks,
        timers: config.timers || DEFAULT_TIMERS,
        randomStart: config.randomStart,
      },
      createdAt: Date.now(),
      votes: new Map(),
      nightActions: new Map(),
      wolfAttacks: new Map(),
      deaths: [],
    };

    // Create FSM
    const fsm = new GameFSM(gameState);
    this.rooms.set(roomId, fsm);

    // Set broadcast callback for automatic phase transitions
    if (this.wsServer) {
      fsm.setBroadcastCallback(async (events) => {
        console.log(`[RoomManager] 📡 Broadcasting ${events.length} events...`);
        
        for (const event of events) {
          if ('targetPlayerId' in event && event.targetPlayerId) {
            this.wsServer!.sendToClient(event.targetPlayerId, {
              type: event.type as any,
              payload: event.payload,
              timestamp: Date.now(),
            });
          } else {
            this.wsServer!.broadcast(roomId, {
              type: event.type as any,
              payload: event.payload,
              timestamp: Date.now(),
            });
          }
        }

        // Save state after broadcast
        await this.saveRoomState(roomId);

        // Trigger AI for new phase
        const newPhase = fsm.getState().phase;
        console.log(`[RoomManager] 🔄 Phase after broadcast: ${newPhase}`);
        
        if (newPhase === 'DAY_FREE_TALK' || newPhase === 'DAY_VOTE' || newPhase === 'NIGHT_ACTIONS') {
          console.log(`[RoomManager] ⏰ Scheduling AI trigger for ${newPhase} in 1 second...`);
          setTimeout(() => {
            this.triggerAIForPhase(roomId);
          }, 1000);
        }
      });
    }

    // Create AI Controller
    if (this.wsServer) {
      const aiController = new AIController(roomId, this.deepseekClient, this.wsServer, this.logStore, this); // ✅ Pass RoomManager
      this.aiControllers.set(roomId, aiController);
    }

    // Save to store
    progressCallback?.(10, 10, 'Finalizing game room...');
    await this.stateStore.saveState(roomId, gameState);

    console.log('[RoomManager] ✅ Room created successfully:', roomId);
    return { roomId, gameState };
  }

  /**
   * Get room FSM
   */
  getRoom(roomId: string): GameFSM | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Load room from storage
   */
  async loadRoom(roomId: string): Promise<GameFSM | null> {
    // Check if already loaded
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    // Load from storage
    const state = await this.stateStore.loadState(roomId);
    if (!state) return null;

    // Create FSM
    const fsm = new GameFSM(state);
    this.rooms.set(roomId, fsm);

    return fsm;
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string): Promise<void> {
    const fsm = this.rooms.get(roomId);
    if (fsm) {
      fsm.destroy();
      this.rooms.delete(roomId);
    }

    const aiController = this.aiControllers.get(roomId);
    if (aiController) {
      aiController.destroy();
      this.aiControllers.delete(roomId);
    }

    await this.stateStore.deleteState(roomId);
  }

  /**
   * Get AI Controller for room
   */
  getAIController(roomId: string): AIController | undefined {
    return this.aiControllers.get(roomId);
  }

  /**
   * Trigger AI actions for phase
   */
  async triggerAIForPhase(roomId: string): Promise<void> {
    console.log(`[RoomManager] 🤖 Triggering AI for phase in room ${roomId}...`);
    
    const fsm = await this.loadRoom(roomId);
    const aiController = this.aiControllers.get(roomId);
    
    if (!fsm) {
      console.error(`[RoomManager] ❌ FSM not found for room ${roomId}`);
      return;
    }
    
    if (!aiController) {
      console.error(`[RoomManager] ❌ AI Controller not found for room ${roomId}`);
      return;
    }

    const state = fsm.getState();
    console.log(`[RoomManager] 📍 Current phase: ${state.phase}`);

    switch (state.phase) {
      case 'DAY_FREE_TALK':
        console.log(`[RoomManager] 💬 Starting day speech...`);
        await aiController.startDaySpeech(state);
        break;
      
      case 'DAY_VOTE':
        console.log(`[RoomManager] 🗳️  Starting AI voting...`);
        aiController.stopSpeech(); // Stop AI speech during voting
        await aiController.handleAIVoting(state);
        break;
      
      case 'DAY_REVOTE_TALK':
        console.log(`[RoomManager] 🔄 Starting revote talk (tied players only)...`);
        aiController.stopSpeech(); // Stop general speech
        await aiController.startRevoteTalk(state);
        break;
      
      case 'DAY_REVOTE':
        console.log(`[RoomManager] 🔄 Starting AI revoting...`);
        aiController.stopSpeech(); // Stop AI speech during revoting
        await aiController.handleAIVoting(state);
        break;
      
      case 'LAST_WILL':
        console.log(`[RoomManager] ⚖️ Starting last will...`);
        await aiController.handleLastWill(state);
        break;
      
      case 'NIGHT_ACTIONS':
        console.log(`[RoomManager] 🌙 Starting night actions...`);
        await aiController.handleAINightActions(state);
        break;
      
      default:
        console.log(`[RoomManager] ⏭️  No AI action for phase: ${state.phase}`);
    }
  }

  /**
   * List all active rooms
   */
  async listRooms(): Promise<string[]> {
    return Array.from(this.rooms.keys());
  }

  /**
   * Generate unique room ID
   */
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add human player to room
   */
  async addPlayer(roomId: string, userId: string, playerName: string): Promise<void> {
    const fsm = await this.loadRoom(roomId);
    if (!fsm) {
      throw new Error('Room not found');
    }

    const state = fsm.getState();
    
    // Check if player already exists
    if (state.players.some(p => p.id === userId)) {
      return; // Already added
    }

    // Add human player
    const humanPlayer: Player = {
      id: userId,
      type: 'HUMAN',
      name: playerName,
      isAlive: true,
    };

    state.players.unshift(humanPlayer); // Add at the beginning
    state.alivePlayers.add(userId);

    // Save updated state
    await this.stateStore.saveState(roomId, state);
  }

  /**
   * Save room state
   */
  async saveRoomState(roomId: string): Promise<void> {
    const fsm = this.rooms.get(roomId);
    if (!fsm) return;

    const state = fsm.getState();
    await this.stateStore.saveState(roomId, state as GameState);
  }

  /**
   * Handle player message
   */
  async handlePlayerMessage(roomId: string, userId: string, playerName: string, content: string): Promise<void> {
    const fsm = await this.loadRoom(roomId);
    if (!fsm) {
      throw new Error('Room not found');
    }

    const state = fsm.getState();
    
    // Check if player is alive and game is in appropriate phase
    if (!state.alivePlayers.has(userId)) {
      throw new Error('Dead players cannot speak');
    }

    // During DAY_REVOTE_TALK, only tied players can speak
    if (state.phase === 'DAY_REVOTE_TALK') {
      if (!state.tiedPlayers || !state.tiedPlayers.includes(userId)) {
        throw new Error('Only tied players can speak during final statements');
      }
    }

    // During voting phases, no one should be able to send chat messages
    if (state.phase === 'DAY_VOTE' || state.phase === 'DAY_REVOTE') {
      throw new Error('Cannot send messages during voting phase');
    }

    // Create message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save to log store
    await this.logStore.savePublicMessage({
      id: messageId,
      type: 'PUBLIC',
      gameId: roomId,
      playerId: userId,
      playerName,
      content,
      timestamp: Date.now(),
      dayNumber: state.dayNumber,
    });

    // Notify AI Controller about new message (for reaction system)
    const aiController = this.aiControllers.get(roomId);
    if (aiController && (state.phase === 'DAY_FREE_TALK' || state.phase === 'NIGHT_WOLF_CHAT')) {
      await aiController.onMessageReceived(state, userId, playerName, content);
    }

    return;
  }

  /**
   * Submit vote (for both human and AI players)
   */
  async submitVote(roomId: string, playerId: string, targetId: string, reason: string): Promise<void> {
    const fsm = await this.loadRoom(roomId);
    if (!fsm) {
      throw new Error('Room not found');
    }

    const state = fsm.getState();

    // Check if player has already voted
    if (state.votes.has(playerId)) {
      console.log(`[RoomManager] ⏭️  Player ${playerId} has already voted, ignoring...`);
      return;
    }

    // Send VOTE event to FSM
    await fsm.handleEvent({
      type: 'VOTE',
      timestamp: Date.now(),
      payload: {
        playerId,
        targetId,
        reason,
      },
    });

    // Save state after vote
    await this.saveRoomState(roomId);
  }

  /**
   * Get game logs (public messages)
   */
  async getGameLogs(roomId: string): Promise<any[]> {
    return this.logStore.getPublicMessages(roomId);
  }

  /**
   * Get wolf chat logs (admin only)
   */
  async getWolfChatLogs(roomId: string): Promise<any[]> {
    return this.logStore.getWolfMessages(roomId);
  }

  /**
   * Get internal events (admin only)
   */
  async getInternalEvents(roomId: string): Promise<any[]> {
    return this.logStore.getInternalEvents(roomId);
  }
}

