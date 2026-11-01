import { describe, expect, it } from "vitest";
import { useRepositorySort } from "~/composables/repositories/use-repository-sort";
import type { RepositorySortOption } from "~/utils/repositories/repository-sort-options";
import { createRepository, namesOf } from "./fixtures/repository";

const alpha = createRepository({ name: "alpha", stars: 5 });
const bravo = createRepository({ name: "bravo", stars: 20 });
const charlie = createRepository({ name: "charlie", stars: 1 });

describe("useRepositorySort", () => {
    it("sorts by stars descending by default", () => {
        const { sortedRepositories, selectedSortOption } = useRepositorySort(ref([alpha, bravo, charlie]));

        expect(selectedSortOption.value).toBe("Stars Descending");
        expect(namesOf(sortedRepositories.value)).toEqual(["bravo", "alpha", "charlie"]);
    });

    it.each<{ sortOption: RepositorySortOption, expectedNames: string[] }>([
        { sortOption: "Name Ascending", expectedNames: ["alpha", "bravo", "charlie"] },
        { sortOption: "Name Descending", expectedNames: ["charlie", "bravo", "alpha"] },
        { sortOption: "Stars Ascending", expectedNames: ["charlie", "alpha", "bravo"] },
        { sortOption: "Stars Descending", expectedNames: ["bravo", "alpha", "charlie"] }
    ])("sorts by $sortOption", ({ sortOption, expectedNames }) => {
        const { sortedRepositories, selectedSortOption } = useRepositorySort(ref([bravo, charlie, alpha]));

        selectedSortOption.value = sortOption;

        expect(namesOf(sortedRepositories.value)).toEqual(expectedNames);
    });

    it("leaves the source repositories in their original order", () => {
        const repositories = ref([charlie, alpha, bravo]);
        const { sortedRepositories, selectedSortOption } = useRepositorySort(repositories);

        selectedSortOption.value = "Name Ascending";

        expect(namesOf(sortedRepositories.value)).toEqual(["alpha", "bravo", "charlie"]);
        expect(namesOf(repositories.value)).toEqual(["charlie", "alpha", "bravo"]);
    });

    it("re-sorts when the source repositories change", () => {
        const repositories = ref([alpha]);
        const { sortedRepositories } = useRepositorySort(repositories);

        repositories.value = [alpha, bravo];

        expect(namesOf(sortedRepositories.value)).toEqual(["bravo", "alpha"]);
    });
});
