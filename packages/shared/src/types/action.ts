/**
 * Vote action
 */
export interface VoteAction {
  gameId: string;
  playerId: string;
  targetPlayerId: string;
  reasoning?: string;  // Optional reasoning (logged)
  timestamp: number;
}

/**
 * Night action types
 */
export type NightActionType = 
  | 'DIVINE'    // Seer
  | 'PROTECT'   // Knight
  | 'ATTACK';   // Werewolf (submitted via wolf chat)

/**
 * Night action
 */
export interface NightAction {
  gameId: string;
  playerId: string;
  actionType: NightActionType;
  targetPlayerId: string;
  timestamp: number;
}

/**
 * Wolf attack submission (structured via function call)
 */
export interface WolfAttackSubmission {
  gameId: string;
  attackerId: string;  // Wolf leader ID
  targetPlayerId: string;
  rationalePublic: string;   // Cover story for tomorrow
  tomorrowPlan?: string;     // Strategy for next day
  timestamp: number;
}

/**
 * Night results (private, sent only to relevant players)
 */
export interface DivinationResultDetail {
  playerId: string;  // The seer
  targetPlayerId: string;
  result: 'WEREWOLF' | 'HUMAN';
}

export interface MediumResultDetail {
  playerId: string;  // The medium
  targetPlayerId: string;  // The executed player from previous day
  result: 'WEREWOLF' | 'HUMAN';
}

export interface ProtectionResult {
  playerId: string;  // The knight
  targetPlayerId: string;
  success: boolean;  // Whether the protected player was attacked
}

/**
 * Vote result
 */
export interface VoteResult {
  executedPlayerId: string;
  votes: Map<string, string>;  // voterId -> targetId
  counts: Map<string, number>; // targetId -> count
  tieResolved: boolean;
}

/**
 * Night result summary
 */
export interface NightResult {
  deaths: string[];  // Player IDs who died
  hunterVictims?: string[];  // Chain deaths from hunter
  divinationResults: Map<string, DivinationResultDetail>;  // seerId -> result
  mediumResults: Map<string, MediumResultDetail>;          // mediumId -> result
  protectionResults: Map<string, ProtectionResult>;  // knightId -> result (private)
}

