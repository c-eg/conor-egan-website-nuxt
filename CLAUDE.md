# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal portfolio site for Conor Egan ([www.conoregan.co.uk](https://www.conoregan.co.uk/)), built with Nuxt 4 and deployed on Vercel.

## Commands

The package manager is pnpm.

- `pnpm install`: installs dependencies. `postinstall` runs `nuxt prepare`, which generates `.nuxt/` (the tsconfig references depend on it).
- `pnpm dev`: starts the dev server
- `pnpm build` / `pnpm preview`: production build, then serve it locally
- `pnpm generate`: static generation

No test runner, linter, or typecheck script is configured.

## Configuration

Both values come from `runtimeConfig` in `nuxt.config.ts` and are empty by default. Supply them through env vars (`.env` is gitignored):

- `NUXT_GITHUB_API_TOKEN`: server-only token for the GitHub API
- `NUXT_PUBLIC_GITHUB_USER`: the GitHub username whose repositories appear on `/projects`

Do not add `vue` or `vue-router` as direct dependencies. They were removed to fix the Vercel build, and Nuxt provides them.

## Architecture

`app/` is the Nuxt 4 source directory, so `~` resolves to `app/`. Server code lives in the root `server/` directory.

### Projects data flow

1. `app/pages/projects.vue` calls `useRepositories()`. That composable wraps `useLazyFetch` for `/api/github/repositories/{githubUser}`, using the key `github-repositories` and a default of `[]`. Data loads through `useLazyFetch` so the SSR payload is reused during hydration and client-side navigation renders right away. The project has no Pinia or other store.
2. `server/api/github/repositories/[username].get.ts` is a `defineCachedEventHandler` with `maxAge: 300`. It validates the route param with zod, then fetches the user's repos through `server/utils/github-api.ts` (`@octokit/request`). It drops archived repos and makes one languages request per repo. The result is mapped to the `Repository` type. Bad params return a 400, and any GitHub failure becomes a 502.
3. Back on the page, the data goes through two composables in order: `useRepositoryFilters`, which filters by language with an `"All"` option, and then `useRepositorySort`. The sort options are a `const` tuple in `app/utils/repositories/repository-sort-options.ts`. A new option needs a matching `case` in the `switch` inside `use-repository-sort.ts`.

`Repository` (`app/shared/types/github.ts`) is shared by the client and the server. Both sides import it as `~/shared/types/github`. This is not Nuxt's root-level `shared/` directory, so it is not auto-imported.

### Conventions

- File names use kebab-case. Components appear in kebab-case in templates (`<repository-card>`).
- Components, composables, and utils are imported explicitly (`import Card from "~/components/core/containers/card.vue"`) instead of relying on Nuxt auto-imports. Nuxt built-ins such as `ref`, `computed`, `useHead`, and `useRuntimeConfig` are still used without imports.
- Server code imports server utils through the `#server/...` alias.
- Each page sets its `<title>` and meta description with `useHead`, using the format `"<Page> | Conor Egan"`.

### Styling

- SCSS throughout. Components use `<style scoped lang="scss">`.
- Vite's `additionalData` (`nuxt.config.ts`) injects `app/assets/scss/_colours.scss` into every SCSS block, so the `$colour-*` variables work anywhere without an `@use`. Use these variables instead of hard-coded colours.
- Global element styles live in `app/assets/scss/main.scss`.
- Layouts are mobile-first, with `min-width` breakpoints at `480px` and `768px`.
