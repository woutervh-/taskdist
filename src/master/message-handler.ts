import { Sender, Receiver, MessageHandlerFactory } from '../shared/messages/message-handler';
import { WorkerMessage } from '../shared/messages/worker-to-master';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { TaskScheduler } from './scheduling/task-scheduler';

export class TaskMessageHandlerFactory<Task, TaskResult> implements MessageHandlerFactory<WorkerMessage<TaskResult>, MasterMessage<Task>> {
    public constructor(private taskScheduler: TaskScheduler<Task, TaskResult>) {
        //
    }

    public create(sender: Sender<MasterMessage<Task>>) {
        return new TaskMessageHandler(this.taskScheduler, sender);
    }
}

class TaskMessageHandler<Task, TaskResult> implements Receiver<WorkerMessage<TaskResult>> {
    private taskKeys: Set<string> = new Set();
    private closed: boolean = false;

    public constructor(private taskScheduler: TaskScheduler<Task, TaskResult>, private sender: Sender<MasterMessage<Task>>) {
        //
    }

    public close() {
        this.closed = true;
        for (const taskKey of this.taskKeys) {
            this.taskScheduler.cancel(taskKey);
        }
    }

    public async receive(message: WorkerMessage<TaskResult>) {
        try {
            switch (message.type) {
                case 'pop': {
                    const taskDescription = await this.taskScheduler.take();
                    this.taskKeys.add(taskDescription.key);
                    if (this.closed) {
                        this.taskScheduler.cancel(taskDescription.key);
                    } else {
                        this.sender.send({ type: 'task', key: taskDescription.key, task: taskDescription.task });
                    }
                    break;
                }
                case 'complete': {
                    this.taskKeys.delete(message.key);
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
