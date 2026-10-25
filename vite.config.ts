/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_BESCHREIBUNG, APP_NAME } from './src/config.ts'

// Bauanleitung der App. Später für GitHub Pages: `base` auf den Repository-Namen setzen.
export default defineConfig({
  plugins: [
    react(),
    {
      // Setzt App-Name und Beschreibung aus config.ts in index.html ein.
      name: 'app-name',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) =>
          html.replaceAll('%APP_NAME%', APP_NAME).replaceAll('%APP_BESCHREIBUNG%', APP_BESCHREIBUNG),
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_BESCHREIBUNG,
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1f1e1d',
        theme_color: '#1f1e1d',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles, was die App braucht, wird für den Offline-Betrieb gespeichert (auch Schriften und Beispieldaten).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,xlsx}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
