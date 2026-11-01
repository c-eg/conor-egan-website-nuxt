import { http, HttpResponse } from "msw/http";
import { mockRepositories, type MockLanguages, type MockRepository } from "./github-fixtures";

const githubApiUrl = "https://api.github.com";

export const githubHandlers = [
    http.get<{ username: string }, never, MockRepository[]>(`${githubApiUrl}/users/:username/repos`, ({ params }) => {
        return HttpResponse.json(mockRepositories.map(({ languages, ...repository }) => ({
            ...repository,
            html_url: `https://github.com/${params.username}/${repository.name}`
        })));
    }),

    http.get<{ owner: string, repo: string }, never, MockLanguages>(`${githubApiUrl}/repos/:owner/:repo/languages`, ({ params }) => {
        const repository = mockRepositories.find(({ name }) => name === params.repo);
        return repository ? HttpResponse.json(repository.languages) : new HttpResponse(null, { status: 404 });
    })
];
