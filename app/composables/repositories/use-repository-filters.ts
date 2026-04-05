import type { Repository } from "~/shared/types/github";

export function useRepositoryFilters(repositories: Ref<Repository[]>) {
    const selectedFilterOption = ref<string>("All");

    const repositoryFilterOptions = computed(() => {
        const languages = [...new Set(repositories.value.flatMap(repo => repo.languages))]
            .sort((a, b) => a.localeCompare(b));
        languages.unshift("All");
        return languages
    });

    const filteredRepositories = computed(() => {
        return repositories.value
            .filter(repo => selectedFilterOption.value === "All" || repo.languages.includes(selectedFilterOption.value));
    });

    return {
        filteredRepositories, repositoryFilterOptions, selectedFilterOption
    }
}
