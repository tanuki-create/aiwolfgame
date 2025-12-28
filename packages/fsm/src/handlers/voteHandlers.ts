import type { GameState, GameEvent, TransitionResult, VoteData } from '@aiwolf/shared';
import { VoteCollector } from '../vote/VoteCollector.js';

/**
 * Handle DAY_VOTE phase - collect votes and determine execution
 */
export async function handleVotePhase(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const collector = new VoteCollector();

  // Submit collected votes
  for (const [voterId, voteData] of state.votes.entries()) {
    collector.submitVote({ 
      gameId: state.gameId,
      playerId: voterId, 
      targetPlayerId: voteData.targetId,
      timestamp: voteData.timestamp,
    });
  }

  // Finalize votes (fills missing votes with random)
  const result = collector.finalizeVotes(state);
  
  // Check for tie
  const maxVotes = Math.max(...Array.from(result.counts.values()));
  const tiedPlayerIds = Array.from(result.counts.entries())
    .filter(([, count]) => count === maxVotes)
    .map(([playerId]) => playerId);

  // If there's a tie (more than 1 player with max votes) and we haven't done revote yet
  if (tiedPlayerIds.length > 1 && state.phase === 'DAY_VOTE') {
    console.log(`[VoteHandler] 🔄 Tie detected! ${tiedPlayerIds.length} players tied with ${maxVotes} votes each.`);
    
    // Store tied players for revote
    state.tiedPlayers = tiedPlayerIds;
    
    return {
      nextState: {
        ...state,
        phase: 'DAY_REVOTE_TALK',
        phaseStartTime: Date.now(),
        phaseDeadline: Date.now() + state.config.timers.dayRevoteTalk,
      },
      events: [],
      broadcast: [
        {
          type: 'VOTE_TIE',
          payload: {
            tiedPlayerIds,
            tiedPlayerNames: tiedPlayerIds.map(id => state.players.find(p => p.id === id)?.name || 'Unknown'),
            voteCount: maxVotes,
            message: `⚖️ Vote tied! The following players are tied with ${maxVotes} votes each: ${tiedPlayerIds.map(id => state.players.find(p => p.id === id)?.name).join(', ')}. They will make final statements.`,
          },
        },
        {
          type: 'PHASE_CHANGE',
          payload: {
            phase: 'DAY_REVOTE_TALK',
            phaseDeadline: Date.now() + state.config.timers.dayRevoteTalk,
            message: '⚖️ Tied players will make their final statements.',
          },
        },
      ],
    };
  }

  // If still tied after revote, no execution
  if (tiedPlayerIds.length > 1 && state.phase === 'DAY_REVOTE') {
    console.log(`[VoteHandler] 🤷 Revote still tied. No execution today.`);
    
    // Clear votes and tied players
    state.votes.clear();
    state.tiedPlayers = undefined;
    
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
          type: 'NO_EXECUTION',
          payload: {
            message: '⚖️ Vote still tied after revote. No one will be executed today.',
          },
        },
      ],
    };
  }

  // Mark executed player as dead (but keep for last will)
  const executedPlayerId = result.executedPlayerId;
  const executedPlayer = state.players.find(p => p.id === executedPlayerId);
  
  // Store executed player ID for last will phase
  state.executedPlayerId = executedPlayerId;
  
  if (executedPlayer) {
    executedPlayer.isAlive = false;
    state.alivePlayers.delete(executedPlayerId);
  }

  // Record death
  state.deaths.push({
    playerId: executedPlayerId,
    playerName: executedPlayer?.name || 'Unknown',
    dayNumber: state.dayNumber,
    deathType: 'EXECUTED',
    timestamp: Date.now(),
  });

  // Clear votes and tied players for next round
  state.votes.clear();
  state.tiedPlayers = undefined;

  // Check for hunter chain reaction if executed player was hunter
  const executedRole = state.roleAssignments.get(executedPlayerId);
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

  // Transition to LAST_WILL phase for executed player's final statement
  return {
    nextState: {
      ...state,
      phase: 'LAST_WILL',
      phaseStartTime: Date.now(),
      phaseDeadline: Date.now() + state.config.timers.lastWill,
    },
    events: [],
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
      {
        type: 'PHASE_CHANGE',
        payload: {
          phase: 'LAST_WILL',
          dayNumber: state.dayNumber,
          message: `⚖️ ${executedPlayer?.name} may now speak their final words...`,
        },
      },
    ],
  };
}

/**
 * Handle vote submission
 */
export async function handleVoteSubmission(state: GameState, event: GameEvent): Promise<TransitionResult> {
  const { playerId, targetId, reason } = event.payload;
  
  // Validate vote
  if (!state.alivePlayers.has(playerId)) {
    throw new Error('Dead players cannot vote');
  }
  
  if (!state.alivePlayers.has(targetId)) {
    throw new Error('Cannot vote for dead player');
  }

  // Record vote with reason
  const voteData: VoteData = {
    voterId: playerId,
    targetId,
    reason: reason || '理由なし',
    timestamp: Date.now(),
  };
  
  state.votes.set(playerId, voteData);

  const voter = state.players.find(p => p.id === playerId);
  const target = state.players.find(p => p.id === targetId);

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
      {
        type: 'SYSTEM_MESSAGE',
        payload: {
          message: `🗳️ ${voter?.name} voted for ${target?.name}. Reason: "${voteData.reason}"`,
          timestamp: Date.now(),
        },
      },
    ],
  };
}

