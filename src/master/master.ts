import { Server } from '../server/server';
import { TaskScheduler } from './scheduling/task-scheduler';
import { TaskMessageHandlerFactory } from './message-handler';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { WorkerMessage } from '../shared/messages/worker-to-master';

interface Options {
    taskTimeout: number;
    port: number;
    listenTimeout: number;
    socketTimeout: number;
}

export class Master<Task, TaskResult> {
    private server: Server<MasterMessage<Task>, WorkerMessage<TaskResult>>;
    public readonly taskScheduler: TaskScheduler<Task, TaskResult>;

    public constructor(options: Options) {
        this.taskScheduler = new TaskScheduler<Task, TaskResult>({ timeout: options.taskTimeout });
        this.server = new Server(
            new TaskMessageHandlerFactory(this.taskScheduler),
            {
                port: options.port,
                listenTimeout: options.listenTimeout,
                socketTimeout: options.socketTimeout
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
