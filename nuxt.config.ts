// https://nuxt.com/docs/api/configuration/nuxt-config
import type { NuxtConfig } from "nuxt/schema";

const apiMocks = {
  runtimeConfig: {
    public: {
      githubUser: "mock-user"
    }
  },
  nitro: {
    plugins: ["~~/api-mocks/api-mocks-plugin"],
    devStorage: {
      cache: { driver: "memory" }
    }
  }
} satisfies NuxtConfig;

export default defineNuxtConfig({
  runtimeConfig: {
    githubApiToken: "",
    public: {
      githubUser: ""
    }
  },
  $development: apiMocks,
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/_colours.scss" as *;',
        }
      }
    }
  },
  css: ['~/assets/scss/main.scss'],
  typescript: {
    serverTsConfig: {
      include: ["../test/unit/**/*", "../api-mocks/**/*"]
    },
    nodeTsConfig: {
      include: ["../vitest.config.ts"]
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
});
