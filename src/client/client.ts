
import * as ws from 'ws';
import * as KeepAlive from '../shared/keep-alive';
import { SocketHandler } from '../shared/socket-handler';
import { MessageHandlerFactory } from '../shared/messages/message-handler';

interface Options {
    connectTimeout: number;
    protocol: 'ws:' | 'wss:';
    serverHost: string;
    serverPort: number;
}

function connect(protocol: 'ws:' | 'wss:', host: string, port: number): Promise<ws> {
    console.info('Connecting...');
    return new Promise<ws>((resolve, reject) => {
        const socket = new ws(`${protocol}//${host}:${port}`);
        socket.once('error', reject);
        socket.once('open', () => {
            console.info(`Connected to server ${host}:${port}.`);
            resolve(socket);
        });
    });
}

export class Client<ServerMessage, ClientMessage> {
    private loop: KeepAlive.Closable | null = null;

    public constructor(private messageHandlerFactory: MessageHandlerFactory<ServerMessage, ClientMessage>, private options: Options) {
        //
    }

    public start() {
        if (this.loop) {
            return;
        }

        this.loop = KeepAlive.loop(
            {
                create: async (revive) => {
                    const socket = await connect(this.options.protocol, this.options.serverHost, this.options.serverPort);
                    const socketHandler = new SocketHandler(socket, this.messageHandlerFactory);

                    socket
                        .once('error', (error: unknown) => {
                            console.warn('Connection errored.', error);
                            socket.close();
                        })
                        .once('close', () => {
                            console.info('Connection closed.');
                            socketHandler.stop();
                            socketHandler.receiver.close();
                            revive();
                        });

                    socketHandler.start();

                    return socket;
                }
            },
            this.options.connectTimeout
        );
    }

    public stop() {
        if (this.loop) {
            this.loop.close();
            this.loop = null;
        }
    }
}
