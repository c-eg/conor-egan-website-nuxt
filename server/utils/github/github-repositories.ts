import type { Repository } from "~/shared/types/github";
import { getRepositories, getRepositoryLanguages } from "./github-api";

export async function getActiveRepositories(githubApiToken: string, username: string): Promise<Repository[]> {
    const octokitRepositories = await getRepositories(githubApiToken, username);

    const activeRepositories = octokitRepositories.filter((repository) => !repository.archived);

    return Promise.all(
        activeRepositories.map(async (octokitRepository) => {
            const languages = await getRepositoryLanguages(githubApiToken, username, octokitRepository.name);

            return {
                url: octokitRepository.html_url,
                name: octokitRepository.name,
                description: octokitRepository.description,
                stars: octokitRepository.stargazers_count ?? 0,
                languages: Object.keys(languages)
            } satisfies Repository;
        })
    );
}
