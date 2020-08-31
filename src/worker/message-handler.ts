import { AbortController } from 'abort-controller';
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
    private abortControllers: Set<AbortController> = new Set();

    public constructor(private taskHandler: TaskHandler<Task, TaskResult>, private sender: Sender<WorkerMessage<TaskResult>>) {
        sender.send({ type: 'pop' });
    }

    public close() {
        for (const abortController of this.abortControllers) {
            abortController.abort();
        }
    }

    public async receive(message: MasterMessage<Task>) {
        const abortController = new AbortController();
        this.abortControllers.add(abortController);
        try {
            switch (message.type) {
                case 'task': {
                    const taskResult = await this.taskHandler.doTask(message.task, abortController.signal);
                    this.sender.send({ type: 'complete', key: message.key, taskResult });
                    break;
                }
            }
        } catch (error) {
            console.debug(`Message: ${JSON.stringify(message)}.`);
            console.warn('Error while handling message.', error);
        } finally {
            this.abortControllers.delete(abortController);
            // If handling of previous task failed, pop next one from the master.
            this.sender.send({ type: 'pop' });
        }
    }
}
