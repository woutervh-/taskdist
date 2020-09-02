export interface TaskHandler<Task, TaskResult> {
    getConcurrency(): number;
    doTask(task: Task): Promise<TaskResult>;
}
