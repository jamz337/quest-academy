import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: { host: true },
  preview: { host: true },
  build: { target: 'es2019', chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/*.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Quest Academy',
        short_name: 'Quest',
        description: 'A Math, English and Coding adventure for grades 2 to 8',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1d2b53',
        theme_color: '#1d2b53',
        lang: 'en',
        categories: ['education', 'games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      }
    })
  ]
});
