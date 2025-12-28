import type { GameState, GameEvent, TransitionResult } from '@aiwolf/shared';
import { VoteCollector } from '../vote/VoteCollector.js';

/**
 * Handle DAY_VOTE phase - collect votes and determine execution
 */
export async function handleVotePhase(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const collector = new VoteCollector();

  // Submit collected votes
  for (const [voterId, targetId] of state.votes.entries()) {
    collector.submitVote({ 
      gameId: state.gameId,
      playerId: voterId, 
      targetPlayerId: targetId,
      timestamp: Date.now(),
    });
  }

  // Finalize votes (fills missing votes with random)
  const result = collector.finalizeVotes(state);
  
  // Mark executed player as dead
  const executedPlayer = state.players.find(p => p.id === result.executedPlayerId);
  if (executedPlayer) {
    executedPlayer.isAlive = false;
    state.alivePlayers.delete(result.executedPlayerId);
  }

  // Record death
  state.deaths.push({
    playerId: result.executedPlayerId,
    playerName: executedPlayer?.name || 'Unknown',
    dayNumber: state.dayNumber,
    deathType: 'EXECUTED',
    timestamp: Date.now(),
  });

  // Clear votes for next round
  state.votes.clear();

  // Check for hunter chain reaction if executed player was hunter
  const executedRole = state.roleAssignments.get(result.executedPlayerId);
  let hunterVictimId: string | undefined;
  
  if (executedRole === 'HUNTER' && state.alivePlayers.size > 0) {
    // Hunter shoots random target
    const targets = Array.from(state.alivePlayers);
    hunterVictimId = targets[Math.floor(Math.random() * targets.length)];
    
    const victim = state.players.find(p => p.id === hunterVictimId);
    if (victim) {
      victim.isAlive = false;
      state.alivePlayers.delete(hunterVictimId);
      
      // Record hunter kill
      state.deaths.push({
        playerId: hunterVictimId,
        playerName: victim.name,
        dayNumber: state.dayNumber,
        deathType: 'HUNTER',
        timestamp: Date.now(),
      });
    }
  }

  return {
    nextState: {
      ...state,
      phase: 'CHECK_END',
      phaseStartTime: Date.now(),
    },
    events: [
      {
        type: 'CHECK_VICTORY',
        timestamp: Date.now(),
      },
    ],
    broadcast: [
      {
        type: 'VOTE_RESULT',
        payload: {
          executedPlayerId: result.executedPlayerId,
          executedPlayerName: executedPlayer?.name || 'Unknown',
          voteCount: result.counts.get(result.executedPlayerId) || 0,
          wasTiebreaker: result.tieResolved,
          hunterVictimId,
          message: hunterVictimId 
            ? `${executedPlayer?.name} was executed! As the Hunter, they took ${state.players.find(p => p.id === hunterVictimId)?.name} with them!`
            : `${executedPlayer?.name} was executed by village vote.`,
        },
      },
    ],
  };
}

/**
 * Handle vote submission
 */
export async function handleVoteSubmission(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const { playerId, targetId } = event.payload;
  
  // Validate vote
  if (!state.alivePlayers.has(playerId)) {
    throw new Error('Dead players cannot vote');
  }
  
  if (!state.alivePlayers.has(targetId)) {
    throw new Error('Cannot vote for dead player');
  }

  // Record vote
  state.votes.set(playerId, targetId);

  return {
    nextState: state,
    events: [],
    broadcast: [
      {
        type: 'VOTE_RECORDED',
        payload: {
          playerId,
          message: `Vote recorded`,
        },
      },
    ],
  };
}

