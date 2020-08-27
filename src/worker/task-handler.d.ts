export interface TaskHandler<Task, TaskResult, Data> {
    doTask(task: Task, data: Data): Promise<TaskResult>;
    stop(): void;
}
