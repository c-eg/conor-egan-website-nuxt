import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRepositories, getRepositoryLanguages } from "../../server/utils/github/github-api";

const githubApiToken = "test-token";
const username = "example-user";

const fetchMock = vi.fn<typeof fetch>();

function respondWith(status: number, body: unknown) {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" }
    }));
}

function sentRequest() {
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    return {
        url: String(url),
        method: init?.method,
        headers: new Headers(init?.headers)
    };
}

describe("GitHub API", () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("getRepositories", () => {
        it("requests the user's repositories with the API token", async () => {
            respondWith(200, []);

            await getRepositories(githubApiToken, username);

            const request = sentRequest();
            expect(request.method).toBe("GET");
            expect(request.url).toBe("https://api.github.com/users/example-user/repos");
            expect(request.headers.get("authorization")).toBe("token test-token");
        });

        it("returns the repositories from the response", async () => {
            const repositories = [{ name: "website" }, { name: "library" }];
            respondWith(200, repositories);

            await expect(getRepositories(githubApiToken, username)).resolves.toEqual(repositories);
        });

        it("rejects when GitHub responds with an error", async () => {
            respondWith(401, { message: "Bad credentials" });

            await expect(getRepositories(githubApiToken, username)).rejects.toMatchObject({ status: 401 });
        });
    });

    describe("getRepositoryLanguages", () => {
        it("requests the repository's languages with the API token", async () => {
            respondWith(200, {});

            await getRepositoryLanguages(githubApiToken, username, "website");

            const request = sentRequest();
            expect(request.method).toBe("GET");
            expect(request.url).toBe("https://api.github.com/repos/example-user/website/languages");
            expect(request.headers.get("authorization")).toBe("token test-token");
        });

        it("returns the languages from the response", async () => {
            respondWith(200, { Vue: 5000, TypeScript: 3000 });

            await expect(getRepositoryLanguages(githubApiToken, username, "website"))
                .resolves.toEqual({ Vue: 5000, TypeScript: 3000 });
        });

        it("rejects when GitHub responds with an error", async () => {
            respondWith(404, { message: "Not Found" });

            await expect(getRepositoryLanguages(githubApiToken, username, "missing"))
                .rejects.toMatchObject({ status: 404 });
        });
    });
});
