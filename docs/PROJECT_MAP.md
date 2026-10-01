# Pixon PC: mapa del proyecto y primera auditoría comercial

Fecha de revisión: 2026-09-28. Estado: diagnóstico del repositorio local; no equivale a una auditoría de Google Search Console ni del perfil de Google Business.

## Arquitectura que ya existe

- `astro.config.ts` genera HTML estático con Astro. `server/` sirve API, tickets, citas y comercio.
- `src/pages/` define rutas explícitas y páginas dinámicas de servicios. `src/data/services/` contiene el catálogo por categoría; `src/components/views/` contiene vistas especializadas.
- `src/layouts/Base.astro` centraliza canonical, robots, alternates y JSON-LD base. `src/lib/english-routes.ts` mantiene parejas exactas de español e inglés.
- `src/lib/business.ts` es la fuente declarada de identidad, diagnóstico, cita, garantía, logística y textos comerciales. `server/modules/appointments/pricing.policy.js` maneja la política de precios de citas en runtime.
- `tools/generate-sitemap.mjs` construye el sitemap a partir del HTML generado. Ya existen controles para indexación, enlaces internos, SEO de servicios, i18n y claims comerciales.
- `src/pages/tickets.astro` y los componentes de formularios son la ruta de captación; el flujo de disponibilidad depende de la API de citas.

El inventario del build local contiene 216 rutas. `docs/SEO_URL_MAP.csv` exporta URL, título, descripción, H1, canonical, robots, JSON-LD y enlaces internos para cada una. El auditor de indexación reporta 188 páginas indexables y 28 excluidas por `noindex`; el sitemap coincide. Es una fotografía del repositorio local, no del despliegue actual.

## Owners existentes que conviene conservar

| Intención | Owner actual o candidato en el código | Comprobación pendiente |
| --- | --- | --- |
| Reparación de PC | `/servicios/pc` | GSC: consultas y URL mostrada |
| PC que no enciende | `/servicios/pc/no-enciende` | Distinguir de fuente de poder y diagnóstico |
| Diagnóstico de PC | `/servicios/pc/diagnostico` | Separar del síntoma específico |
| GPU sin video, artefactos o temperatura | `/servicios/pc/tarjeta-video-gpu` | Agrupar síntomas según GSC |
| Reparación de laptop | `/servicios/laptop` | GSC: consultas y URL mostrada |
| Diagnóstico de laptop | `/servicios/laptop/diagnostico` | Separar de reparación general |
| Reparación de celular | `/servicios/telefono` | GSC: consultas y URL mostrada |
| Celular mojado | `/servicios/telefono/celular-mojado` | Revisar intención en español e inglés |
| Reparación de PS5 | `/servicios/consola/reparacion-ps5` | Separar HDMI, apagado y mantenimiento si la demanda lo justifica |
| Empresas | `/empresas` | Diferenciar mantenimiento por lote y soporte hotelero |
| Atención en inglés | `/en` y owners de `src/lib/english-routes.ts` | GSC inglés y conversiones, sin ampliar por traducción automática |

Estos owners son hipótesis basadas en la arquitectura, no decisiones de canibalización. No se creó ninguna URL nueva.

## Inconsistencias observadas

1. El propietario confirmó que el diagnóstico inicia desde $600 MXN y que reparaciones, baterías y otras sustituciones se cotizan tras conocer el modelo exacto. Se corrigieron los fallbacks de $650/$750 como diagnóstico y se quitaron ofertas fijas de schema en 51 páginas de reparación. No se asume que los $600 cubren una pieza, reparación o visita B2B.
2. Los horarios publicados no tienen una fuente única: `public/llms.txt` y `src/pages/privacidad.astro` dicen 09:00–19:00; `src/components/home/HomeAppointmentCalendar.astro` y `src/pages/tickets.astro` dicen 11:00–22:00; el admin muestra 08:30–19:00. Existe una migración local todavía sin confirmar que propone lunes a sábado 11:00–22:00 y domingo 11:00–18:00. Confirmar horario de atención, recepción y disponibilidad de citas por separado antes de publicar un cambio global.
3. `src/lib/business.ts` declara `pickupEnabled: false` y `deliveryEnabled: false`, pero el mismo archivo y varias páginas ofrecen coordinar recolección o entrega. Confirmar si el servicio existe, en qué zonas y bajo qué condiciones; después alinear política, copy y schema.
4. `src/pages/tickets.astro` decía “sin citas forzadas” pese a `appointmentPolicy.appointmentOnly: true`. Se cambió a “Atención con cita confirmada”. La disponibilidad visible debe depender de la API, nunca de datos ficticios.
5. La búsqueda pública todavía mostró la frase antigua “diagnosticamos tu fuente de poder gratis” para `/servicios/pc/fuente-poder`. La fuente local actual ya indica diagnóstico desde $600 MXN. Verificar el HTML desplegado y solicitar nuevo rastreo solo después de confirmar que la versión corregida está publicada.

El control `check:claims` pasa, pero no detecta horarios contradictorios ni si una promesa de recolección coincide con `pickupDeliveryPolicy`. Se añadió `check:repair-pricing` para detectar ofertas fijas en el schema de reparaciones; no sustituye una revisión editorial de todas las páginas.

## Estado de las comprobaciones locales

- `npm run typecheck`: 0 errores, 0 advertencias, 114 sugerencias.
- `npm run check:service-seo`: 130 páginas de servicio revisadas, pasa.
- `npm run check:indexation`: pasa; 188 indexables y 28 `noindex`.
- `npm run check:links`: pasa; 49,408 enlaces internos verificados en 216 páginas.
- `npm run check:i18n`: pasa.
- `npm run check:claims`: pasa con 0 claims inseguros según las reglas actuales.
- `npm run check:repair-pricing`: 51 páginas de reparación revisadas; ninguna publica una oferta fija de reparación en JSON-LD.
- `npm run check:jsonld`: 762 esquemas válidos en 202 páginas.
- Pruebas Playwright focalizadas: fallas de API de calendario y render seguro de reseñas.

## Orden de ejecución recomendado

1. Confirmar horarios reales y política de recolección con la operación; después cambiar fuente central, runtime y textos publicados en un solo lote. La tarifa de diagnóstico y el criterio de cotización ya se confirmaron.
2. Comparar GBP con la web: NAP, cita, horarios, servicios, dirección visible y URL. No se contó con acceso autenticado a GBP en esta revisión.
3. Exportar GSC por consulta y página (28 días y 3 meses) para decidir owners, CTR y canibalización. No se contó con datos autenticados de GSC en esta revisión.
4. Medir WhatsApp, tickets iniciados/completados y llamadas por landing antes de crear páginas por síntomas.
5. Publicar casos técnicos reales con autorización y evidencia; reutilizar el contenido en las páginas existentes antes de abrir nuevas rutas.

## Cambios implementados y límites de evidencia

- Se alineó el diagnóstico desde $600 MXN con la política confirmada y se eliminó el precio de reparación/sustitución publicado como si fuera fijo cuando requiere modelo exacto y valoración técnica. Las tarifas de mantenimiento o software no se interpretan como reparación y requieren validación comercial independiente.
- Se retiraron valoraciones estáticas contradictorias del JSON-LD, cifras de reseñas no verificadas, casos redactados como reales sin evidencia y promesas de atención hotelera 24/7 no sustentadas. Los casos reales ahora pueden cargarse desde `src/data/repair-cases.ts` con consentimiento del cliente.
- Se impidió que un error en la API del calendario muestre citas inventadas; el formulario conserva el ticket pendiente si falla el envío. El renderizador de reseñas escapa contenido externo y no excluye calificaciones bajas.
- Se registran `ticket_start` y `ticket_submit`, y la atribución UTM de primera visita se conserva durante la sesión. La medición final de leads y facturación exige conectar los datos de producción.
- Se diferenciaron los títulos de `/en` y `/en/computer-repair`; no se crearon páginas nuevas ni redirecciones sin datos de consultas.
- No hay acceso autenticado a GSC ni GBP. Por ello no se afirman posiciones, CTR, canibalizaciones reales, reseñas actuales, horarios del perfil o diferencias actuales contra el perfil. Los owners anteriores siguen siendo candidatos, no conclusiones basadas en rendimiento.

## 30 / 60 / 90 días

- 0–30: confirmar horarios y logística, publicar los cambios, cotejar NAP/horarios con GBP, verificar tickets/WhatsApp/llamadas en producción, solicitar reseñas reales sin incentivos ni filtrado.
- 30–60: exportar GSC por consulta y landing, decidir owners y CTR; subir casos reales con consentimiento y enlazarlos desde servicios existentes; validar intención inglesa y B2B.
- 60–90: ampliar solo los grupos que demuestren leads cualificados. Medir contactos, tickets completados y facturación por categoría; no usar impresiones como único éxito.

El árbol de trabajo ya contenía numerosas modificaciones ajenas a esta revisión; se conservaron.
