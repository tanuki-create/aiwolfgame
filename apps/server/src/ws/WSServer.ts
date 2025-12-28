import type { ServerWebSocket } from 'bun';
import type { ClientEvent, ServerEvent } from '@aiwolf/shared';

/**
 * Client data attached to each WebSocket connection
 */
export interface ClientData {
  userId: string;
  roomId: string;
  playerName: string;
  isAdmin: boolean;
}

/**
 * WebSocket server for real-time game communication
 */
export class WSServer {
  private connections: Map<string, ServerWebSocket<ClientData>> = new Map();
  private onConnectionCallback?: (ws: ServerWebSocket<ClientData>) => Promise<void>;

  /**
   * Set callback for when a client connects (to send initial state)
   */
  setOnConnectionCallback(callback: (ws: ServerWebSocket<ClientData>) => Promise<void>): void {
    this.onConnectionCallback = callback;
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: ServerWebSocket<ClientData>): Promise<void> {
    const { userId, roomId } = ws.data;
    
    // Store connection
    this.connections.set(userId, ws);
    
    // Subscribe to room channel
    ws.subscribe(`room:${roomId}`);
    
    console.log(`Client ${userId} connected to room ${roomId}`);

    // Send initial state
    if (this.onConnectionCallback) {
      await this.onConnectionCallback(ws);
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnection(ws: ServerWebSocket<ClientData>): void {
    const { userId, roomId } = ws.data;
    
    // Remove connection
    this.connections.delete(userId);
    
    // Unsubscribe from room
    ws.unsubscribe(`room:${roomId}`);
    
    console.log(`Client ${userId} disconnected from room ${roomId}`);
  }

  /**
   * Handle incoming message from client
   */
  async handleMessage(ws: ServerWebSocket<ClientData>, data: string): Promise<void> {
    try {
      const event: ClientEvent = JSON.parse(data);
      console.log(`Received event: ${event.type} from ${ws.data.userId}`);
      
      // Call message handler if set
      if (this.messageHandler) {
        await this.messageHandler(ws, event);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  private messageHandler?: (ws: ServerWebSocket<ClientData>, event: ClientEvent) => Promise<void>;

  /**
   * Set callback for handling client messages
   */
  setMessageHandler(handler: (ws: ServerWebSocket<ClientData>, event: ClientEvent) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * Broadcast event to all clients in a room
   */
  broadcast(roomId: string, event: ServerEvent): void {
    const message = JSON.stringify(event);
    this.server?.publish(`room:${roomId}`, message);
  }

  /**
   * Send event to specific client
   */
  sendToClient(userId: string, event: ServerEvent): void {
    const ws = this.connections.get(userId);
    if (ws) {
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Send error to client
   */
  sendError(ws: ServerWebSocket<ClientData>, message: string): void {
    const event: ServerEvent = {
      type: 'ERROR',
      payload: { message },
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(event));
  }

  /**
   * Get connection count for room
   */
  getRoomConnectionCount(roomId: string): number {
    return Array.from(this.connections.values())
      .filter(ws => ws.data.roomId === roomId)
      .length;
  }

  private server?: any; // Will be set by the HTTP server

  setServer(server: any): void {
    this.server = server;
  }
}

