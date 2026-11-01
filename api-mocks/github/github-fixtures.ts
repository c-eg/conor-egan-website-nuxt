import type { getRepositories, getRepositoryLanguages } from "#server/utils/github/github-api";

type GitHubRepository = Awaited<ReturnType<typeof getRepositories>>[number];

export type MockRepository = Pick<GitHubRepository, "name" | "html_url" | "description" | "stargazers_count" | "archived">;
export type MockLanguages = Awaited<ReturnType<typeof getRepositoryLanguages>>;

type MockRepositoryFixture = Omit<MockRepository, "html_url"> & {
    languages: MockLanguages;
};

export const mockRepositories: MockRepositoryFixture[] = [
    {
        name: "dotfiles",
        description: null,
        stargazers_count: 0,
        archived: false,
        languages: { Shell: 4210 }
    },
    {
        name: "empty-experiment",
        description: "A repository with no code in it yet",
        stargazers_count: 1,
        archived: false,
        languages: {}
    },
    {
        name: "legacy-blog",
        description: "An old blog that has been archived",
        stargazers_count: 5,
        archived: true,
        languages: { PHP: 18324 }
    },
    {
        name: "movie-database-client",
        description: "A Java client for a movie database API",
        stargazers_count: 304,
        archived: false,
        languages: { Java: 152340 }
    },
    {
        name: "portfolio-website",
        description: "A personal portfolio site built with Nuxt",
        stargazers_count: 12,
        archived: false,
        languages: { Vue: 15872, TypeScript: 9364, SCSS: 4102 }
    },
    {
        name: "task-runner",
        description: "A small command line tool for running project tasks",
        stargazers_count: 41,
        archived: false,
        languages: { TypeScript: 22105, JavaScript: 1203 }
    }
];
