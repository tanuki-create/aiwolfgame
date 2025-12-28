/**
 * Async queue for managing AI speech order
 */
export declare class AsyncQueue<T> {
    private queue;
    private waiting;
    enqueue(item: T): Promise<void>;
    dequeue(): Promise<T>;
    size(): number;
    clear(): void;
}
/**
 * Sleep utility
 */
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=queue.d.ts.map