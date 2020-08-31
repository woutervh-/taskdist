export interface TaskDescription<T> {
    key: string;
    task: T;
}

export interface TaskScheduler<T, R> {
    put(task: T): Promise<R>;
    take(): Promise<TaskDescription<T>>;
    complete(key: string, result: R): void;
    cancel(key: string): void;
    abortAll(): void;
}
