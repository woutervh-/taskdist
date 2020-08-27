import * as http from 'http';
import * as https from 'https';
import { Server } from '../server/server';
import { TaskScheduler } from './scheduling/task-scheduler';
import { TaskMessageHandlerFactory } from './message-handler';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { WorkerMessage } from '../shared/messages/worker-to-master';

interface ServerOptions {
    port?: number;
    server?: http.Server | https.Server;
}

interface Options {
    serverOptions?: ServerOptions;
    taskTimeout?: number;
    listenTimeout?: number;
    socketTimeout?: number;
}

export class Master<Task, TaskResult> {
    private static defaultOptions: Options = {};
    private static defaultServerOptions: ServerOptions = { port: 4000 };
    private static defaultListenTimeout: number = 5000;
    private static defaultSocketTimeout: number = 30000;

    private server: Server<MasterMessage<Task>, WorkerMessage<TaskResult>>;

    public readonly taskScheduler: TaskScheduler<Task, TaskResult>;

    public constructor(options: Options = Master.defaultOptions) {
        this.taskScheduler = new TaskScheduler<Task, TaskResult>({ timeout: options.taskTimeout });
        this.server = new Server(
            new TaskMessageHandlerFactory(this.taskScheduler),
            {
                serverOptions: options.serverOptions || Master.defaultServerOptions,
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
