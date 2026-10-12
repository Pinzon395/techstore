# Auditoría visual y SEO local · pixon.com.mx · 12-oct-2026

Rama: `audit/seo-visual-2026-10` (sin desplegar). Producción auditada: https://pixon.com.mx

## Alcance y método

- **192 vistas**: las 189 URLs del sitemap + `/tickets`, `/carrito`, `/checkout`, `/tienda/promociones`, `/catalogo`, `/comentarios`, `/preguntas-frecuentes`, `/contacto` y una URL inexistente (404). Las rutas privadas (`/admin`, `/cuenta`, `/auth/*`) no se auditaron.
- Cada vista se cargó en Chromium real a **1440 px (escritorio) y 390 px (móvil)**, con captura, métricas de layout (CLS, LCP, desbordes), contraste WCAG, tamaños de letra, iconos del sprite, errores de consola/red, title, description, canonical, H1, jerarquía de encabezados y JSON-LD. Google Analytics se bloqueó para no ensuciar datos.
- SEO: export de Search Console (últimos 3 meses al 25-ago-2026) en `Downloads/pixon.com.mx-Performance-on-Search-2026-08-25`.
- Las correcciones se validaron en local (`localhost:3002`, base local) con el mismo rastreo, `npm run build`, `check:indexation`, `check:links`, `check:jsonld`, `check:claims`, `check:service-seo`, `check:i18n`.

## Corregido en esta rama

| # | Problema (evidencia) | Causa raíz | Cambio |
|---|---|---|---|
| 1 | **Preguntas frecuentes vacía**: "0 respuestas / No encontramos esa pregunta" (79 respuestas existían en el HTML). | El script leía `<template>.textContent` (siempre vacío) y `/api/faqs` devuelve `[]`; al combinar ambos reemplazaba el contenido por nada. | Lee `template.content`; si el panel no trae FAQs conserva el contenido renderizado. Estilos faltantes de la barra de estado/filtros. Barra fija desactivada en móvil (ocupaba media pantalla). |
| 2 | **CLS 0.1–0.77 en ~100 vistas de escritorio** (`/tienda` 0.65, `/paquetes` 0.32, `/servicios` 0.21, fichas de servicio ~0.25). | Tres causas medidas por separado: (a) `content-visibility:auto` global con `contain-intrinsic-size: 400px 1px` (cada sección fuera de pantalla medía **1 px**); (b) Font Awesome de cdnjs en asíncrono: los `<i class="fa-*">` medían 0 y crecían al cargar; (c) Google Fonts en asíncrono con `swap`. | (a) regla global retirada; (b) espacio reservado con `:where(i.fa-*)` de especificidad 0; (c) fuentes Kanit y Red Hat Display **autoalojadas** (OFL) con `preload` + `font-display: optional`. Resultado local: **0.003–0.009** en todas las vistas medidas. |
| 3 | **Bloque "Servicios relacionados" invisible** (títulos blancos sobre fondo claro) en 22 vistas: `/antisulfatacion`, `/servicios/b2b/soporte-hoteles`, `/servicios/laptop/recuperacion-datos`, `/servicios/laptop/pasta-termica`, `/servicios/consola/fuente`, `/servicios/consola/pasta-termica`, `/servicios/consola/sobrecalentamiento`, `/servicios/mac/mantenimiento-macbook`, `/servicios/consola/limpieza-metal-liquido-ps5`, entre otras. | La regla global `section:not(...)` (especificidad 0,4,1) pone fondo claro a toda sección y pisa el fondo oscuro del componente. | El componente detecta su fondo final y usa la variante clara existente cuando corresponde. |
| 4 | **`/en/store`: H1 invisible** (blanco sobre blanco). | Misma regla global. | El hero de tienda declara su fondo con prioridad (es un hero; por marca debe ser oscuro). |
| 5 | **Iconos vacíos**: `fa-calendar-days`, `fa-arrow-left` (calendario de inicio), `fa-hand-holding-heart` (`/contacto`), `fa-list`, `fa-cloud-rain` (blog de mantenimiento), `fa-gauge-simple-high` (Xbox sobrecalentamiento), `fa-code` (desarrollo de software), `fa-pause` (inicio) y 5 iconos del panel admin. | Se usaban en el código pero no existían en `sprite.svg`. | 13 símbolos añadidos desde Font Awesome Free 6.4.0 (misma fuente que `tools/create-fa-sprite.mjs`). |
| 6 | **Horario contradictorio**: inicio "11 AM–10 PM", `/tickets` "Lunes a Sábado", `/privacidad` "9:00–19:00", otras "Lunes a Domingo". Sin `openingHoursSpecification` en el negocio. | Texto duplicado a mano en 7 archivos. | Fuente única `openingHours` en `src/lib/business.ts` (lun–sáb 11:00–22:00, dom 11:00–18:00, igual que la agenda real de producción) usada en textos y en el schema `LocalBusiness`. |
| 7 | **Sombra gris sobre el logo** en todas las páginas. | El enlace oculto "Saltar al contenido" dejaba ver su `box-shadow`. | La sombra solo aparece al enfocarlo. |
| 8 | **Breadcrumb tapado por el navbar** (73 px de alto vs. 54–58 px de margen); visible en todas las vistas `/en/*` y en móvil. | Margen fijo desactualizado. | Margen = alto real del navbar (73 px). |
| 9 | **Banner "Visiting Cancun? Switch to English"** en todas las páginas en español, también para visitantes en español. | Se mostraba siempre. | Solo aparece si el navegador no está en español. |
| 10 | **Tres botones flotantes en móvil** (subir, carrito, WhatsApp) tapando contenido. | — | "Subir" oculto en móvil (el gesto nativo ya existe). |
| 11 | **CTA principal de WhatsApp** con texto blanco sobre `#25d366`: contraste 2:1. | — | Verde `#128c55` (cumple AA texto grande). |
| 12 | **H1 encimado sobre la foto** en `/servicios/b2b/mantenimiento-flotilla` y `/servicios/b2b/polizas-mantenimiento`. | Tamaño de hasta 6.1 rem: "Mantenimiento" medía 650 px en una columna de 576 px. | Escala reducida + `overflow-wrap`/`hyphens`. |
| 13 | **Imagen 404** en `/servicios/laptop/reparacion-lenovo`. | Ruta `/responsive/` inexistente. | Ruta corregida. |
| 14 | **400 en cada visita** a `/servicios/telefono/reparacion-pantalla-iphone`. | Telemetría propia enviaba eventos que el servidor no acepta. | Retirada (los clics a WhatsApp ya los mide `tracker.js`). |
| 15 | **Sitemap con URLs que no deben indexarse**: `/garantia` (301 a `/politica-de-garantia`, título/H1 duplicados) y `/tienda/promociones` (63 palabras, "No hay promociones activas"). | — | Ambas `noindex, follow`; sitemap 189 → 187 URLs. |
| 16 | **Promesa sin diagnóstico**: "Temperaturas bajan 20–30 °C garantizado" (`/servicios/pc/limpieza-profunda`) y "Trabajo impecable garantizado" (schema de bisagras). | Contradice la regla de marca "diagnóstico antes que promesa". | Texto factual (medición antes/después, garantía por escrito). |
| 17 | **Acentos faltantes** en title/H1/descripción de 12 vistas (redes, Mac, B2B, iPhone botones/bocina/micrófono/diagnóstico). | Datos escritos sin acentos. | Corregidos (solo textos visibles; slugs y rutas intactos). |
| 18 | **Mezcla de fuentes**: `Inter` declarada en 19 archivos pero nunca cargada (caía a fuente del sistema). | — | Unificado a `var(--font-main)`. |
| 19 | **Canibalización** "mantenimiento de computadoras en Cancún" (posición 48 en GSC): el blog usaba el mismo título comercial y no enlazaba a la página de servicio. | — | Blog con título/H1 informativo ("Guía…") y enlace a `/mantenimiento-preventivo-computadora`. |
| 20 | **"ensamblado de computadoras en Cancún" posición 38**: el título de `/ensambles` no decía "ensamble". | — | Título: "Ensamble de PC Gamer en Cancún \| Armado a medida". |
| 21 | **Páginas en inglés con 140–220 palabras** mientras "computer repair" y "laptop repair" suman ~28 k impresiones con ~0 clics. | Contenido mínimo. | `/en/computer-repair`, `/en/laptop-repair`, `/en/phone-repair`: bloque con precio de diagnóstico, horario, ubicación, recolección en Zona Hotelera, FAQ visible y enlaces internos (solo datos reales de `business.ts`). |

## Pendiente (no se cambió: requiere decisión, fotos reales o contenido)

### P1 · Impacto alto
1. **Fotos repetidas o equivocadas** (la política del proyecto prohíbe stock/IA; ver `docs/MISSING_REAL_PHOTOS.md`):
   - Consolas: la misma foto Xbox/PS5 en `reparacion-ps5`, `reparacion-nintendo-switch`, `reparacion-xbox`, `controles-drift` (un control sería lo correcto), `lector-disco`, `no-da-imagen`, `diagnostico`, `cambio-hdmi-ps5`, `ps5-se-apaga`.
   - iPhone: la misma foto interna en `iphone-no-prende`, `iphone-se-reinicia`, `iphone-sin-senal`, `reparacion-placa-iphone`, `reparacion-tapa-trasera-iphone`, `reparacion-wifi-bluetooth-iphone`, `software-iphone`, `reparacion-lente-camara-iphone`.
   - Android: misma placa en Samsung, Xiaomi, Motorola y Huawei.
   - Mac: Mac mini en `recuperacion-datos-mac`, `soporte-agencias` y `soporte-restaurantes`; placa de MacBook en `teclado-macbook` (debería verse el teclado).
   - PC: misma foto en `no-enciende`, `tarjeta-madre`, `refrigeracion`.
2. **Páginas casi clonadas** (riesgo de "doorway pages"): impresoras por marca (`reparacion-brother/canon/epson/hp`, `no-imprime`, `cabezal`, `toner`, `wifi-impresora`) usan el mismo bloque y textos; celulares por marca y por falla de iPhone repiten "Cotización por modelo · 24–72 h". Cada página necesita al menos un bloque propio (fallas típicas reales de esa marca/modelo, casos atendidos, precios desde).
3. **Canibalización restante**: `/mantenimiento-mac` vs `/servicios/mac/mantenimiento-macbook` (mismo servicio, dos URLs) y `/paquetes` vs `/mantenimiento-preventivo-computadora`. Recomendación: una sola URL por intención (301 de la débil a la fuerte). No se hizo porque las reglas del repo prohíben cambiar rutas sin autorización.
4. **Reseñas**: `/comentarios` muestra el formulario antes de las reseñas, solo 4 reseñas y todas como "Comentario de cliente" (sin nombre). Con `GOOGLE_PLACES_API_KEY` el carrusel puede mostrar reseñas reales de Google Maps.
5. **Tiempos de diagnóstico**: el sitio dice "menos de 2 horas" (`/tickets`), "24–48 h", "24–72 h", "1–2 h", "mismo día" según la página. Si dependen del servicio está bien, pero `/tickets` lo promete para todos los equipos. NEEDS CONFIRMATION del dueño.
6. **Coordenadas del negocio** (`geo` 21.0512, -86.8475 en el schema): confirmar que corresponden a Cto. Hacienda Chimay.

### P2 · Mejora importante (sistema visual)
- **Tipografía**: 32 tamaños de letra distintos por página en promedio (41 en inicio); se recomiendan 7. Títulos en cursiva negrita en casi todas las vistas (8,900 encabezados en cursiva en el sitio) y degradado azul‑morado en palabras clave de heros (`/paquetes`, `/catalogo`, `/comentarios`, `/preguntas-frecuentes`, `/reparaciones`, impresoras "Profesional"). Es el patrón más asociado a "diseño genérico de IA".
- **Contraste**: promedio de 34 textos por página bajo WCAG AA (grises claros sobre blanco y etiquetas cian sobre fondo claro).
- **Etiquetas en MAYÚSCULAS** sobre cada título (61 en inicio) y cifras de vanidad sin decisión asociada ("148 servicios activos", "01 02 03 04" en `/comentarios`).
- **Mismo hero en todas las categorías** (tarjeta blanca + tarjeta azul con número): `/servicios`, `/servicios/laptop`, `/servicios/pc`, `/servicios/telefono`, `/servicios/impresora`, `/servicios/mac`, `/servicios/redes`, `/servicios/consola`.
- **`/blogs`**: el H1 ocupa toda la primera pantalla; `/blogs/pasta-termica-vs-metal-liquido` mide ~19,700 px sin índice.
- **`/tienda`**: 3 productos en una cuadrícula grande; fotos con proporciones y fondos distintos.
- **Font Awesome completo desde cdnjs** (≈100 KB + fuentes) para 3,143 iconos `<i>`; migrar al sprite local eliminaría una dependencia externa.

### P3 · Refinamiento
- Descripciones de más de 160 caracteres en algunas vistas (ver apéndice).
- `/limpieza-laptop` usa "Envíos desde México" en el title (confuso para búsqueda local).
- Saltos de nivel de encabezado (H2→H4) en varias fichas.

## SEO local Cancún · lectura de Search Console y plan

**Datos (3 meses al 25-ago-2026, Web):** 621 clics, ~72,700 impresiones, posición media ~5.8.
- **"computer repair" 14,383 y "laptop repair" 14,280 impresiones, 1 clic**, posición ~3–4: Google muestra la página en español a búsquedas en inglés hechas en México (turistas/expats). → Hecho: páginas `/en` enriquecidas. Siguiente: enlazar `/en/computer-repair` y `/en/laptop-repair` desde la home en inglés y desde el banner para visitantes en inglés; revisar en GSC qué URL se muestra para esas consultas tras el deploy.
- **"reparacion de celulares cancun"** posición 6.9, CTR 0.27 %; `/servicios/telefono` 5,159 impresiones con CTR 0.25 %. → Title/description con precio "desde" y garantía visibles en el snippet; y las fotos/textos propios por marca (P1).
- **Consultas comerciales lejos del top 10**: "mantenimiento de computadoras en cancún" (48), "ensamblado de computadoras en cancún" (38), "desarrollo web cancun" (33), "reparación de impresoras" (20), "reparacion de impresoras cancun" (11.7), "pc gamer cancun" (10.4). → Una URL fuerte por intención (canibalización P1), enlaces internos con el texto exacto desde inicio y categorías, y contenido propio.
- **Fragmentos de producto**: 7,103 impresiones (posición 9.5) → completar `Product` con disponibilidad, precio y reseñas reales.
- **Fuera del sitio (mayor impacto en el "map pack")**: Google Business Profile con categorías correctas ("Servicio de reparación de computadoras", "Tienda de reparación de teléfonos móviles"), horario igual al del sitio (ya unificado), fotos reales del taller, respuestas a reseñas y solicitud sistemática de reseñas al entregar cada equipo. Citas NAP idénticas (nombre, dirección, teléfono) en directorios locales.

## Apéndice · hallazgos automáticos por vista (producción, antes de esta rama)

Los CLS marcados "(corregido)" quedaron por debajo de 0.01 en local. Los conteos de contraste y tamaños de letra son del sistema visual (P2) y no se corrigieron vista por vista.

| Vista | Hallazgos automáticos en producción (12-oct-2026) |
|---|---|
| / | iconos faltantes: fa-calendar-days,fa-arrow-left; contraste bajo 35; 41 tamaños de letra; 99 textos <12px móvil |
| /404-no-existe-qa | noindex; red: 404 /404-no-existe-qa |
| /antisulfatacion | CLS 0.19 (corregido); desc larga 166; 1 saltos de nivel; contraste bajo 61; 33 tamaños de letra |
| /blogs | contraste bajo 33; contenido escaso 257 palabras |
| /blogs/aplicacion-metal-liquido-cancun | 3 saltos de nivel; contraste bajo 70; 39 tamaños de letra |
| /blogs/humedad-salitre-calor-cancun | title largo 74; desc larga 168; contraste bajo 50; 39 tamaños de letra |
| /blogs/mantenimiento-preventivo-equipos-cancun | CLS 0.25 (corregido); title largo 73; desc larga 172; iconos faltantes: bladeLp,bladePc,bladeCs,fa-list,fa-cloud-rain; contraste bajo 39; 38 tamaños de letra |
| /blogs/pasta-termica-vs-metal-liquido | CLS 0.12 (corregido); 1 saltos de nivel; contraste bajo 56; 37 tamaños de letra; 41 textos <12px móvil |
| /blogs/reparacion-bisagras-carcasas-laptop-cancun | CLS 0.14 (corregido); contraste bajo 49; 39 tamaños de letra |
| /carrito | title corto 18; desc corta 49; noindex |
| /catalogo | CLS 0.28 (corregido); 1 saltos de nivel; contraste bajo 39; 30 tamaños de letra |
| /checkout | title corto 19; desc corta 66; noindex; contraste bajo 22 |
| /comentarios | CLS 0.17 (corregido); 1 saltos de nivel; contraste bajo 23; 27 tamaños de letra |
| /contacto | title largo 78; desc larga 235; iconos faltantes: fa-hand-holding-heart; contraste bajo 39; 30 tamaños de letra |
| /desarrollo-software-paginas-web-cancun | CLS 0.16 (corregido); desc larga 181; 1 saltos de nivel; iconos faltantes: fa-code; contraste bajo 36; 34 tamaños de letra; 82 textos <12px móvil |
| /desbloqueo-icloud-cancun | CLS 0.11 (corregido); desc larga 184; contraste bajo 46; 37 tamaños de letra |
| /empresas | title largo 71; desc larga 214; 1 saltos de nivel; contraste bajo 68; 35 tamaños de letra |
| /en | Sin hallazgos automáticos |
| /en/business-it-support | contraste bajo 22; contenido escaso 148 palabras |
| /en/business-wifi | contraste bajo 22; contenido escaso 140 palabras |
| /en/computer-repair | contenido escaso 217 palabras |
| /en/contact | desc corta 88; contraste bajo 22; contenido escaso 146 palabras |
| /en/custom-pc-builds | desc corta 81; contraste bajo 22; contenido escaso 143 palabras |
| /en/data-recovery | desc corta 86; contraste bajo 22; contenido escaso 151 palabras |
| /en/game-console-repair | contraste bajo 22; contenido escaso 145 palabras |
| /en/graphics-card-repair | contraste bajo 22; contenido escaso 152 palabras |
| /en/iphone-battery-replacement | 27 tamaños de letra |
| /en/laptop-repair | desc larga 166; contenido escaso 212 palabras |
| /en/liquid-damage | 28 tamaños de letra |
| /en/macbook-repair | contraste bajo 22; contenido escaso 144 palabras |
| /en/pc-optimization | CLS 0.11 (corregido); 4 saltos de nivel; contraste bajo 33; 35 tamaños de letra; 47 textos <12px móvil |
| /en/phone-repair | desc larga 176; contenido escaso 210 palabras |
| /en/printer-repair | contraste bajo 22; contenido escaso 149 palabras |
| /en/ps5-repair | contraste bajo 22; contenido escaso 151 palabras |
| /en/services | desc corta 84; contraste bajo 22; contenido escaso 137 palabras |
| /en/store | contraste bajo 21 |
| /en/tickets | Sin hallazgos automáticos |
| /ensambles | CLS 0.17 (corregido); contraste bajo 43; 40 tamaños de letra |
| /garantia | canonical→/politica-de-garantia; contraste bajo 21 |
| /instalacion-windows | 2 saltos de nivel; contraste bajo 32; 39 tamaños de letra |
| /limpieza-laptop | contraste bajo 39; 37 tamaños de letra |
| /limpieza-laptop-liquido | desc larga 168; 4 saltos de nivel; contraste bajo 48; 33 tamaños de letra |
| /mantenimiento-mac | contraste bajo 23; 33 tamaños de letra |
| /mantenimiento-pc-laptop-domicilio-cancun | CLS 0.18 (corregido); desc larga 166; 2 saltos de nivel; contraste bajo 31; 33 tamaños de letra |
| /mantenimiento-preventivo-computadora | CLS 0.24 (corregido); desc larga 175; contraste bajo 22; 30 tamaños de letra |
| /optimizacion | desc larga 166; 3 saltos de nivel; contraste bajo 41; 37 tamaños de letra |
| /paquetes | CLS 0.32 (corregido); 1 saltos de nivel; contraste bajo 35; 33 tamaños de letra |
| /politica-de-envios-y-devoluciones | desc corta 82; contraste bajo 22; contenido escaso 213 palabras |
| /politica-de-garantia | contraste bajo 21 |
| /preguntas-frecuentes | desc larga 167; 1 saltos de nivel; contraste bajo 21 |
| /privacidad | contraste bajo 24 |
| /reparacion-bisagras | desc larga 167; 1 saltos de nivel; contraste bajo 37; 32 tamaños de letra |
| /reparacion-controles | CLS 0.11 (corregido); title largo 69; desc larga 177; contraste bajo 43; 30 tamaños de letra |
| /reparaciones | CLS 0.13 (corregido); contraste bajo 32; 30 tamaños de letra |
| /servicios | CLS 0.21 (corregido); contraste bajo 30; 31 tamaños de letra |
| /servicios/b2b/mantenimiento-flotilla | CLS 0.17 (corregido); desc larga 250; 1 saltos de nivel; contraste bajo 30; 37 tamaños de letra |
| /servicios/b2b/polizas-mantenimiento | CLS 0.12 (corregido); desc larga 172; 1 saltos de nivel; contraste bajo 30; 37 tamaños de letra |
| /servicios/b2b/soporte-agencias | CLS 0.12 (corregido); desc larga 249; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/b2b/soporte-hoteles | CLS 0.18 (corregido); 1 saltos de nivel; contraste bajo 54; 35 tamaños de letra; 49 textos <12px móvil |
| /servicios/b2b/soporte-oficinas | CLS 0.11 (corregido); 1 saltos de nivel; contraste bajo 31; 33 tamaños de letra |
| /servicios/b2b/soporte-restaurantes | CLS 0.11 (corregido); desc larga 253; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/b2b/wifi-empresarial | 2 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/consola | CLS 0.14 (corregido); contraste bajo 23; 32 tamaños de letra; 60 textos <12px móvil |
| /servicios/consola/cambio-hdmi-ps5 | CLS 0.11 (corregido); title largo 68; 1 saltos de nivel; contraste bajo 29; 35 tamaños de letra |
| /servicios/consola/controles-drift | desc larga 202; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/diagnostico | CLS 0.11 (corregido); desc larga 219; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/fuente | CLS 0.15 (corregido); 1 saltos de nivel; contraste bajo 42; 31 tamaños de letra |
| /servicios/consola/hdmi | CLS 0.17 (corregido); 2 saltos de nivel; contraste bajo 36; 37 tamaños de letra |
| /servicios/consola/lector-disco | desc larga 203; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/limpieza-interna | CLS 0.24 (corregido); desc larga 172; 1 saltos de nivel; contraste bajo 30; 40 tamaños de letra |
| /servicios/consola/limpieza-metal-liquido-ps5 | CLS 0.11 (corregido); title largo 68; 1 saltos de nivel; contraste bajo 45; 31 tamaños de letra |
| /servicios/consola/mantenimiento-nintendo-switch | title largo 77; 41 tamaños de letra; 50 textos <12px móvil |
| /servicios/consola/mantenimiento-preventivo | CLS 0.14 (corregido); title largo 67; 1 saltos de nivel; contraste bajo 23; 35 tamaños de letra |
| /servicios/consola/mantenimiento-ps5 | CLS 0.14 (corregido); 37 tamaños de letra; 42 textos <12px móvil |
| /servicios/consola/no-da-imagen | desc larga 204; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/no-enciende | desc larga 199; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/pasta-termica | CLS 0.10 (corregido); title largo 66; 1 saltos de nivel; contraste bajo 46; 31 tamaños de letra |
| /servicios/consola/ps5-se-apaga | 1 saltos de nivel; contraste bajo 31; 32 tamaños de letra |
| /servicios/consola/reparacion-nintendo-switch | CLS 0.13 (corregido); desc larga 214; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/reparacion-ps5 | desc larga 218; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/reparacion-xbox | CLS 0.18 (corregido); desc larga 210; 1 saltos de nivel; contraste bajo 35; 32 tamaños de letra |
| /servicios/consola/sobrecalentamiento | CLS 0.14 (corregido); desc larga 168; 1 saltos de nivel; contraste bajo 45; 31 tamaños de letra |
| /servicios/consola/xbox/dano-liquido | CLS 0.20 (corregido); contraste bajo 21; 29 tamaños de letra |
| /servicios/consola/xbox/sobrecalentamiento | iconos faltantes: fa-gauge-simple-high; contraste bajo 59; 30 tamaños de letra |
| /servicios/impresora | CLS 0.17 (corregido); contraste bajo 23; 32 tamaños de letra |
| /servicios/impresora/atascos | 1 saltos de nivel; contraste bajo 25; 36 tamaños de letra |
| /servicios/impresora/cabezal | desc larga 256; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/impresora/cambio-tinta-toner | CLS 0.25 (corregido); 1 saltos de nivel; contraste bajo 26; 37 tamaños de letra |
| /servicios/impresora/conectividad | 1 saltos de nivel; contraste bajo 25; 36 tamaños de letra |
| /servicios/impresora/diagnostico | CLS 0.18 (corregido); 1 saltos de nivel; contraste bajo 30; 36 tamaños de letra |
| /servicios/impresora/mantenimiento | 1 saltos de nivel; contraste bajo 33; 34 tamaños de letra |
| /servicios/impresora/no-imprime | desc larga 244; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/impresora/reparacion-brother | CLS 0.10 (corregido); desc larga 219; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/impresora/reparacion-canon | CLS 0.10 (corregido); desc larga 217; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/impresora/reparacion-epson | CLS 0.10 (corregido); desc larga 217; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/impresora/reparacion-hp | CLS 0.10 (corregido); desc larga 214; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/impresora/rodillos | CLS 0.12 (corregido); 1 saltos de nivel; contraste bajo 29; 36 tamaños de letra |
| /servicios/impresora/toner | CLS 0.11 (corregido); desc larga 237; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/impresora/wifi-impresora | desc larga 252; 3 saltos de nivel; contraste bajo 25; 37 tamaños de letra |
| /servicios/laptop | CLS 0.11 (corregido); contraste bajo 23; 32 tamaños de letra; 44 textos <12px móvil |
| /servicios/laptop/cambio-bateria | CLS 0.15 (corregido); 1 saltos de nivel; contraste bajo 47; 42 tamaños de letra; 44 textos <12px móvil |
| /servicios/laptop/cambio-pantalla | CLS 0.20 (corregido); desc larga 215; 4 saltos de nivel; contraste bajo 27; 36 tamaños de letra |
| /servicios/laptop/cambio-teclado | CLS 0.36 (corregido); 2 saltos de nivel; contraste bajo 43; 42 tamaños de letra |
| /servicios/laptop/diagnostico | desc larga 168; 1 saltos de nivel; contraste bajo 29; 35 tamaños de letra |
| /servicios/laptop/formateo-windows-virus-cancun | 1 saltos de nivel; contraste bajo 30; 33 tamaños de letra |
| /servicios/laptop/laptop-mojada | 1 saltos de nivel; contraste bajo 30; 33 tamaños de letra |
| /servicios/laptop/mantenimiento-preventivo | 1 saltos de nivel; contraste bajo 43; 37 tamaños de letra |
| /servicios/laptop/pasta-termica | desc larga 167; 3 saltos de nivel; contraste bajo 64; 41 tamaños de letra |
| /servicios/laptop/recuperacion-datos | title largo 68; 1 saltos de nivel; contraste bajo 43; 35 tamaños de letra |
| /servicios/laptop/reparacion-dell | title largo 70; desc larga 230; 1 saltos de nivel; contraste bajo 49; 34 tamaños de letra |
| /servicios/laptop/reparacion-hp | CLS 0.17 (corregido); title largo 73; desc larga 188; 1 saltos de nivel; contraste bajo 43; 34 tamaños de letra |
| /servicios/laptop/reparacion-lenovo | CLS 0.14 (corregido); title largo 69; desc larga 232; 1 saltos de nivel; imgs rotas: laptop-feliz-limpia.webp; contraste bajo 43; 33 tamaños de letra; red: 404 /assets/images/responsive/laptop-feliz-limpia.webp |
| /servicios/laptop/upgrade | 5 saltos de nivel; contraste bajo 25; 33 tamaños de letra |
| /servicios/mac | contraste bajo 23; 32 tamaños de letra |
| /servicios/mac/cambio-bateria-macbook | CLS 0.15 (corregido); 1 saltos de nivel; contraste bajo 33; 33 tamaños de letra |
| /servicios/mac/cambio-pantalla-macbook | CLS 0.12 (corregido); contraste bajo 46; 38 tamaños de letra |
| /servicios/mac/diagnostico-mac | CLS 0.13 (corregido); desc larga 171; 1 saltos de nivel; contraste bajo 63; 38 tamaños de letra |
| /servicios/mac/limpieza-liquido-macbook | CLS 0.10 (corregido); 1 saltos de nivel; contraste bajo 31; 39 tamaños de letra |
| /servicios/mac/macbook-no-enciende | CLS 0.10 (corregido); 1 saltos de nivel; contraste bajo 30; 36 tamaños de letra |
| /servicios/mac/mantenimiento-macbook | CLS 0.13 (corregido); title largo 93; desc larga 169; 1 saltos de nivel; contraste bajo 68; 34 tamaños de letra |
| /servicios/mac/recuperacion-datos-mac | desc larga 242; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/mac/reparacion-imac-mac-mini | 1 saltos de nivel; contraste bajo 47; 33 tamaños de letra |
| /servicios/mac/reparacion-macbook | contraste bajo 51; 35 tamaños de letra |
| /servicios/mac/software-macos | title largo 78; desc larga 190; 1 saltos de nivel; contraste bajo 46; 32 tamaños de letra; 44 textos <12px móvil |
| /servicios/mac/teclado-macbook | desc larga 235; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/mantenimiento-preventivo-pc-empresas | contraste bajo 84; 35 tamaños de letra |
| /servicios/pc | contraste bajo 23; 32 tamaños de letra; 49 textos <12px móvil |
| /servicios/pc/diagnostico | desc larga 167; 1 saltos de nivel; contraste bajo 40; 34 tamaños de letra |
| /servicios/pc/formateo | CLS 0.13 (corregido); 1 saltos de nivel; contraste bajo 31; 34 tamaños de letra |
| /servicios/pc/fuente-poder | title largo 66; contraste bajo 54; 33 tamaños de letra |
| /servicios/pc/instalacion-componentes | CLS 0.10 (corregido); 1 saltos de nivel; contraste bajo 31; 34 tamaños de letra |
| /servicios/pc/lentitud | CLS 0.16 (corregido); desc larga 196; 1 saltos de nivel; contraste bajo 81; 36 tamaños de letra |
| /servicios/pc/limpieza-profunda | desc larga 195; 1 saltos de nivel; contraste bajo 74; 38 tamaños de letra |
| /servicios/pc/mantenimiento-correctivo | desc larga 234; contraste bajo 67; 38 tamaños de letra |
| /servicios/pc/no-enciende | desc larga 177; contraste bajo 55; 38 tamaños de letra |
| /servicios/pc/pantalla-azul | CLS 0.16 (corregido); desc larga 173; 1 saltos de nivel; contraste bajo 41; 35 tamaños de letra |
| /servicios/pc/recuperacion-datos | CLS 0.12 (corregido); title largo 66; 1 saltos de nivel; contraste bajo 39; 32 tamaños de letra |
| /servicios/pc/refrigeracion | desc larga 197; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/pc/tarjeta-madre | CLS 0.16 (corregido); desc larga 208; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/pc/tarjeta-video-gpu | contraste bajo 42; 36 tamaños de letra |
| /servicios/pc/upgrade | CLS 0.15 (corregido); desc larga 189; contraste bajo 56; 39 tamaños de letra |
| /servicios/pc/virus-malware | CLS 0.16 (corregido); 1 saltos de nivel; contraste bajo 39; 31 tamaños de letra |
| /servicios/redes | contraste bajo 23; 31 tamaños de letra |
| /servicios/redes/cableado-red | CLS 0.11 (corregido); 1 saltos de nivel; contraste bajo 40; 33 tamaños de letra |
| /servicios/redes/configuracion-router | CLS 0.11 (corregido); 1 saltos de nivel; contraste bajo 40; 33 tamaños de letra |
| /servicios/redes/impresora-red | CLS 0.11 (corregido); 1 saltos de nivel; contraste bajo 40; 33 tamaños de letra |
| /servicios/redes/red-oficina | CLS 0.12 (corregido); 1 saltos de nivel; contraste bajo 40; 33 tamaños de letra |
| /servicios/redes/repetidores-mesh | 1 saltos de nivel; contraste bajo 40; 33 tamaños de letra |
| /servicios/redes/wifi-lento | CLS 0.25 (corregido); 1 saltos de nivel; contraste bajo 40; 35 tamaños de letra |
| /servicios/telefono | title largo 80; contraste bajo 23; 32 tamaños de letra; 65 textos <12px móvil |
| /servicios/telefono/cambio-bateria | 1 saltos de nivel; contraste bajo 51; 34 tamaños de letra |
| /servicios/telefono/cambio-bateria-iphone | CLS 0.13 (corregido); contraste bajo 33; 37 tamaños de letra |
| /servicios/telefono/cambio-bateria-samsung | CLS 0.12 (corregido); desc larga 172; 1 saltos de nivel; contraste bajo 33; 32 tamaños de letra |
| /servicios/telefono/cambio-flex-botones | CLS 0.12 (corregido); 1 saltos de nivel; contraste bajo 30; 33 tamaños de letra |
| /servicios/telefono/cambio-pantalla | CLS 0.23 (corregido); title largo 66; desc larga 168; 1 saltos de nivel; contraste bajo 33; 32 tamaños de letra |
| /servicios/telefono/cambio-pantalla-samsung | desc larga 202; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/celular-mojado | CLS 0.18 (corregido); 1 saltos de nivel; contraste bajo 39; 37 tamaños de letra |
| /servicios/telefono/celular-no-prende | CLS 0.21 (corregido); desc larga 213; 1 saltos de nivel; contraste bajo 31; 36 tamaños de letra |
| /servicios/telefono/celular-sin-senal | CLS 0.16 (corregido); desc larga 193; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/centro-carga-celular | CLS 0.18 (corregido); desc larga 217; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/diagnostico | 1 saltos de nivel; contraste bajo 24; 32 tamaños de letra |
| /servicios/telefono/diagnostico-iphone | title largo 66; 1 saltos de nivel; contraste bajo 30; 33 tamaños de letra |
| /servicios/telefono/iphone-no-prende | desc larga 193; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/iphone-se-reinicia | desc larga 200; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/iphone-sin-senal | desc larga 182; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/liberacion-software | desc larga 166; 1 saltos de nivel; contraste bajo 26; 31 tamaños de letra |
| /servicios/telefono/reparacion-bocina | 1 saltos de nivel; contraste bajo 33; 31 tamaños de letra |
| /servicios/telefono/reparacion-bocina-iphone | CLS 0.12 (corregido); 1 saltos de nivel; contraste bajo 29; 34 tamaños de letra |
| /servicios/telefono/reparacion-botones-iphone | 1 saltos de nivel; contraste bajo 29; 33 tamaños de letra |
| /servicios/telefono/reparacion-camara-iphone | CLS 0.15 (corregido); 1 saltos de nivel; contraste bajo 42; 31 tamaños de letra |
| /servicios/telefono/reparacion-carga | CLS 0.15 (corregido); desc larga 188; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-carga-iphone | CLS 0.14 (corregido); 1 saltos de nivel; contraste bajo 29; 35 tamaños de letra |
| /servicios/telefono/reparacion-face-id-iphone | CLS 0.12 (corregido); contraste bajo 43; 38 tamaños de letra; 48 textos <12px móvil |
| /servicios/telefono/reparacion-huawei | CLS 0.17 (corregido); desc larga 227; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-humedad-iphone | CLS 0.17 (corregido); contraste bajo 67; 35 tamaños de letra |
| /servicios/telefono/reparacion-iphone | CLS 0.32 (corregido); title largo 66; contraste bajo 93; 36 tamaños de letra |
| /servicios/telefono/reparacion-lente-camara-iphone | CLS 0.16 (corregido); desc larga 191; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-microfono-iphone | CLS 0.15 (corregido); title largo 69; 1 saltos de nivel; contraste bajo 29; 33 tamaños de letra |
| /servicios/telefono/reparacion-motorola | CLS 0.18 (corregido); desc larga 229; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-pantalla-iphone | CLS 0.24 (corregido); title largo 67; desc larga 188; contraste bajo 66; 40 tamaños de letra; 45 textos <12px móvil; consola: Failed to load resource: the server responded with a status of 400 () / Permissions policy violation: compute-pressure i; red: 400 /api/track/event |
| /servicios/telefono/reparacion-placa-iphone | CLS 0.18 (corregido); desc larga 203; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-samsung | CLS 0.14 (corregido); desc larga 235; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-tapa-trasera-iphone | CLS 0.17 (corregido); desc larga 184; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-wifi-bluetooth-iphone | CLS 0.16 (corregido); desc larga 188; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/reparacion-xiaomi | CLS 0.13 (corregido); desc larga 241; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /servicios/telefono/software-iphone | desc larga 217; 1 saltos de nivel; contraste bajo 30; 32 tamaños de letra |
| /tickets | 1 headings vacíos; contraste bajo 22 |
| /tienda | CLS 0.65 (corregido); desc larga 166; 1 saltos de nivel |
| /tienda/laptop-para-trabajo-y-escuela | contraste bajo 26; 28 tamaños de letra; 67 textos <12px móvil |
| /tienda/mantenimiento-preventivo-pasta-termica-arctic-mx4 | title largo 75; contraste bajo 26; 28 tamaños de letra |
| /tienda/pc-gamer-cancun-ryzen-5-rtx-3060 | contraste bajo 26; 31 tamaños de letra |
| /tienda/promociones | title largo 67; contenido escaso 63 palabras |
