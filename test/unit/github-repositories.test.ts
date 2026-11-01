import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRepositories, getRepositoryLanguages } from "../../server/utils/github/github-api";
import { getActiveRepositories } from "../../server/utils/github/github-repositories";

vi.mock("../../server/utils/github/github-api", () => ({
    getRepositories: vi.fn(),
    getRepositoryLanguages: vi.fn()
}));

type OctokitRepository = Awaited<ReturnType<typeof getRepositories>>[number];

const githubApiToken = "test-token";
const username = "example-user";

function createOctokitRepository(overrides: Partial<OctokitRepository>): OctokitRepository {
    return {
        name: "repository",
        html_url: "https://github.com/example-user/repository",
        description: null,
        stargazers_count: 0,
        archived: false,
        ...overrides
    } as OctokitRepository;
}

describe("getActiveRepositories", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getRepositoryLanguages).mockResolvedValue({});
    });

    it("converts GitHub repositories into portfolio repositories", async () => {
        vi.mocked(getRepositories).mockResolvedValue([
            createOctokitRepository({
                name: "website",
                html_url: "https://github.com/example-user/website",
                description: "My personal website",
                stargazers_count: 7
            })
        ]);
        vi.mocked(getRepositoryLanguages).mockResolvedValue({ Vue: 5000, TypeScript: 3000 });

        const repositories = await getActiveRepositories(githubApiToken, username);

        expect(repositories).toEqual([{
            url: "https://github.com/example-user/website",
            name: "website",
            description: "My personal website",
            stars: 7,
            languages: ["Vue", "TypeScript"]
        }]);
    });

    it("requests repositories and languages with the given token and username", async () => {
        vi.mocked(getRepositories).mockResolvedValue([createOctokitRepository({ name: "website" })]);

        await getActiveRepositories(githubApiToken, username);

        expect(getRepositories).toHaveBeenCalledWith(githubApiToken, username);
        expect(getRepositoryLanguages).toHaveBeenCalledWith(githubApiToken, username, "website");
    });

    it("leaves out archived repositories", async () => {
        vi.mocked(getRepositories).mockResolvedValue([
            createOctokitRepository({ name: "active" }),
            createOctokitRepository({ name: "archived", archived: true })
        ]);

        const repositories = await getActiveRepositories(githubApiToken, username);

        expect(repositories.map((repository) => repository.name)).toEqual(["active"]);
        expect(getRepositoryLanguages).not.toHaveBeenCalledWith(githubApiToken, username, "archived");
    });

    it("treats a missing star count as zero stars", async () => {
        vi.mocked(getRepositories).mockResolvedValue([
            createOctokitRepository({ stargazers_count: undefined })
        ]);

        const [repository] = await getActiveRepositories(githubApiToken, username);

        expect(repository?.stars).toBe(0);
    });

    it("fails when a language request fails", async () => {
        const gitHubError = new Error("GitHub is unavailable");
        vi.mocked(getRepositories).mockResolvedValue([createOctokitRepository({})]);
        vi.mocked(getRepositoryLanguages).mockRejectedValue(gitHubError);

        await expect(getActiveRepositories(githubApiToken, username)).rejects.toBe(gitHubError);
    });
});
