export interface DataRetriever<Task, Data> {
    retrieve(task: Task): Promise<Data>;
}
