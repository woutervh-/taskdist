import { BlockingQueue } from './blocking-queue';

export interface TaskSchedulerOptions {
    timeout?: number;
}

export interface TaskDescription<T> {
    completionKey: string;
    task: T;
}

interface StatusEntry<T, R> {
    task: T;
    timeout: NodeJS.Timeout | null;
    notify: (result: R) => void;
}

/**
 * A task scheduler that takes tasks from a producer and allows consumers to take tasks and deliver completion results.
 * The scheduler is backed by an asynchronous blocking FIFO queue.
 *
 * Tasks that are worked on for more than the specified `options.timeout` amount of time are put back onto the queue.
 * This ensures at-least-once execution of tasks.
 */
export class TaskScheduler<T, R> {
    private timeout: number;
    private queue: BlockingQueue<string>;
    private tasksStatus: { [Key: string]: StatusEntry<T, R> };
    private taskCounter: number;

    public constructor(options: TaskSchedulerOptions = {}) {
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
        return new Promise<R>((resolve) => {
            const key = (this.taskCounter++).toString();
            this.tasksStatus[key] = { task, timeout: null, notify: resolve };
            this.queue.enqueue(key);
        });
    }

    /**
     * Takes a task from the queue to be worked on.
     * @returns A promise with a description of the task.
     * If no tasks are available, the promise will resolve when there is a task available.
     * The `completionKey` must be used to indicate the completion of the task.
     */
    public async take(): Promise<TaskDescription<T>> {
        let taskKey: string = await this.queue.dequeue();
        while (!(taskKey in this.tasksStatus)) {
            // Task in queue was already completed by a slow consumer, and put back into the queue.
            // Try the next one.
            taskKey = await this.queue.dequeue();
        }
        if (this.tasksStatus[taskKey].timeout) {
            global.clearTimeout(this.tasksStatus[taskKey].timeout!);
        }
        // Task is not completed yet, we give it to the consumer.
        this.tasksStatus[taskKey].timeout = global.setTimeout(() => {
            if (taskKey in this.tasksStatus) {
                // Task was not complete before timeout, move task back to queue.
                this.queue.enqueue(taskKey);
            }
        }, this.timeout);
        return { completionKey: taskKey, task: this.tasksStatus[taskKey].task };
    }

    /**
     * Deliver the result of a task that is completed.
     * Depending on whether or not (1) the maximum task timeout has been exceeded, and (2) the task has been completed before by another consumer, the result may be ignored.
     * If the result is not ignored, the producer of the task will be notified of the result.
     * @param completionKey The key obtained from taking the task.
     * @param result The task completion result.
     */
    public complete(completionKey: string, result: R) {
        if (completionKey in this.tasksStatus) {
            const notify = this.tasksStatus[completionKey].notify;
            if (this.tasksStatus[completionKey].timeout) {
                global.clearTimeout(this.tasksStatus[completionKey].timeout!);
            }
            delete this.tasksStatus[completionKey];
            notify(result);
        } else {
            // Task was completed before. Ignore result.
        }
    }

    /**
     * Cancel work on a task after it was taken.
     * Puts the task back onto the queue, if it hasn't been completed yet.
     * @param completionKey The key obtained from taking the task.
     */
    public cancel(completionKey: string) {
        if (completionKey in this.tasksStatus) {
            if (this.tasksStatus[completionKey].timeout) {
                global.clearTimeout(this.tasksStatus[completionKey].timeout!);
                this.tasksStatus[completionKey].timeout = null;
            }
            this.queue.enqueue(completionKey);
        } else {
            // Task was completed before. Ignore cancellation.
        }
    }
}
