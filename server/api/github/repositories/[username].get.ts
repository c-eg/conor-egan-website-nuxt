import type { Repository } from "~/shared/types/github";
import { useRuntimeConfig } from "#imports";
import { z } from "zod";
import { getRepositories, getRepositoryLanguages } from "#server/utils/github-api";

const contentSchema = z.object({
    username: z.string().min(1)
});

export default defineCachedEventHandler(async (event) => {
    const runtimeConfig = useRuntimeConfig(event);

    const params = await getValidatedRouterParams(event, contentSchema.safeParse);
    if (!params.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid username param",
            data: z.treeifyError(params.error)
        });
    }

    const { username } = params.data;

    const octokitRepositories = await getRepositories(runtimeConfig.githubApiToken, username)
        .catch(handleGitHubError);

    const activeRepositories = octokitRepositories.filter((repository) => !repository.archived);

    const repositories: Repository[] = await Promise.all(
        activeRepositories.map(async (octokitRepository) => {
            const languages = await getRepositoryLanguages(
                runtimeConfig.githubApiToken,
                username,
                octokitRepository.name
            ).catch(handleGitHubError);

            return {
                url: octokitRepository.html_url,
                name: octokitRepository.name,
                description: octokitRepository.description,
                stars: octokitRepository.stargazers_count ?? 0,
                languages: Object.keys(languages)
            } satisfies Repository;
        })
    );

    return repositories;
}, {
    maxAge: 300
});

function handleGitHubError(err: unknown): never {
    throw createError({ statusCode: 502, statusMessage: "GitHub API error", cause: err });
}
