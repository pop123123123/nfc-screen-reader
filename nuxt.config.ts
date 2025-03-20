// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  nitro: {
    prerender: {
      routes: ["/"],
    },
  },

  modules: ["@vite-pwa/nuxt", "@nuxtjs/tailwindcss"],
  devServer: {
    https: {
      key: "./server.key",
      cert: "./server.crt",
    },
  },

  pwa: {
    registerType: "autoUpdate",
    injectRegister: "auto",

    manifest: {
      name: "NFC Reader/Writer",
      short_name: "NFC App",
      description: "Read and write NFC tags",
      theme_color: "#4f46e5",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait",
      start_url: "/",
      scope: "/",
      id: "/",
      categories: ["utilities"],
      prefer_related_applications: false,
    },

    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
    },

    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallback: "/",
      navigateFallbackAllowlist: [/^\/$/],
      type: "module",
    },

    registerWebManifestInRouteRules: true,

    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    pwaAssets: {
      config: true,
    }
  },

  compatibilityDate: "2025-03-19",
});
