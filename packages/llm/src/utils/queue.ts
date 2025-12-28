/**
 * Async queue for managing AI speech order
 */
export class AsyncQueue<T> {
  private queue: T[] = [];
  private waiting: Array<(value: T) => void> = [];

  async enqueue(item: T): Promise<void> {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve?.(item);
    } else {
      this.queue.push(item);
    }
  }

  async dequeue(): Promise<T> {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }

    return new Promise<T>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.waiting = [];
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

