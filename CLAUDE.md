# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal portfolio site for Conor Egan ([www.conoregan.co.uk](https://www.conoregan.co.uk/)), built with Nuxt 4 and deployed on Vercel.

## Commands

The package manager is pnpm 11, which CI also uses (`version: 11` in the workflow).

- `pnpm install`: installs dependencies. `postinstall` runs `nuxt prepare`, which generates `.nuxt/` (the tsconfig references depend on it).
- `pnpm dev`: starts the dev server, with outbound API requests answered by the API mocks (see "API mocks")
- `pnpm dev:no-api-mocks`: starts the dev server without the API mocks, so it calls the real APIs using `.env`
- `pnpm build` / `pnpm preview`: production build, then serve it locally. `nuxt preview` loads `.env`, and a production build never includes the API mocks, so this shows real data.
- `pnpm generate`: static generation
- `pnpm test`: runs every Vitest test once. `pnpm test:watch` reruns tests on change.
- `pnpm test test/unit/github-api.test.ts` runs one file, `pnpm test --project unit` (or `nuxt`) runs one project, and `pnpm test -t "<test name>"` runs the tests whose name matches.
- `pnpm typecheck`: runs `nuxt typecheck` (`vue-tsc -b --noEmit` over Nuxt's generated tsconfigs). It covers the app, the server, both test folders and `vitest.config.ts`. Vitest does not type-check, so run this as well as the tests.

No linter is configured. CI (`.github/workflows/test.yml`) runs `pnpm typecheck` and then `pnpm test` on pull requests and on pushes to `main`. The test step has `if: ${{ !cancelled() }}`, so it still runs when the typecheck fails and both results are reported.

## Configuration

Both values come from `runtimeConfig` in `nuxt.config.ts` and are empty by default. Production (Vercel) supplies them as env vars:

- `NUXT_GITHUB_API_TOKEN`: server-only token for the GitHub API
- `NUXT_PUBLIC_GITHUB_USER`: the GitHub username whose repositories appear on `/projects`

Locally, `pnpm dev` needs neither, because the API mocks answer its outbound API requests (see "API mocks" below). To see real data, put the values in `.env` (gitignored) and run `pnpm dev:no-api-mocks`, or build and preview.

`vue` is a direct dependency, at the version Nuxt already installs. Nothing imports it by name, but under pnpm IntelliJ only detects Vue when it is listed in `package.json`. Without it, IntelliJ checks `.ts` files with its plain TypeScript service and reports TS2307 on every `.vue` import. Do not add `vue-router` directly. Both were removed in `baa1f39` to fix the Vercel build, and if a Vercel build breaks, check the `vue` dependency first.

pnpm 11 enforces two supply-chain rules, and both make `pnpm install` fail rather than warn:

- **Build scripts:** a dependency's build script runs only if `allowBuilds` in `pnpm-workspace.yaml` allows it, and an unlisted one fails the install with `ERR_PNPM_IGNORED_BUILDS`. `esbuild` and `@parcel/watcher` are denied.
  - Both ship prebuilt binaries in platform packages, and their scripts add nothing here.
  - esbuild's JS API, which Vite and Nuxt use, resolves the platform binary itself. Its script only checks the version and, on Linux and macOS, speeds up the `esbuild` CLI.
  - `@parcel/watcher`'s script does nothing unless `npm_config_build_from_source` is `true`.
  - When a new dependency brings a build script, read what it does before setting it in `allowBuilds`, for example with `pnpm approve-builds '!<pkg>'`.
- **Release age:** pnpm won't install a version published less than a day ago (`minimumReleaseAge` defaults to 1440 minutes), and it checks existing lockfile entries too. If `pnpm install` fails with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, re-resolve the affected dependency to an older version within its range rather than excluding it from the check.

## Architecture

`app/` is the Nuxt 4 source directory, so `~` resolves to `app/`. Server code lives in the root `server/` directory.

### Projects data flow

1. `app/pages/projects.vue` calls `useRepositories()`. That composable wraps `useLazyFetch` for `/api/github/repositories/{githubUser}`, using the key `github-repositories` and a default of `[]`. Data loads through `useLazyFetch` so the SSR payload is reused during hydration and client-side navigation renders right away. The project has no Pinia or other store.
2. `server/api/github/repositories/[username].get.ts` is a `defineCachedEventHandler` with `maxAge: 300`. It validates the route param with zod (a bad param returns a 400), then calls `getActiveRepositories` in `server/utils/github/github-repositories.ts` and turns any rejection into a 502. `getActiveRepositories` fetches the user's repos through `server/utils/github/github-api.ts` (`@octokit/request`), drops archived repos, makes one languages request per repo, and maps the result to the `Repository` type. Only the first page of repos is requested, so at most 30 appear.
3. Back on the page, the data goes through two composables in order: `useRepositoryFilters`, which filters by language with an `"All"` option, and then `useRepositorySort`. The sort options are a `const` tuple in `app/utils/repositories/repository-sort-options.ts`. A new option needs a matching `case` in the `switch` inside `use-repository-sort.ts`.

`Repository` (`app/shared/types/github.ts`) is shared by the client and the server. Both sides import it as `~/shared/types/github`. This is not Nuxt's root-level `shared/` directory, so it is not auto-imported.

### API mocks

The top-level `api-mocks/` uses MSW to answer the server's outbound API requests in place of the real services. It is dev tooling and sits beside `test/` rather than in `server/`, so that nothing in `server/` exists only for development. MSW's `setupServer` patches `globalThis.fetch` inside the Nitro process, and the server's API clients (such as `@octokit/request`, which reads `globalThis.fetch` on every request) go through it. Everything else in the server runs for real: for `/projects`, that means the Octokit call, the archived filter, the languages requests, the mapping, the route cache and the 502 handling.

The layout follows MSW's docs: domain handlers composed into one root list, and a Node module that exports the server.

- `api-mocks-handlers.ts` collects every service's handlers into `apiMocksHandlers`.
- `api-mocks-node.ts` exports `apiMocksServer`, created with `setupServer(...apiMocksHandlers)`.
- `api-mocks-plugin.ts` is a Nitro plugin that calls `apiMocksServer.listen({ onUnhandledFrame: "error" })` at server startup and `close()` on Nitro's `close` hook. Any outbound request from the server that no handler matches fails, whatever its host, and the server log names it: `[MSW] Error: intercepted a request without a matching request handler`. The repositories route turns that failure into a 502. The plugin imports `defineNitroPlugin` from `nitropack/runtime`, which is where Nuxt's docs say it comes from, because Nuxt documents auto-imports only inside `server/`. The dev server reloads when a file the plugin imports changes. A file nothing imports yet, such as a new service folder that isn't in `apiMocksHandlers`, doesn't trigger a reload.
- Each service has its own folder, named after the service, with its handlers and fixtures. Following MSW's docs, handlers import `http` and `HttpResponse` from `msw/http`, and they declare the response body type in `http.get<Params, RequestBody, ResponseBody>` so the typecheck checks each response. To mock a new service, add `api-mocks/<service>/` and spread its handlers into `apiMocksHandlers`. To cover a new endpoint of an existing service, add a handler in that service's folder.
- A handler must always return a response. If its resolver returns nothing, MSW falls through to its default passthrough and the request goes to the real API, and `onUnhandledFrame` doesn't catch it, because a handler matched.
- `github/` mocks the GitHub API.
  - `github-fixtures.ts` holds the fake repositories. Each one has only the fields the server reads (`name`, `html_url`, `description`, `stargazers_count`, `archived`), plus its languages. These types are a `Pick` of Octokit's types, taken through `getRepositories` and `getRepositoryLanguages`, and Octokit generates them from GitHub's OpenAPI spec. So `pnpm typecheck` rejects a misspelled field or a wrong type.
  - The mock doesn't return the rest of GitHub's response. If server code starts reading another GitHub field, add it to `MockRepository` and the fixtures in the same change; otherwise it reads as `undefined` under `pnpm dev`.
  - The fixtures cover an archived repo (which must not appear), a `null` description, a repo with no languages, and a spread of languages and stars for the filter and sort.
  - `github-handlers.ts` serves the repos for any username, building `html_url` from it. It serves each fixture repo's languages, and returns a 404 for any other repo, as GitHub does.

MSW's Vite guide (the `msw()` plugin from `msw/vite`, plus `virtual:msw`) does not apply here, so use `setupServer` from `msw/node`. `virtual:msw` resolves only inside Vite's module graph. Nitro 2 builds the server with its own Rollup pipeline, so importing `virtual:msw` from Nitro code fails at runtime ("Received protocol 'virtual:'"). On the server side, the Vite plugin uses the same Node.js interception as `setupServer`. The browser needs no mocking, because it only calls this site's own API, so the plugin's service worker isn't needed either.

`nuxt.config.ts` registers the plugin only in the `apiMocks` overrides, which are checked with `satisfies NuxtConfig` so a misspelled key fails the typecheck. Those overrides also give the mocked services' config values (`githubUser` is `mock-user`) and keep Nitro's dev cache in memory, so a fixture edit shows up as soon as the server reloads instead of after a route cache expires. They apply under `$development`, so only `nuxt dev` gets them. `pnpm dev:no-api-mocks` passes `--envName no-api-mocks`, so Nuxt skips the `$development` overrides and the dev server calls the real APIs with the values from `.env`. No `$env` block is needed for that. Production builds, including Vercel's, never contain the API mocks. A `.env` value such as `NUXT_PUBLIC_GITHUB_USER` overrides the mock value under `pnpm dev` too, but the data still comes from the fixtures. `msw` is a dev dependency, and the Nuxt Vitest project runs with `NODE_ENV=test`, so the API mocks aren't active in tests.

### Conventions

- File names use kebab-case. Components appear in kebab-case in templates (`<repository-card>`).
- Components, composables, and utils are imported explicitly (`import Card from "~/components/core/containers/card.vue"`) instead of relying on Nuxt auto-imports. Nuxt built-ins such as `ref`, `computed`, `useHead`, and `useRuntimeConfig` are still used without imports.
- Code is grouped into feature folders (`app/composables/repositories/`, `server/utils/github/`), and file names keep their prefix inside them (`github/github-api.ts`). Nitro scans `server/utils/` recursively, so subfolders are still auto-imported.
- Code in `server/` uses the auto-imported Nitro and h3 helpers (`defineCachedEventHandler`, `getValidatedRouterParams`, `createError`, `useRuntimeConfig`), as Nuxt's server docs show. In routes, pass `event` to `useRuntimeConfig`, as Nuxt's runtime-config docs recommend.
  - Nuxt 4.6 also offers `nuxt/server` for runtime-agnostic helpers. Its helpers read the event from its own `defineEventHandler`, so Nuxt's upgrade guide says a handler that needs Nitro helpers it lacks, such as `defineCachedEventHandler`, keeps using h3's and Nitro's.
  - Code outside `server/` that Nitro bundles, such as the API mocks plugin, imports from `nitropack/runtime` explicitly.
  - Don't import server helpers from `#imports`. Nuxt documents `#imports` only for app code, and here it is mistyped in both tsconfigs. In the server tsconfig, `#imports` re-exports from `nitropack/runtime/internal/*`, which doesn't resolve under pnpm (only `nitropack`, `nitropack/runtime` and `nitropack/types` are mapped), so the import is `any`. The app tsconfig also checks route handlers, because Nuxt's typed `$fetch` routes import them, and there `#imports` gives Nuxt's app composables instead of Nitro's.
- Route handlers import server utils through the `#server/...` alias. Server utils that unit tests import use relative imports for runtime values instead, because the `unit` Vitest project runs without Nuxt's aliases. Type-only `~` imports are fine there, since they are erased.
- Each page sets its `<title>` and meta description with `useHead`, using the format `"<Page> | Conor Egan"`.

### Styling

- SCSS throughout. Components use `<style scoped lang="scss">`.
- Vite's `additionalData` (`nuxt.config.ts`) injects `app/assets/scss/_colours.scss` into every SCSS block, so the `$colour-*` variables work anywhere without an `@use`. Use these variables instead of hard-coded colours.
- Global element styles live in `app/assets/scss/main.scss`.
- Layouts are mobile-first, with `min-width` breakpoints at `480px` and `768px`.

## Testing

`vitest.config.ts` defines two projects:

- `unit` (`test/unit/`): plain Node, for server code. Nuxt aliases and auto-imports are not available. Collaborators are replaced with `vi.mock` using relative paths. The GitHub client tests stub the global `fetch` instead, so they assert the URL and headers GitHub actually receives.
- `nuxt` (`test/nuxt/`): runs inside a Nuxt app through `@nuxt/test-utils`, so `~` and auto-imports such as `ref` and `useRuntimeConfig` work in the test files too. Used for composables, components and pages.

Keep route handlers thin. Nitro globals such as `defineCachedEventHandler`, `getValidatedRouterParams` and `createError` don't exist under Vitest, so put logic in `server/utils/`, where the `unit` project can test it.

Pages and components are rendered with `renderSuspended` from `@nuxt/test-utils/runtime` and queried with `@testing-library/vue` (`screen`, `fireEvent`). Each render starts at route `/` and unmounts the previous one. `jest-dom` is not installed: its current major needs `@testing-library/dom` 10, while `@testing-library/vue` still uses 9. Assert with plain matchers instead (`getAttribute`, `textContent`, `toBe`).

Fake API responses with `registerEndpoint(url, { handler, once: true })`. Build the repositories URL from `useRuntimeConfig().public.githubUser` instead of hard-coding a username, because a local `.env` can set it.

`test/nuxt/fixtures/repository.ts` has `createRepository` and `namesOf` for building `Repository` test data.

### In the browser

The `verify-in-browser` skill (`.claude/skills/verify-in-browser/`) starts the site in the background and drives it with Playwright. It takes screenshots and ARIA snapshots, runs scripted clicks, and reports console errors, hydration warnings and failed requests. `playwright`, the Playwright library, is a dev dependency only for this skill; the project has no Playwright test suite. Playwright's docs say to install `playwright` for library use. The library has no web-first `expect` (that is part of the `@playwright/test` runner), so scenarios wait with `locator.waitFor()` and assert with `node:assert`. The skill writes its server log, screenshots and scenarios to `.playwright/`, which is gitignored. If Chromium is missing, run `pnpm exec playwright install chromium`.

## TypeScript

Nuxt generates the tsconfigs in `.nuxt/`, and the root `tsconfig.json` only references them. `test/nuxt/` is in the app tsconfig by default. `nuxt.config.ts` adds `test/unit/` and `api-mocks/` to the server tsconfig and `vitest.config.ts` to the node tsconfig through `typescript.serverTsConfig` and `typescript.nodeTsConfig` (paths are relative to `.nuxt/`). Any new TypeScript file outside `app/`, `server/` and those folders needs adding there too. Otherwise editors check it with TypeScript's defaults (for example, TS2705 on async functions) and `pnpm typecheck` skips it.
