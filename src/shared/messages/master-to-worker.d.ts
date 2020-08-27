export interface TaskMessage<Task, Data> {
    type: 'task';
    key: string;
    task: Task;
    data: Data;
}

export type MasterMessage<Task, Data> = TaskMessage<Task, Data>;
