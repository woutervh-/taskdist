import { Client } from '../client/client';
import { TaskMessageHandlerFactory } from './message-handler';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { WorkerMessage } from '../shared/messages/worker-to-master';
import { TaskHandler } from './task-handler';

interface Options {
    connectTimeout?: number;
    protocol?: 'ws:' | 'wss:';
    masterHost?: string;
    masterPort?: number;
}

export class Worker<Task, TaskResult> {
    private static defaultOptions: Options = {};
    private static defaultConnectTimeout: number = 5000;
    private static defaultProtocol: 'ws:' | 'wss:' = 'ws:';
    private static defaultMasterHost: string = 'localhost';
    private static defaultMasterPort: number = 4000;

    private client: Client<MasterMessage<Task>, WorkerMessage<TaskResult>>;

    public constructor(taskHandler: TaskHandler<Task, TaskResult>, options: Options = Worker.defaultOptions) {
        this.client = new Client(
            new TaskMessageHandlerFactory(taskHandler),
            {
                connectTimeout: options.connectTimeout || Worker.defaultConnectTimeout,
                protocol: options.protocol || Worker.defaultProtocol,
                serverHost: options.masterHost || Worker.defaultMasterHost,
                serverPort: options.masterPort || Worker.defaultMasterPort
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
