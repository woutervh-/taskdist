import { Sender, Receiver, MessageHandlerFactory } from '../shared/messages/message-handler';
import { WorkerMessage } from '../shared/messages/worker-to-master';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { TaskScheduler, TaskDescription } from './scheduling/task-scheduler';
import { DataRetriever } from './data-retriever';

export class TaskMessageHandlerFactory<Task, TaskResult, Data> implements MessageHandlerFactory<WorkerMessage<TaskResult>, MasterMessage<Task, Data>> {
    public constructor(private taskScheduler: TaskScheduler<Task, TaskResult>, private dataRetriever: DataRetriever<Task, Data>) {
        //
    }

    public create(sender: Sender<MasterMessage<Task, Data>>) {
        return new TaskMessageHandler(this.taskScheduler, this.dataRetriever, sender);
    }
}

class TaskMessageHandler<Task, TaskResult, Data> implements Receiver<WorkerMessage<TaskResult>> {
    private taskDescription: TaskDescription<Task> | null = null;
    private closed: boolean = false;

    public constructor(private taskScheduler: TaskScheduler<Task, TaskResult>, private dataRetriever: DataRetriever<Task, Data>, private sender: Sender<MasterMessage<Task, Data>>) {
        //
    }

    public stop() {
        this.closed = true;
        if (this.taskDescription) {
            this.taskScheduler.cancel(this.taskDescription.key);
        }
    }

    public async receive(message: WorkerMessage<TaskResult>) {
        try {
            switch (message.type) {
                case 'pop': {
                    this.taskDescription = await this.taskScheduler.take();
                    const data = await this.dataRetriever.retrieve(this.taskDescription.task);
                    if (this.closed) {
                        this.taskScheduler.cancel(this.taskDescription.key);
                    } else {
                        this.sender.send({ type: 'task', key: this.taskDescription.key, task: this.taskDescription.task, data });
                    }
                    break;
                }
                case 'complete': {
                    this.taskDescription = null;
                    this.taskScheduler.complete(message.key, message.taskResult);
                    break;
                }
            }
        } catch (error) {
            console.debug(`Message: ${JSON.stringify(message)}.`);
            console.warn(`Error while handling message.`, error);
        }
    }
}
