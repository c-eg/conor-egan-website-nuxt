import { useRuntimeConfig } from "#imports";
import { z } from "zod";
import { getActiveRepositories } from "#server/utils/github/github-repositories";

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

    return getActiveRepositories(runtimeConfig.githubApiToken, username)
        .catch(handleGitHubError);
}, {
    maxAge: 300
});

function handleGitHubError(err: unknown): never {
    throw createError({ statusCode: 502, statusMessage: "GitHub API error", cause: err });
}
