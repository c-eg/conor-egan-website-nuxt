// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    githubApiToken: "",
    public: {
      githubUser: ""
    }
  },
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
      include: ["../test/unit/**/*"]
    },
    nodeTsConfig: {
      include: ["../vitest.config.ts"]
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
});
