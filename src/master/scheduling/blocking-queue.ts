interface ProducerItem<T> {
    item: T;
    notify: () => void;
}

type Listener<T> = (error: Error | null, item?: T) => void;

/**
 * Implements an asynchronous blocking queue.
 * Items can be put on the queue and removed from the queue.
 * Removing items from the queue blocks (asynchronously) until an item is available.
 * Items are removed in FIFO order.
 */
export class BlockingQueue<T> {
    private producerQueue: ProducerItem<T>[] = [];
    private consumerQueue: Listener<T>[] = [];

    /**
     * The number of items waiting to be consumed.
     */
    public get producerCount() {
        return this.producerQueue.length;
    }

    /**
     * The number of consumers waiting for an item.
     */
    public get consumerCount() {
        return this.consumerQueue.length;
    }

    /**
     * Puts an item on the queue.
     * @param item The item to put on the queue.
     * @returns A promise that resolves when the item that was put on the queue is dequeued.
     */
    public enqueue(item: T) {
        return new Promise<void>((resolve, reject) => {
            const consumer = this.consumerQueue.shift();
            if (consumer === undefined) {
                this.producerQueue.push({ item, notify: resolve });
            } else {
                consumer(null, item);
                resolve();
            }
        });
    }

    /**
     * Retrieve an item from the queue.
     * Blocks until an item is available.
     * @returns A promise that resolves when an item is available.
     * The resolved value is the item that is removed from the queue.
     */
    public dequeue() {
        return new Promise<T>((resolve, reject) => {
            const item = this.producerQueue.shift();
            if (item === undefined) {
                this.consumerQueue.push((error, item) => {
                    if (error === null && item !== undefined) {
                        resolve(item);
                    } else if (error !== null) {
                        reject(error);
                    } else {
                        reject(new Error('Invalid arguments.'));
                    }
                });
            } else {
                resolve(item.item);
                item.notify();
            }
        });
    }
}
