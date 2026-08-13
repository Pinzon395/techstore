# Migraciones y backups de MariaDB

Esta infraestructura protege los cambios incrementales de esquema de Pixon PC. Las migraciones no se ejecutan al arrancar Express y los modos de inspeccion no escriben en MariaDB.

## Garantias

- Los archivos de `server/sql/migrations/` son codigo fuente versionable.
- Cada archivo usa SHA-256 sobre sus bytes exactos. Una migracion aplicada es inmutable.
- `--plan` y `--verify` solo consultan `INFORMATION_SCHEMA` y `schema_migrations`.
- La aplicacion exige un backup formato 2, cifrado, autenticado, reciente y con manifiesto valido.
- Solo un despliegue puede migrar una base a la vez mediante `GET_LOCK` de MariaDB.
- El estado se escribe antes y despues de cada archivo. No se usa una transaccion ficticia alrededor de DDL.
- Un estado `failed` o `running` bloquea ejecuciones posteriores para impedir un reintento ciego sobre DDL parcial.
- Las credenciales, la clave del backup y los datos del negocio no aparecen en el manifiesto ni en los logs normales.

## Convencion de archivos

Usa nombres secuenciales, unicos y en minusculas:

```text
server/sql/migrations/001_runtime_schema.sql
server/sql/migrations/002_commerce_foundation.sql
server/sql/migrations/003_catalog_indexes.sql
```

El formato aceptado es `NNN_nombre_descriptivo.sql` (de 3 a 6 digitos). No reutilices una version, no insertes una migracion anterior a otra ya aplicada y nunca edites un archivo aplicado. Una correccion debe ser una migracion nueva hacia adelante.

## Comandos

```powershell
npm run db:migrate:plan
npm run db:migrate:verify
npm run db:backup:encrypted
npm run db:backup:verify -- backups\pixon-FECHA.pixonbak
npm run db:migrate -- --backup backups\pixon-FECHA.pixonbak
npm run test:db:infra
```

`db:migrate:plan` presenta pendientes, checksums legado y bloqueos sin crear ni alterar tablas. `db:migrate:verify` termina con codigo 2 cuando faltan columnas de control, hay pendientes o la integridad no coincide. Ninguno requiere `DB_BACKUP_KEY` porque no abre backups ni escribe.

`db:migrate` aplica cambios. Si se omite `--backup`, busca el `.pixonbak` mas reciente en `backups/`; en despliegues se recomienda pasar la ruta explicita.

Opciones configurables:

```env
DB_MIGRATION_BACKUP_MAX_AGE_HOURS=24
DB_MIGRATION_LOCK_TIMEOUT_SECONDS=30
```

`DB_BACKUP_KEY` debe vivir fuera del repositorio y ser una clave aleatoria de alta entropia; no uses una frase humana ni la compartas por logs o argumentos de consola.

Tambien pueden pasarse `--backup-max-age-hours N` y `--lock-timeout-seconds N`.

## Flujo obligatorio de despliegue

1. Detener escrituras o abrir una ventana de mantenimiento.
2. Ejecutar `npm run db:migrate:plan` y revisar todos los archivos.
3. Crear el backup con `npm run db:backup:encrypted`.
4. Verificar el artefacto con `npm run db:backup:verify -- RUTA`.
5. Probar restauracion y migracion en una base aislada de staging.
6. Aplicar con `npm run db:migrate -- --backup RUTA`.
7. Ejecutar `npm run db:migrate:verify`.
8. Ejecutar smoke tests y reabrir trafico.

El preflight de aplicacion valida, antes de obtener el lock:

- cabecera del formato Pixon;
- autenticidad AES-256-GCM con `DB_BACKUP_KEY`;
- SHA-256 y tamano contra el manifiesto;
- base de datos de origen contra `DB_NAME`;
- fecha y antiguedad maxima;
- estructura de tablas y checksum del snapshot de esquema;
- cantidad de tablas y filas contra el manifiesto.

El manifiesto lateral termina en `.pixonbak.manifest.json`. Solo contiene metadatos operativos: no incluye credenciales, nombres de clientes, contenido de filas ni la clave de cifrado.

## Consistencia del backup

`backup-encrypted.mjs` abre una transaccion `REPEATABLE READ WITH CONSISTENT SNAPSHOT`, exporta tablas base y guarda dentro del sobre cifrado:

- definiciones `CREATE TABLE`;
- checksum del esquema;
- filas serializadas;
- origen y version del motor;
- fecha de creacion.

El script detiene el backup si encuentra una tabla base que no use InnoDB, porque no podria prometer un snapshot transaccional consistente.

Es un backup logico. Antes de produccion debe comprobarse una restauracion completa en un entorno aislado con la misma version de MariaDB. El backup no reemplaza snapshots administrados por el proveedor ni una politica externa de retencion.

## `schema_migrations` y compatibilidad legado

La tabla historica con `name` y `applied_at` se conserva. En la primera aplicacion protegida se agregan, de forma aditiva e idempotente, las columnas de checksum, origen, estado, inicio, fin, duracion, bytes, runner, intentos y ultimo error.

Una fila historica sin checksum no se vuelve a ejecutar. Bajo lock se fija el SHA-256 del archivo actual y queda identificada con `checksum_origin = 'legacy_baseline'`. Esto crea una linea base verificable hacia el futuro; no pretende demostrar criptograficamente que el archivo era identico el dia de su ejecucion original. El plan muestra estas filas antes de adoptarlas.

La migracion existente `001_runtime_schema.sql` pasa a estar versionada sin modificar su contenido. El ejecutor no elimina, renombra ni transforma tablas comerciales legado. Las migraciones de commerce posteriores deben ser aditivas y mantener adaptadores hasta completar un cutover documentado.

Si una base contiene DDL aplicado manualmente pero no tiene la fila correspondiente en `schema_migrations`, no ejecutes el archivo como pendiente. Deten el despliegue y reconcilia primero en staging con evidencia del esquema real.

## Fallos de DDL

MariaDB realiza commits implicitos para muchas instrucciones DDL. Por eso el ejecutor:

1. inserta `running` antes de enviar el SQL;
2. ejecuta el archivo sin prometer rollback;
3. escribe `applied` y duracion al terminar;
4. escribe `failed`, duracion y un error sanitizado cuando falla.

Tras `failed` o un `running` abandonado:

1. conserva logs y backup;
2. no edites el archivo que fallo;
3. inspecciona en staging que sentencias quedaron aplicadas;
4. decide entre restaurar el backup probado o completar una reparacion controlada;
5. reconcilia `schema_migrations` solo dentro del procedimiento de incidente y con auditoria;
6. crea una migracion nueva para cualquier correccion hacia adelante.

No borres la fila ni fuerces un reintento automatico: eso puede duplicar datos o dejar restricciones distintas entre ambientes.

## Lock de despliegue

El nombre del advisory lock incluye un hash de host, puerto y base; no expone credenciales. `GET_LOCK` usa una espera limitada. El lock vive en la conexion dedicada y se libera con `RELEASE_LOCK` en `finally`; cerrar la conexion tambien lo libera si el proceso termina inesperadamente.

El lock evita dos ejecutores simultaneos, pero no detiene escrituras de la aplicacion. Las migraciones que cambien tablas activas todavia requieren ventana de mantenimiento o una estrategia online ensayada.

## Rollback

Cada cambio debe documentar antes del deploy:

- restauracion probada del backup;
- compatibilidad del build anterior con el esquema nuevo;
- migracion compensatoria cuando el DDL sea reversible;
- punto a partir del cual el rollback de codigo deja de ser seguro.

No se debe declarar una migracion reversible solo porque el script llamo a `ROLLBACK`.
