export interface PopTaskMessage {
    type: 'pop';
}

export interface CompleteTaskMessage<TaskResult> {
    type: 'complete';
    taskKey: string;
    taskResult: TaskResult;
}

export type WorkerMessage<TaskResult> = PopTaskMessage | CompleteTaskMessage<TaskResult>;
