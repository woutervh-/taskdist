export interface TaskHandler<Task, TaskResult> {
    doTask(task: Task): Promise<TaskResult>;
    stop(): void;
}
