import { defineStore } from "#imports";
import type { Repository } from "~/shared/types/github";
import { useFetchState } from "~/composables/core/use-fetch-state";

export const useGithubStore = defineStore("githubStore", () => {
    const repositories = ref<Repository[]>([]);
    const { hasError, createInitialisationPromise } = useFetchState();

    async function fetchRepositories() {
        const runtimeConfig = useRuntimeConfig();
        repositories.value = await $fetch<Repository[]>(
            `/api/github/repositories/${runtimeConfig.public.githubUser}`, {
                method: 'GET',
            }
        );
    }

    const isInitialised = createInitialisationPromise(fetchRepositories);

    return { repositories, hasError, isInitialised }
});
