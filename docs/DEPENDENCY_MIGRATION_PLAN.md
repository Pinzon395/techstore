# Plan de migraciones mayores

No ejecutar estas migraciones junto con parches o cambios de contenido. Cada una debe ir en rama propia, con build limpio, auditorias SEO y prueba de servidor en produccion.

## Astro 7

Riesgos:
- Cambios en el pipeline de build, integracion SSR y adaptador `@astrojs/node`.
- Posibles diferencias en hidratacion, procesamiento de estilos, rutas y generacion de sitemap.

Archivos potencialmente afectados:
- `astro.config.mjs`
- `src/layouts/Base.astro`
- `src/pages/**/*.astro`
- `tools/externalize-inline-js.mjs`
- `tools/generate-sitemap.mjs`

Orden recomendado:
1. Actualizar `astro` y `@astrojs/node` juntos.
2. Ejecutar build y comparar `dist/` contra rutas criticas.
3. Revisar externalizacion de scripts inline y sitemap.

Pruebas necesarias:
- `npm run build`
- `npm run check:all-pages`
- `npm run check:service-seo`
- `npm run check:service-mobile`
- `node tools/audit-built-csp.mjs`

Rollback:
- Revertir `package.json` y `package-lock.json`, reinstalar dependencias y regenerar build.

## Express 5

Riesgos:
- Cambios en manejo de errores async, matching de rutas y middleware.
- Posibles diferencias con `express-session`, `passport`, CORS, rate limiting y endpoints API.

Archivos potencialmente afectados:
- `server/server.js`
- `server/routes/**/*.js`
- `server/middleware/**/*.js`
- `server/services/**/*.js`

Orden recomendado:
1. Auditar rutas y middlewares async.
2. Actualizar Express en aislamiento.
3. Probar autenticacion, sesiones, tickets, APIs y archivos estaticos.

Pruebas necesarias:
- `node --check server/server.js`
- Smoke test de `/`, `/ensambles`, `/api/pc-builder/catalog`, `/health` si existe.
- Pruebas manuales de login, ticket y formulario.
- `npm audit --audit-level=moderate`

Rollback:
- Revertir lockfile y dependencia `express`, reinstalar y reiniciar servicio anterior.

## TypeScript 7

Riesgos:
- Cambios de inferencia, resolucion de modulos y diagnosticos nuevos.
- Puede afectar `astro check`, tipos de datos SEO y componentes Astro con props complejas.

Archivos potencialmente afectados:
- `tsconfig.json`
- `src/**/*.ts`
- `src/**/*.astro`
- `astro.config.mjs`

Orden recomendado:
1. Actualizar TypeScript sin mezclar cambios de framework.
2. Ejecutar typecheck si el proyecto define script mantenible.
3. Corregir diagnosticos sin relajar tipos globales.

Pruebas necesarias:
- `npx astro check`
- `npm run build`
- Auditorias SEO y paginas moviles.

Rollback:
- Revertir `typescript` y lockfile, reinstalar dependencias y repetir build.
