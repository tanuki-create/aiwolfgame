/**
 * Async queue for managing AI speech order
 */
export class AsyncQueue {
    queue = [];
    waiting = [];
    async enqueue(item) {
        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift();
            resolve?.(item);
        }
        else {
            this.queue.push(item);
        }
    }
    async dequeue() {
        if (this.queue.length > 0) {
            return this.queue.shift();
        }
        return new Promise((resolve) => {
            this.waiting.push(resolve);
        });
    }
    size() {
        return this.queue.length;
    }
    clear() {
        this.queue = [];
        this.waiting = [];
    }
}
/**
 * Sleep utility
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
