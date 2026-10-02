# ARCHIVO HISTÓRICO — CLOUDFLARE WORKERS & FREE-TIER CLOUD POC

**Estado:** OBSOLETO / ARCHIVADO  
**Fecha de Archivo:** Octubre 2026  
**Motivo:** Migración definitiva a Hostinger Cloud Startup (Arquitectura Unificada: One Provider, One App, One Database).

---

## 1. Contexto Histórico

Durante septiembre-octubre de 2026 se evaluó una arquitectura distribuida basada en:
- Cloudflare Workers para el backend en el Edge
- Cloudflare Static Assets para el frontend de Astro
- Cloudflare Hyperdrive como acelerador y connection pooler
- Aiven MySQL Free como base de datos en la nube
- Cloudflare Tunnel (`cloudflared`) temporal hacia MariaDB local
- Cloudflare R2 para almacenamiento y respaldos cifrados

## 2. Lecciones Aprendidas y Desafíos

1. **Latencia de Red Distribuida:** La combinación Edge Worker -> Hyperdrive -> Aiven MySQL introducía saltos de red adicionales en comparación con una base de datos local o coubicada en el mismo centro de datos.
2. **Restricciones de Runtime:** Cloudflare Workers requería hacks (`disableEval`, re-implementación de `express-mysql-session`, adaptación de SSE, simulador de cron triggers vía fetch handler) que agregaban complejidad accidental.
3. **Fragilidad de Planes Gratuitos:** Los servicios gratuitos de bases de datos externas (como Aiven Free) sufren de desconexiones imprevistas, límites de memoria y riesgos de corte de servicio sin soporte.
4. **Múltiples Paneles:** Mantener Cloudflare, Aiven, GitHub, túnel de Windows y servicios locales requería 5 paneles y monitorización constante.

## 3. Clasificación de Artefactos

| Artefacto | Clasificación | Motivo |
| :--- | :--- | :--- |
| `worker/index.mjs` | ARCHIVE | Código de referencia sobre emulación de Express en V8 Workers |
| `wrangler.toml` | ARCHIVE | Configuración de bindings Hyperdrive y R2 |
| `tools/setup-hyperdrive.mjs` | ARCHIVE | Script de automatización de Hyperdrive |
| `tools/deploy-cloudflare.mjs` | ARCHIVE | Script de despliegue a Workers |
| `docs/CLOUDFLARE_EDGE.md` | DEPRECATED | Documentación de la fase experimental |
| `docs/VPS_REQUIREMENTS.md` | DEPRECATED | Requisitos de VPS previo a la elección de Cloud Startup |
| `docs/VPS_CUTOVER_CHECKLIST.md` | DEPRECATED | Checklist de VPS previo a la elección de Cloud Startup |
| `docs/HOSTINGER_PRODUCTION.md` | **CANÓNICO (VIGENTE)** | Arquitectura actual y definitiva |
