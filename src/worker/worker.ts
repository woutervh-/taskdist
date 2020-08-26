import { Client } from '../client/client';
import { TaskMessageHandlerFactory } from './message-handler';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { WorkerMessage } from '../shared/messages/worker-to-master';
import { TaskHandler } from '../shared/tasks/task-handler';

interface Options {
    connectTimeout: number;
    protocol: 'ws' | 'wss';
    masterHost: string;
    masterPort: number;
}

export class Worker<Task, TaskResult> {
    private client: Client<MasterMessage<Task>, WorkerMessage<TaskResult>>;

    public constructor(taskHandler: TaskHandler<Task, TaskResult>, options: Options) {
        this.client = new Client(
            new TaskMessageHandlerFactory(taskHandler),
            {
                connectTimeout: options.connectTimeout,
                protocol: options.protocol,
                serverHost: options.masterHost,
                serverPort: options.masterPort
            }
        );
    }

    public start() {
        this.client.start();
    }

    public stop() {
        this.client.stop();
    }
}
