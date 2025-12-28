import type { GameState, Player } from '@aiwolf/shared';
import { GameFSM } from '@aiwolf/fsm';
import { RoleBuilder, RoleAssigner } from '@aiwolf/fsm';
import { SeededRNG } from '@aiwolf/shared';

interface SimulationResult {
  gameId: string;
  winner: 'VILLAGE' | 'WEREWOLF' | 'FOX' | null;
  numDays: number;
  numPhases: number;
  timeoutCount: number;
  errors: string[];
  duration: number;
}

interface SimulationStats {
  totalGames: number;
  completed: number;
  crashed: number;
  villageWins: number;
  werewolfWins: number;
  foxWins: number;
  avgDays: number;
  avgDuration: number;
  timeoutRate: number;
}

/**
 * Simulation runner for automated game testing
 */
export class SimulationRunner {
  private results: SimulationResult[] = [];

  /**
   * Run N simulated games
   */
  async runSimulation(numGames: number, startSeed: number = 1000): Promise<SimulationStats> {
    console.log(`🎮 Starting simulation of ${numGames} games...`);
    
    this.results = [];

    for (let i = 0; i < numGames; i++) {
      const seed = startSeed + i;
      console.log(`\n[${i + 1}/${numGames}] Running game with seed ${seed}...`);
      
      try {
        const result = await this.runSingleGame(seed);
        this.results.push(result);
        
        console.log(`  ✓ Completed: ${result.winner} wins in ${result.numDays} days (${result.duration}ms)`);
      } catch (error: any) {
        console.error(`  ✗ Crashed:`, error.message);
        this.results.push({
          gameId: `game_${seed}`,
          winner: null,
          numDays: 0,
          numPhases: 0,
          timeoutCount: 0,
          errors: [error.message],
          duration: 0,
        });
      }

      // Progress update every 10 games
      if ((i + 1) % 10 === 0) {
        const stats = this.calculateStats();
        console.log(`\n📊 Progress: ${i + 1}/${numGames} games`);
        console.log(`   Completion rate: ${((stats.completed / stats.totalGames) * 100).toFixed(1)}%`);
        console.log(`   Village wins: ${stats.villageWins}, Werewolf wins: ${stats.werewolfWins}, Fox wins: ${stats.foxWins}`);
      }
    }

    const finalStats = this.calculateStats();
    this.printSummary(finalStats);
    
    return finalStats;
  }

  /**
   * Run a single simulated game
   */
  private async runSingleGame(seed: number): Promise<SimulationResult> {
    const startTime = Date.now();
    const gameId = `sim_game_${seed}`;

    // Create initial game state
    const roleBuilder = new RoleBuilder();
    const { roles, packs } = roleBuilder.buildRandomRoles(seed);

    // Create mock players
    const players: Player[] = [];
    for (let i = 0; i < 11; i++) {
      players.push({
        id: `player_${i}`,
        type: 'AI',
        name: `AI_${i}`,
        isAlive: true,
      });
    }

    const gameState: GameState = {
      gameId,
      phase: 'INIT',
      dayNumber: 0,
      players,
      alivePlayers: new Set(players.map(p => p.id)),
      roleAssignments: new Map(),
      votes: new Map(),
      nightActions: new Map(),
      wolfAttacks: new Map(),
      deaths: [],
      phaseStartTime: Date.now(),
      phaseDeadline: Date.now() + 1000,
      seeds: {
        roster: seed,
        roles: seed + 1,
        packs: seed + 2,
        turns: seed + 3,
        wolfLeader: seed + 4,
      },
      config: {
        numPlayers: 11,
        numAI: 11,
        packs,
        timers: {
          dayFreeTalk: 100,    // Very short for simulation
          dayVote: 100,
          nightWolfChat: 100,
          nightActions: 100,
          dawn: 100,
          dayRevoteTalk: 30,
          dayRevote: 60,
        },
        randomStart: true,
      },
      createdAt: Date.now(),
    };

    // Assign roles
    const roleAssigner = new RoleAssigner();
    const assignments = roleAssigner.assign(players, roles, seed + 1);
    gameState.roleAssignments = assignments;

    // Create FSM
    const fsm = new GameFSM(gameState);

    let phaseCount = 0;
    let timeoutCount = 0;
    const errors: string[] = [];
    const maxPhases = 1000; // Safety limit

    // Simulate game until end
    while (phaseCount < maxPhases) {
      const currentState = fsm.getState();
      
      if (currentState.phase === 'GAME_OVER') {
        break;
      }

      phaseCount++;

      try {
        // Auto-advance phases (simplified simulation)
        await this.simulatePhase(fsm);
        
        // Small delay to prevent infinite loops
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error: any) {
        errors.push(error.message);
        timeoutCount++;
        
        if (errors.length > 10) {
          throw new Error('Too many errors, aborting simulation');
        }
      }
    }

    const finalState = fsm.getState();
    const duration = Date.now() - startTime;

    return {
      gameId,
      winner: finalState.winner || null,
      numDays: finalState.dayNumber,
      numPhases: phaseCount,
      timeoutCount,
      errors,
      duration,
    };
  }

  /**
   * Simulate a single phase (mock)
   */
  private async simulatePhase(fsm: GameFSM): Promise<void> {
    const state = fsm.getState();

    // This is a simplified simulation
    // In reality, you'd trigger proper events based on phase
    switch (state.phase) {
      case 'INIT':
        await fsm.transition({ type: 'ROLES_ASSIGNED', timestamp: Date.now() });
        break;
      case 'ASSIGN_ROLES':
        await fsm.transition({ type: 'START_DAY', timestamp: Date.now() });
        break;
      case 'DAY_FREE_TALK':
        await fsm.transition({ type: 'START_VOTE', timestamp: Date.now() });
        break;
      case 'DAY_VOTE':
        await fsm.transition({ type: 'VOTE_COMPLETE', timestamp: Date.now() });
        break;
      case 'CHECK_END':
        // Check if game should end, otherwise continue
        await fsm.transition({ type: 'START_DAY', timestamp: Date.now() });
        break;
      default:
        // For other phases, just wait for timer
        await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Calculate statistics from results
   */
  private calculateStats(): SimulationStats {
    const totalGames = this.results.length;
    const completed = this.results.filter(r => r.winner !== null).length;
    const crashed = totalGames - completed;

    const villageWins = this.results.filter(r => r.winner === 'VILLAGE').length;
    const werewolfWins = this.results.filter(r => r.winner === 'WEREWOLF').length;
    const foxWins = this.results.filter(r => r.winner === 'FOX').length;

    const completedResults = this.results.filter(r => r.winner !== null);
    const avgDays = completedResults.length > 0
      ? completedResults.reduce((sum, r) => sum + r.numDays, 0) / completedResults.length
      : 0;

    const avgDuration = completedResults.length > 0
      ? completedResults.reduce((sum, r) => sum + r.duration, 0) / completedResults.length
      : 0;

    const totalTimeouts = this.results.reduce((sum, r) => sum + r.timeoutCount, 0);
    const totalPhases = this.results.reduce((sum, r) => sum + r.numPhases, 0);
    const timeoutRate = totalPhases > 0 ? totalTimeouts / totalPhases : 0;

    return {
      totalGames,
      completed,
      crashed,
      villageWins,
      werewolfWins,
      foxWins,
      avgDays,
      avgDuration,
      timeoutRate,
    };
  }

  /**
   * Print summary statistics
   */
  private printSummary(stats: SimulationStats): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SIMULATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Games:        ${stats.totalGames}`);
    console.log(`Completed:          ${stats.completed} (${((stats.completed / stats.totalGames) * 100).toFixed(1)}%)`);
    console.log(`Crashed:            ${stats.crashed} (${((stats.crashed / stats.totalGames) * 100).toFixed(1)}%)`);
    console.log('');
    console.log(`Village Wins:       ${stats.villageWins} (${((stats.villageWins / stats.completed) * 100).toFixed(1)}%)`);
    console.log(`Werewolf Wins:      ${stats.werewolfWins} (${((stats.werewolfWins / stats.completed) * 100).toFixed(1)}%)`);
    console.log(`Fox Wins:           ${stats.foxWins} (${((stats.foxWins / stats.completed) * 100).toFixed(1)}%)`);
    console.log('');
    console.log(`Avg Days:           ${stats.avgDays.toFixed(2)}`);
    console.log(`Avg Duration:       ${stats.avgDuration.toFixed(0)}ms`);
    console.log(`Timeout Rate:       ${(stats.timeoutRate * 100).toFixed(2)}%`);
    console.log('='.repeat(60));
  }

  /**
   * Export results to file
   */
  exportResults(filename: string): void {
    const data = JSON.stringify({
      results: this.results,
      stats: this.calculateStats(),
      timestamp: new Date().toISOString(),
    }, null, 2);

    Bun.write(filename, data);
    console.log(`\n📄 Results exported to ${filename}`);
  }
}

// CLI interface
if (import.meta.main) {
  const numGames = parseInt(process.argv[2]) || 100;
  const seed = parseInt(process.argv[3]) || 1000;

  const runner = new SimulationRunner();
  await runner.runSimulation(numGames, seed);
  runner.exportResults(`simulation_${Date.now()}.json`);
}

