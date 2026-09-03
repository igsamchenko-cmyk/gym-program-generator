import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base відповідає назві репозиторію — так GitHub Pages віддає ресурси
// з правильного шляху https://<user>.github.io/gym-program-generator/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg", "pwa-192x192.png", "pwa-512x512.png", "apple-touch-icon.png"],
      manifest: {
        name: "Конструктор тренувань",
        short_name: "Тренування",
        description: "Персональна програма силових тренувань із журналом прогресу.",
        lang: "uk",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#E9EDEA",
        theme_color: "#14181A",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}"],
        globIgnores: ["exercise-media/**/*", "assets/exceljs*.js"],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === "image" && url.pathname.includes("/exercise-media/"),
            handler: "CacheFirst",
            options: {
              cacheName: "exercise-technique-media-v1",
              expiration: { maxEntries: 36, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/assets\/exceljs[^/]*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "optional-export-v1",
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
      },
    }),
  ],
  base: "/gym-program-generator/",
});
