# Pixon PC · cierre de auditoría visual y SEO · octubre 2026

Detalle por vista y estado de cada pendiente: `docs/AUDITORIA_VISUAL_SEO_2026-10.md`.

## Qué cambió
- **Contenido honesto:** sin promesas de tiempo sin respaldo ("diagnóstico en menos de 2 h", "respuesta en minutos"), sin reseñas de ejemplo con nombres inventados, sin foto IA de "taller" ni stock, sin nube de keywords. `check:claims` bloquea esas frases en adelante.
- **Fuente única del negocio** (`src/lib/business.ts`): horario (sitio, schema, footer, llms.txt), coordenadas del pin real de Google Maps y enlace al perfil.
- **Rutas consolidadas (301, un salto):**
  - `/mantenimiento-mac` → `/servicios/mac/mantenimiento-macbook`
  - `/instalacion-windows` y `/formateo-optimizacion` → `/servicios/pc/formateo`
  - `/servicios/laptop/reparacion-macbook` → `/servicios/mac/reparacion-macbook`
  - alias de mantenimiento de laptop → `/servicios/laptop/mantenimiento-preventivo`
  - `/en/repairs`, `/en/controller-repair`, `/en/pc-builds`, `/en/optimization`, `/en/mac-maintenance`, `/en/windows-install`, `/en/hinge-repair`, `/en/anti-sulfatation` → su equivalente vigente
- **SEO:** títulos en inglés por intención (computer/PC/gaming PC technician, laptop, iPhone & phone), contenido para turistas, nómadas digitales y residentes; páginas de impresora por marca y fallas de iPhone/Android con contenido propio; ensambles coherente (title, H1, schema, breadcrumb, footer); servicio ↔ guía ↔ paquetes enlazados; footer con enlace "Mantenimiento de computadoras".
- **Sistema visual:** títulos sin cursiva (8,907 → 0), sin texto en degradado, tokens de color AA (botón primario, verde WhatsApp, footer). Textos bajo AA por vista: 32.9 → 8.4.
- **Fotos:** solo fotos reales y del equipo correcto; bloque neutro cuando no existe foto real.
- **Admin:** panel "Taller hoy" en Mi jornada con:
  - entraron hoy, entregados hoy, abiertos y solicitudes sin recibir;
  - equipos por etapa: diagnóstico, esperan al cliente, pieza, reparación, listos y atrasados;
  - lista de los tickets con más días abiertos, que se abren con un clic.
  
  Lo complementan filtros por etapa y orden (recientes / más tiempo abiertos / fecha prometida) en Órdenes. Reutiliza `repairs` y `repair_status_history`, sin tablas nuevas.
- **Prevención:** `check:icons` (símbolos del sprite) y `test:dashboard` dentro de `check:release`.

## Impacto SEO esperado (no garantizado; medir en Search Console a 4–8 semanas)
- Consultas en inglés ("computer repair", "laptop repair", ~28 k impresiones y ~1 clic): títulos y contenido en inglés emparejados por hreflang con las fichas en español. Revisar qué URL muestra Google para esas consultas.
- Una URL por intención en mantenimiento de Mac, formateo y mantenimiento de laptop: la autoridad deja de repartirse.
- Recuperación de impresiones de URLs que daban 404 (`/servicios/laptop/reparacion-macbook`, `/en/*` retiradas).

## Deuda de contenido (NEEDS_REAL_PHOTO)
Fotos del taller pendientes, en orden de impacto:
1. Nintendo Switch abierto.
2. Control con el stick desmontado (joystick drift).
3. iPhone en software/restauración.
4. Disco de Mac en recuperación de datos.
5. Visitas B2B: restaurante, agencia y oficina.
6. Teclado de MacBook.
7. Interior de PS5 (lector de disco y HDMI).

La lista completa está en `docs/MISSING_REAL_PHOTOS.md`.

## Google Business Profile (acciones del dueño)
1. Categoría principal "Servicio de reparación de computadoras"; secundarias "Tienda de reparación de teléfonos móviles" y "Servicio de reparación de consolas".
2. Horario idéntico al sitio: abierto 24 horas con cita previa (actualizado 2026-10-12, ver `docs/PIXON_GROWTH_MASTER.md`).
3. Servicios con los mismos nombres de las fichas del sitio y enlace a cada ficha.
4. 10+ fotos reales: fachada o acceso, banco de trabajo y equipos abiertos.
5. Pedir reseña al entregar cada equipo y responder todas las reseñas.
6. NAP idéntico al footer: "Pixon PC · Cto. Hacienda Chimay, 77539 Cancún, Q.R. · +52 998 669 0777"; sitio web `https://pixon.com.mx/`.

## Deuda técnica previa
- `astro check`: 29 errores de tipos `any` implícitos, los mismos en `main`; ninguno introducido.
- `server/sql/schema/data-dump.sql` versionado con datos de visitas: valorar sacarlo del repositorio.
- `src/styles/original/style.min.css` sin uso.
- Font Awesome todavía se carga desde cdnjs.

## Despliegue y validación en producción
Ver la sección final de este documento: commit desplegado, SHA256 del ZIP, reversión y resultados.
