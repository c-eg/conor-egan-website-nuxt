import type { Repository } from "~/shared/types/github";

export function createRepository(overrides: Partial<Repository> & Pick<Repository, "name">): Repository {
    return {
        url: `https://github.com/example-user/${overrides.name}`,
        description: null,
        stars: 0,
        languages: [],
        ...overrides
    };
}

export function namesOf(repositories: Repository[]): string[] {
    return repositories.map((repository) => repository.name);
}
