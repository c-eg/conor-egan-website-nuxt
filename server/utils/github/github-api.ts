import { request } from "@octokit/request";

export async function getRepositories(githubApiToken: string, username: string) {
    const response = await request('GET /users/{username}/repos', {
        headers: {
            authorization: `token ${githubApiToken}`
        },
        username,
    });

    return response.data;
}

export async function getRepositoryLanguages(githubApiToken: string, username: string, repository: string) {
    const response = await request('GET /repos/{owner}/{repo}/languages', {
        headers: {
            authorization: `token ${githubApiToken}`
        },
        owner: username,
        repo: repository
    });

    return response.data;
}
