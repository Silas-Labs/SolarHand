import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// Read endpoints we cache for offline reads. Matched against the full request
// URL, so this works whether the API is cross-origin (dev) or same-origin
// (behind the reverse proxy in production).
const READ_API = /\/(auth\/me|companies|users|assets|jobs|readings|faults|sync\/pull)(\/|\?|$)/;

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "SolarHand — Field & Compliance",
        short_name: "SolarHand",
        description:
          "Offline-first field service, performance checks and EPRA compliance for solar installers.",
        theme_color: "#10152e",
        background_color: "#f6f7fb",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["business", "productivity", "utilities"],
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: "index.html",
        // Never serve the SPA shell for API calls.
        navigateFallbackDenylist: [READ_API, /\/(auth|analytics|sync)\//],
        runtimeCaching: [
          {
            urlPattern: READ_API,
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "solarhand-api-reads",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Keep the SW off during `vite dev` so it doesn't cache stale modules.
        enabled: false,
      },
    }),
  ],
});
