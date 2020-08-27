export interface TaskMessage<Task> {
    type: 'task';
    key: string;
    task: Task;
}

export type MasterMessage<Task> = TaskMessage<Task>;
