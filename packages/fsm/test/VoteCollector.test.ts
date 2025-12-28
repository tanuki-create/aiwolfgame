import { describe, it, expect } from 'bun:test';
import { VoteCollector } from '../src/vote/VoteCollector';
import type { GameState } from '@aiwolf/shared';

describe('VoteCollector', () => {
  const createMockState = (): GameState => ({
    gameId: 'test-game',
    phase: 'DAY_VOTE',
    dayNumber: 1,
    players: [
      { id: 'p1', type: 'AI', name: 'Alice', isAlive: true },
      { id: 'p2', type: 'AI', name: 'Bob', isAlive: true },
      { id: 'p3', type: 'AI', name: 'Carol', isAlive: true },
      { id: 'p4', type: 'AI', name: 'David', isAlive: false },
    ],
    alivePlayers: new Set(['p1', 'p2', 'p3']),
    roleAssignments: new Map(),
    phaseStartTime: Date.now(),
    phaseDeadline: Date.now() + 60000,
    seeds: {
      roster: 1,
      roles: 2,
      packs: 3,
      turns: 12345,
      wolfLeader: 5,
    },
    config: {
      numPlayers: 11,
      numAI: 10,
      packs: [],
      timers: {
        dayFreeTalk: 300000,
        dayVote: 120000,
        nightWolfChat: 180000,
        nightActions: 60000,
        dawn: 10000,
      },
      randomStart: false,
    },
    createdAt: Date.now(),
  });

  describe('submitVote', () => {
    it('should record submitted vote', () => {
      const collector = new VoteCollector();
      collector.submitVote({
        gameId: 'test-game',
        playerId: 'p1',
        targetPlayerId: 'p2',
        timestamp: Date.now(),
      });

      expect(collector.hasVoted('p1')).toBe(true);
      expect(collector.getVote('p1')).toBe('p2');
    });

    it('should allow vote changes', () => {
      const collector = new VoteCollector();
      collector.submitVote({
        gameId: 'test-game',
        playerId: 'p1',
        targetPlayerId: 'p2',
        timestamp: Date.now(),
      });
      collector.submitVote({
        gameId: 'test-game',
        playerId: 'p1',
        targetPlayerId: 'p3',
        timestamp: Date.now(),
      });

      expect(collector.getVote('p1')).toBe('p3');
    });
  });

  describe('finalizeVotes', () => {
    it('should fill missing votes with random targets', () => {
      const collector = new VoteCollector();
      const state = createMockState();

      // Only p1 votes
      collector.submitVote({
        gameId: 'test-game',
        playerId: 'p1',
        targetPlayerId: 'p2',
        timestamp: Date.now(),
      });

      const result = collector.finalizeVotes(state);

      expect(result.votes.size).toBe(3); // All alive players
      expect(result.votes.get('p1')).toBe('p2');
      expect(result.votes.has('p2')).toBe(true);
      expect(result.votes.has('p3')).toBe(true);
    });

    it('should determine execution with simple majority', () => {
      const collector = new VoteCollector();
      const state = createMockState();

      collector.submitVote({ gameId: 'test-game', playerId: 'p1', targetPlayerId: 'p2', timestamp: Date.now() });
      collector.submitVote({ gameId: 'test-game', playerId: 'p2', targetPlayerId: 'p3', timestamp: Date.now() });
      collector.submitVote({ gameId: 'test-game', playerId: 'p3', targetPlayerId: 'p3', timestamp: Date.now() });

      const result = collector.finalizeVotes(state);

      expect(result.executedPlayerId).toBe('p3'); // 2 votes
      expect(result.counts.get('p3')).toBe(2);
    });

    it('should resolve ties deterministically with seed', () => {
      const collector = new VoteCollector();
      const state = createMockState();

      collector.submitVote({ gameId: 'test-game', playerId: 'p1', targetPlayerId: 'p2', timestamp: Date.now() });
      collector.submitVote({ gameId: 'test-game', playerId: 'p2', targetPlayerId: 'p3', timestamp: Date.now() });
      collector.submitVote({ gameId: 'test-game', playerId: 'p3', targetPlayerId: 'p1', timestamp: Date.now() });

      const result1 = collector.finalizeVotes(state);
      
      // Reset and try again with same seed
      collector.clear();
      collector.submitVote({ gameId: 'test-game', playerId: 'p1', targetPlayerId: 'p2', timestamp: Date.now() });
      collector.submitVote({ gameId: 'test-game', playerId: 'p2', targetPlayerId: 'p3', timestamp: Date.now() });
      collector.submitVote({ gameId: 'test-game', playerId: 'p3', targetPlayerId: 'p1', timestamp: Date.now() });

      const result2 = collector.finalizeVotes(state);

      expect(result1.executedPlayerId).toBe(result2.executedPlayerId);
      expect(result1.tieResolved).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all votes', () => {
      const collector = new VoteCollector();
      collector.submitVote({ gameId: 'test-game', playerId: 'p1', targetPlayerId: 'p2', timestamp: Date.now() });
      collector.submitVote({ gameId: 'test-game', playerId: 'p2', targetPlayerId: 'p3', timestamp: Date.now() });

      collector.clear();

      expect(collector.hasVoted('p1')).toBe(false);
      expect(collector.hasVoted('p2')).toBe(false);
    });
  });
});

