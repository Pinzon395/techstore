# PIXON PC — PERFORMANCE BASELINE BEFORE (MEDICIÓN REAL EN PRODUCCIÓN)
**Fecha:** 2026-10-01T01:13:46.550Z  
**Host Auditado:** https://pixon.com.mx  
**Infraestructura:** Cloudflare Workers + Static Assets + Hyperdrive + Aiven MySQL  
**Herramienta de Medición:** Playwright Headless Chromium + Chrome DevTools Protocol (CDP) Throttling  

---

## 1. RESUMEN EJECUTIVO DEL ESTADO ACTUAL (ROOT CAUSES IDENTIFICADAS)

Antes de alterar una sola línea de código, realizamos la auditoría completa en frío y en caliente sobre **18 rutas de producción** bajo tres perfiles de dispositivo reales:

1. **FALLA CRÍTICA EN PRODUCCIÓN (P0) — AIVEN HOSTNAME ENOTFOUND & ERROR 1101:**
   - Todas las llamadas a la base de datos a través de Cloudflare Worker (`/api/comments`, `/api/appointments/availability`, etc.) fallan con **HTTP 500 / Cloudflare Error 1101 (Worker threw exception)**.
   - **Causa Raíz:** El hostname configurado en Hyperdrive y .env (`mysql-26d0ac80-luispinzon395-8413.f.aivencloud.com`) **no existe en DNS público (ENOTFOUND)**.
   - **Impacto de Usuario:** El calendario del Home y las páginas de servicio se quedan eternamente en estado *"Cargando mes..."* y *"Actualizando disponibilidad en vivo..."*. Las reseñas no cargan o fallan silenciosamente. El usuario percibe la web como congelada o rota.

2. **MEGA-NAV GLOBAL MASIVO (P1) — 870 NODOS DOM Y 238 ENLACES POR PÁGINA:**
   - La barra de navegación (`Navbar.astro`) inyecta el catálogo completo de más de 138 servicios en el DOM inicial de **TODAS** las páginas en español.
   - En el Home, de 1,903 nodos DOM totales, **870 nodos (45.7%)** pertenecen únicamente al menú de navegación.
   - En contraste, la versión en inglés (`/en`), que usa un menú conciso, tiene solo **491 nodos DOM en total** y un LCP de apenas **616ms**.

3. **LLAMADAS API EAGER DESDE EL FIRST RENDER (P1):**
   - El Home dispara automáticamente llamadas a `/api/appointments/availability/month`, `/api/appointments/availability` y `/api/commerce/catalog` apenas parsea el HTML (DOMContentLoaded), a pesar de que el calendario y el marketplace se encuentran a más de 2,000px por debajo del viewport.
   - El script del Home inyecta un iframe de YouTube tras 1.2 segundos, consumiendo cientos de KB en scripts de Google/YouTube antes de cualquier interacción del usuario.

4. **ENSAMBLES CON DOM DESMEDIDO (P2):**
   - `/ensambles` alcanza **2,447 nodos DOM**, con SVG masivos de 4,600 líneas de código y sin `content-visibility: auto` en secciones inferiores.

5. **FUENTES EXTERNAS Y FONT-AWESOME BLOQUEANTE (P2):**
   - `Base.astro` descarga la suite completa de Font-Awesome desde CDN externo (`cdnjs.cloudflare.com`) y 10 variantes de fuentes desde Google Fonts (`Fugaz One`, 3 pesos de `Kanit`, 6 pesos de `Red Hat Display`), generando cadenas de conexión seriales (DNS + TLS).

---

## 2. AUDITORÍA DE APIS Y SERVICIOS CLOUD (LATENCIA Y STATUS)

| Endpoint | Método | Status Producción | Latencia Wall-Clock | Comportamiento / Diagnóstico |
|---|---|---|---|---|
| `/api/health` | GET | **200 OK** | 80 ms | Worker vivo y respondiendo desde edge. |
| `/api/me` | GET | **200 OK** | 350 ms | Responde sin sesión (`authenticated: false`) sin tocar DB. |
| `/api/comments` | GET | **500 ERROR 1101** | 332 ms | **Worker crash**: Fallo de conexión Hyperdrive a Aiven. |
| `/api/appointments/availability?date=2026-10-01` | GET | **500 ERROR 1101** | 123 ms | **Worker crash**: Fallo de conexión Hyperdrive a Aiven. |
| `/api/tickets?limit=5` | GET | **404 NOT FOUND** | 94 ms | Endpoint no existe (rutas GET son `/api/mis-tickets` o admin). |
| `/api/commerce/catalog` | GET | **200 OK** | 110 ms | Responde JSON vacío (`{ ok: true, data: [] }`). |
| `/api/qa/fresh-vs-cached` | GET | **500 ERROR 1101** | 115 ms | Fallo al conectar a Hyperdrive Fresh y Cached. |

---

## 3. TABLA COMPARATIVA COMPLETA: 18 RUTAS AUDITADAS

### A. DESKTOP FAST (1920x1080 — Sin Throttling)
| Ruta | Cache | LCP (ms) | FCP (ms) | TTFB (ms) | DOM Nodes | Nav Nodes | Transfer (KB) | HTML (KB) | JS (KB) | CSS (KB) | Req Count |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | COLD | 664 | 664 | 109 | 1903 | 870 | 1089.8 | 151.5 | 161.4 | 354.4 | 52 |
| `/` | WARM | 256 | 256 | 118 | 1900 | 870 | 1073.4 | 150.6 | 141.5 | 354.4 | 50 |
| `/servicios` | COLD | 648 | 648 | 111 | 1364 | 870 | 833.4 | 96.5 | 88.3 | 275.9 | 40 |
| `/servicios` | WARM | 224 | 224 | 143 | 1362 | 870 | 810.6 | 95.6 | 66.5 | 275.9 | 37 |
| `/reparaciones` | COLD | 652 | 652 | 111 | 1451 | 870 | 1268.3 | 122.5 | 91.5 | 272.9 | 51 |
| `/reparaciones` | WARM | 228 | 228 | 108 | 1449 | 870 | 1246.6 | 121.6 | 70.7 | 272.9 | 48 |
| `/instalacion-windows` | COLD | 924 | 816 | 190 | 1561 | 870 | 970.5 | 114.4 | 90.6 | 285.9 | 49 |
| `/instalacion-windows` | WARM | 224 | 224 | 111 | 1559 | 870 | 948.4 | 113.5 | 69.5 | 285.9 | 46 |
| `/empresas` | COLD | 732 | 732 | 105 | 1660 | 870 | 1192 | 138.8 | 89.6 | 298.9 | 47 |
| `/empresas` | WARM | 184 | 184 | 102 | 1658 | 870 | 1169.2 | 137.9 | 67.7 | 298.9 | 44 |
| `/paquetes` | COLD | 696 | 696 | 130 | 1684 | 870 | 936.3 | 137.7 | 104.1 | 277.7 | 42 |
| `/paquetes` | WARM | 196 | 196 | 124 | 1682 | 870 | 914.5 | 136.7 | 83.2 | 277.7 | 39 |
| `/ensambles` | COLD | 808 | 808 | 199 | 2447 | 870 | 1030.1 | 226.1 | 120.1 | 311.3 | 44 |
| `/ensambles` | WARM | 220 | 220 | 134 | 2445 | 870 | 1009.1 | 225.2 | 99.9 | 311.3 | 41 |
| `/comentarios` | COLD | 712 | 712 | 180 | 1354 | 870 | 875.1 | 91.9 | 141.1 | 269.5 | 40 |
| `/comentarios` | WARM | 172 | 172 | 113 | 1352 | 870 | 863.2 | 91 | 121 | 269.5 | 39 |
| `/contacto` | COLD | 760 | 760 | 176 | 1773 | 870 | 900.9 | 140.8 | 86.8 | 294.2 | 42 |
| `/contacto` | WARM | 184 | 184 | 109 | 1771 | 870 | 879.9 | 139.9 | 66.7 | 294.2 | 39 |
| `/catalogo` | COLD | 728 | 728 | 166 | 1354 | 870 | 914.3 | 111 | 92.3 | 268.9 | 46 |
| `/catalogo` | WARM | 172 | 172 | 115 | 1352 | 870 | 867.7 | 110.1 | 71.5 | 268.9 | 42 |
| `/tienda` | COLD | 1048 | 652 | 124 | 1233 | 870 | 1021.6 | 88.7 | 145.6 | 326.1 | 46 |
| `/tienda` | WARM | 228 | 196 | 110 | 1231 | 870 | 960.2 | 87.8 | 124.7 | 326.1 | 43 |
| `/tickets` | COLD | 2996 | 2996 | 122 | 1364 | 870 | 867.3 | 106.4 | 139.8 | 288.1 | 45 |
| `/tickets` | WARM | 188 | 188 | 126 | 1362 | 870 | 801.2 | 105.5 | 118.9 | 288.1 | 41 |
| `/en` | COLD | 616 | 616 | 109 | 491 | 36 | 782.7 | 45.3 | 86.1 | 278.6 | 39 |
| `/en` | WARM | 168 | 168 | 106 | 489 | 36 | 761.4 | 44.4 | 65.8 | 278.6 | 36 |
| `/servicios/laptop/diagnostico` | COLD | 724 | 712 | 174 | 1771 | 870 | 988.3 | 145.5 | 87.6 | 307.4 | 46 |
| `/servicios/laptop/diagnostico` | WARM | 216 | 216 | 120 | 1769 | 870 | 967.6 | 144.6 | 67.7 | 307.4 | 43 |
| `/servicios/laptop/mantenimiento-preventivo` | COLD | 852 | 852 | 163 | 1796 | 870 | 1301.3 | 149.6 | 88.6 | 308.9 | 50 |
| `/servicios/laptop/mantenimiento-preventivo` | WARM | 220 | 220 | 123 | 1794 | 870 | 1279.7 | 148.7 | 67.9 | 308.9 | 47 |
| `/servicios/laptop/cambio-bateria` | COLD | 776 | 776 | 162 | 1903 | 870 | 961.1 | 137 | 88.1 | 307 | 46 |
| `/servicios/laptop/cambio-bateria` | WARM | 196 | 196 | 116 | 1901 | 870 | 939.9 | 136.1 | 67.7 | 307 | 43 |
| `/servicios/pc/lentitud` | COLD | 884 | 884 | 315 | 1774 | 870 | 908.5 | 145.1 | 88.4 | 302.3 | 46 |
| `/servicios/pc/lentitud` | WARM | 232 | 232 | 123 | 1772 | 870 | 886.9 | 144.2 | 67.7 | 302.3 | 43 |
| `/desarrollo-software-paginas-web-cancun` | COLD | 1020 | 1020 | 334 | 2126 | 870 | 900.4 | 153.2 | 87.1 | 287.4 | 43 |
| `/desarrollo-software-paginas-web-cancun` | WARM | 264 | 264 | 124 | 2124 | 870 | 879.5 | 152.3 | 67.2 | 287.4 | 40 |

### B. MID MOBILE (390x844 — CPU 4x Throttling, Fast 4G)
| Ruta | Cache | LCP (ms) | FCP (ms) | TTFB (ms) | DOM Nodes | Nav Nodes | Transfer (KB) | HTML (KB) | JS (KB) | CSS (KB) | Req Count |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | COLD | 968 | 804 | 109 | 1903 | 870 | 1054.5 | 151.5 | 161.7 | 354.6 | 51 |
| `/` | WARM | 288 | 236 | 106 | 1901 | 870 | 1057.5 | 150.6 | 141.5 | 354.6 | 50 |
| `/servicios` | COLD | 1068 | 776 | 113 | 1365 | 870 | 833.5 | 96.5 | 88.3 | 276 | 40 |
| `/servicios` | WARM | 252 | 252 | 114 | 1363 | 870 | 810.7 | 95.6 | 66.5 | 276 | 37 |
| `/reparaciones` | COLD | 944 | 756 | 105 | 1452 | 870 | 1124.6 | 122.5 | 91.2 | 273.1 | 48 |
| `/reparaciones` | WARM | 264 | 264 | 112 | 1450 | 870 | 997.2 | 121.6 | 70.7 | 273.1 | 43 |
| `/instalacion-windows` | COLD | 1260 | 792 | 128 | 1562 | 870 | 970.6 | 114.4 | 90.6 | 286 | 49 |
| `/instalacion-windows` | WARM | 348 | 284 | 109 | 1560 | 870 | 948.6 | 113.5 | 69.5 | 286 | 46 |
| `/empresas` | COLD | 1156 | 1156 | 109 | 1661 | 870 | 1190.7 | 138.8 | 88.1 | 299 | 47 |
| `/empresas` | WARM | 340 | 228 | 106 | 1659 | 870 | 1169.3 | 137.9 | 67.7 | 299 | 44 |
| `/paquetes` | COLD | 1080 | 740 | 109 | 1685 | 870 | 892.2 | 137.7 | 104.1 | 277.8 | 41 |
| `/paquetes` | WARM | 308 | 224 | 113 | 1683 | 870 | 870.4 | 136.7 | 83.2 | 277.8 | 38 |
| `/ensambles` | COLD | 1088 | 852 | 109 | 2448 | 870 | 1030.9 | 226.1 | 120.7 | 311.4 | 44 |
| `/ensambles` | WARM | 260 | 260 | 120 | 2446 | 870 | 1009.2 | 225.2 | 99.9 | 311.4 | 41 |
| `/comentarios` | COLD | 964 | 708 | 106 | 1355 | 870 | 874.7 | 91.9 | 141.1 | 269 | 40 |
| `/comentarios` | WARM | 244 | 244 | 114 | 1353 | 870 | 862.8 | 91 | 121 | 269 | 39 |
| `/contacto` | COLD | 996 | 796 | 127 | 1774 | 870 | 901.1 | 140.8 | 86.9 | 294.3 | 42 |
| `/contacto` | WARM | 236 | 236 | 109 | 1772 | 870 | 880 | 139.9 | 66.7 | 294.3 | 39 |
| `/catalogo` | COLD | 984 | 744 | 105 | 1355 | 870 | 889 | 111 | 91.7 | 269 | 45 |
| `/catalogo` | WARM | 244 | 244 | 111 | 1353 | 870 | 867.8 | 110.1 | 71.5 | 269 | 42 |
| `/tienda` | COLD | 1256 | 732 | 103 | 1234 | 870 | 1020.7 | 88.7 | 144.6 | 326.2 | 46 |
| `/tienda` | WARM | 396 | 284 | 107 | 1232 | 870 | 911.5 | 87.8 | 124.7 | 326.2 | 42 |
| `/tickets` | COLD | 976 | 724 | 103 | 1365 | 870 | 818.6 | 106.4 | 139.7 | 288.2 | 43 |
| `/tickets` | WARM | 324 | 256 | 124 | 1363 | 870 | 801.4 | 105.5 | 118.9 | 288.2 | 41 |
| `/en` | COLD | 972 | 972 | 153 | 492 | 36 | 782.9 | 45.3 | 86.2 | 278.7 | 39 |
| `/en` | WARM | 240 | 240 | 99 | 490 | 36 | 761.6 | 44.4 | 65.8 | 278.7 | 36 |
| `/servicios/laptop/diagnostico` | COLD | 1136 | 812 | 111 | 1772 | 870 | 988.8 | 145.5 | 87.9 | 307.5 | 46 |
| `/servicios/laptop/diagnostico` | WARM | 308 | 308 | 106 | 1770 | 870 | 967.7 | 144.6 | 67.7 | 307.5 | 43 |
| `/servicios/laptop/mantenimiento-preventivo` | COLD | 1164 | 852 | 110 | 1797 | 870 | 1300.4 | 149.6 | 88.1 | 308.5 | 50 |
| `/servicios/laptop/mantenimiento-preventivo` | WARM | 340 | 228 | 114 | 1795 | 870 | 1279.3 | 148.7 | 67.9 | 308.5 | 47 |
| `/servicios/laptop/cambio-bateria` | COLD | 1012 | 768 | 105 | 1904 | 870 | 961.8 | 137 | 88.6 | 307.1 | 46 |
| `/servicios/laptop/cambio-bateria` | WARM | 304 | 216 | 107 | 1902 | 870 | 940 | 136.1 | 67.7 | 307.1 | 43 |
| `/servicios/pc/lentitud` | COLD | 1044 | 752 | 110 | 1775 | 870 | 909.3 | 145.1 | 89.6 | 301.9 | 46 |
| `/servicios/pc/lentitud` | WARM | 316 | 220 | 109 | 1773 | 870 | 886.5 | 144.2 | 67.7 | 301.9 | 43 |
| `/desarrollo-software-paginas-web-cancun` | COLD | 1192 | 868 | 123 | 2127 | 870 | 901.4 | 153.2 | 88 | 287.5 | 43 |
| `/desarrollo-software-paginas-web-cancun` | WARM | 252 | 252 | 106 | 2125 | 870 | 879.6 | 152.3 | 67.2 | 287.5 | 40 |

### C. LOW END MOBILE (360x800 — CPU 6x Throttling, Slow 4G: 1.6Mbps, 150ms Latency)
| Ruta | Cache | LCP (ms) | FCP (ms) | TTFB (ms) | DOM Nodes | Nav Nodes | Transfer (KB) | HTML (KB) | JS (KB) | CSS (KB) | Req Count |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | COLD | 1780 | 1512 | 106 | 1903 | 870 | 1054.6 | 151.5 | 161.8 | 354.6 | 51 |
| `/` | WARM | 372 | 296 | 105 | 1901 | 870 | 1037.9 | 150.6 | 141.5 | 354.6 | 49 |
| `/servicios` | COLD | 1548 | 1252 | 129 | 1365 | 870 | 833.5 | 96.5 | 88.3 | 276 | 40 |
| `/servicios` | WARM | 356 | 356 | 111 | 1363 | 870 | 810.7 | 95.6 | 66.5 | 276 | 37 |
| `/reparaciones` | COLD | 1616 | 1316 | 114 | 1452 | 870 | 1019.7 | 122.5 | 92.3 | 273.1 | 46 |
| `/reparaciones` | WARM | 520 | 356 | 109 | 1450 | 870 | 997.2 | 121.6 | 70.7 | 273.1 | 43 |
| `/instalacion-windows` | COLD | 2148 | 1320 | 109 | 1562 | 870 | 969.7 | 114.4 | 89.6 | 286 | 49 |
| `/instalacion-windows` | WARM | 504 | 324 | 109 | 1560 | 870 | 948.6 | 113.5 | 69.5 | 286 | 46 |
| `/empresas` | COLD | 2052 | 1540 | 116 | 1661 | 870 | 1190.6 | 138.8 | 88.1 | 299 | 47 |
| `/empresas` | WARM | 436 | 304 | 112 | 1659 | 870 | 1169.3 | 137.9 | 67.7 | 299 | 44 |
| `/paquetes` | COLD | 1928 | 1396 | 136 | 1685 | 870 | 890.2 | 137.7 | 102 | 277.8 | 41 |
| `/paquetes` | WARM | 372 | 372 | 111 | 1683 | 870 | 870.4 | 136.7 | 83.2 | 277.8 | 38 |
| `/ensambles` | COLD | 1812 | 1432 | 133 | 2448 | 870 | 1030.1 | 226.1 | 119.9 | 311.4 | 44 |
| `/ensambles` | WARM | 548 | 300 | 106 | 2446 | 870 | 1009.2 | 225.2 | 99.9 | 311.4 | 41 |
| `/comentarios` | COLD | 1568 | 1260 | 107 | 1355 | 870 | 874.8 | 91.9 | 141.2 | 269 | 40 |
| `/comentarios` | WARM | 396 | 308 | 123 | 1353 | 870 | 862.8 | 91 | 121 | 269 | 39 |
| `/contacto` | COLD | 1620 | 1332 | 107 | 1774 | 870 | 901.6 | 140.8 | 87.4 | 294.3 | 42 |
| `/contacto` | WARM | 388 | 332 | 124 | 1772 | 870 | 880 | 139.9 | 66.7 | 294.3 | 39 |
| `/catalogo` | COLD | 1576 | 1232 | 106 | 1355 | 870 | 889.9 | 111 | 92.7 | 269 | 45 |
| `/catalogo` | WARM | 360 | 360 | 108 | 1353 | 870 | 867.8 | 110.1 | 71.5 | 269 | 42 |
| `/tienda` | COLD | 2100 | 1296 | 121 | 1234 | 870 | 1020.7 | 88.7 | 144.6 | 326.2 | 46 |
| `/tienda` | WARM | 600 | 312 | 109 | 1232 | 870 | 911.5 | 87.8 | 124.7 | 326.2 | 42 |
| `/tickets` | COLD | 1672 | 1312 | 121 | 1365 | 870 | 818.6 | 106.4 | 139.8 | 288.2 | 43 |
| `/tickets` | WARM | 380 | 304 | 103 | 1363 | 870 | 801.4 | 105.5 | 118.9 | 288.2 | 41 |
| `/en` | COLD | 1576 | 1576 | 108 | 492 | 36 | 782.6 | 45.3 | 85.9 | 278.7 | 39 |
| `/en` | WARM | 372 | 372 | 105 | 490 | 36 | 761.6 | 44.4 | 65.8 | 278.7 | 36 |
| `/servicios/laptop/diagnostico` | COLD | 1952 | 1368 | 123 | 1772 | 870 | 987.5 | 145.5 | 86.6 | 307.5 | 46 |
| `/servicios/laptop/diagnostico` | WARM | 424 | 424 | 119 | 1770 | 870 | 967.7 | 144.6 | 67.7 | 307.5 | 43 |
| `/servicios/laptop/mantenimiento-preventivo` | COLD | 2044 | 1540 | 118 | 1797 | 870 | 1301.3 | 149.6 | 89.1 | 308.5 | 50 |
| `/servicios/laptop/mantenimiento-preventivo` | WARM | 416 | 416 | 111 | 1795 | 870 | 1279.3 | 148.7 | 67.9 | 308.5 | 47 |
| `/servicios/laptop/cambio-bateria` | COLD | 1988 | 1408 | 106 | 1904 | 870 | 961 | 137 | 87.8 | 307.1 | 46 |
| `/servicios/laptop/cambio-bateria` | WARM | 408 | 300 | 112 | 1902 | 870 | 940 | 136.1 | 67.7 | 307.1 | 43 |
| `/servicios/pc/lentitud` | COLD | 1912 | 1404 | 113 | 1775 | 870 | 908.3 | 145.1 | 88.6 | 301.9 | 46 |
| `/servicios/pc/lentitud` | WARM | 556 | 404 | 116 | 1773 | 870 | 886.5 | 144.2 | 67.7 | 301.9 | 43 |
| `/desarrollo-software-paginas-web-cancun` | COLD | 1804 | 1344 | 121 | 2127 | 870 | 901 | 153.2 | 87.6 | 287.5 | 43 |
| `/desarrollo-software-paginas-web-cancun` | WARM | 424 | 332 | 123 | 2125 | 870 | 879.6 | 152.3 | 67.2 | 287.5 | 40 |

---

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
- **Scripts:** Carga eager de `home.js`, `home-store.js`, `store-cart.js`, `comments.js`.
- **Llamadas a API en carga inicial:** 3 llamadas disparadas inmediatamente (citas mes, citas día, catálogo de tienda).

### 4.3. /ensambles
- **Nodos DOM:** 2,447 nodos (la página más pesada del sitio).
- **COLD Low-End Mobile LCP:** 1,812 ms.
- **Warm Low-End Mobile LCP:** 548 ms.
- **Causa:** Gran cantidad de elementos SVG embebidos inline en el simulador de ensamble y cards repetitivas sin `content-visibility: auto`.

### 4.4. /tickets
- **COLD Desktop LCP:** 2,996 ms (pico de latencia en primer render debido a scripts y render-blocking resources).
- **Nodos DOM:** 1,364 nodos.

### 4.5. Third-Parties
- **Google Fonts:** `fonts.googleapis.com` y `fonts.gstatic.com` descargan múltiples fuentes woff2.
- **Font-Awesome CDN:** `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css` se carga como recurso render-blocking global.
- **Google Analytics:** `googletagmanager.com/gtag/js` cargado dinámicamente post-load.
- **YouTube Embed:** En Home tras 1.2s de inactividad si no está en low-end mode. En /catalogo miniaturas directas a `img.youtube.com`.

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
