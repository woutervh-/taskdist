export interface Sender<Outgoing> {
    send(message: Outgoing): void;
}

export interface Receiver<Incoming> {
    close(): void;
    receive(message: Incoming): void;
}

export interface MessageHandlerFactory<Incoming, Outgoing> {
    create(sender: Sender<Outgoing>): Receiver<Incoming>;
}
