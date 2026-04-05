export function useFetchState() {
    const hasError = ref<boolean>(false);

    async function withFetch(fn: () => Promise<void>) {
        try {
            await fn();
        } catch (err: unknown) {
            hasError.value = true;
            console.error(err);
        }
    }

    function createInitialisationPromise(fn: () => Promise<void>): () => Promise<void> {
        const promise = withFetch(fn);
        return () => promise;
    }

    return { hasError, createInitialisationPromise }
}
