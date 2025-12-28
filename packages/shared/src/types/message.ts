/**
 * Message types
 */
export type MessageType = 'PUBLIC' | 'WOLF' | 'SYSTEM';

/**
 * Base message interface
 */
export interface BaseMessage {
  id: string;
  gameId: string;
  timestamp: number;
  content: string;
}

/**
 * Public chat message (visible to all)
 */
export interface PublicMessage extends BaseMessage {
  type: 'PUBLIC';
  playerId: string;
  playerName: string;
  dayNumber: number;
}

/**
 * Wolf chat message (visible only to wolves)
 */
export interface WolfMessage extends BaseMessage {
  type: 'WOLF';
  playerId: string;
  playerName: string;
  dayNumber: number;
}

/**
 * System message (game events, announcements)
 */
export interface SystemMessage extends BaseMessage {
  type: 'SYSTEM';
  category: 'PHASE_CHANGE' | 'DEATH' | 'VOTE_RESULT' | 'GAME_END';
}

/**
 * All message types
 */
export type Message = PublicMessage | WolfMessage | SystemMessage;

/**
 * Typing indicator
 */
export interface TypingIndicator {
  playerId: string;
  playerName: string;
  isTyping: boolean;
  timestamp: number;
}

