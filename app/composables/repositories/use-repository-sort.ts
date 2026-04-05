import type { Repository } from "~/shared/types/github";
import type { RepositorySortOption } from "~/utils/repositories/repository-sort-options";

export function useRepositorySort(repositories: Ref<Repository[]>) {
    const selectedSortOption = ref<RepositorySortOption>("Stars Descending");

    const sortedRepositories = computed(() => {
        return [...repositories.value].sort((a, b) => {
            switch (selectedSortOption.value) {
                case "Name Ascending":
                    return a.name.localeCompare(b.name);
                case "Name Descending":
                    return b.name.localeCompare(a.name);
                case "Stars Ascending":
                    return a.stars - b.stars;
                case "Stars Descending":
                    return b.stars - a.stars;
            }
        });
    });

    return {
        sortedRepositories, selectedSortOption
    }
}
