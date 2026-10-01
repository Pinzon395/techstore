import fs from 'node:fs';
import path from 'node:path';

const rawData = JSON.parse(fs.readFileSync('tools/baseline-raw.json', 'utf8'));

let md = `# PIXON PC — PERFORMANCE BASELINE BEFORE (MEDICIÓN REAL EN PRODUCCIÓN)
**Fecha:** ${new Date().toISOString()}  
**Host Auditado:** https://pixon.com.mx  
**Infraestructura:** Cloudflare Workers + Static Assets + Hyperdrive + Aiven MySQL  
**Herramienta de Medición:** Playwright Headless Chromium + Chrome DevTools Protocol (CDP) Throttling  

---

## 1. RESUMEN EJECUTIVO DEL ESTADO ACTUAL (ROOT CAUSES IDENTIFICADAS)

Antes de alterar una sola línea de código, realizamos la auditoría completa en frío y en caliente sobre **18 rutas de producción** bajo tres perfiles de dispositivo reales:

1. **FALLA CRÍTICA EN PRODUCCIÓN (P0) — AIVEN HOSTNAME ENOTFOUND & ERROR 1101:**
   - Todas las llamadas a la base de datos a través de Cloudflare Worker (\`/api/comments\`, \`/api/appointments/availability\`, etc.) fallan con **HTTP 500 / Cloudflare Error 1101 (Worker threw exception)**.
   - **Causa Raíz:** El hostname configurado en Hyperdrive y .env (\`mysql-26d0ac80-luispinzon395-8413.f.aivencloud.com\`) **no existe en DNS público (ENOTFOUND)**.
   - **Impacto de Usuario:** El calendario del Home y las páginas de servicio se quedan eternamente en estado *"Cargando mes..."* y *"Actualizando disponibilidad en vivo..."*. Las reseñas no cargan o fallan silenciosamente. El usuario percibe la web como congelada o rota.

2. **MEGA-NAV GLOBAL MASIVO (P1) — 870 NODOS DOM Y 238 ENLACES POR PÁGINA:**
   - La barra de navegación (\`Navbar.astro\`) inyecta el catálogo completo de más de 138 servicios en el DOM inicial de **TODAS** las páginas en español.
   - En el Home, de 1,903 nodos DOM totales, **870 nodos (45.7%)** pertenecen únicamente al menú de navegación.
   - En contraste, la versión en inglés (\`/en\`), que usa un menú conciso, tiene solo **491 nodos DOM en total** y un LCP de apenas **616ms**.

3. **LLAMADAS API EAGER DESDE EL FIRST RENDER (P1):**
   - El Home dispara automáticamente llamadas a \`/api/appointments/availability/month\`, \`/api/appointments/availability\` y \`/api/commerce/catalog\` apenas parsea el HTML (DOMContentLoaded), a pesar de que el calendario y el marketplace se encuentran a más de 2,000px por debajo del viewport.
   - El script del Home inyecta un iframe de YouTube tras 1.2 segundos, consumiendo cientos de KB en scripts de Google/YouTube antes de cualquier interacción del usuario.

4. **ENSAMBLES CON DOM DESMEDIDO (P2):**
   - \`/ensambles\` alcanza **2,447 nodos DOM**, con SVG masivos de 4,600 líneas de código y sin \`content-visibility: auto\` en secciones inferiores.

5. **FUENTES EXTERNAS Y FONT-AWESOME BLOQUEANTE (P2):**
   - \`Base.astro\` descarga la suite completa de Font-Awesome desde CDN externo (\`cdnjs.cloudflare.com\`) y 10 variantes de fuentes desde Google Fonts (\`Fugaz One\`, 3 pesos de \`Kanit\`, 6 pesos de \`Red Hat Display\`), generando cadenas de conexión seriales (DNS + TLS).

---

## 2. AUDITORÍA DE APIS Y SERVICIOS CLOUD (LATENCIA Y STATUS)

| Endpoint | Método | Status Producción | Latencia Wall-Clock | Comportamiento / Diagnóstico |
|---|---|---|---|---|
| \`/api/health\` | GET | **200 OK** | 80 ms | Worker vivo y respondiendo desde edge. |
| \`/api/me\` | GET | **200 OK** | 350 ms | Responde sin sesión (\`authenticated: false\`) sin tocar DB. |
| \`/api/comments\` | GET | **500 ERROR 1101** | 332 ms | **Worker crash**: Fallo de conexión Hyperdrive a Aiven. |
| \`/api/appointments/availability?date=2026-10-01\` | GET | **500 ERROR 1101** | 123 ms | **Worker crash**: Fallo de conexión Hyperdrive a Aiven. |
| \`/api/tickets?limit=5\` | GET | **404 NOT FOUND** | 94 ms | Endpoint no existe (rutas GET son \`/api/mis-tickets\` o admin). |
| \`/api/commerce/catalog\` | GET | **200 OK** | 110 ms | Responde JSON vacío (\`{ ok: true, data: [] }\`). |
| \`/api/qa/fresh-vs-cached\` | GET | **500 ERROR 1101** | 115 ms | Fallo al conectar a Hyperdrive Fresh y Cached. |

---

## 3. TABLA COMPARATIVA COMPLETA: 18 RUTAS AUDITADAS

### A. DESKTOP FAST (1920x1080 — Sin Throttling)
| Ruta | Cache | LCP (ms) | FCP (ms) | TTFB (ms) | DOM Nodes | Nav Nodes | Transfer (KB) | HTML (KB) | JS (KB) | CSS (KB) | Req Count |
|---|---|---|---|---|---|---|---|---|---|---|---|
`;

for (const r of rawData.filter(d => d.profile === 'DESKTOP_FAST')) {
  md += `| \`${r.urlPath}\` | ${r.isWarm ? 'WARM' : 'COLD'} | ${r.lcpMs} | ${r.fcpMs} | ${r.ttfbMs} | ${r.domNodes} | ${r.navNodes} | ${r.totalKb} | ${r.htmlKb} | ${r.jsKb} | ${r.cssKb} | ${r.totalRequests} |\n`;
}

md += `\n### B. MID MOBILE (390x844 — CPU 4x Throttling, Fast 4G)
| Ruta | Cache | LCP (ms) | FCP (ms) | TTFB (ms) | DOM Nodes | Nav Nodes | Transfer (KB) | HTML (KB) | JS (KB) | CSS (KB) | Req Count |
|---|---|---|---|---|---|---|---|---|---|---|---|
`;

for (const r of rawData.filter(d => d.profile === 'MID_MOBILE')) {
  md += `| \`${r.urlPath}\` | ${r.isWarm ? 'WARM' : 'COLD'} | ${r.lcpMs} | ${r.fcpMs} | ${r.ttfbMs} | ${r.domNodes} | ${r.navNodes} | ${r.totalKb} | ${r.htmlKb} | ${r.jsKb} | ${r.cssKb} | ${r.totalRequests} |\n`;
}

md += `\n### C. LOW END MOBILE (360x800 — CPU 6x Throttling, Slow 4G: 1.6Mbps, 150ms Latency)
| Ruta | Cache | LCP (ms) | FCP (ms) | TTFB (ms) | DOM Nodes | Nav Nodes | Transfer (KB) | HTML (KB) | JS (KB) | CSS (KB) | Req Count |
|---|---|---|---|---|---|---|---|---|---|---|---|
`;

for (const r of rawData.filter(d => d.profile === 'LOW_END_MOBILE')) {
  md += `| \`${r.urlPath}\` | ${r.isWarm ? 'WARM' : 'COLD'} | ${r.lcpMs} | ${r.fcpMs} | ${r.ttfbMs} | ${r.domNodes} | ${r.navNodes} | ${r.totalKb} | ${r.htmlKb} | ${r.jsKb} | ${r.cssKb} | ${r.totalRequests} |\n`;
}

md += `\n---

## 4. ANÁLISIS DETALLADO POR ELEMENTO CRÍTICO

### 4.1. El Menú Global (Navbar)
- **Nodos DOM Navbar en páginas ES:** 870 nodos.
- **Enlaces anchor en Navbar:** 238 enlaces.
- **Porcentaje del DOM total:** 45.7% en Home, 63.7% en /servicios, 63.8% en /tickets.
- **Nodos DOM Navbar en páginas EN (/en):** 11 nodos (apenas 4 enlaces directos).
- **Evidencia directa:** La página /en carga con 491 nodos totales frente a los 1,364 de /tickets o 1,903 de Home.

### 4.2. Home (Inicio)
- **COLD Desktop LCP:** 664 ms
- **COLD Low-End Mobile LCP:** 1,780 ms
- **Nodos DOM:** 1,903 nodos (Máxima profundidad DOM: 20 niveles).
- **Transferencia total:** ~1,089 KB.
- **Scripts:** Carga eager de \`home.js\`, \`home-store.js\`, \`store-cart.js\`, \`comments.js\`.
- **Llamadas a API en carga inicial:** 3 llamadas disparadas inmediatamente (citas mes, citas día, catálogo de tienda).

### 4.3. /ensambles
- **Nodos DOM:** 2,447 nodos (la página más pesada del sitio).
- **COLD Low-End Mobile LCP:** 1,812 ms.
- **Warm Low-End Mobile LCP:** 548 ms.
- **Causa:** Gran cantidad de elementos SVG embebidos inline en el simulador de ensamble y cards repetitivas sin \`content-visibility: auto\`.

### 4.4. /tickets
- **COLD Desktop LCP:** 2,996 ms (pico de latencia en primer render debido a scripts y render-blocking resources).
- **Nodos DOM:** 1,364 nodos.

### 4.5. Third-Parties
- **Google Fonts:** \`fonts.googleapis.com\` y \`fonts.gstatic.com\` descargan múltiples fuentes woff2.
- **Font-Awesome CDN:** \`cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css\` se carga como recurso render-blocking global.
- **Google Analytics:** \`googletagmanager.com/gtag/js\` cargado dinámicamente post-load.
- **YouTube Embed:** En Home tras 1.2s de inactividad si no está en low-end mode. En /catalogo miniaturas directas a \`img.youtube.com\`.

---

## 5. CONCLUSIÓN DEL BASELINE ANTES DE OPTIMIZAR

| Métrica Clave | Medición Baseline Actual | Meta / Budget |
|---|---|---|
| **Aiven DB Connectivity** | ❌ FAILED (DNS ENOTFOUND) | ✅ Resuelto / Resiliente |
| **Home Desktop LCP** | 664 ms | < 500 ms |
| **Home Low-End Mobile LCP** | 1,780 ms | < 1,200 ms |
| **Tickets Desktop LCP** | 2,996 ms | < 800 ms |
| **DOM Nodes Home** | 1,903 nodos | < 1,200 nodos |
| **DOM Nodes Navbar** | 870 nodos | < 150 nodos |
| **Navbar DOM Share** | 45.7% | < 15% |
| **Initial API calls on Home** | 3 eager calls (fallando en 500) | 0 en first render (IntersectionObserver) |

El baseline está formalmente cerrado y registrado. Procederemos con el plan de optimización de alto impacto sin romper la arquitectura existente.
`;

fs.writeFileSync('PERFORMANCE_BASELINE_BEFORE.md', md, 'utf8');
console.log('✅ PERFORMANCE_BASELINE_BEFORE.md generated successfully.');
