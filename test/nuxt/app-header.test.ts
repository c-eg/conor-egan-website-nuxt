import { describe, expect, it } from "vitest";
import { renderSuspended } from "@nuxt/test-utils/runtime";
import { fireEvent, screen, waitFor } from "@testing-library/vue";
import AppHeader from "~/components/core/app-header.vue";

function menuButton(): HTMLElement {
    return screen.getByRole("button", { name: "Toggle navigation menu" });
}

function isMenuOpen(): boolean {
    return menuButton().getAttribute("aria-expanded") === "true";
}

async function renderWithMenuOpen() {
    await renderSuspended(AppHeader);
    await fireEvent.click(menuButton());
}

describe("app header", () => {
    it("links to the home and projects pages", async () => {
        await renderSuspended(AppHeader);

        expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
        expect(screen.getByRole("link", { name: "Projects" }).getAttribute("href")).toBe("/projects");
    });

    it("starts with the menu closed", async () => {
        await renderSuspended(AppHeader);

        expect(isMenuOpen()).toBe(false);
    });

    it("opens and closes the menu from the menu button", async () => {
        await renderWithMenuOpen();

        expect(isMenuOpen()).toBe(true);

        await fireEvent.click(menuButton());

        expect(isMenuOpen()).toBe(false);
    });

    it("closes the menu when the link to the current page is clicked", async () => {
        await renderWithMenuOpen();

        await fireEvent.click(screen.getByRole("link", { name: "Home" }));

        expect(isMenuOpen()).toBe(false);
    });

    it("closes the menu when the page changes", async () => {
        await renderWithMenuOpen();

        await navigateTo("/projects");

        await waitFor(() => expect(isMenuOpen()).toBe(false));
    });
});
