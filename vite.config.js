/**
 * vite.config.js — Configuración para Pixon PC
 *
 * Optimizaciones de performance (importante para 1MB/s):
 * - manualChunks: separa las librerías de FontAwesome del código propio
 * - brotliSize + gzip: reportar tamaño comprimido real
 * - assetsInlineLimit: imágenes < 4KB se incrustan como base64 (0 HTTP requests)
 * - sourcemap: false en producción (menos peso)
 * - minify: terser + compresión de CSS
 */

import { defineConfig } from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
export default defineConfig({
    // La raíz del proyecto es el directorio actual
    root: '.',
    appType: 'mpa', // Especifica que es multi-página

    plugins: [
        ViteImageOptimizer({
            png: { quality: 80, compressionLevel: 8 },
            jpeg: { quality: 80, progressive: true },
            jpg: { quality: 80, progressive: true },
        }),
        {
            name: 'clean-url-dev',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    // Si la ruta no tiene extensión y no es la raíz o la API, buscar .html
                    if (req.url && !req.url.includes('.') && req.url !== '/' && !req.url.startsWith('/api')) {
                        req.url = req.url + '.html';
                    }
                    next();
                });
            }
        }
    ],

    build: {
        // La carpeta de salida es dist/ — Express la sirve en producción
        outDir:    'dist',
        // Limpiar el directorio antes de cada build
        emptyOutDir: true,

        // Inline assets pequeños como base64 (reduce HTTP requests)
        assetsInlineLimit: 4096, // 4KB

        // Sin sourcemaps en producción (reduce tamaño y oculta código)
        sourcemap: false,

        // Minificador (esbuild es más rápido, terser comprime más)
        minify: 'esbuild',

        // CSS: minificar y dividir por página
        cssCodeSplit: true,

        rollupOptions: {
            // Todas las páginas HTML del sitio
            input: {
                main:                  'index.html',
                paquetes:              'paquetes.html',
                ensambles:             'ensambles.html',
                catalogo:              'catalogo.html',
                comentarios:           'comentarios.html',
                contacto:              'contacto.html',
                mantenimientoMac:      'mantenimiento-mac.html',
                preguntasFrecuentes:   'preguntas-frecuentes.html',
                privacidad:            'privacidad.html',
                garantia:              'garantia.html',
                notFound:              '404.html',
            },
        },
    },

    // Servidor de desarrollo: proxy de la API hacia Express en :3000
    // Así, en dev, fetch('/api/comments') va a-> localhost:3000/api/comments
    // y no hay problemas de CORS
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target:    'http://localhost:3000',
                changeOrigin: true,
            }
        }
    },

    // Preview server (npm run preview): también proxea a Express
    preview: {
        port: 4173,
    },
});
