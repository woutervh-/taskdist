import * as ws from 'ws';
import * as http from 'http';
import * as https from 'https';
import * as KeepAlive from '../shared/keep-alive';
import { ConnectionManager } from './connection-manager';
import { MessageHandlerFactory } from '../shared/messages/message-handler';

interface Options {
    port?: number;
    server?: http.Server | https.Server;
    listenTimeout: number;
    socketTimeout: number;
}

function listen(port?: number, server?: http.Server | https.Server) {
    console.info('Opening WebSocket server...');
    return new Promise<ws.Server>((resolve, reject) => {
        const wss = new ws.Server({ port, server });
        wss
            .once('error', reject)
            .once('listening', () => {
                console.info('WebSocket server listening.');
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
                    const wss = await listen(this.options.port, this.options.server);
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
