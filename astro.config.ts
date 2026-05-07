import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  site: 'https://pixon.com.mx',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  redirects: {
    '/formateo-optimizacion': '/instalacion-windows',
    '/B2B': '/b2b',
  },
  vite: {
    plugins: [
      ViteImageOptimizer({
        png: { quality: 80, compressionLevel: 8 },
        jpeg: { quality: 80, progressive: true },
        jpg: { quality: 80, progressive: true },
      }),
    ],
    build: {
      assetsInlineLimit: 4096,
      sourcemap: false,
      minify: 'esbuild',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            fa: ['@fortawesome/fontawesome-free'],
            vendor: ['lenis'],
          },
        },
      },
    },
    server: {
      port: 4321,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
    },
  },
});
