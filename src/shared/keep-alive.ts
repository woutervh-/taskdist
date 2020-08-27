export interface Closable {
    close(): void;
}

interface ClosableFactory {
    /**
     * Create the closable resource.
     * @param revive Function which must be invoked when the resource closes. Will trigger the creation of another closable resource, unless the loop has been stopped.
     */
    create(revive: () => void): Promise<Closable>;
}

/**
 * Keeps alive a creatable resource that may close unexpectedly, by re-creating it after it closes.
 * The loop can be stopped, which will cause the closable to be closed, and the loop to end.
 * 
 * @param factory A factory which can create the closable.
 * @param delay Amount of delay between the termination of the closable and the re-creation.
 */
export function loop(factory: ClosableFactory, delay: number): Closable {
    let timeout: NodeJS.Timeout | undefined = undefined;
    let stopped = false;
    let currentClosable: Closable | undefined;

    (async function retry() {
        await new Promise(async (resolve) => {
            try {
                currentClosable = await factory.create(resolve);
                if (stopped) {
                    currentClosable.close();
                }
            } catch (error) {
                console.warn('Error in keep-alive loop.', error);
                resolve();
            }
        });

        if (currentClosable) {
            currentClosable.close();
        }

        if (!stopped) {
            await new Promise((resolve) => {
                timeout = global.setTimeout(resolve, delay);
            });
            retry();
        }
    })();

    return {
        close() {
            stopped = true;
            if (timeout) {
                global.clearTimeout(timeout);
            }
            if (currentClosable) {
                currentClosable.close();
            }
        }
    };
}
