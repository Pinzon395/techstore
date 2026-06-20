# Auditoria de performance - 2026-06-20

## Resumen

El sitio ya compila como Astro estatico. Los mayores costos detectados fueron:

- Home: muchas imagenes WebP pequeñas/medianas cargadas en la pagina.
- Paginas de servicios: CSS compartido de servicios de aproximadamente 800 KB sin comprimir, usado por mas de 100 paginas.
- Algunas referencias puntuales a JPG/JPEG pesados aunque ya existia WebP equivalente.
- Service worker cacheaba JS/CSS no versionados con estrategia cache-first.
- `cache-buster.js` recargaba tambien en primera visita.

## Cambios aplicados

- `src/layouts/Base.astro`: desactive el preload global de `sprite.svg`. Los iconos siguen cargando cuando el navegador los necesita, pero ya no compiten con el LCP en todas las paginas.
- `src/components/views/B2bOfficeSupportView.astro`: cambie `formateo-windows-cancun.jpeg` por `formateo-windows-cancun.webp`.
- `src/components/views/PhoneNoPowerView.astro`: cambie `microscopio-flexor.jpg` por `microscopio-flexor.webp`.
- `public/cache-buster.js`: ya no limpia storage ni recarga en primera visita; solo actua cuando existe una version previa distinta.
- `public/sw.js`: actualice version y limite cache-first a imagenes/fuentes/assets versionados de Astro. Evita que scripts no versionados queden viejos.
- `public/scripts/pwa-register.js`: actualice version del service worker.

## Medicion antes y despues

Estimacion por HTML + assets referenciados en `dist`:

```text
Home:
Antes:   3220 KB total, 2721 KB imagenes
Despues: 3133 KB total, 2634 KB imagenes
Ahorro:   87 KB

/servicios/b2b/soporte-oficinas:
Antes:   2428 KB total, 1205 KB imagenes
Despues: 1849 KB total,  626 KB imagenes
Ahorro:  579 KB

/servicios/telefono/celular-no-prende:
Antes:   1967 KB total,  744 KB imagenes
Despues: 1840 KB total,  618 KB imagenes
Ahorro:  127 KB
```

Medicion local con navegador mobile Playwright contra `dist`:

```text
/                                      LCP 316 ms | CLS 0.000 | transfer 434 KB | resources 32
/servicios/b2b/soporte-oficinas       LCP  88 ms | CLS 0.000 | transfer 1633 KB | resources 40
/servicios/telefono/celular-no-prende LCP  72 ms | CLS 0.000 | transfer 1465 KB | resources 38
```

Notas de la medicion:

- El servidor estatico local no simula Brotli/Cloudflare, por eso el CSS se ve mas pesado que en produccion con compresion.
- Los errores de consola observados fueron por red externa bloqueada y `/api/*` no disponible en el servidor estatico de auditoria.

## Pendiente de mayor impacto

El siguiente trabajo importante es dividir o reducir el CSS de `src/pages/servicios/[categoria]/[servicio].astro`. El build genera un CSS de servicios cercano a 800 KB que se carga en muchas paginas. Conviene hacerlo en una rama/paso separado porque puede afectar layout de mas de 100 URLs.

Recomendacion tecnica:

1. Separar estilos comunes de servicio de estilos especificos por categoria/vista.
2. Mover bloques repetidos a componentes Astro con CSS scoped.
3. Verificar con screenshots mobile/desktop de al menos:
   - `/servicios/b2b/soporte-oficinas`
   - `/servicios/telefono/celular-no-prende`
   - `/servicios/laptop/diagnostico`
   - `/servicios/pc/mantenimiento-preventivo`
   - `/`

## CSS de servicios - paso controlado aplicado

Se elimino el bundle compartido `_servicio_.*.css` de aproximadamente 800 KB.

Cambios:

- `ServiceDetailView.astro`: el CSS comun se movio a `public/styles/service-detail.css`.
- `src/pages/servicios/[categoria]/[servicio].astro`: las vistas especiales se cargan con `await import(...)` segun el servicio actual, en vez de importarlas todas de forma estatica.
- El CSS legacy grande se movio a `public/styles/service-legacy.css` y se carga solo en servicios legacy y servicios PC que todavia dependen de esos estilos compartidos.
- Se agrego `tools/audit-service-css-screenshots.mjs` para repetir medicion y screenshots antes/despues.

Resultado de build:

```text
Antes:
_servicio_.DROlsG0q.css  819,603 bytes, enlazado en 116 paginas HTML

Despues:
_servicio_.*.css         0 paginas HTML
global.CtmLcRXE.css      128,911 bytes, CSS mas grande generado por Astro
service-legacy.css       260,853 bytes, enlazado en 39 paginas
service-detail.css        61,526 bytes, enlazado en 47 paginas
```

Verificacion:

- `npm run build` completo sin errores.
- Screenshots baseline/final guardados en `test-results/service-css-audit/`.
- Comparacion visual automatizada en servicios auditados:
  - `/servicios/b2b/soporte-oficinas`: 0.000% de pixeles cambiados
  - `/servicios/laptop/diagnostico`: 0.000% de pixeles cambiados
  - `/servicios/pc/mantenimiento-preventivo`: 0.000% de pixeles cambiados
  - `/servicios/telefono/celular-no-prende`: desktop 0.000%; mobile mostro diferencia por carga de imagen lazy, no por layout
