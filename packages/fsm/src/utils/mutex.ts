/**
 * Async mutex for ensuring serial execution of FSM transitions
 */
export class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    while (this.locked) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.locked = true;
    try {
      return await fn();
    } finally {
      this.locked = false;
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
    }
  }

  isLocked(): boolean {
    return this.locked;
  }
}

