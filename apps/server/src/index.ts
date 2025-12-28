import type { ServerWebSocket } from 'bun';
import { WSServer, type ClientData } from './ws/WSServer.js';
import { APIRoutes } from './api/routes.js';
import { RoomManager } from './rooms/RoomManager.js';
import { GameStateStore, LogStore, PersonaStore } from '@aiwolf/db';
import { validateToken } from './ws/auth.js';
import { join } from 'path';
import { existsSync } from 'fs';

// Load environment variables from workspace root
const rootEnvPath = join(import.meta.dir, '../../../.env');
if (existsSync(rootEnvPath)) {
  console.log('📝 Loading .env from:', rootEnvPath);
  // Bun will automatically load .env files, but we ensure it's from the root
  const envFile = Bun.file(rootEnvPath);
  const envContent = await envFile.text();
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Load environment variables
const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:dev@localhost:5432/aiwolf';

console.log('🔧 Starting AI Wolf server...');
console.log('📍 PORT:', PORT);
console.log('💾 DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@')); // Mask password

// Initialize stores (both use Neon PostgreSQL)
const stateStore = new GameStateStore(DATABASE_URL);
const logStore = new LogStore(DATABASE_URL);
const personaStore = new PersonaStore(DATABASE_URL);

// Initialize database tables
await stateStore.initialize();
await logStore.initialize();
await personaStore.initialize();

// Initialize managers
const roomManager = new RoomManager(stateStore, logStore, personaStore);
const wsServer = new WSServer();
const apiRoutes = new APIRoutes(roomManager, wsServer);

// Set WSServer reference in RoomManager
roomManager.setWSServer(wsServer);

/**
 * Main HTTP server with WebSocket upgrade
 */
const server = Bun.serve<ClientData>({
  port: PORT,
  
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response('Missing token', { status: 401 });
      }

      const { valid, payload } = validateToken(token);
      if (!valid || !payload) {
        return new Response('Invalid token', { status: 401 });
      }

      const upgraded = server.upgrade(req, {
        data: {
          userId: payload.userId,
          roomId: payload.roomId,
          playerName: payload.playerName,
          isAdmin: payload.isAdmin || false,
        } as ClientData,
      });

      return upgraded ? undefined : new Response('WebSocket upgrade failed', { status: 500 });
    }

    // REST API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPIRequest(req, url);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws: ServerWebSocket<ClientData>) {
      wsServer.handleConnection(ws);
    },

    message(ws: ServerWebSocket<ClientData>, message: string | Buffer) {
      const data = typeof message === 'string' ? message : message.toString();
      wsServer.handleMessage(ws, data);
    },

    close(ws: ServerWebSocket<ClientData>) {
      wsServer.handleDisconnection(ws);
    },
  },
});

// Set server reference for publishing
wsServer.setServer(server);

// Set message handler for player chat
wsServer.setMessageHandler(async (ws, event) => {
  const { userId, roomId, playerName } = ws.data;
  
  try {
    const fsm = await roomManager.loadRoom(roomId);
    if (!fsm) {
      throw new Error('Room not found');
    }

    switch (event.type) {
      case 'SEND_MESSAGE':
        await roomManager.handlePlayerMessage(roomId, userId, playerName, event.payload.content);
        // Broadcast to room
        wsServer.broadcast(roomId, {
          type: 'MESSAGE',
          payload: {
            id: `msg_${Date.now()}`,
            playerName,
            content: event.payload.content,
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
        });
        break;
      
      case 'WOLF_CHAT_MESSAGE':
        // Handle wolf chat message through FSM
        const wolfChatResult = await fsm.transition({
          type: 'WOLF_CHAT_MESSAGE',
          payload: {
            playerId: userId,
            content: event.payload.content,
          },
          timestamp: Date.now(),
        });
        
        // Save wolf chat message
        await logStore.saveWolfMessage({
          type: 'WOLF',
          id: `wolf_${Date.now()}_${userId}`,
          gameId: roomId,
          playerId: userId,
          playerName,
          content: event.payload.content,
          dayNumber: fsm.getState().dayNumber,
          timestamp: Date.now(),
        });
        
        await roomManager.saveRoomState(roomId);
        
        // Broadcast to werewolves only
        if (wolfChatResult.broadcast) {
          for (const broadcastEvent of wolfChatResult.broadcast) {
            if ('targetRoles' in broadcastEvent && broadcastEvent.targetRoles) {
              // Send to players with specific roles
              const state = fsm.getState();
              const targetPlayers = Array.from(state.roleAssignments.entries())
                .filter(([_, role]) => broadcastEvent.targetRoles?.includes(role as any))
                .map(([playerId]) => playerId);
              
              for (const targetPlayerId of targetPlayers) {
                wsServer.sendToClient(targetPlayerId, {
                  type: broadcastEvent.type as any,
                  payload: broadcastEvent.payload,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
        break;
      
      case 'VOTE':
        // Submit vote through FSM
        const voteResult = await fsm.transition({
          type: 'VOTE',
          payload: {
            playerId: userId,
            targetId: event.payload.targetId,
          },
          timestamp: Date.now(),
        });
        
        await roomManager.saveRoomState(roomId);
        
        // Broadcast vote recorded
        if (voteResult.broadcast) {
          for (const broadcastEvent of voteResult.broadcast) {
            wsServer.broadcast(roomId, {
              type: broadcastEvent.type as any,
              payload: broadcastEvent.payload,
              timestamp: Date.now(),
            });
          }
        }
        break;
      
      case 'NIGHT_ACTION':
        // Submit night action through FSM
        const nightResult = await fsm.transition({
          type: 'NIGHT_ACTION',
          payload: {
            playerId: userId,
            actionType: event.payload.actionType,
            targetId: event.payload.targetId,
          },
          timestamp: Date.now(),
        });
        
        await roomManager.saveRoomState(roomId);
        
        // Broadcast result (usually private)
        if (nightResult.broadcast) {
          for (const broadcastEvent of nightResult.broadcast) {
            if ('targetPlayerId' in broadcastEvent && broadcastEvent.targetPlayerId) {
              wsServer.sendToClient(broadcastEvent.targetPlayerId, {
                type: broadcastEvent.type as any,
                payload: broadcastEvent.payload,
                timestamp: Date.now(),
              });
            } else {
              wsServer.broadcast(roomId, {
                type: broadcastEvent.type as any,
                payload: broadcastEvent.payload,
                timestamp: Date.now(),
              });
            }
          }
        }
        break;
    }
  } catch (error: any) {
    console.error('Error handling message:', error);
    wsServer.sendError(ws, error.message);
  }
});

// Set connection callback to send initial game state
wsServer.setOnConnectionCallback(async (ws) => {
  const { roomId } = ws.data;
  const fsm = await roomManager.loadRoom(roomId);
  
  if (fsm) {
    const state = fsm.getState();
    ws.send(JSON.stringify({
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
    }));
  }
});

console.log(`🎮 AI Werewolf Server running on port ${PORT}`);
console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
console.log(`🔌 REST API: http://localhost:${PORT}/api`);

/**
 * Handle API requests
 */
async function handleAPIRequest(req: Request, url: URL): Promise<Response> {
  const path = url.pathname.replace('/api', '');
  const method = req.method;

  // Enable CORS
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    let response: Response;

    // POST /api/rooms - Create room
    if (path === '/rooms' && method === 'POST') {
      response = await apiRoutes.createRoom(req);
    }
    // GET /api/rooms - List rooms
    else if (path === '/rooms' && method === 'GET') {
      response = await apiRoutes.listRooms();
    }
    // POST /api/rooms/:id/join - Join room
    else if (path.match(/^\/rooms\/[^/]+\/join$/) && method === 'POST') {
      const roomId = path.split('/')[2];
      response = await apiRoutes.joinRoom(roomId, req);
    }
    // GET /api/rooms/:id - Get room info
    else if (path.match(/^\/rooms\/[^/]+$/) && method === 'GET') {
      const roomId = path.split('/')[2];
      response = await apiRoutes.getRoom(roomId);
    }
    // POST /api/rooms/:id/start - Start game
    else if (path.match(/^\/rooms\/[^/]+\/start$/) && method === 'POST') {
      const roomId = path.split('/')[2];
      response = await apiRoutes.startGame(roomId);
    }
    // GET /api/rooms/:id/replay - Get replay
    else if (path.match(/^\/rooms\/[^/]+\/replay$/) && method === 'GET') {
      const roomId = path.split('/')[2];
      response = await apiRoutes.getReplay(roomId);
    }
    // GET /api/admin/games/:id/state - Get admin game state
    else if (path.match(/^\/admin\/games\/[^/]+\/state$/) && method === 'GET') {
      const roomId = path.split('/')[3];
      // For development, allow admin access without strict auth
      // In production, validate token properly
      const token = url.searchParams.get('token') || req.headers.get('Authorization')?.replace('Bearer ', '');
      const { valid, payload } = token ? validateToken(token) : { valid: false, payload: null };
      const isAdmin = valid && payload?.isAdmin || true; // Allow admin for development
      response = await apiRoutes.getAdminGameState(roomId, isAdmin);
    }
    // GET /api/admin/games/:id/wolf-chat - Get wolf chat logs
    else if (path.match(/^\/admin\/games\/[^/]+\/wolf-chat$/) && method === 'GET') {
      const roomId = path.split('/')[3];
      const token = url.searchParams.get('token') || req.headers.get('Authorization')?.replace('Bearer ', '');
      const { valid, payload } = token ? validateToken(token) : { valid: false, payload: null };
      const isAdmin = valid && payload?.isAdmin || true; // Allow admin for development
      response = await apiRoutes.getAdminWolfChat(roomId, isAdmin);
    }
    // GET /api/admin/games/:id/private-actions - Get internal events
    else if (path.match(/^\/admin\/games\/[^/]+\/private-actions$/) && method === 'GET') {
      const roomId = path.split('/')[3];
      const token = url.searchParams.get('token') || req.headers.get('Authorization')?.replace('Bearer ', '');
      const { valid, payload } = token ? validateToken(token) : { valid: false, payload: null };
      const isAdmin = valid && payload?.isAdmin || true; // Allow admin for development
      response = await apiRoutes.getAdminPrivateActions(roomId, isAdmin);
    }
    // GET /api/admin/rooms/:id/logs - Get admin logs (legacy, not implemented)
    else if (path.match(/^\/admin\/rooms\/[^/]+\/logs$/) && method === 'GET') {
      // const roomId = path.split('/')[3];
      // const token = req.headers.get('Authorization')?.replace('Bearer ', '');
      // const { valid, payload } = token ? validateToken(token) : { valid: false, payload: null };
      // const isAdmin = valid && payload?.isAdmin;
      // response = await apiRoutes.getAdminLogs(roomId, isAdmin || false);
      response = new Response('Not Implemented', { status: 501 });
    }
    else {
      response = new Response('Not Found', { status: 404 });
    }

    // Add CORS headers
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await stateStore.close();
  await logStore.close();
  process.exit(0);
});

