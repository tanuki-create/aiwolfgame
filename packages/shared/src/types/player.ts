import type { Role } from './roles.js';

/**
 * Player types
 */
export type PlayerType = 'HUMAN' | 'AI';

/**
 * AI skill levels
 * Target distribution: 20% beginner, 60% intermediate, 20% advanced
 */
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/**
 * AI persona specification
 */
export interface Persona {
  name: string;
  personality: string;         // Personality traits description
  speakingStyle: string;       // How they communicate
  skillLevel: SkillLevel;
  playStyle: string;           // Strategic approach
  systemPrompt?: string;       // Generated system prompt for LLM
}

/**
 * Player in the game
 */
export interface Player {
  id: string;
  type: PlayerType;
  name: string;
  role?: Role;                 // Assigned at game start (hidden from other players)
  isAlive: boolean;
  persona?: Persona;           // Only for AI players
  lastBelief?: PlayerBelief;   // Last stated suspicion (used for fallback votes)
}

/**
 * Player's stated belief about another player
 */
export interface PlayerBelief {
  suspectId: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
}

/**
 * Player status summary (public information)
 */
export interface PlayerStatus {
  id: string;
  name: string;
  isAlive: boolean;
  votedFor?: string;           // During vote phase
  hasVoted?: boolean;          // Whether they've submitted a vote
}

