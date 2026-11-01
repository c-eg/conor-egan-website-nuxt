import { describe, expect, it } from "vitest";
import { registerEndpoint, renderSuspended } from "@nuxt/test-utils/runtime";
import { fireEvent, screen, waitFor } from "@testing-library/vue";
import type { Repository } from "~/shared/types/github";
import ProjectsPage from "~/pages/projects.vue";
import { createRepository } from "./fixtures/repository";

const website = createRepository({ name: "website", stars: 7, languages: ["Vue", "TypeScript"] });
const library = createRepository({ name: "library", stars: 20, languages: ["Java"] });
const scripts = createRepository({ name: "scripts", stars: 3, languages: ["TypeScript", "Shell"] });

function respondWithRepositories(handler: () => Repository[] | Promise<Repository[]>) {
    const url = `/api/github/repositories/${useRuntimeConfig().public.githubUser}`;
    registerEndpoint(url, { handler, once: true });
}

async function renderLoadedProjectsPage() {
    await renderSuspended(ProjectsPage);
    await screen.findByRole("heading", { level: 1 });
}

function projectNames(): string[] {
    return screen.getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent?.trim() ?? "");
}

describe("projects page", () => {
    it("shows a loading message while the projects load", async () => {
        respondWithRepositories(() => new Promise(() => {}));

        await renderSuspended(ProjectsPage);

        expect(screen.getByText("Loading projects...")).toBeTruthy();
    });

    it("shows an error message when the projects fail to load", async () => {
        respondWithRepositories(() => {
            throw createError({ statusCode: 502 });
        });

        await renderSuspended(ProjectsPage);

        expect(await screen.findByText("There was an error loading the projects.")).toBeTruthy();
    });

    it("shows a message when there are no projects", async () => {
        respondWithRepositories(() => []);

        await renderSuspended(ProjectsPage);

        expect(await screen.findByText("There are no projects at the moment.")).toBeTruthy();
    });

    it("lists the projects with the most stars first", async () => {
        respondWithRepositories(() => [website, library, scripts]);

        await renderLoadedProjectsPage();

        expect(projectNames()).toEqual(["library", "website", "scripts"]);
    });

    it("shows only the projects that use the chosen language", async () => {
        respondWithRepositories(() => [website, library, scripts]);
        await renderLoadedProjectsPage();

        await fireEvent.update(screen.getByRole("combobox", { name: /filter/i }), "TypeScript");

        expect(projectNames()).toEqual(["website", "scripts"]);
    });

    it("reorders the projects by the chosen sort option", async () => {
        respondWithRepositories(() => [website, library, scripts]);
        await renderLoadedProjectsPage();

        await fireEvent.update(screen.getByRole("combobox", { name: /sort/i }), "Name Ascending");

        expect(projectNames()).toEqual(["library", "scripts", "website"]);
    });

    it("sets the page title", async () => {
        respondWithRepositories(() => []);

        await renderSuspended(ProjectsPage);

        await waitFor(() => expect(document.title).toBe("Projects | Conor Egan"));
    });
});
