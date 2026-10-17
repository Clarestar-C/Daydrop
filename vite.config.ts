// Build-only config file — never ships to the browser, so no privacy concerns here.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import {
  APP_NAME,
  APP_SHORT_NAME,
  APP_DESCRIPTION,
  THEME_COLOR,
  BACKGROUND_COLOR,
} from './src/config';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Journal content is NEVER cached by the service worker: it lives only in
      // IndexedDB (client-side) and is never sent over the network. The SW
      // precaches the static app shell only — there are no network calls in the
      // app at all, so runtimeCaching is deliberately omitted.
     workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,aac,mpeg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        // Relative icon paths (no leading slash) so the manifest works under
        // any GitHub Pages repository subpath, matching base: './'.
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
