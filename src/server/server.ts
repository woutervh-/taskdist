import * as ws from 'ws';
import * as KeepAlive from '../shared/keep-alive';
import { ConnectionManager } from './connection-manager';
import { MessageHandlerFactory } from '../shared/messages/message-handler';

interface Options {
    server: ws.ServerOptions['server'];
    port: number;
    listenTimeout: number;
    socketTimeout: number;
}

function listen(server: ws.ServerOptions['server'], port: number) {
    console.info('Opening server...');
    return new Promise<ws.Server>((resolve, reject) => {
        const wss = new ws.Server({ server, port });
        wss
            .once('error', reject)
            .once('listening', () => {
                console.info(`Server listening on port ${port}.`);
                resolve(wss);
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
                    const wss = await listen(this.options.server, this.options.port);
                    const connectionManager = new ConnectionManager(wss, this.messageHandlerFactory, this.options.socketTimeout);

                    wss
                        .once('error', (error) => {
                            console.warn('Server error.', error);
                            wss.close();
                        })
                        .once('close', () => {
                            connectionManager.stop();
                            console.error('Server closed.');
                            revive();
                        });

                    connectionManager.start();

                    return wss;
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
