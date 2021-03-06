import * as http from 'http';
import * as https from 'https';
import { Server } from '../server/server';
import { TaskScheduler } from './scheduling/task-scheduler';
import { TaskMessageHandlerFactory } from './message-handler';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { WorkerMessage } from '../shared/messages/worker-to-master';

interface Options {
    port?: number;
    server?: http.Server | https.Server;
    listenTimeout?: number;
    socketTimeout?: number;
}

export class Master<Task, TaskResult> {
    private static defaultOptions: Options = {};
    private static defaultListenTimeout: number = 5000;
    private static defaultSocketTimeout: number = 30000;

    private server: Server<MasterMessage<Task>, WorkerMessage<TaskResult>>;

    public constructor(private taskScheduler: TaskScheduler<Task, TaskResult>, options: Options = Master.defaultOptions) {
        this.server = new Server(
            new TaskMessageHandlerFactory(this.taskScheduler),
            {
                port: options.port,
                server: options.server,
                listenTimeout: options.listenTimeout || Master.defaultListenTimeout,
                socketTimeout: options.socketTimeout || Master.defaultSocketTimeout
            }
        );
    }

    public start() {
        this.server.start();
    }

    public stop() {
        this.server.stop();
    }
}
