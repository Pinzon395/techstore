# Snapshot versionado de MariaDB

`content.json` contiene datos reproducibles y no sensibles del sitio:

- catalogo, componentes y builds;
- categorias y servicios;
- FAQs y configuracion de citas;
- roles y configuracion publica.

No contiene usuarios, sesiones, correos, telefonos, tickets, comentarios,
direcciones, IPs, analitica, pagos ni logs administrativos.

Comandos:

```powershell
npm run db:snapshot
npm run db:snapshot:check
npm run db:restore -- --force
```

La restauracion fusiona el snapshot mediante `INSERT ... ON DUPLICATE KEY
UPDATE`; no elimina datos operativos locales.

El backup completo se genera por separado y permanece en `backups/`, fuera de
Git. Git no sustituye un backup cifrado de produccion.
