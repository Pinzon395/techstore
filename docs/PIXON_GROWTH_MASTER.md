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
