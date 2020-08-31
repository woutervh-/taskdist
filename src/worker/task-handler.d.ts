import { AbortSignal } from 'abort-controller';

export interface TaskHandler<Task, TaskResult> {
    doTask(task: Task, abortSignal: AbortSignal): Promise<TaskResult>;
}
