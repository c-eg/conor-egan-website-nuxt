# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal portfolio site for Conor Egan ([www.conoregan.co.uk](https://www.conoregan.co.uk/)), built with Nuxt 4 and deployed on Vercel.

## Commands

The package manager is pnpm 11, which CI also uses (`version: 11` in the workflow).

- `pnpm install`: installs dependencies. `postinstall` runs `nuxt prepare`, which generates `.nuxt/` (the tsconfig references depend on it).
- `pnpm dev`: starts the dev server
- `pnpm build` / `pnpm preview`: production build, then serve it locally
- `pnpm generate`: static generation
- `pnpm test`: runs every Vitest test once. `pnpm test:watch` reruns tests on change.
- `pnpm test test/unit/github-api.test.ts` runs one file, `pnpm test --project unit` (or `nuxt`) runs one project, and `pnpm test -t "<test name>"` runs the tests whose name matches.
- `pnpm typecheck`: runs `nuxt typecheck` (`vue-tsc -b --noEmit` over Nuxt's generated tsconfigs). It covers the app, the server, both test folders and `vitest.config.ts`. Vitest does not type-check, so run this as well as the tests.

No linter is configured. CI (`.github/workflows/test.yml`) runs `pnpm typecheck` and then `pnpm test` on pull requests and on pushes to `main`. The test step has `if: ${{ !cancelled() }}`, so it still runs when the typecheck fails and both results are reported.

## Configuration

Both values come from `runtimeConfig` in `nuxt.config.ts` and are empty by default. Supply them through env vars (`.env` is gitignored):

- `NUXT_GITHUB_API_TOKEN`: server-only token for the GitHub API
- `NUXT_PUBLIC_GITHUB_USER`: the GitHub username whose repositories appear on `/projects`

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

### Conventions

- File names use kebab-case. Components appear in kebab-case in templates (`<repository-card>`).
- Components, composables, and utils are imported explicitly (`import Card from "~/components/core/containers/card.vue"`) instead of relying on Nuxt auto-imports. Nuxt built-ins such as `ref`, `computed`, `useHead`, and `useRuntimeConfig` are still used without imports.
- Code is grouped into feature folders (`app/composables/repositories/`, `server/utils/github/`), and file names keep their prefix inside them (`github/github-api.ts`). Nitro scans `server/utils/` recursively, so subfolders are still auto-imported.
- Code in `server/` uses the auto-imported Nitro and h3 helpers (`defineCachedEventHandler`, `getValidatedRouterParams`, `createError`, `useRuntimeConfig`), as Nuxt's server docs show. In routes, pass `event` to `useRuntimeConfig`, as Nuxt's runtime-config docs recommend.
  - Nuxt 4.6 also offers `nuxt/server` for runtime-agnostic helpers. Its helpers read the event from its own `defineEventHandler`, so Nuxt's upgrade guide says a handler that needs Nitro helpers it lacks, such as `defineCachedEventHandler`, keeps using h3's and Nitro's.
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

## TypeScript

Nuxt generates the tsconfigs in `.nuxt/`, and the root `tsconfig.json` only references them. `test/nuxt/` is in the app tsconfig by default. `nuxt.config.ts` adds `test/unit/` to the server tsconfig and `vitest.config.ts` to the node tsconfig through `typescript.serverTsConfig` and `typescript.nodeTsConfig` (paths are relative to `.nuxt/`). Any new TypeScript file outside `app/`, `server/` and those test folders needs adding there too. Otherwise editors check it with TypeScript's defaults (for example, TS2705 on async functions) and `pnpm typecheck` skips it.
