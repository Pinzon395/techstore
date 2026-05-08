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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin: copia archivos estáticos que Vite no bundlea automáticamente
// (scripts referenciados como type="module" en HTML se bundlean, pero
//  los que se cargan dinámicamente o en rutas externas necesitan estar
//  presentes en dist/ para que Express los sirva en producción)
function copyStaticPlugin() {
    // Helper: copia todos los archivos de srcDir a destDir (solo archivos, no recursivo)
    function copyDir(srcDir, destDir, label) {
        if (!fs.existsSync(srcDir)) return;
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.readdirSync(srcDir).forEach(file => {
            const srcFile  = path.join(srcDir, file);
            const destFile = path.join(destDir, file);
            if (fs.statSync(srcFile).isFile()) {
                fs.copyFileSync(srcFile, destFile);
                console.log(`[copy-static] ${label}/${file} → dist/${label}/${file}`);
            }
        });
    }

    return {
        name: 'copy-static-components',
        closeBundle() {
            // 1. components/*.js  →  dist/components/
            copyDir(
                path.join(__dirname, 'components'),
                path.join(__dirname, 'dist', 'components'),
                'components'
            );
            // 2. assets/logos/*   →  dist/assets/logos/
            //    El navbar referencia /assets/logos/Logo.svg directamente;
            //    Vite no lo copia porque no está en una ruta procesada por el bundler.
            copyDir(
                path.join(__dirname, 'assets', 'logos'),
                path.join(__dirname, 'dist', 'assets', 'logos'),
                'assets/logos'
            );
            // 3. public/assets/icons/*.svg  →  dist/assets/icons/
            //    SVG sprite para reemplazar Font Awesome
            copyDir(
                path.join(__dirname, 'public', 'assets', 'icons'),
                path.join(__dirname, 'dist', 'assets', 'icons'),
                'assets/icons'
            );
            // 4. assets/images/responsive/*.webp  →  dist/assets/images/responsive/
            //    WebP responsivos para sección ensambles (performance)
            copyDir(
                path.join(__dirname, 'assets', 'images', 'responsive'),
                path.join(__dirname, 'dist', 'assets', 'images', 'responsive'),
                'assets/images/responsive'
            );
        }
    };
}

export default defineConfig({
    // La raíz del proyecto es el directorio actual
    root: '.',
    appType: 'mpa', // Especifica que es multi-página

    plugins: [
        copyStaticPlugin(),
        ViteImageOptimizer({
            png: { quality: 80, compressionLevel: 8 },
            jpeg: { quality: 80, progressive: true },
            jpg: { quality: 80, progressive: true },
        }),
        {
            name: 'clean-url-dev',
            configureServer(server) {
                // Mapa de URLs públicas cortas -> ruta del archivo en el repo
                const urlMap = {
                    '/en':                    '/pages/en/index.html',
                    '/paquetes':              '/pages/servicios/paquetes.html',
                    '/ensambles':             '/pages/servicios/ensambles.html',
                    '/mantenimiento-mac':     '/pages/servicios/mantenimiento-mac.html',
                    '/instalacion-windows':   '/pages/servicios/instalacion-windows.html',
                    '/reparaciones':          '/pages/servicios/reparaciones.html',
                    '/reparacion-bisagras':   '/pages/servicios/reparacion-bisagras.html',
                    '/reparacion-controles':  '/pages/servicios/reparacion-controles.html',
                    '/b2b':                   '/pages/servicios/b2b.html',
                    '/catalogo':              '/pages/info/catalogo.html',
                    '/comentarios':           '/pages/info/comentarios.html',
                    '/contacto':              '/pages/info/contacto.html',
                    '/preguntas-frecuentes':  '/pages/info/preguntas-frecuentes.html',
                    '/privacidad':            '/pages/legal/privacidad.html',
                    '/garantia':              '/pages/legal/garantia.html',
                    '/admin':                 '/pages/admin/admin.html',
                    '/optimizacion':          '/pages/servicios/optimizacion.html',
                    '/limpieza-laptop-liquido': '/pages/servicios/limpieza-laptop-liquido.html',
                    '/antisulfatacion':       '/pages/servicios/antisulfatacion.html',
                };

                // URLs viejas que ahora redirigen 301 a /instalacion-windows
                const legacyRedirects = new Set(['/formateo-optimizacion']);

                server.middlewares.use((req, res, next) => {
                    if (!req.url) return next();
                    const [pathOnly, queryStr] = req.url.split('?');
                    // 0) Redirects 301 de URLs legacy
                    if (legacyRedirects.has(pathOnly)) {
                        res.statusCode = 301;
                        res.setHeader('Location', '/instalacion-windows');
                        return res.end();
                    }
                    // M6 — canonicaliza /B2B -> /b2b
                    if (pathOnly === '/B2B') {
                        res.statusCode = 301;
                        res.setHeader('Location', '/b2b' + (queryStr ? '?' + queryStr : ''));
                        return res.end();
                    }
                    // 1) Mapeo explicito a las nuevas ubicaciones
                    if (urlMap[pathOnly]) {
                        req.url = urlMap[pathOnly] + (queryStr ? '?' + queryStr : '');
                        return next();
                    }
                    // 2) Si la ruta no tiene extension y no es la raiz/API/auth, anadir .html
                    if (!pathOnly.includes('.') && pathOnly !== '/' && !pathOnly.startsWith('/api') && !pathOnly.startsWith('/auth')) {
                        req.url = pathOnly + '.html' + (queryStr ? '?' + queryStr : '');
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
            treeshake: false,
            // Todas las páginas HTML del sitio
            input: {
                main:                  'index.html',
                notFound:              '404.html',
                enHome:                'pages/en/index.html',
                paquetes:              'pages/servicios/paquetes.html',
                ensambles:             'pages/servicios/ensambles.html',
                mantenimientoMac:      'pages/servicios/mantenimiento-mac.html',
                instalacionWindows:    'pages/servicios/instalacion-windows.html',
                optimizacion:          'pages/servicios/optimizacion.html',
                reparaciones:          'pages/servicios/reparaciones.html',
                reparacionBisagras:    'pages/servicios/reparacion-bisagras.html',
                reparacionControles:   'pages/servicios/reparacion-controles.html',
                b2b:                   'pages/servicios/b2b.html',
                catalogo:              'pages/info/catalogo.html',
                comentarios:           'pages/info/comentarios.html',
                contacto:              'pages/info/contacto.html',
                preguntasFrecuentes:   'pages/info/preguntas-frecuentes.html',
                privacidad:            'pages/legal/privacidad.html',
                garantia:              'pages/legal/garantia.html',
                admin:                 'pages/admin/admin.html',
                limpiezaLiquido:       'pages/servicios/limpieza-laptop-liquido.html',
                antisulfatacion:       'pages/servicios/antisulfatacion.html',
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
                target:    'http://localhost:3001',
                changeOrigin: true,
            },
            '/auth': {
                target:    'http://localhost:3001',
                changeOrigin: true,
            }
        }
    },

    // Preview server (npm run preview): también proxea a Express
    preview: {
        port: 4173,
    },
});
