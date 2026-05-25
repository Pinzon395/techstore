# Checklist QA antes de deploy

Usar esta lista antes de subir cambios a produccion.

## Build y sintaxis

- Ejecutar `npm run build`.
- Ejecutar `node --check server/server.js`.
- Ejecutar `node --check public/scripts/*.js` para scripts modificados.
- Ejecutar `node --check server/routes/*.js`, `server/middlewares/*.js`, `server/db/*.js` y `server/utils/*.js` si cambiaron.
- Confirmar que no hay secretos en `git diff`.

## Smoke test publico

- Home carga en desktop y movil.
- `/servicios` carga.
- Una categoria de servicios carga.
- Una pagina individual de servicio carga.
- `/contacto` carga.
- Navbar desktop abre menus correctamente.
- Menu movil abre, cierra y responde a Escape.
- WhatsApp, telefono y correo apuntan a datos reales del proyecto.
- Ruta inexistente devuelve 404 real.
- `/robots.txt` abre y declara sitemap correcto.
- `/sitemap.xml` abre y no incluye rutas privadas.

## Formularios y conversion

- Formulario de contacto muestra errores claros.
- Formulario de ticket exige login cuando aplica.
- Crear ticket con datos validos responde correctamente.
- Datos invalidos en ticket se rechazan con mensaje claro.
- Comentarios validan nombre, texto y rating.
- Comentarios quedan en revision antes de publicarse.

## Admin

- `/admin` no sirve panel a usuario no admin.
- Login Google funciona con credenciales reales.
- Admin carga dashboard sin errores visibles.
- Comentarios pueden aprobarse o eliminarse con confirmacion.
- FAQs pueden crearse/editarse/eliminarse.
- Tickets cargan y muestran estados entendibles.
- Cambios de tickets muestran exito o error claro.

## SEO y performance

- Cada pagina importante mantiene un solo H1.
- No hay paginas EN incompletas indexables.
- Schema JSON-LD no incluye reviews o ratings falsos.
- Imagenes principales no estan rotas.
- No hay enlaces internos rotos evidentes.
- Ejecutar Lighthouse manual en Home, servicio principal y Contacto.

