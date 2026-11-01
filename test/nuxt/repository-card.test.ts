import { describe, expect, it } from "vitest";
import { renderSuspended } from "@nuxt/test-utils/runtime";
import { screen } from "@testing-library/vue";
import RepositoryCard from "~/components/repositories/repository-card.vue";
import { createRepository } from "./fixtures/repository";

describe("repository card", () => {
    it("links to the repository in a new tab", async () => {
        await renderSuspended(RepositoryCard, {
            props: { repository: createRepository({ name: "website" }) }
        });

        const link = screen.getByRole("link", { name: /website/ });
        expect(link.getAttribute("href")).toBe("https://github.com/example-user/website");
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("shows the description, star count and languages", async () => {
        await renderSuspended(RepositoryCard, {
            props: {
                repository: createRepository({
                    name: "website",
                    description: "My personal website",
                    stars: 7,
                    languages: ["Vue", "TypeScript"]
                })
            }
        });

        expect(screen.getByText("My personal website")).toBeTruthy();
        expect(screen.getByText("7")).toBeTruthy();
        expect(screen.getByText("Vue")).toBeTruthy();
        expect(screen.getByText("TypeScript")).toBeTruthy();
    });
});
