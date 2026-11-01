---
name: verify-in-browser
description: Starts this Nuxt site locally and drives it in headless Chromium with Playwright, to click around, take screenshots, and catch console errors, hydration warnings and failed requests. Use after changing pages, components, styles, composables or server code, and whenever asked to run, start, launch or screenshot the site, check that a page renders, try the burger menu or the projects filter and sort, compare mobile and desktop layouts, or verify a change in the real app rather than only in Vitest.
---

# Verify in the browser

Two scripts do the work. Run them from the project root, the directory containing `nuxt.config.ts`; both scripts check this and stop if it isn't.

- `${CLAUDE_SKILL_DIR}/scripts/server.mjs` starts the site in the background on a free port, reports its status, and stops it.
- `${CLAUDE_SKILL_DIR}/scripts/browse.mjs` opens a page in Chromium using the Playwright library, optionally runs a scenario you write, and prints the URL, title, screenshot path and ARIA snapshot (the accessibility tree as YAML) for each step. It then lists every console error or warning, uncaught error, failed request and HTTP 400+ response.

Each `browse.mjs` run starts a fresh browser, so it takes about two seconds. To explore, rerun it with a longer scenario. Nothing carries over between runs.

## 1. Prepare

- If `node_modules/` is missing (as in a fresh worktree), run `pnpm install`.
- You don't need a `.env` or any API credentials. By default the API mocks in `api-mocks/` answer the server's outbound API requests. Only `start --no-api-mocks` (see step 2) uses real data, and that needs the user's `.env`. Never create or copy a `.env` yourself. If `--no-api-mocks` is needed and there is no `.env`, ask the user.
- If Chromium is missing, `browse.mjs` fails with Playwright's "Executable doesn't exist" error. Run `pnpm exec playwright install chromium`.

## 2. Start the server

```bash
node ${CLAUDE_SKILL_DIR}/scripts/server.mjs start
```

This starts `nuxt dev` on a free port, so it doesn't clash with dev servers in other checkouts. Nuxt allows only one dev server per directory, though. If the user's own `pnpm dev` is running in this checkout, `start` fails and says so. Don't stop the user's server or bypass Nuxt's lock. Ask the user to stop it, or point `browse.mjs` at their server with `--base-url`; it then runs in whichever mode they started it. The command returns once the home page responds (about 20 seconds on a cold start). The URL goes to `.playwright/server.json`, which `browse.mjs` reads. Server output goes to `.playwright/server.log`, so look there for SSR errors and for failed API requests. The log also confirms the API mocks are running with "Outbound API requests are answered by the API mocks". A line starting `[MSW] Error: intercepted a request without a matching request handler` means server code made an outbound request that no API mock handles. MSW blocks it rather than letting it reach the real service. Add a handler in that service's folder under `api-mocks/`, or add a new service folder (see "API mocks" in `CLAUDE.md`).

The dev server hot-reloads. After you edit a file, run `browse.mjs` again; no restart is needed. That includes the API mocks' fixtures and handlers, but only files the API mocks plugin imports: a new service folder takes effect once its handlers are added to `api-mocks/api-mocks-handlers.ts`. Nuxt restarts itself after a change to `nuxt.config.ts` or `.env`, which takes a few seconds. If a change still doesn't show up, stop the server and start it again.

- `start --no-api-mocks` runs the dev server without the API mocks, the same as `pnpm dev:no-api-mocks`, so it calls the real APIs with the credentials and settings from `.env`. Use it only when the user asks to see real data. Real data changes, so don't assert exact names or counts. The script warns if there is no `.env`. In this mode the server log has no "answered by the API mocks" line. The repositories route caches responses for five minutes, and in this mode the cache is kept on disk under `.nuxt/cache/`, so it survives restarts. To see fresh data sooner, stop the server, delete `.nuxt/cache/`, and start it again.
- `start` fails if a server in the other mode is already running. Stop that one first.
- `status` reports whether the server is up, where, and in which mode.
- `stop` kills the server's whole process tree.

## 3. Look at a page

```bash
node ${CLAUDE_SKILL_DIR}/scripts/browse.mjs projects --viewport mobile,desktop
```

Write page paths without the leading slash (`projects`, not `/projects`). Git Bash rewrites `/projects` into a Windows file path, and the script rejects that path rather than opening it. With no path, the script opens the home page.

| Option | Effect |
| --- | --- |
| `--viewport` | Comma-separated list. The presets are Playwright device descriptors, one for each layout tier: `mobile` is "Pixel 7" (412 wide, below the `480px` breakpoint), `tablet` is "Galaxy Tab S4" (712 wide, between `480px` and `768px`, still with the burger menu), and `desktop` is "Desktop Chrome" (1280 wide, the default). `WIDTHxHEIGHT` sets a plain viewport instead, for example `767x900,768x900` to check either side of a breakpoint. |
| `--scenario <file>` | Runs a scenario after the page loads (see step 4). |
| `--full-page` | Captures the whole page instead of only the viewport. Avoid it on long pages: a very tall image is too downscaled to read. |
| `--out <dir>` | Screenshot directory, `.playwright/screenshots` by default. To keep "before" shots for a later comparison, pass `--out .playwright/before`. |
| `--headed` | Shows the browser window, for when the user wants to watch. |

Screenshots are named `<viewport>-<label>.png`. Each run overwrites earlier files of the same name and leaves the others alone, so rely on the paths the run prints. Use the Read tool to look at them: the ARIA snapshot shows the structure and text, but not layout, colour, spacing or overflow, and those are often what a change is about. Screenshots finish CSS transitions instantly and hide the Nuxt DevTools pill. The device presets render at the device's pixel ratio, so their screenshots are larger than the viewport size.

The exit code is 0 only when every viewport ran its scenario without throwing and recorded no problems.

## 4. Click around with a scenario

Write scenarios to `.playwright/scenarios/<name>.mjs`. The whole `.playwright/` directory is gitignored. A scenario's default export receives:

- `page`: the Playwright `Page`, already on the start path and hydrated. Its `baseURL` is the server, so relative URLs work.
- `snapshot(label, locator?)`: saves a screenshot and prints the ARIA snapshot. If you pass a locator, both are scoped to it. If the scenario takes no snapshot, the runner takes one at the end.
- `goto(path)`: navigates and waits for hydration. Use it instead of `page.goto`. A click before hydration finishes has no effect, because Vue hasn't attached its event handlers yet.

The Playwright library has no auto-retrying assertions; those belong to the Playwright Test runner. Actions such as `click()` and `selectOption()` wait for their element on their own. To check a result, first wait for the state you expect with `locator.waitFor()` (visible by default, or `{ state: "detached" }` for an element to disappear), then check values with `node:assert/strict`. A failed assertion, or a wait that times out, fails the run.

```js
import assert from "node:assert/strict";

export default async ({ page, snapshot }) => {
    await page.getByRole("button", { name: "Toggle navigation menu" }).click();
    await page.getByRole("button", { name: "Toggle navigation menu", expanded: true }).waitFor();
    await snapshot("menu open");

    await page.getByRole("link", { name: "Projects" }).click();
    await page.getByRole("heading", { level: 1, name: "Here are some of my projects" }).waitFor();

    await page.getByRole("combobox", { name: "Filter" }).selectOption("Vue");
    await page.getByRole("heading", { level: 2, name: /task-runner/ }).waitFor({ state: "detached" });
    assert.equal(await page.getByRole("heading", { level: 2 }).count(), 1);
    await snapshot("vue projects", page.getByRole("main"));
};
```

```bash
node ${CLAUDE_SKILL_DIR}/scripts/browse.mjs --scenario .playwright/scenarios/menu.mjs --viewport mobile
```

Prefer role-based locators. They match the ARIA snapshot output, so you can copy roles and names from it:

- Navigation: `button "Toggle navigation menu"` (below `768px` only; it exposes `aria-expanded`, which `getByRole`'s `expanded` option matches), `link "Home"`, `link "Projects"`.
- Home: `heading "I'm Conor Egan"` (level 1), `link "LinkedIn icon"`, `link "GitHub icon"`.
- Projects: `heading "Here are some of my projects"` (level 1), `combobox "Filter"` (language names plus `All`), and `combobox "Sort"` (the options in `app/utils/repositories/repository-sort-options.ts`). Each repository is a level 2 heading wrapping a link whose name ends in "Opens in a new tab".

## Repository data

The repositories come from the GitHub API mock's fixtures in `api-mocks/github/github-fixtures.ts` and stay the same on every run, so scenarios can assert exact names, counts and order. The mock user is `mock-user`, and the repository links point at `https://github.com/mock-user/<name>`. If a `.env` sets `NUXT_PUBLIC_GITHUB_USER`, that name overrides `mock-user`. The links then use it, but the repositories are still the fixtures. On every load, `/projects` should show five repositories:

- `legacy-blog` is archived, so it must never appear.
- `dotfiles` has no description.
- `empty-experiment` has no languages.
- The languages are Java, JavaScript, SCSS, Shell, TypeScript and Vue, and the star counts run from 0 to 304.

If a change needs data the fixtures don't cover, edit the fixtures or add a handler in `api-mocks/github/github-handlers.ts`. The server reloads and drops its cache, so the next `browse.mjs` run shows the new data. Undo temporary fixture edits before you finish, unless the change itself needs them.

## Things that catch people out

- On mobile, the ARIA snapshot lists the nav links even while the menu is closed, because the menu hides itself with `opacity` and stays in the accessibility tree. To tell whether the menu is open, check `aria-expanded` or the screenshot.
- Loading `/projects` directly fetches the repositories during SSR, inside the server, so `page.route` can't intercept that request. Navigating there from the home page with the Projects link makes the browser fetch `/api/github/repositories/<user>`, and that request can be faked. This is the quickest way to see the loading, error and empty states without editing the API mocks:
  ```js
  await page.route("**/api/github/repositories/**", (route) => route.fulfill({ status: 502 }));
  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByText("There was an error loading the projects.").waitFor();
  ```
  Faked 4xx and 5xx responses still appear under Problems and set exit code 1. Nuxt retries a failed GET once, so a faked error is listed twice.
- Repository and social links open in new tabs and lead off the site. Check their `href` with `getAttribute("href")` instead of clicking them.
- The runner records problems only on its own page, not on popups the scenario opens.

## 5. Finish

Stop the server once you have finished verifying:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/server.mjs stop
```

Tell the user what you checked, at which viewports, and what you saw. Give the screenshot paths so they can open them, and report any problems the runner listed, including ones you judged harmless and why.
