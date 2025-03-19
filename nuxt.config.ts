// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  nitro: {
    prerender: {
      routes: ['/'],
    },
  },

  modules: ['@vite-pwa/nuxt',
    '@nuxtjs/tailwindcss'],
  devServer: {
    https: {
      key: './server.key',
      cert: './server.crt'
    }
  },

  pwa: {
    registerType: 'prompt',
    injectRegister: false,

    manifest: {
      name: 'web_nfc',
      short_name: 'web_nfc',
      description: 'yoo',
      theme_color: '#ffffff',
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },

    devOptions: {
      enabled: false,
      suppressWarnings: true,
      navigateFallback: '/',
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module',
    },

    registerWebManifestInRouteRules: true,

    client: {
      installPrompt: true,
    },
  },

  compatibilityDate: '2025-03-19',
})
