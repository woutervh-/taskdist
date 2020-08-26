export interface TaskMessage<Task> {
    type: 'task';
    taskKey: string;
    task: Task;
}

export type MasterMessage<Task> = TaskMessage<Task>;
