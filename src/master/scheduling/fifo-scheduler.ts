import { BlockingQueue } from './blocking-queue';
import { TaskScheduler, TaskDescription } from './task-scheduler';

interface Options {
    timeout?: number;
}

interface StatusEntry<T, R> {
    task: T;
    timeout: NodeJS.Timeout | null;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
}

/**
 * A task scheduler that takes tasks from a producer and allows consumers to take tasks and deliver completion results.
 * The scheduler is backed by an asynchronous blocking FIFO queue.
 *
 * Tasks that are worked on for more than the specified `options.timeout` amount of time are put back onto the queue.
 * This ensures at-least-once execution of tasks.
 */
export class FifoScheduler<T, R> implements TaskScheduler<T, R> {
    private timeout: number;
    private queue: BlockingQueue<string>;
    private tasksStatus: { [Key: string]: StatusEntry<T, R> };
    private taskCounter: number;

    public constructor(options: Options = {}) {
        this.timeout = options.timeout === undefined ? 5000 : options.timeout;
        this.queue = new BlockingQueue<string>();
        this.tasksStatus = {};
        this.taskCounter = 0;
    }

    /**
     * Puts a task into the queue.
     * @param task The task that needs to be performed.
     * @returns A promise that resolves when the task has been completed.
     * The resolved value is the result of completing the task.
     */
    public put(task: T) {
        return new Promise<R>((resolve, reject) => {
            const key = (this.taskCounter++).toString();
            this.tasksStatus[key] = { task, timeout: null, resolve, reject };
            this.queue.enqueue(key).catch(FifoScheduler.ignore);
        });
    }

    /**
     * Takes a task from the queue to be worked on.
     * @returns A promise with a description of the task.
     * If no tasks are available, the promise will resolve when there is a task available.
     * The `key` must be used to indicate the completion of the task.
     */
    public async take(): Promise<TaskDescription<T>> {
        let key: string = await this.queue.dequeue();
        while (!(key in this.tasksStatus)) {
            // Task in queue was already completed by a slow consumer, and put back into the queue.
            // Try the next one.
            key = await this.queue.dequeue();
        }
        if (this.tasksStatus[key].timeout) {
            global.clearTimeout(this.tasksStatus[key].timeout!);
        }
        // Task is not completed yet, we give it to the consumer.
        this.tasksStatus[key].timeout = global.setTimeout(() => {
            if (key in this.tasksStatus) {
                // Task was not complete before timeout, move task back to queue.
                this.queue.enqueue(key).catch(FifoScheduler.ignore);
            }
        }, this.timeout);
        return { key, task: this.tasksStatus[key].task };
    }

    /**
     * Deliver the result of a task that is completed.
     * Depending on whether or not (1) the maximum task timeout has been exceeded, and (2) the task has been completed before by another consumer, the result may be ignored.
     * If the result is not ignored, the producer of the task will be notified of the result.
     * @param key The key obtained from taking the task.
     * @param result The task completion result.
     */
    public complete(key: string, result: R) {
        if (key in this.tasksStatus) {
            const resolve = this.tasksStatus[key].resolve;
            if (this.tasksStatus[key].timeout) {
                global.clearTimeout(this.tasksStatus[key].timeout!);
            }
            delete this.tasksStatus[key];
            resolve(result);
        } else {
            // Task was completed before. Ignore result.
        }
    }

    /**
     * Cancel work on a task after it was taken.
     * Puts the task back onto the queue, if it hasn't been completed yet.
     * @param key The key obtained from taking the task.
     */
    public cancel(key: string) {
        if (key in this.tasksStatus) {
            if (this.tasksStatus[key].timeout) {
                global.clearTimeout(this.tasksStatus[key].timeout!);
                this.tasksStatus[key].timeout = null;
            }
            this.queue.enqueue(key).catch(FifoScheduler.ignore);
        } else {
            // Task was completed before. Ignore cancellation.
        }
    }

    /**
     * Abort all tasks.
     */
    public abortAll() {
        const error = new Error('Task destroyed.');
        this.queue.drain(error);
        for (const key of Object.keys(this.tasksStatus)) {
            if (this.tasksStatus[key].timeout) {
                global.clearTimeout(this.tasksStatus[key].timeout!);
            }
            this.tasksStatus[key].reject(error);
        }
        this.tasksStatus = {};
    }

    private static ignore() {
        //
    }
}
