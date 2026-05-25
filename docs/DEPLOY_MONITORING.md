# Deploy, monitoreo y mantenimiento

## Predeploy

1. Actualizar `.env` en el servidor, nunca en Git.
2. Confirmar `NODE_ENV=production`.
3. Confirmar `SESSION_SECRET` largo y unico.
4. Confirmar conexion MariaDB con usuario de app, no `root`.
5. Ejecutar `npm ci`.
6. Ejecutar `npm run build`.
7. Revisar `docs/QA_CHECKLIST.md`.

## Migraciones

En produccion no deben correr migraciones runtime de forma silenciosa.

- Recomendado: ejecutar scripts SQL controlados y respaldar antes.
- Temporal: usar `ALLOW_RUNTIME_MIGRATIONS=true` solo durante una ventana de mantenimiento.
- Despues de migrar, volver a `ALLOW_RUNTIME_MIGRATIONS=false`.

Antes de cualquier cambio de base de datos:

- Crear backup.
- Verificar que el backup abre.
- Probar la migracion en local/staging.
- Documentar rollback.

## Arranque

Comando de produccion:

```powershell
npm run start
```

Health check:

```text
GET /api/health
```

Debe responder JSON con `ok: true`.

## Monitoreo recomendado

- Uptime HTTP contra `/api/health`.
- Revisión semanal de logs del servidor.
- Revisión mensual de Search Console.
- Revisión mensual de sitemap y robots.
- Revisión de errores 404 reales.
- Revisión de Core Web Vitals en navegador.

## Eventos a medir

No inventar IDs de herramientas externas. Cuando exista GA4/Search Console real, medir:

- `click_whatsapp`
- `click_telefono`
- `click_email`
- `submit_contacto`
- `submit_ticket`
- `view_servicio`
- `click_cotizacion`
- `error_formulario`

## Rollback basico

1. Conservar el build anterior o commit anterior.
2. Restaurar el commit estable.
3. Ejecutar `npm ci` si cambió `package-lock.json`.
4. Ejecutar `npm run build`.
5. Reiniciar servidor.
6. Confirmar `/api/health`, Home, Servicios, Contacto y Admin.

