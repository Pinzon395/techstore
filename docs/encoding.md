# Política UTF-8

Este proyecto debe guardarse y servirse siempre como UTF-8.

Reglas obligatorias:

- Guardar archivos como UTF-8.
- No usar ANSI, Windows-1252 ni conversiones manuales Latin-1.
- Ejecutar `npm run check:encoding` antes de `npm run build`.
- Si aparecen mojibake, replacement characters o palabras corruptas, detener el release y corregir.
- Mantener MariaDB y la conexión Node en `utf8mb4`.
- No convertir datos de base de datos sin backup previo.

Validación local:

```bash
npm run check:encoding
npm run build
```

Corrección mecánica de mojibake conocido:

```bash
node scripts/check-encoding.js --fix
npm run check:encoding
```

Si el problema viene de datos reales en MariaDB, primero respaldar la base y revisar tabla/campo afectado antes de aplicar cualquier migración.
