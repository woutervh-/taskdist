import { Sender, Receiver, MessageHandlerFactory } from '../shared/messages/message-handler';
import { WorkerMessage } from '../shared/messages/worker-to-master';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { TaskHandler } from './task-handler';

export class TaskMessageHandlerFactory<Task, TaskResult> implements MessageHandlerFactory<MasterMessage<Task>, WorkerMessage<TaskResult>> {
    public constructor(private taskHandler: TaskHandler<Task, TaskResult>) {
        //
    }

    public create(sender: Sender<WorkerMessage<TaskResult>>) {
        return new TaskMessageHandler(this.taskHandler, sender);
    }
}

class TaskMessageHandler<Task, TaskResult> implements Receiver<MasterMessage<Task>> {
    private closed = false;

    public constructor(private taskHandler: TaskHandler<Task, TaskResult>, private sender: Sender<WorkerMessage<TaskResult>>) {
        sender.send({ type: 'pop' });
    }

    public close() {
        this.closed = true;
        // Connection will be closed.
        // TODO: work on task should be aborted.
    }

    public async receive(message: MasterMessage<Task>) {
        try {
            switch (message.type) {
                case 'task': {
                    const taskResult = await this.taskHandler.doTask(message.task);
                    this.sender.send({ type: 'complete', key: message.key, taskResult });
                    break;
                }
            }
        } catch (error) {
            if (!this.closed) {
                console.debug(`Message: ${JSON.stringify(message)}.`);
                console.warn('Error while handling message.', error);
            }
        }
        if (!closed) {
            // If handling of previous task failed, pop next one from the master.
            this.sender.send({ type: 'pop' });
        }
    }
}
