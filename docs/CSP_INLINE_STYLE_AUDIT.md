# Auditoria de estilos inline para CSP

Estado: pendiente de migracion gradual.

La CSP de produccion conserva temporalmente `style-src 'unsafe-inline'` porque el build aun contiene estilos inline controlados por el proyecto. Quitar esa directiva en este estado romperia layout, componentes compartidos, acordeones, formularios y vistas de servicio.

## Bloqueadores confirmados

- `src/layouts/Base.astro` mantiene estilos globales embebidos con `<style is:inline>` y markup de alertas generado en cliente con estilos inline.
- Componentes compartidos como `FaqSection.astro`, `DeviceButtons.astro`, `CommentsSection.astro`, `ServiceTicketSection.astro`, `Footer.astro` y `ContactSection.astro` aun usan `style=""` o variables CSS inline.
- La ruta dinamica `src/pages/servicios/[categoria]/[servicio].astro` usa estilos inline para variantes visuales por tipo de servicio.
- `server/services/email.service.js` necesita estilos inline porque son plantillas HTML de correo; esto no afecta CSP del navegador para el sitio publico, pero si debe quedar fuera del conteo de deuda web cuando se migren vistas.

## Verificacion

Ejecutar:

```bash
npm run build
npm run check:inline-styles
```

El script reporta paginas generadas, atributos `style=""`, etiquetas `<style>` y las rutas con mayor deuda. Cuando el total llegue a cero para HTML publico, ejecutar `npm run check:inline-styles -- --fail` y eliminar `'unsafe-inline'` de `style-src` en `server/server.js`.

## Orden recomendado

1. Mover estilos globales de `Base.astro` a CSS local cargado por Astro.
2. Migrar componentes compartidos a clases, atributos `data-*` y tokens CSS predefinidos.
3. Reducir variantes inline de servicios a clases semanticas por estado/categoria.
4. Mantener los estilos inline de email aislados de la auditoria web.
5. Quitar `'unsafe-inline'` solo despues de validar build, paginas moviles, modales, menus, acordeones y formularios.
