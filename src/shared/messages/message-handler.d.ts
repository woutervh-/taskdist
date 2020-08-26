export interface Sender<Outgoing> {
    send(message: Outgoing): void;
}

export interface Receiver<Incoming> {
    receive(message: Incoming): void;
    stop(): void;
}

export interface MessageHandlerFactory<Incoming, Outgoing> {
    create(sender: Sender<Outgoing>): Receiver<Incoming>;
}
