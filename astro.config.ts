import { defineConfig } from 'astro/config';


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
  build: {
    format: 'file', // emite /comentarios.html en vez de /comentarios/index.html
  },
  vite: {
    plugins: [],
    build: {
      assetsInlineLimit: 4096,
      sourcemap: false,
      minify: 'esbuild',
      cssCodeSplit: true,
    },
    server: {
      port: 4321,
      allowedHosts: true,
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
