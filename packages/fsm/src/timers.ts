import type { GamePhase, PhaseTimers } from '@aiwolf/shared';

/**
 * Get timer duration for a given phase
 */
export function getPhaseTimer(phase: GamePhase, timers: PhaseTimers): number {
  switch (phase) {
    case 'DAY_FREE_TALK':
      return timers.dayFreeTalk;
    case 'DAY_VOTE':
      return timers.dayVote;
    case 'NIGHT_WOLF_CHAT':
      return timers.nightWolfChat;
    case 'NIGHT_ACTIONS':
      return timers.nightActions;
    case 'DAWN':
      return timers.dawn;
    default:
      return 0; // No timer for this phase
  }
}

/**
 * Calculate phase deadline
 */
export function calculateDeadline(phase: GamePhase, timers: PhaseTimers, startTime: number = Date.now()): number {
  const duration = getPhaseTimer(phase, timers);
  return startTime + duration;
}

/**
 * Check if deadline has passed
 */
export function isDeadlinePassed(deadline: number, currentTime: number = Date.now()): boolean {
  return currentTime >= deadline;
}

/**
 * Get remaining time until deadline
 */
export function getRemainingTime(deadline: number, currentTime: number = Date.now()): number {
  const remaining = deadline - currentTime;
  return Math.max(0, remaining);
}

/**
 * Timer manager for automatic phase transitions with time warnings
 */
export class PhaseTimer {
  private timeoutId?: Timer;
  private warningTimeouts: Timer[] = [];
  private callback?: () => void;
  private warningCallback?: (remainingSeconds: number) => void;

  /**
   * Start a timer that calls callback when deadline is reached
   * Optionally sends warnings at specific time intervals
   */
  start(
    deadline: number, 
    callback: () => void,
    warningCallback?: (remainingSeconds: number) => void
  ): void {
    this.clear();
    
    const delay = getRemainingTime(deadline);
    if (delay <= 0) {
      // Deadline already passed, trigger immediately
      callback();
      return;
    }

    this.callback = callback;
    this.warningCallback = warningCallback;
    
    // Setup warning timers (1 minute and 30 seconds before deadline)
    if (warningCallback) {
      this.setupWarningTimers(delay);
    }

    // Setup main deadline timer
    this.timeoutId = setTimeout(() => {
      this.callback?.();
      this.clear();
    }, delay);
  }

  /**
   * Setup warning timers for time announcements
   */
  private setupWarningTimers(totalDelay: number): void {
    const warnings = [
      { seconds: 60, message: 60 },   // 1 minute warning
      { seconds: 30, message: 30 },   // 30 seconds warning
      { seconds: 10, message: 10 },   // 10 seconds warning
    ];

    for (const warning of warnings) {
      const warningDelay = totalDelay - (warning.seconds * 1000);
      
      if (warningDelay > 0) {
        const warningTimer = setTimeout(() => {
          this.warningCallback?.(warning.message);
        }, warningDelay);
        
        this.warningTimeouts.push(warningTimer);
      }
    }
  }

  /**
   * Clear the current timer and all warning timers
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    
    // Clear all warning timers
    for (const warningTimer of this.warningTimeouts) {
      clearTimeout(warningTimer);
    }
    this.warningTimeouts = [];
    
    this.callback = undefined;
    this.warningCallback = undefined;
  }

  /**
   * Check if timer is active
   */
  isActive(): boolean {
    return this.timeoutId !== undefined;
  }
}

