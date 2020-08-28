A framework for setting up a master and worker nodes for distributed tasks.

Synopsis:

```typescript
import * as Taskdist from 'taskdist';

// Describes the task that the worker can complete.
interface Task {
    // Calculate the n-th Fibonacci number.
    type: 'fibonacci';
    n: number;
}

// The result of the task.
type TaskResult = number;

// Implementation of the work to be done for a task.
class TaskHandler implements Taskdist.TaskHandler<Task, TaskResult> {
    public stop() {
        // Connection closed.
        // Close resources if necessary.
    }

    public async doTask(task: Task) {
        let [a, b] = [0, 1];
        for (let i = 0; i < task.n - 1; i++) {
            [a, b] = [b, a + b];
        }
        return b;
    }
}

(async () => {
    // Set up master node.
    const taskScheduler = new Taskdist.FifoScheduler<Task, TaskResult>();
    const master = new Taskdist.Master(taskScheduler, { listenTimeout: 5000, port: 9000, socketTimeout: 5000, taskTimeout: 30000 });

    // Set up worker node.
    // Can be in the same process (as in this example).
    // Can also be a different process on the same machine, or on another machine altogether.
    const taskHandler = new TaskHandler();
    const worker = new Taskdist.Worker(taskHandler, { connectTimeout: 5000, masterHost: 'localhost', masterPort: 9000, protocol: 'ws' });

    // Start the master and worker.
    master.start();
    worker.start();

    // Put a task onto the queue, and await the result.
    const result = await taskScheduler.put({ type: 'fibonacci', n: 10 });
    // Log the result.
    console.log(`The 10th Fibonacci number is: ${result}.`);

    // When finished, stop the master and worker.
    master.stop();
    worker.stop();
})();
```

### Master

When creating a master:

* A WebSocket server will be created to listen on the configured port.
* A FIFO queue is created onto which tasks can be pushed.
* Workers can connect to the master and pop tasks from the queue.
* If workers do not complete the task within the timeout, the master will put the task back onto the queue, ensuring "at least once" execution.
* If the WebSocket server yields an error, the server is re-created indefinitely until the master is stopped.

### Worker

When creating a worker:

* A WebSocket connection is made to the master.
* The worker will continuously pop tasks from the master and work on those tasks.
* If the connection is lost, the worker will attempt to re-connect.
* Stopping the worker will abort work on the current task and disconnect the WebSocket.

### Roadmap

* Option for workers to reject tasks. Worker to send "reject" message to master, and master to put the task back onto the queue.
* Task filtering on worker side. Allow user to define which tasks can be worked on.
