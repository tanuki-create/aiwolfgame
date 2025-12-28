import type { GamePhase } from './game.js';
import type { PlayerStatus } from './player.js';
import type { Message } from './message.js';
import type { VoteResult } from './action.js';

/**
 * Client event types (sent from client to server)
 */
export type ClientEventType =
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'SEND_MESSAGE'
  | 'SEND_WOLF_MESSAGE'
  | 'SUBMIT_VOTE'
  | 'SUBMIT_NIGHT_ACTION'
  | 'START_GAME'
  | 'TYPING_START'
  | 'TYPING_STOP';

export interface ClientEvent {
  type: ClientEventType;
  payload: any;
}

/**
 * Server event types (sent from server to client)
 */
export type ServerEventType =
  | 'ROOM_JOINED'
  | 'ROOM_STATE'
  | 'PHASE_CHANGE'
  | 'MESSAGE'
  | 'WOLF_MESSAGE'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'VOTE_SUBMITTED'
  | 'VOTE_RESULT'
  | 'NIGHT_RESULT'
  | 'DEATH_ANNOUNCEMENT'
  | 'GAME_END'
  | 'TYPING_INDICATOR'
  | 'ERROR';

export interface ServerEvent {
  type: ServerEventType;
  payload: any;
  timestamp: number;
}

/**
 * Specific server events
 */
export interface PhaseChangeEvent {
  type: 'PHASE_CHANGE';
  payload: {
    phase: GamePhase;
    dayNumber: number;
    deadline: number;
    message?: string;
  };
  timestamp: number;
}

export interface MessageEvent {
  type: 'MESSAGE';
  payload: Message;
  timestamp: number;
}

export interface VoteResultEvent {
  type: 'VOTE_RESULT';
  payload: {
    result: VoteResult;
    executedPlayerName: string;
  };
  timestamp: number;
}

export interface DeathAnnouncementEvent {
  type: 'DEATH_ANNOUNCEMENT';
  payload: {
    deaths: Array<{
      playerId: string;
      playerName: string;
      cause: 'EXECUTION' | 'ATTACK' | 'HUNTER_CHAIN';
    }>;
  };
  timestamp: number;
}

export interface GameEndEvent {
  type: 'GAME_END';
  payload: {
    winner: 'VILLAGE' | 'WEREWOLF' | 'FOX';
    reason: string;
    roleAssignments: Array<{
      playerId: string;
      playerName: string;
      role: string;
    }>;
  };
  timestamp: number;
}

export interface NightResultEvent {
  type: 'NIGHT_RESULT';
  payload: {
    // Only sent to specific players
    divinationResult?: {
      targetPlayerId: string;
      targetPlayerName: string;
      result: 'WEREWOLF' | 'HUMAN';
    };
    mediumResult?: {
      targetPlayerId: string;
      targetPlayerName: string;
      result: 'WEREWOLF' | 'HUMAN';
    };
    protectionResult?: {
      targetPlayerId: string;
      targetPlayerName: string;
      wasAttacked: boolean;
    };
  };
  timestamp: number;
}

/**
 * Internal event (logged but not broadcast)
 */
export interface InternalEvent {
  gameId: string;
  type: string;
  timestamp: number;
  data: any;
  visibility: 'ADMIN_ONLY' | 'ROLE_SPECIFIC' | 'PUBLIC';
}

