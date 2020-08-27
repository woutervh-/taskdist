import { Sender, Receiver, MessageHandlerFactory } from '../shared/messages/message-handler';
import { WorkerMessage } from '../shared/messages/worker-to-master';
import { MasterMessage } from '../shared/messages/master-to-worker';
import { TaskHandler } from './task-handler';

export class TaskMessageHandlerFactory<Task, TaskResult, Data> implements MessageHandlerFactory<MasterMessage<Task, Data>, WorkerMessage<TaskResult>> {
    public constructor(private taskHandler: TaskHandler<Task, TaskResult, Data>) {
        //
    }

    public create(sender: Sender<WorkerMessage<TaskResult>>) {
        return new TaskMessageHandler(this.taskHandler, sender);
    }
}

class TaskMessageHandler<Task, TaskResult, Data> implements Receiver<MasterMessage<Task, Data>> {
    public constructor(private taskHandler: TaskHandler<Task, TaskResult, Data>, private sender: Sender<WorkerMessage<TaskResult>>) {
        sender.send({ type: 'pop' });
    }

    public stop() {
        this.taskHandler.stop();
    }

    public async receive(message: MasterMessage<Task, Data>) {
        try {
            switch (message.type) {
                case 'task': {
                    const taskResult = await this.taskHandler.doTask(message.task, message.data);
                    this.sender.send({ type: 'complete', key: message.key, taskResult });
                    break;
                }
            }
        } catch (error) {
            console.debug(`Message: ${JSON.stringify(message)}.`);
            console.warn('Error while handling message.', error);
        } finally {
            // If handling of previous task failed, pop next one from the master.
            this.sender.send({ type: 'pop' });
        }
    }
}
