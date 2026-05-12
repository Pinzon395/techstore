import { defineConfig } from 'astro/config';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// Astro como SSG: emite HTML estático a dist/.
export default defineConfig({
  output: 'static',
  outDir: './dist',
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
    '/b2b': '/empresas',
  },
  build: {
    format: 'file', // emite /comentarios.html en vez de /comentarios/index.html
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
