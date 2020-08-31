import * as http from 'http';
import * as ws from 'ws';
import { SocketHandler } from '../shared/socket-handler';
import { MessageHandlerFactory } from '../shared/messages/message-handler';

/**
 * Accepts connections from a server.
 * Handle the JSON messages between the client of a connection and the server application.
 */
export class ConnectionManager<ServerMessage, ClientMessage> {
    private uid: number = 0;
    private heartbeats: { [Key: string]: { timer: NodeJS.Timer, alive: boolean } } = {};
    private started: boolean = false;

    public constructor(private wss: ws.Server, private messageHandlerFactory: MessageHandlerFactory<ClientMessage, ServerMessage>, private socketTimeout: number) {
        //
    }

    public getClientCount() {
        return this.wss.clients.size;
    }

    public start() {
        if (this.started) {
            throw new Error('ConnectionManager already started.');
        }

        this.wss
            .once('close', this.handleClose)
            .on('connection', this.handleConnection);

        this.started = true;
    }

    public stop() {
        if (!this.started) {
            throw new Error('ConnectionManager already stopped.');
        }

        this.wss.removeListener('close', this.handleClose);
        this.wss.removeListener('connection', this.handleConnection);
        this.started = false;
    }

    private handleClose = () => {
        // Stop all heartbeat monitors.
        for (const key of Object.keys(this.heartbeats)) {
            if (this.heartbeats[key]) {
                global.clearInterval(this.heartbeats[key].timer);
                delete this.heartbeats[key];
            }
        }
        // Close all connections.
        for (const client of this.wss.clients) {
            client.close();
        }
    }

    private handleConnection = (socket: ws, request: http.IncomingMessage) => {
        // Set up heartbeat ping/pong.
        const key = request.connection.remoteAddress + ':' + request.connection.remotePort + ':' + (this.uid++);
        socket.on('pong', () => {
            this.heartbeats[key].alive = true;
        });
        this.heartbeats[key] = {
            timer: global.setInterval(() => {
                if (!this.heartbeats[key].alive) {
                    socket.terminate();
                } else {
                    this.heartbeats[key].alive = false;
                    socket.ping();
                }
            }, this.socketTimeout),
            alive: true
        };

        console.info(`Established client connection ${request.connection.remoteAddress}:${request.connection.remotePort}.`);

        const socketHandler = new SocketHandler(socket, this.messageHandlerFactory);
        socket
            .once('close', () => {
                console.info(`Client connection ${request.connection.remoteAddress}:${request.connection.remotePort} lost.`);

                // Cancel the heartbeat timer.
                if (this.heartbeats[key]) {
                    global.clearInterval(this.heartbeats[key].timer);
                    delete this.heartbeats[key];
                }

                socketHandler.stop();
            })
            .once('error', (error) => {
                console.warn('Client connection error.', error);
                socket.close();
            });

        socketHandler.start();
    }
}
