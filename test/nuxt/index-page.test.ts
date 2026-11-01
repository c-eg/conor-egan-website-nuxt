import { describe, expect, it } from "vitest";
import { renderSuspended } from "@nuxt/test-utils/runtime";
import { screen, waitFor } from "@testing-library/vue";
import IndexPage from "~/pages/index.vue";

describe("index page", () => {
    it("introduces Conor Egan", async () => {
        await renderSuspended(IndexPage);

        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("I'm Conor Egan");
    });

    it("links to the LinkedIn and GitHub profiles", async () => {
        await renderSuspended(IndexPage);

        expect(screen.getByRole("link", { name: "LinkedIn icon" }).getAttribute("href"))
            .toBe("https://www.linkedin.com/in/c-eg/");
        expect(screen.getByRole("link", { name: "GitHub icon" }).getAttribute("href"))
            .toBe("https://github.com/c-eg");
    });

    it("sets the page title", async () => {
        await renderSuspended(IndexPage);

        await waitFor(() => expect(document.title).toBe("Home | Conor Egan"));
    });
});
