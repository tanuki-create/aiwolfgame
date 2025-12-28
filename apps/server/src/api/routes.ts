import type { Pack, PhaseTimers } from '@aiwolf/shared';
import { RoomManager } from '../rooms/RoomManager.js';
import { generateUserToken } from '../ws/auth.js';
import type { WSServer } from '../ws/WSServer.js';

/**
 * REST API routes
 */
export class APIRoutes {
  private roomManager: RoomManager;
  private wsServer?: WSServer;

  constructor(roomManager: RoomManager, wsServer?: WSServer) {
    this.roomManager = roomManager;
    this.wsServer = wsServer;
  }

  /**
   * Create a new room
   * POST /api/rooms
   */
  async createRoom(req: Request): Promise<Response> {
    try {
      const body = await req.json() as any;
      const { numPlayers = 11, numAI = 10, packs = [], randomStart = false, timers } = body;

      const result = await this.roomManager.createRoom({
        numPlayers,
        numAI,
        packs: packs as Pack[],
        randomStart,
        timers: timers as PhaseTimers | undefined,
      });

      return new Response(JSON.stringify({
        success: true,
        roomId: result.roomId,
        gameState: this.serializeGameState(result.gameState),
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 400);
    }
  }

  /**
   * Get room info
   * GET /api/rooms/:id
   */
  async getRoom(roomId: string): Promise<Response> {
    try {
      const fsm = await this.roomManager.loadRoom(roomId);
      if (!fsm) {
        return this.errorResponse('Room not found', 404);
      }

      const state = fsm.getState();
      return new Response(JSON.stringify({
        success: true,
        gameState: this.serializeGameState(state),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  /**
   * Start game
   * POST /api/rooms/:id/start
   */
  async startGame(roomId: string): Promise<Response> {
    try {
      const fsm = await this.roomManager.loadRoom(roomId);
      if (!fsm) {
        return this.errorResponse('Room not found', 404);
      }

      const result = await fsm.transition({
        type: 'START_GAME',
        timestamp: Date.now(),
      });

      await this.roomManager.saveRoomState(roomId);

      // Broadcast state change to all connected clients
      if (this.wsServer && result.broadcast) {
        for (const event of result.broadcast) {
          // Check if this is a targeted message
          if ('targetPlayerId' in event && event.targetPlayerId) {
            // Send only to specific player
            this.wsServer.sendToClient(event.targetPlayerId, {
              type: event.type as any,
              payload: event.payload,
              timestamp: Date.now(),
            });
          } else {
            // Broadcast to all
            this.wsServer.broadcast(roomId, {
              type: event.type as any,
              payload: event.payload,
              timestamp: Date.now(),
            });
          }
        }
      }

      // Also send current state
      if (this.wsServer) {
        const state = fsm.getState();
        this.wsServer.broadcast(roomId, {
          type: 'ROOM_STATE',
          payload: {
            phase: state.phase,
            dayNumber: state.dayNumber,
            players: state.players.map(p => ({
              id: p.id,
              name: p.name,
              isAlive: p.isAlive,
            })),
          },
          timestamp: Date.now(),
        });

        // Trigger AI actions for the new phase
        setTimeout(async () => {
          await this.roomManager.triggerAIForPhase(roomId);
        }, 1000);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Game started',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Failed to start game:', error);
      return this.errorResponse(error.message, 400);
    }
  }

  /**
   * Join room (get user token)
   * POST /api/rooms/:id/join
   */
  async joinRoom(roomId: string, req: Request): Promise<Response> {
    try {
      const body = await req.json() as any;
      const { playerName } = body;

      if (!playerName) {
        return this.errorResponse('Player name required', 400);
      }

      const fsm = await this.roomManager.loadRoom(roomId);
      if (!fsm) {
        return this.errorResponse('Room not found', 404);
      }

      // Generate user ID and token
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const token = generateUserToken(userId, roomId, playerName);

      // Add player to room
      await this.roomManager.addPlayer(roomId, userId, playerName);

      // Broadcast updated player list
      if (this.wsServer) {
        const state = fsm.getState();
        this.wsServer.broadcast(roomId, {
          type: 'ROOM_STATE',
          payload: {
            phase: state.phase,
            dayNumber: state.dayNumber,
            players: state.players.map(p => ({
              id: p.id,
              name: p.name,
              isAlive: p.isAlive,
            })),
          },
          timestamp: Date.now(),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        userId,
        token,
        roomId,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  /**
   * List all rooms
   * GET /api/rooms
   */
  async listRooms(): Promise<Response> {
    try {
      const rooms = await this.roomManager.listRooms();
      
      return new Response(JSON.stringify({
        success: true,
        rooms,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  /**
   * Get replay (public messages only)
   * GET /api/rooms/:id/replay
   */
  async getReplay(roomId: string): Promise<Response> {
    try {
      const messages = await this.roomManager.getGameLogs(roomId);
      
      return new Response(JSON.stringify({
        success: true,
        replay: messages,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  /**
   * Get admin game state (includes role assignments)
   * GET /api/admin/games/:id/state
   */
  async getAdminGameState(roomId: string, isAdmin: boolean): Promise<Response> {
    if (!isAdmin) {
      return this.errorResponse('Unauthorized', 403);
    }

    try {
      const fsm = await this.roomManager.loadRoom(roomId);
      if (!fsm) {
        return this.errorResponse('Room not found', 404);
      }

      const state = fsm.getState();
      
      return new Response(JSON.stringify({
        success: true,
        gameState: {
          ...this.serializeGameState(state),
          // Include role assignments for admin
          roleAssignments: Array.from(state.roleAssignments.entries()),
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  /**
   * Get wolf chat logs (admin only)
   * GET /api/admin/games/:id/wolf-chat
   */
  async getAdminWolfChat(roomId: string, isAdmin: boolean): Promise<Response> {
    if (!isAdmin) {
      return this.errorResponse('Unauthorized', 403);
    }

    try {
      const wolfMessages = await this.roomManager.getWolfChatLogs(roomId);
      
      return new Response(JSON.stringify({
        success: true,
        wolfMessages,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  /**
   * Get private actions (admin only)
   * GET /api/admin/games/:id/private-actions
   */
  async getAdminPrivateActions(roomId: string, isAdmin: boolean): Promise<Response> {
    if (!isAdmin) {
      return this.errorResponse('Unauthorized', 403);
    }

    try {
      const internalEvents = await this.roomManager.getInternalEvents(roomId);
      
      return new Response(JSON.stringify({
        success: true,
        internalEvents,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return this.errorResponse(error.message, 500);
    }
  }

  /**
   * Error response helper
   */
  private errorResponse(message: string, status: number): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Serialize game state (convert Sets/Maps to arrays)
   */
  private serializeGameState(state: any): any {
    return {
      ...state,
      alivePlayers: Array.from(state.alivePlayers || []),
      roleAssignments: Array.from(state.roleAssignments?.entries() || []),
    };
  }
}

