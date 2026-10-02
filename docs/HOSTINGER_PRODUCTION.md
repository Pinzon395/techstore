# PIXON PC — ARQUITECTURA PRODUCTIVA EN HOSTINGER CLOUD STARTUP

**Estado:** Vigente / Canónico  
**Dominio:** `https://pixon.com.mx`  
**Proveedor:** Hostinger (Plan: Cloud Startup — Managed Hosting)  
**Filosofía:** ONE PROVIDER · ONE APP · ONE DATABASE · ONE DEPLOYMENT  

---

## 1. Resumen Ejecutivo

Pixon PC consolida toda su infraestructura en **Hostinger Cloud Startup**, eliminando la dispersión entre múltiples servicios gratuitos y túneles locales.

```
Usuario / Navegador
        │
        ▼ HTTPS
HOSTINGER CLOUD STARTUP (pixon.com.mx)
  ├── Red Global CDN / WAF / Anti-DDoS
  ├── Certificado SSL Let's Encrypt (Automático)
  ├── 1 Aplicación Node.js (Express + Astro)
  │     ├── Frontend estático pre-renderizado (dist/)
  │     ├── API REST (/api/*) y Autenticación (/auth/*)
  │     ├── SSR dinámico para catálogo en vivo (/tienda/:slug)
  │     ├── Tareas programadas internas (Hold cleanup, Review sync, Outbox)
  │     └── Almacenamiento persistente (storage/ fuera del release)
  ├── MySQL Administrado (Base de datos transaccional)
  ├── Backups diarios automatizados (retención nativa)
  └── Despliegue automático vía GitHub (push a main)
```

---

## 2. Pila Tecnológica

| Componente | Tecnología | Rol |
| :--- | :--- | :--- |
| **Hosting & Runtime** | Hostinger Cloud Startup (Node.js LTS 20.x / 22.x) | Servidor de aplicaciones administrado |
| **Frontend** | Astro 6.x (Modo SSG / Static File) | Generación estática de 217+ rutas optimizadas en `dist/` |
| **Backend & API** | Node.js + Express 4.x (`server/server.js`) | API REST, sesiones, seguridad, headers CSP, OAuth, uploads |
| **Base de Datos** | MySQL 8.0 Administrado en Hostinger | 98 tablas InnoDB, índices, transacciones ACID, row locking |
| **Sesiones** | `express-mysql-session` | Sesiones persistentes en tabla `sessions` con cookies HttpOnly/Secure/SameSite=Lax |
| **Storage Persistente**| Directorio persistente de Hostinger | Comprobantes de pago y multimedia protegida en `storage/` |
| **Seguridad** | Helmet, CSP estricto, Rate Limiting, CORS | Cabeceras HTTP seguras, protección anti-CSRF |
| **Correos** | Resend API | Envío transaccional y cola en tabla `email_outbox` |
| **OAuth** | Google OAuth 2.0 (Passport.js) | Callback oficial `https://pixon.com.mx/auth/google/callback` |

---

## 3. Comandos de Construcción y Arranque

En el panel de Hostinger (hPanel -> Sección **Node.js**):

- **Node.js version:** `22.x` (o `20.x` LTS)
- **Application root:** `/home/uXXXXX/domains/pixon.com.mx/public_html` (o directorio asignado)
- **Application startup file:** `server/server.js`
- **Build command:**
  ```bash
  npm run build
  ```
- **Start command:**
  ```bash
  npm run start
  ```

---

## 4. Variables de Entorno en Producción (.env)

Estas variables deben configurarse de forma segura en el gestor de variables de Hostinger:

```ini
# Entorno
NODE_ENV=production
PORT=3000

# Base de Datos MySQL Hostinger
DB_HOST=localhost
DB_PORT=3306
DB_USER=uXXXXX_pixon
DB_PASSWORD=ContraseñaSuperSegura_MySQL8
DB_NAME=uXXXXX_pixondb

# Sesión y Seguridad (mínimo 64 caracteres aleatorios)
SESSION_SECRET=a8f9c2d1e0b347...long_random_hex...

# Google OAuth 2.0
GOOGLE_CLIENT_ID=827973477493-dgeltontfj0esnq7d25bkfpdjm58ol11.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://pixon.com.mx/auth/google/callback

# Notificaciones y Correos
RESEND_API_KEY=re_...
EMAIL_FROM=soporte@pixon.com.mx
NOTIFICATION_EMAIL=luispinzon395@gmail.com
ADMIN_EMAIL=luispinzon395@gmail.com

# Almacenamiento Persistente (Fuera del build/dist)
DATA_DIR=/home/uXXXXX/pixon_persistent_data
UPLOAD_DIR=/home/uXXXXX/pixon_persistent_data/commerce-payment-proofs
MEDIA_DIR=/home/uXXXXX/pixon_persistent_data/commerce-media
```

---

## 5. Base de Datos MySQL Administrada

### Conexión y Pool
El backend utiliza `mysql2/promise` con pool optimizado para el límite de conexiones de Hostinger:
- **connectionLimit:** 10 conexiones persistentes
- **waitForConnections:** `true`
- **queueLimit:** `0`
- **charset:** `utf8mb4`
- **collation:** `utf8mb4_unicode_ci`

### Importación de Datos
El dump inicial completo y validado se encuentra en:
`backups/pixon_full_production_backup_mysql8.sql`
- **Tablas:** 98 tablas base + `job_runs` (idempotencia)
- **Filas:** 16,568 registros íntegros
- **Integridad:** Claves foráneas diferidas al final para prevenir fallos de importación.

---

## 6. Almacenamiento de Archivos y Persistencia

1. **Archivos Estáticos del Build:** Viven en `dist/` y se regeneran en cada despliegue de Astro.
2. **Archivos de Usuarios (Comprobantes / Multimedia Privada):**
   - Viven en `DATA_DIR` configurado fuera de la raíz de releases de Git.
   - Acceso autenticado mediante `/api/commerce/payment-proofs/:key`.
   - Sandbox CSP, `Cache-Control: private, no-store`, `nosniff`.

---

## 7. Despliegue Automatizado (CI/CD con GitHub)

1. En Hostinger hPanel -> **Git**:
   - Conectar con repositorio: `Pinzon395/techstore`
   - Branch: `main`
   - Configurar webhook de GitHub para despliegue automático ante cada push a `main`.
2. Flujo de trabajo de desarrollo:
   ```
   Cambio en local -> Tests locales pasan -> git push origin main -> Hostinger build automático -> Sitio en vivo
   ```
3. Verificación de versión tras el despliegue:
   - Endpoint: `https://pixon.com.mx/api/version`
   - Endpoint de salud: `https://pixon.com.mx/api/health` (Devuelve `status: "UP"`, `app: "UP"`, `db: "UP"`)

---

## 8. Configuración DNS

Registros canónicos para `pixon.com.mx`:

| Tipo | Host | Valor / Destino | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | IP del servidor Hostinger Cloud Startup | 300 (inicial) -> 3600 |
| **CNAME** | `www` | `pixon.com.mx` | 3600 |
| **MX** | `@` | Registros del proveedor de correo (ej. Titan Mail / Google Workspace) | 3600 |
| **TXT** | `@` | SPF / DKIM / DMARC vigentes | 3600 |
