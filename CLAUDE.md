# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal portfolio site for Conor Egan ([www.conoregan.co.uk](https://www.conoregan.co.uk/)), built with Nuxt 4 and deployed on Vercel.

## Commands

The package manager is pnpm.

- `pnpm install`: installs dependencies. `postinstall` runs `nuxt prepare`, which generates `.nuxt/` (the tsconfig references depend on it).
- `pnpm dev`: starts the dev server
- `pnpm build` / `pnpm preview`: production build, then serve it locally
- `pnpm generate`: static generation
- `pnpm test`: runs every Vitest test once. `pnpm test:watch` reruns tests on change.
- `pnpm test test/unit/github-api.test.ts` runs one file, `pnpm test --project unit` (or `nuxt`) runs one project, and `pnpm test -t "<test name>"` runs the tests whose name matches.
- `pnpm typecheck`: runs `nuxt typecheck` (`vue-tsc -b --noEmit` over Nuxt's generated tsconfigs). It covers the app, the server, both test folders and `vitest.config.ts`. Vitest does not type-check, so run this as well as the tests.

No linter is configured. CI (`.github/workflows/test.yml`) runs `pnpm test` and then `pnpm typecheck` on pull requests and on pushes to `main`.

## Configuration

Both values come from `runtimeConfig` in `nuxt.config.ts` and are empty by default. Supply them through env vars (`.env` is gitignored):

- `NUXT_GITHUB_API_TOKEN`: server-only token for the GitHub API
- `NUXT_PUBLIC_GITHUB_USER`: the GitHub username whose repositories appear on `/projects`

`vue` is a direct dependency, at the version Nuxt already installs. Nothing imports it by name, but under pnpm IntelliJ only detects Vue when it is listed in `package.json`. Without it, IntelliJ checks `.ts` files with its plain TypeScript service and reports TS2307 on every `.vue` import. Do not add `vue-router` directly. Both were removed in `baa1f39` to fix the Vercel build, and if a Vercel build breaks, check the `vue` dependency first.

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
