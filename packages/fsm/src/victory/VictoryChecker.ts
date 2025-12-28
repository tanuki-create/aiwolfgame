import type { GameState, Role } from '@aiwolf/shared';
import { ROLE_TEAMS } from '@aiwolf/shared';

export type VictoryResult = {
  hasWinner: boolean;
  winner?: 'VILLAGE' | 'WEREWOLF' | 'FOX';
  reason?: string;
};

export class VictoryChecker {
  check(state: GameState): VictoryResult {
    const alivePlayers = Array.from(state.alivePlayers);
    const aliveRoles = alivePlayers.map(id => state.roleAssignments.get(id)!);

    // Count alive players by team
    const counts = {
      village: 0,
      werewolf: 0,
      fox: 0,
    };

    for (const role of aliveRoles) {
      const team = ROLE_TEAMS[role];
      if (team === 'VILLAGE') counts.village++;
      else if (team === 'WEREWOLF') counts.werewolf++;
      else if (team === 'FOX') counts.fox++;
    }

    // Fox wins if alive when game would otherwise end
    const hasFox = counts.fox > 0;

    // Werewolves win if they equal or outnumber non-werewolves
    if (counts.werewolf >= counts.village + counts.fox) {
      if (hasFox) {
        return { hasWinner: true, winner: 'FOX', reason: 'Fox alive when wolves would win' };
      }
      return { hasWinner: true, winner: 'WEREWOLF', reason: 'Werewolves equal or outnumber villagers' };
    }

    // Village wins if all werewolves dead
    if (counts.werewolf === 0) {
      if (hasFox) {
        return { hasWinner: true, winner: 'FOX', reason: 'Fox alive when village would win' };
      }
      return { hasWinner: true, winner: 'VILLAGE', reason: 'All werewolves eliminated' };
    }

    return { hasWinner: false };
  }
}

