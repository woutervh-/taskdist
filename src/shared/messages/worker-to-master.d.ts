export interface PopTaskMessage {
    type: 'pop';
}

export interface CompleteTaskMessage<TaskResult> {
    type: 'complete';
    key: string;
    taskResult: TaskResult;
}

export type WorkerMessage<TaskResult> = PopTaskMessage | CompleteTaskMessage<TaskResult>;
