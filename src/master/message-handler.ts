import { Sender, Receiver, MessageHandlerFactory } from '../shared/messages/message-handler';
import { WorkerMessage } from '../shared/messages/worker-to-master';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { TaskScheduler, TaskDescription } from './scheduling/task-scheduler';

export class TaskMessageHandlerFactory<Task, TaskResult> implements MessageHandlerFactory<WorkerMessage<TaskResult>, MasterMessage<Task>> {
    public constructor(private taskScheduler: TaskScheduler<Task, TaskResult>) {
        //
    }

    public create(sender: Sender<MasterMessage<Task>>) {
        return new TaskMessageHandler(this.taskScheduler, sender);
    }
}

class TaskMessageHandler<Task, TaskResult> implements Receiver<WorkerMessage<TaskResult>> {
    private taskDescription: TaskDescription<Task> | null = null;
    private closed: boolean = false;

    public constructor(private taskScheduler: TaskScheduler<Task, TaskResult>, private sender: Sender<MasterMessage<Task>>) {
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
                    if (this.closed) {
                        this.taskScheduler.cancel(this.taskDescription.key);
                    } else {
                        this.sender.send({ type: 'task', taskKey: this.taskDescription.key, task: this.taskDescription.task });
                    }
                    break;
                }
                case 'complete': {
                    this.taskDescription = null;
                    this.taskScheduler.complete(message.taskKey, message.taskResult);
                    break;
                }
            }
        } catch (error) {
            console.debug(`Message: ${JSON.stringify(message)}.`);
            console.warn(`Error while handling message.`, error);
        }
    }
}
