export function useRepositories() {
    const runtimeConfig = useRuntimeConfig();

    return useLazyFetch(`/api/github/repositories/${runtimeConfig.public.githubUser}`, {
        key: "github-repositories",
        default: () => []
    });
}
