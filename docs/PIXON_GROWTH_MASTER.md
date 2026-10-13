# Pixon PC · Growth master (documento vivo)

Última actualización: **2026-10-12**. Datos con fecha; no tratar como actuales después de 30 días sin revisar.
Convención: **FACT** (dato verificado, con fuente) · **INFERENCE** (deducido de datos) · **HYPOTHESIS** (por probar).

## 1. Fuente de verdad comercial
Todo vive en `src/lib/business.ts`; `npm run check:claims` bloquea regresiones (horario viejo, diagnóstico gratis o en 1–2 h, precio de diagnóstico ≠ $600, ratings/porcentajes y bajas de temperatura prometidas).

| Regla | Valor | Dónde |
|---|---|---|
| Horario | Atención 24/7 con cita previa | `openingHours` (+ schema 00:00–23:59 los 7 días) |
| Emergencias | Sin cita normal, **avisando antes** por WhatsApp o correo | `emergencyPolicy` |
| Diagnóstico | Desde $600 MXN · normalmente 8 h a 2 días | `diagnosticPolicy`, `diagnosticCopy` |
| Proceso | Diagnóstico → cotización → autorización → reparación | `diagnosticCopy.full` |
| Equipo mojado | Sin garantía de recuperación | `commercialCopy.*.liquidDamage` |

La agenda en línea (`appointment_settings`, migración 015) sigue ofreciendo turnos 11:00–22:00 (dom. 11:00–18:00). Eso es "qué turnos se reservan en línea", no el horario público; fuera de esos turnos se coordina por WhatsApp. **Decisión del dueño:** ampliar turnos en Admin › Configuración de agenda si de verdad se atiende de madrugada.

## 2. Posicionamiento y cliente
- **Posicionamiento:** taller técnico de Cancún para computadoras, laptops y PC gamer, con diagnóstico por escrito y nada se repara sin autorización. Celulares, consolas e impresoras son servicios reales pero secundarios.
- **Clientes objetivo:** (1) residentes de Cancún con laptop/PC que falla; (2) urgencias (líquido, no enciende); (3) turistas, expats y remotos que buscan en inglés; (4) gamers (PC gamer, consolas); (5) pequeñas empresas/hoteles (B2B, sin competir en el inicio).

## 3. Hallazgos de mercado y competencia
- **FACT (GSC, 3 meses al 25-ago-2026, export en `Downloads/pixon.com.mx-Performance-on-Search-2026-08-25`):** 621 clics, ~72.7 k impresiones, posición media 5.8. 92 % de impresiones desde México.
- **FACT:** "computer repair" 14,383 impr. / 1 clic / pos. 3.9 y "laptop repair" 14,280 / 0 / pos. 2.8.
- **INFERENCE:** CTR ≈ 0 en posición 3 no es típico de un resultado orgánico normal. Lo más probable es que sean impresiones del perfil de Google (map pack) en búsquedas genéricas en inglés hechas en Cancún, donde el usuario llama o pide ruta en vez de entrar al sitio. Si es así, **la palanca es Google Business Profile (GBP)**, no más páginas.
- **FACT:** "graphics card repair" 3,340 impr., pos. 7.3, 0 clics. INFERENCE: intención mayoritariamente fuera de Cancún; no perseguir con contenido.
- **FACT (búsqueda web 2026-10-12):** para "reparación de computadoras Cancún" y "laptop mojada Cancún" la búsqueda web devuelve sobre todo directorios (Cronoshare, Sección Amarilla). Pixon ("Luis Pinzón") aparece listado en Cronoshare. INFERENCE: los directorios son citaciones NAP que deben coincidir con el sitio.
- **PENDIENTE (bloqueado):** auditoría de competidores en Google Maps (RedMovil y otros: reseñas, categorías, fotos, horarios). Requiere navegador con sesión; la extensión de Chrome no estaba conectada en esta sesión. No se registran datos de competidores sin verificarlos.

### Actualización GSC 2026-10-12 (export de 3 meses, `Downloads/pixon.com.mx-Performance-on-Search-2026-10-12.zip`)
- **FACT:** el inicio `/` tiene 35,907 impresiones, 158 clics y posición 3.6. El escritorio suma 70,496 impresiones con CTR 0.34 %; el móvil, 32,781 con CTR 1.68 %.
- **FACT:** "computer repair" 18,221 impr. (1 clic), "laptop repair" 17,071 (0), "graphics card repair" 13,218 (0) y "phone repair" 8,482 (0), todas creciendo frente a agosto.
- **FACT:** `/en/graphics-card-repair` tiene 7,267 impresiones con 0 clics en posición 5; `/en/computer-repair`, 2,403 con 0 clics en posición 8.2.
- **INFERENCE:** el volumen en inglés de escritorio y CTR ~0 se concentra en el inicio y en `/en/*`. Siguiente prueba: en GSC, filtrar la consulta "computer repair" → pestaña Páginas y País/Dispositivo. Si es México + escritorio sobre `/`, el snippet en español no responde a la búsqueda en inglés.
- **FACT:** fragmentos de producto: 6,473 impresiones y 99 clics (CTR 1.5 %). Las fichas de `/tienda/*` traen `Offer`, pero no `hasMerchantReturnPolicy`. **Decisión del dueño:** definir la política de devoluciones real antes de marcarla en el schema; no se inventa.

## 4b. Core Web Vitals (laboratorio, 2026-10-12, `tools/measure-cwv.mjs`)
No se pudo abrir el reporte de Search Console (sin sesión de navegador). Mediciones propias, móvil con CPU 4x y red 4G lenta, recorriendo la página:
| Vista | Producción (commit 80191b7) | Local (esta rama) |
|---|---|---|
| `/tienda` escritorio | **CLS 0.627** (salto del footer) | 0.005 |
| `/tienda` móvil | 0.017 | 0.102 → **0.000** (espacio reservado para la cuadrícula) |
| `/contacto` escritorio | CLS 0.048 | 0.007 |
| `/reparaciones` escritorio | CLS 0.045 | 0.007 |
| Botón del carrito (móvil, con banner de cookies) | 0.017 | **0.000** (holgura con `translate`, no con `bottom`) |
| LCP móvil, 14 vistas principales | 1.1–2.6 s | 1.3–2.0 s |
| Interacciones (menú, FAQ) móvil | 64–256 ms | 40–144 ms |
**Conclusión:** los avisos de CLS en producción se corrigen con el deploy de esta rama (incluye el arreglo de CLS de la auditoría anterior, que tampoco está publicado). Riesgo pendiente: el JS y CSS en móvil (TBT de laboratorio de 0.3 a 1.5 s según la carga de la máquina) puede afectar el INP de teléfonos de gama baja; mayor costo medido: `gtag` (587 KB) y el recálculo de estilos.

### Actualización 2026-10-13
- **FACT (deploy):** después del "deploy" reportado, `/api/version` en producción seguía en `80191b7` (build del 2026-10-05). El `release/release-prod.zip` que existía era del 2026-10-12 12:26 (commit `97f2ed1`) y no contenía `6ecc085`, `2379c1c` ni la migración 016. Se regeneró con `npm run release:build`; el manifiesto (`release/release-manifest.json`) indica el SHA del ZIP correcto. Regla: antes de subir, comparar `git_sha` del manifiesto con `git log -1`; después de subir, `/api/version` debe mostrar ese commit.
- **FACT (GA):** en producción, móvil 4x, bloquear `gtag` baja el TBT de laboratorio de ~1,050–1,130 ms a ~670–730 ms en `/` y `/contacto` (≈400 ms de tareas largas por `gtag.js`, después de `load`). Cambio: `gtag.js` se carga en la primera interacción (pointerdown/keydown/scroll/touchstart) o 4 s después de `load`. Verificado: `page_view` llega a `g/collect` en ambos casos (44 ms tras el toque; 4.0 s sin interacción). La atribución comercial propia (`/api/track/event`) no depende de GA. Pérdida aceptada: visitas que salen en menos de 4 s sin tocar nada no registran `page_view` en GA.
- **FACT (cards):** `/paquetes` (y la sección de paquetes del inicio) tenía cards de alturas distintas en la misma fila (1440 px: 873/1056/1269 px) y CTAs desalineados por `align-items:start` + `height:fit-content`. Ahora la fila se estira y la lista de incluidos crece, dejando garantía + CTA al fondo. `tools/check-card-alignment.mjs` lo verifica en 360/390/430/768/1024/1440/1920 (sale 1 en el código anterior, 0 en el nuevo).
- **INFERENCE (inglés, CTR ~0):** 97.7k de 103k impresiones son de México. "laptop repair" está en posición 2.6 con 17,071 impresiones y 0 clics, y `/en/laptop-repair` solo tiene 108 impresiones: Google muestra el inicio en español (hreflang correcto: un usuario con Google en español recibe la versión es-MX). Una posición orgánica de 2–4 sin ningún clic en un término local suele indicar que el pack de Maps absorbe los clics, o impresiones de rastreadores de posiciones (concentradas en escritorio, lo que también explicaría el CTR de escritorio de 0.34 % frente a 1.68 % en móvil). Los títulos y descripciones en inglés ya son específicos y honestos; reescribirlos no ataca esa causa. **HYPOTHESIS a verificar en GSC:** consulta "laptop repair" → Dispositivos/País. Palanca real: el perfil de Google Business (categoría, fotos, reseñas), medido con el UTM del enlace del perfil.
- **Residual:** `/tienda` móvil local dio un salto aislado de 0.086 en `#main-content` en 1 de 8 corridas (no reproducible con red lenta); queda por debajo de 0.1.

### SEARCH CONSOLE STATUS (leído en la interfaz, 2026-10-13)
| Sección | Estado | Clasificación / acción |
|---|---|---|
| CORE WEB VITALS MOBILE | "No hay suficientes datos de uso (90 días)" | Sin datos de campo: no hay grupos de URL que validar. Referencia = laboratorio. |
| CORE WEB VITALS DESKTOP | "No hay suficientes datos de uso (90 días)" | Igual que móvil. |
| INDEXATION | 185 indexadas / 347 sin indexar (actualizado 8/10/26) | noindex 162 (esperado: cuenta, auth, duplicados), canónica alternativa 107 (esperado), redirección 29 (esperado), 404 21, 5xx 15, 403 1 (`/api/admin/...`, esperado), rastreada sin indexar 9, descubierta 2, duplicada 1 (`/blogs/` → 301). |
| 5xx | 15 (ej. `/tickets`, `/ensambles`, `www/...`) | **Causa raíz:** en Hostinger el proceso arranca con la primera petición y el middleware respondía 503 inmediato mientras `bootstrap()` seguía. Fix: la petición espera el arranque (hasta 20 s). Test en `server/tests/embedded-boot.test.js` (falla con el código anterior). Hoy todas devuelven 200/301. |
| 404 | 21 | `/en/privacy`, `/en/warranty`, `/en/packages`, `/en/catalog`, `/en/corporate` → 301 a su equivalente real. `/servicios/tablet/*`, `/servicios/monitor/*`, `/en/reviews`: servicios/páginas que no existen → 404 correcto. |
| SITEMAPS | `sitemap.xml` correcto (189 descubiertas) | Hay 6 envíos erróneos (robots.txt, `/`, `contacto.html`, `catalogo.html`, `ensambles.html`, `paquetes.html`) con "1 error" que generan los avisos "Nuevos motivos... de un sitemap". Acción del dueño: quitarlos en Sitemaps (no se pudo desde la sesión automática). |
| HTTPS | 110 HTTPS / 0 no HTTPS | OK |
| PRODUCT SNIPPETS | 1 válido / 0 no válidos | Solo recomendados: `aggregateRating`, `review`. No se inventan. |
| MERCHANT LISTINGS | 1 válido / 0 no válidos | Recomendado: `hasMerchantReturnPolicy` → NEEDS_BUSINESS_POLICY_CONFIRMATION. `shippingDetails` 0. |
| BREADCRUMBS | 199 válidos / 0 | OK |
| VIDEOS | 2 sin indexar: "no está en una página de visualización" | Esperado (video de apoyo). |
| MANUAL ACTIONS | Ningún problema | NONE |
| SECURITY ISSUES | Ningún problema | NONE |

**Inglés (FACT, filtros de GSC, 3 meses):** "laptop repair" = 16,950 impr. escritorio vs 2 móvil, 100 % México, 0 clics (páginas: `/` 13,972; `/servicios/laptop` 5,182; `/en/laptop-repair` 107). "computer repair" = 18,065 escritorio vs 3 móvil, 1 clic. "graphics card repair" = 13,198 escritorio, 0 móvil (`/en/graphics-card-repair` 7,260; `/servicios/pc/tarjeta-video-gpu` 5,617). **Conclusión:** son impresiones automatizadas de escritorio (rastreo de posiciones), no demanda humana en inglés; no se reescriben títulos.
**Home (FACT):** CTR escritorio 0.1 % (30,634 impr.) vs móvil 4.4 %. Excluyendo consultas con "repair": escritorio 4.1 % (589 impr.) vs móvil 4.5 % (1,073). La brecha la explican esas impresiones, no el diseño ni el snippet.
**Producción (2026-10-13):** commit `613ca01` desplegado (hPanel, build OK). Migración 016 aplicada vía phpMyAdmin con el SQL exacto del archivo, después de respaldo manual de Hostinger `u493813761_pixondb` 2026-10-13 14:00; registrada en `schema_migrations` con checksum `94d50632…` (runner `phpmyadmin-manual-2026-10-13`); 57 tickets intactos. Laboratorio en producción: CLS ≤ 0.005 escritorio y 0.000 móvil en `/`, `/tienda`, `/contacto`, `/reparaciones`, `/paquetes`; LCP móvil 1.4–2.2 s; cards de paquetes PASS en 360–1920.

## 4. Mapa QUERY → PÁGINA → ACCIÓN (GSC 2026-08-25)
La exportación no une consulta y página; la columna "página" es la URL que debe ganar esa intención.

| Query | Impr. | Pos. | CTR | Página objetivo | Acción |
|---|---|---|---|---|---|
| computer repair / laptop repair | 28.6 k | 3–4 | ~0 % | GBP + `/en/computer-repair`, `/en/laptop-repair` | GBP en inglés (descripción, servicios, fotos); medir clics del perfil |
| reparacion de celulares (cancun) | 801 | 6–7 | 0.4 % | `/servicios/telefono` | Title con precio "desde" y garantía (hecho en la auditoría anterior); medir CTR |
| reparacion de computadoras | 192 | 4–5 | 3 % | `/` | Inicio ya responde qué, dónde y cómo contactar |
| mantenimiento de computadoras en cancún | 107 | 48 | 0 % | `/mantenimiento-preventivo-computadora` | Blog ya no compite (hecho); vigilar posición |
| ensamblado de computadoras en cancún | 79 | 38 | 0 % | `/ensambles` | Title con "ensamble" (hecho); vigilar |
| pc gamer cancun | 60 | 10.4 | 3 % | `/ensambles` | Fotos reales de builds; enlaces internos desde inicio |
| reparacion de impresoras cancun | 53 | 11.7 | 0 % | `/servicios/impresora` | Contenido propio por marca (hecho) |
| cuanto cuesta reparar una laptop mojada | 29 | 6.1 | 0 % | `/limpieza-laptop-liquido` | **Hecho hoy:** URL única, precio del diagnóstico y tiempo en la primera pantalla |

## 5. Laptop mojada (decisión 2026-10-12)
- **FACT (GSC):** `/limpieza-laptop-liquido` 422 impr., 3 clics, pos. 4.6 · `/servicios/laptop/laptop-mojada` 270 impr., 1 clic, pos. 6.3. Misma intención.
- **Decisión:** se queda `/limpieza-laptop-liquido` (más impresiones, mejor posición y más enlaces internos). 301 de un salto desde `/servicios/laptop/laptop-mojada` y `/servicios/limpieza-laptop-liquido`; quitada del sitemap; la categoría laptop la muestra primero como "Laptop mojada".
- **Embudo:** la primera pantalla muestra 6 pasos (apagar, no encender, no cargar, no arroz, WhatsApp, traerla avisando) y el botón de WhatsApp con mensaje prellenado. El ticket queda más abajo.
- **Retirado por no verificable:** "4.9/5 reseñas", "Recolección Express", ">90 % de recuperación", galería "antes/después" armada con fotos de mantenimiento y de bisagras, "cobro por éxito / no te cobramos" (contradecía el diagnóstico desde $600), "100 % recomendado".

## 6. Google Business Profile (acciones del dueño, P1)
Sin acceso desde esta sesión. Checklist, en orden de impacto:
1. **Categoría principal:** "Servicio de reparación de computadoras" (Computer repair service). Secundarias solo si son servicios reales: "Tienda de reparación de teléfonos móviles", "Servicio de reparación de consolas". Antes de cambiar, captura la configuración actual. Si hoy la principal es "reparación de teléfonos", el cambio puede mover rankings de celulares; se acepta porque el foco comercial es computadoras.
2. **Horario:** "Abierto 24 horas" los 7 días, igual que el sitio. Agrega a la descripción: "Atención con cita previa. En emergencias, avísanos por WhatsApp antes de venir."
3. **Descripción bilingüe:** primeras 2 líneas en español y luego "English support by WhatsApp · diagnosis from MXN $600".
4. **Servicios:** mismos nombres que las fichas del sitio, cada uno con su enlace (laptop mojada → `/limpieza-laptop-liquido`).
5. **Sitio web con UTM** para separar GBP de orgánico en el tracker: `https://pixon.com.mx/?utm_source=google&utm_medium=organic&utm_campaign=gbp`.
6. **Fotos:** 1 por semana, solo reales (banco de trabajo, laptop abierta, placa, PC gamer entregada; sin datos del cliente).
7. **Posts:** 1 por semana con un caso real (problema → qué hicimos → resultado) cuando haya material.
8. **NAP idéntico** en GBP, footer, Cronoshare, Sección Amarilla y Facebook: Pixon PC · Cto. Hacienda Chimay, 77539 Cancún, Q.R. · +52 998 669 0777.

## 7. Reseñas (flujo real, sin incentivos)
1. Al entregar, el técnico confirma en persona que el equipo quedó bien.
2. Ese mismo día, por WhatsApp:
   > Hola {nombre}, gracias por confiar en Pixon PC. Si tu {equipo} quedó bien, ¿nos ayudas con tu opinión en Google? Nos sirve mucho para que otras personas en Cancún nos encuentren: {link de reseña}. Si algo no quedó como esperabas, respóndenos aquí y lo revisamos.
3. Nunca pedir 5 estrellas, ni ofrecer descuentos a cambio, ni condicionar la garantía.
4. Responder todas las reseñas en menos de 48 h.
5. **Medición:** total de reseñas y rating en GBP cada lunes (sección 10). Meta: crecimiento semanal sostenido, no un número inventado.

Automatización evaluada: el admin ya registra `delivered_at`. **Siguiente paso:** botón "Pedir reseña" en el ticket entregado que abre WhatsApp con el mensaje anterior. No se hace envío automático para no ser invasivos.

## 8. Medición implementada
| Señal | Fuente | Estado |
|---|---|---|
| Clics a WhatsApp (enlaces y botones) | `public/scripts/tracker.js` → `conversion_events` + evento GA4 | **Corregido hoy:** los botones `smartWaRedirect` no se medían; ahora sí, sin contar doble |
| Llamadas (`tel:`) | tracker | ya existía |
| Ticket iniciado/enviado, carrito, checkout | tracker | ya existía |
| Citas creadas | `appointment.service` → `conversion_events` | ya existía |
| UTM de primer toque | tracker (sessionStorage) | ya existía; falta usarlo en GBP (sección 6.5) |
| **Origen del cliente** | `repairs.lead_source` (migración 016) | **Nuevo:** selector en el ticket (Google Maps, Google Search, WhatsApp directo, Facebook, Instagram, TikTok, Recomendación, Cliente anterior, Hotel, Empresa, Otro) |
| **Motivo de pérdida** | `repairs.lost_reason` | **Nuevo:** precio, sin respuesta, reparó en otro lugar, no reparable, pieza no disponible, otro |
| **Embudo del periodo** | Panel › Servicios y técnicos | **Nuevo:** tickets, cotizados, autorizados, entregados, perdidos, sin origen; ranking por origen y por motivo |

**Regla operativa:** al recibir cada equipo, preguntar "¿cómo nos encontraste?" y registrarlo. Sin este dato, en 30–60 días no se podrá responder de dónde vienen los clientes.

## 9. Plan 30 días (2026-10-12 → 2026-11-11)
| Semana | Acción | Responsable | Métrica |
|---|---|---|---|
| 1 | Desplegar release + `npm run db:migrate` (016) | Dueño (ZIP manual) | `/api/version` = commit nuevo; selector visible en el ticket |
| 1 | GBP: categoría, 24 h, descripción bilingüe, sitio con UTM | Dueño | Captura antes/después |
| 1 | Registrar origen en el 100 % de tickets nuevos | Mostrador | "Sin origen" = 0 en el panel |
| 1–4 | Pedir reseña en cada entrega (sección 7) | Técnico | Reseñas nuevas por semana |
| 2 | 3 fotos reales en GBP + 1 post (caso real) | Dueño | Vistas de fotos en GBP |
| 2 | Revisar en GSC qué URL aparece para "computer repair" (Rendimiento › Consulta › Páginas) | Claude/Dueño | Confirmar o descartar la hipótesis de la sección 3 |
| 3 | Botón "Pedir reseña" en ticket entregado | Claude | Clics registrados |
| 4 | Revisión: clics WA por página, origen de tickets, autorizados/perdidos | Claude | Reporte semanal (sección 10) |

## 10. Experimentos
| # | Hipótesis | Cambio | Métrica | Periodo | Resultado |
|---|---|---|---|---|---|
| E1 | Una sola URL de laptop mojada con WhatsApp primero aumenta contactos | 301 + nuevo hero (2026-10-12) | `whatsapp_click` en `/limpieza-laptop-liquido`; impresiones y CTR en GSC | 4–8 semanas desde el deploy | pendiente (sin baseline de clics de botón: antes no se medían) |
| E2 | Hero del inicio con WhatsApp primario y "Agendar cita" secundario mejora el contacto | Cambio de CTAs (2026-10-12) | `whatsapp_click` en `/` + citas | 4 semanas | pendiente |
| E3 | Las impresiones de "computer repair" vienen de GBP | UTM en el sitio de GBP + GBP en inglés | clics con `utm_campaign=gbp` | 4 semanas | pendiente |

## 11. Reporte semanal (plantilla; llenar solo con datos reales)
LEADS (tickets) · ORIGEN · SERVICIOS · AUTORIZADOS / PERDIDOS (motivo) · CLICS WA · CLICS SEO (GSC) · GBP (vistas, llamadas, rutas) · RESEÑAS (total, nuevas) · WINS · LOSSES · NEXT TEST.

## 12. Pendientes por decisión o evidencia
- **Recolección a domicilio:** `pickupDeliveryPolicy` dice deshabilitado, pero varias páginas dicen "podemos coordinar recolección según zona". Confirmar si existe capacidad real; si no, retirar el copy (no se tocó para no quitar un servicio que quizá sí opera).
- **Garantías por servicio** ("3 meses", "6 meses" en `src/data/services/*`): confirmar que son las condiciones reales.
- **Turnos en línea vs 24/7:** ver sección 1.
- **Precio "Inspección pre-compra $200 MXN"** en las fichas de diagnóstico: confirmar que sigue vigente.

## 13. Seguridad y producción (2026-10-13)

- FACT: Producción = `ab3121c` (deploy hPanel 2026-10-13 15:30; `/api/health` 200, `/api/ready` 200 DB UP). Migración 016 aplicada una vez, no se re-ejecuta.
- FACT: Escáner de vulnerabilidades Hostinger antes: 1 crítico (proxy-addr 2.0.7, runtime vía express + `trust proxy`), 2 altos (compression 1.8.1 runtime directo; source-map-js 1.2.1 build-time). Corregido con parches: proxy-addr 2.0.8, compression ^1.8.2, source-map-js 1.2.2. Re-escaneo 2026-10-13 15:31: "No se encontraron vulnerabilidades".
- FACT: `npm audit` = 0 y `npm audit --omit=dev` = 0. Sin `--force`, sin majors, sin @astrojs/node ni nodemon.
- FACT: Fix 5xx (`c66bc5d`): requests no-health esperan el boot embebido (hasta `PIXON_BOOT_WAIT_MS`, 20 s) en vez de 503 inmediato; test `server/tests/embedded-boot.test.js`. Barrido post-deploy 39 requests, 0 5xx.
- FACT: 5 redirects EN (`/en/privacy`, `/en/warranty`, `/en/packages`, `/en/catalog`, `/en/corporate`) = 301 de un salto a 200.
- FACT: Search Console "Validar corrección" iniciada 2026-10-13 para grupos 5xx y 404. En el grupo 404 quedan 404 intencionales (tablet/monitor/impresora no ofrecidos, `/api/*`, `/cdn-cgi/*`); la validación de esas URLs fallará y es esperado.
- PENDIENTE USUARIO: quitar 6 sitemaps inválidos (Search Console › Sitemaps › clic en la fila › ⋮ › Quitar sitemap). No verificado por agente: login Google, admin autenticado, subida de archivos y email en producción.
