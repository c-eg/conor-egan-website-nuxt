import { describe, expect, it } from "vitest";
import type { Repository } from "~/shared/types/github";
import { useRepositoryFilters } from "~/composables/repositories/use-repository-filters";
import { createRepository, namesOf } from "./fixtures/repository";

const website = createRepository({ name: "website", languages: ["Vue", "TypeScript"] });
const library = createRepository({ name: "library", languages: ["Java"] });
const scripts = createRepository({ name: "scripts", languages: ["TypeScript", "Shell"] });
const notes = createRepository({ name: "notes", languages: [] });

describe("useRepositoryFilters", () => {
    it("offers All followed by each language once in alphabetical order", () => {
        const { repositoryFilterOptions } = useRepositoryFilters(ref([website, library, scripts, notes]));

        expect(repositoryFilterOptions.value).toEqual(["All", "Java", "Shell", "TypeScript", "Vue"]);
    });

    it("shows every repository when All is selected", () => {
        const { filteredRepositories, selectedFilterOption } = useRepositoryFilters(ref([website, library, scripts, notes]));

        expect(selectedFilterOption.value).toBe("All");
        expect(namesOf(filteredRepositories.value)).toEqual(["website", "library", "scripts", "notes"]);
    });

    it("shows only repositories that use the selected language", () => {
        const { filteredRepositories, selectedFilterOption } = useRepositoryFilters(ref([website, library, scripts, notes]));

        selectedFilterOption.value = "TypeScript";

        expect(namesOf(filteredRepositories.value)).toEqual(["website", "scripts"]);
    });

    it("adds language options once the repositories load", () => {
        const repositories = ref<Repository[]>([]);
        const { repositoryFilterOptions } = useRepositoryFilters(repositories);

        expect(repositoryFilterOptions.value).toEqual(["All"]);

        repositories.value = [library];

        expect(repositoryFilterOptions.value).toEqual(["All", "Java"]);
    });
});
