import type { GameState, Pack, PhaseTimers, Player } from '@aiwolf/shared';
import { DEFAULT_TIMERS } from '@aiwolf/shared';
import { GameStateStore, LogStore } from '@aiwolf/db';
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
  private deepseekClient: DeepSeekClient;
  private rosterGenerator: RosterGenerator;
  private wsServer?: WSServer;

  constructor(stateStore: GameStateStore, logStore: LogStore) {
    this.stateStore = stateStore;
    this.logStore = logStore;
    
    // Initialize DeepSeek client and roster generator
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  DEEPSEEK_API_KEY not found. AI personas will use fallback generation.');
    }
    this.deepseekClient = new DeepSeekClient(apiKey || '');
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
  }): Promise<{ roomId: string; gameState: GameState }> {
    const roomId = this.generateRoomId();
    
    // Generate seeds
    const seeds = {
      roster: Date.now(),
      roles: Date.now() + 1,
      packs: Date.now() + 2,
      turns: Date.now() + 3,
      wolfLeader: Date.now() + 4,
    };

    // Build roles
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

    // Generate AI players
    const aiPersonas = await this.rosterGenerator.generate(config.numAI, seeds.roster);
    const aiPlayers: Player[] = aiPersonas.map((persona, idx) => ({
      id: `ai_${idx}`,
      name: persona.name,
      isAI: true,
      persona,
      isAlive: true,
    }));

    // Create initial game state
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
        if (newPhase === 'DAY_FREE_TALK' || newPhase === 'DAY_VOTE' || newPhase === 'NIGHT_ACTIONS') {
          setTimeout(() => {
            this.triggerAIForPhase(roomId);
          }, 1000);
        }
      });
    }

    // Create AI Controller
    if (this.wsServer) {
      const aiController = new AIController(roomId, this.deepseekClient, this.wsServer, this.logStore);
      this.aiControllers.set(roomId, aiController);
    }

    // Save to store
    await this.stateStore.saveState(roomId, gameState);

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
    const fsm = await this.loadRoom(roomId);
    const aiController = this.aiControllers.get(roomId);
    
    if (!fsm || !aiController) return;

    const state = fsm.getState();

    switch (state.phase) {
      case 'DAY_FREE_TALK':
        await aiController.startDaySpeech(state);
        break;
      
      case 'DAY_VOTE':
        await aiController.handleAIVoting(state);
        break;
      
      case 'NIGHT_ACTIONS':
        await aiController.handleAINightActions(state);
        break;
    }
  }

  /**
   * Get game logs for replay
   */
  async getGameLogs(roomId: string): Promise<any[]> {
    const messages = await this.logStore.getPublicMessages(roomId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
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
      name: playerName,
      isAI: false,
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

    // Create message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save to log store
    await this.logStore.savePublicMessage({
      id: messageId,
      gameId: roomId,
      playerId: userId,
      playerName,
      content,
      timestamp: Date.now(),
      dayNumber: state.dayNumber,
    });

    return;
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

