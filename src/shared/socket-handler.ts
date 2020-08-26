import * as ws from 'ws';
import { MessageHandlerFactory, Sender, Receiver } from './messages/message-handler';

export class SocketHandler<IncomingMessage, OutgoingMessage> {
    private started: boolean = false;
    
    public readonly receiver: Receiver<IncomingMessage>;
    public readonly sender: Sender<OutgoingMessage>;

    public constructor(private socket: ws, messageHandlerFactory: MessageHandlerFactory<IncomingMessage, OutgoingMessage>) {
        this.sender = {
            send(message: OutgoingMessage) {
                socket.send(JSON.stringify(message));
            }
        };
        this.receiver = messageHandlerFactory.create(this.sender);
    }

    public start() {
        if (this.started) {
            throw new Error('SocketHandler already started.');
        }

        this.socket.on('message', this.handleMessage);
        this.started = true;
    }

    public stop() {
        if (!this.started) {
            throw new Error('SocketHandler already stopped.');
        }

        this.socket.off('message', this.handleMessage);
        this.started = false;
    }

    private handleMessage = (data: ws.Data) => {
        try {
            const message = JSON.parse(data.toString()) as IncomingMessage;
            this.receiver.receive(message);
        } catch (error) {
            console.error('Message handling error, closing connection.', error);
            this.socket.close();
        }
    };
}
