import * as ws from 'ws';
import * as KeepAlive from '../shared/keep-alive';
import { ConnectionManager } from './connection-manager';
import { MessageHandlerFactory } from '../shared/messages/message-handler';

interface Options {
    port: number;
    listenTimeout: number;
    socketTimeout: number;
}

function listen(port: number) {
    console.info('Opening server...');
    return new Promise<ws.Server>((resolve, reject) => {
        const server = new ws.Server({ port });
        server
            .once('error', reject)
            .once('listening', () => {
                console.info(`Server listening on port ${port}.`);
                resolve(server);
            });
    })
}

export class Server<ServerMessage, ClientMessage> {
    private loop: KeepAlive.Closable | null = null;

    public constructor(private messageHandlerFactory: MessageHandlerFactory<ClientMessage, ServerMessage>, private options: Options) {
        //
    }

    public start() {
        if (this.loop) {
            return;
        }

        this.loop = KeepAlive.loop(
            {
                create: async (revive) => {
                    const server = await listen(this.options.port);
                    const connectionManager = new ConnectionManager(server, this.messageHandlerFactory, this.options.socketTimeout);

                    server
                        .once('error', (error) => {
                            console.warn('Server error.', error);
                            server.close();
                        })
                        .once('close', () => {
                            connectionManager.stop();
                            console.error('Server closed.');
                            revive();
                        });

                    connectionManager.start();

                    return server;
                }
            },
            this.options.listenTimeout
        );
    }

    public stop() {
        if (this.loop) {
            this.loop.close();
            this.loop = null;
        }
    }
}
