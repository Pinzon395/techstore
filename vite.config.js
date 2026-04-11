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

export default defineConfig({
    // La raíz del proyecto es el directorio actual
    root: '.',

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
                main:         'index.html',
                paquetes:     'paquetes.html',
                ensambles:    'ensambles.html',
                catalogo:     'catalogo.html',
                comentarios:  'comentarios.html',
                contacto:     'contacto.html',
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
