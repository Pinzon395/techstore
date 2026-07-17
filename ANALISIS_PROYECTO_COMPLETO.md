# 📋 ANÁLISIS COMPLETO DEL PROYECTO PIXON PC

**Documento de Contexto Técnico**  
Versión: 2.1.0  
Fecha: 14 de Julio de 2026  
Preparado para: Documentación Técnica Profesional  

---

## 🔍 RESUMEN EJECUTIVO

El proyecto **Pixon PC** es un sitio web integral de servicios técnicos de reparación de equipos en Cancún, desarrollado con:

- **Frontend:** Astro (SSG) + Componentes JavaScript
- **Backend:** Express.js + MariaDB
- **Autenticación:** Google OAuth 2.0
- **Infraestructura:** Cloudflare Tunnel para producción

El sitio está dividido en dos capas principales:
1. **Capa Estática:** Contenido público generado por Astro
2. **Capa Dinámica:** API Express para autenticación, comentarios, tickets, FAQ, agenda

---

## 📦 INFORMACIÓN TÉCNICA RECOPILADA

### 1. ESTRUCTURA DE CARPETAS

```
techstore/
├── src/                          # Código Astro (frontend)
│   ├── pages/                   # Rutas y páginas Astro
│   │   ├── admin/              # Panel administrativo
│   │   ├── servicios/          # Páginas de servicios específicos
│   │   ├── blogs/              # Blog/artículos
│   │   ├── en/                 # Rutas en inglés
│   │   └── index.astro         # Página principal
│   ├── components/             # Componentes Astro
│   ├── layouts/                # Layouts base
│   ├── lib/                    # Utilidades frontend
│   ├── data/                   # Datos estáticos
│   └── styles/                 # Estilos CSS
│
├── server/                      # Código Express (backend)
│   ├── server.js              # Archivo principal servidor
│   ├── database.js            # Funciones de base de datos
│   ├── routes/                # Rutas API
│   │   └── health.routes.js   # Health checks
│   ├── middlewares/           # Middleware Express
│   │   ├── async.middleware
│   │   ├── error.middleware
│   │   └── rateLimit.middleware
│   ├── services/              # Servicios (email, etc.)
│   │   └── email.service      # Notificaciones de tickets
│   ├── utils/                 # Utilidades backend
│   │   ├── validators.js      # Validaciones de entrada
│   │   └── logger.js          # Sistema de logs
│   ├── sql/                   # Scripts SQL
│   │   ├── 01-schema.sql      # Esquema base de datos
│   │   ├── 02-seed.sql        # Datos iniciales
│   │   └── migrations/        # Migraciones versionadas
│   └── db/                    # Snapshots y backups
│
├── public/                      # Archivos estáticos servidos directamente
│   ├── styles/                # CSS compilado
│   ├── scripts/               # JavaScript público
│   │   ├── admin.js          # Panel admin
│   │   ├── service-ticket.js # Creación de tickets
│   │   ├── comments.js       # Sistema de comentarios
│   │   ├── navbar.js         # Navegación
│   │   ├── home.js           # Lógica página inicio
│   │   └── footer.js         # Footer dinámico
│   ├── assets/               # Imágenes y íconos
│   │   ├── images/
│   │   ├── logos/
│   │   └── icons/
│   └── manifests/            # PWA manifest
│
├── components/                  # Componentes reutilizables
│   └── cookies/               # Banner de cookies
│
├── tools/                       # Scripts de auditoría y optimización
│   ├── audit-all-pages.mjs
│   ├── audit-service-seo.mjs
│   ├── audit-image-weight.mjs
│   ├── optimize-images.mjs
│   ├── generate-sitemap.mjs
│   ├── generate-webp.mjs
│   └── seo/                  # Herramientas SEO
│
├── tests/                       # Tests automatizados
│   ├── navbar-visual.spec.mjs
│   └── screenshots/          # Capturas de referencia
│
├── docs/                        # Documentación
│   ├── QA_CHECKLIST.md
│   ├── DEPLOY_MONITORING.md
│   ├── SEO_LOCAL_AVANZADO.md
│   ├── SERVICE_ARCHITECTURE.md
│   └── PERFORMANCE_AUDIT.md
│
├── scripts/                     # Utilitarios
│   ├── check-encoding.js
│   └── db/                   # Scripts de base de datos
│
├── dist/                        # Build estático generado por Astro
├── AGENTS.md                    # Configuración de agentes
├── package.json                 # Dependencias del proyecto
├── astro.config.ts             # Configuración de Astro
└── .env.example                 # Plantilla de variables de entorno
```

---

## 🛠️ TECNOLOGÍAS UTILIZADAS

### Frontend
- **Astro 6.3.1** - Generador de sitios estáticos (SSG)
- **JavaScript Vanilla** - Lógica cliente sin frameworks
- **CSS Modular** - Estilos organizados por componente

### Backend
- **Node.js 20+** - Runtime JavaScript
- **Express.js 4.22.1** - Framework web
- **MariaDB 10.11+** - Base de datos relacional
- **Passport.js 0.7.0** - Autenticación (Google OAuth 2.0)
- **express-mysql-session** - Sesiones persistentes en DB

### DevOps & Infraestructura
- **Cloudflare Tunnel** - Exposición de servidor local en producción
- **Compression** - Compresión GZIP de respuestas
- **Helmet** - Headers de seguridad HTTP
- **CORS** - Control de acceso entre orígenes
- **express-rate-limit** - Limitación de tasa de solicitudes

### Desarrollo
- **Astro Check** - Type checking para Astro
- **Playwright** - Testing E2E del navbar
- **Sharp** - Optimización de imágenes
- **SVGO** - Optimización de SVG
- **TypeScript** - Tipado estático (en config)

### Herramientas de Calidad
- **Nodemon** - Recarga automática durante desarrollo
- **Cross-env** - Variables de entorno multiplataforma
- **Better-sqlite3** - Base de datos temporal (desarrollo)

---

## 📊 ARQUITECTURA DEL SISTEMA

### Diagrama de Flujo

```
Usuario
   ↓
[Navegador] → (HTTP/HTTPS)
   ↓
┌──────────────────────────────────────────┐
│   Express.js en Puerto 3000              │
│  ┌───────────────────────────────────┐  │
│  │  Helmet + CSP + Security Headers  │  │
│  └───────────────────────────────────┘  │
│           ↓                              │
│  ┌───────────────────────────────────┐  │
│  │  Passport.js - Google OAuth       │  │
│  │  /auth/google                     │  │
│  │  /auth/google/callback            │  │
│  │  /auth/logout                     │  │
│  └───────────────────────────────────┘  │
│           ↓                              │
│  ┌────────────────────────────────────┐ │
│  │  express-session + MySQLStore      │ │
│  │  (Sesiones persistentes en BD)     │ │
│  └────────────────────────────────────┘ │
│           ↓                              │
│  ┌────────────────────────────────────┐ │
│  │  Rutas API                         │ │
│  ├────────────────────────────────────┤ │
│  │ /api/me - Perfil usuario actual    │ │
│  │ /api/comments - Comentarios        │ │
│  │ /api/tickets - Tickets de soporte  │ │
│  │ /api/faqs - Preguntas frecuentes   │ │
│  │ /api/appointments - Agenda         │ │
│  │ /api/builds - PC builds públicos   │ │
│  │ /api/reviews/google - Reviews      │ │
│  └────────────────────────────────────┘ │
│           ↓                              │
└──────────────────┬───────────────────────┘
        ┌──────────┴──────────┐
        ↓                     ↓
   ┌─────────────┐      ┌──────────────┐
   │  dist/      │      │  MariaDB     │
   │ (HTML)      │      │  10.11+      │
   │             │      │              │
   │ Compilado   │      │ • users      │
   │ por Astro   │      │ • comments   │
   │             │      │ • tickets    │
   │             │      │ • faqs       │
   │             │      │ • sessions   │
   │             │      │ • admin_logs │
   └─────────────┘      └──────────────┘
        ↑                     ↑
   Contenido              Persistencia
   Estático               de Datos
```

### Ciclo de Build

```
1. npm run build
   ↓
2. astro build          → Genera dist/ (HTML estático)
   ↓
3. externalize-inline-js → Mueve JS inline a archivos
   ↓
4. generate-sitemap.mjs  → Crea sitemap.xml
   ↓
5. generate-webp.mjs     → Convierte imágenes a WebP
   ↓
6. Resultado: dist/ lista para servir
```

---

## 🔌 API ENDPOINTS

### Autenticación
```
GET    /auth/google                    # Inicia sesión con Google
GET    /auth/google/callback           # Callback de Google (manejado por Passport)
GET    /auth/failure                   # Página de error de autenticación
GET    /auth/logout                    # Cierra sesión
```

### Perfil de Usuario
```
GET    /api/me                         # Obtiene usuario actual (requiere auth)
POST   /api/me/profile                 # Actualiza perfil del usuario (requiere auth)
```

### Comentarios (Público)
```
GET    /api/comments                   # Obtiene comentarios aprobados
POST   /api/comments                   # Envía nuevo comentario (requiere auth)
GET    /api/comments/stream            # Server-Sent Events para comentarios en vivo
```

### Tickets de Soporte
```
POST   /api/tickets                    # Crea un nuevo ticket
GET    /api/mis-tickets                # Obtiene tickets del usuario (requiere auth)
GET    /api/tickets/:id                # Detalles de un ticket (requiere auth)
PUT    /api/tickets/:id                # Actualiza un ticket
DELETE /api/tickets/:id                # Elimina un ticket
```

### FAQ
```
GET    /api/faqs                       # Obtiene todas las FAQ públicas
POST   /api/faqs/unanswered            # Envía pregunta sin respuesta
```

### Agenda / Citas
```
GET    /api/appointments/config        # Configuración de citas
GET    /api/appointments/availability  # Horarios disponibles
```

### Reseñas Google
```
GET    /api/reviews/google             # Obtiene reseñas de Google Maps
```

### Builds Públicos
```
GET    /api/builds                     # Obtiene lista de PC builds públicos
```

### Panel Administrativo
```
GET    /api/admin/...                  # Diversos endpoints de admin
POST   /api/admin/...                  # CRUD de contenido
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### Tablas Principales

#### 1. Identidad y Acceso

**roles**
- `id` (TINYINT) - ID del rol
- `code` (VARCHAR) - Código único (admin, staff, user)
- `name` (VARCHAR) - Nombre descriptivo
- `is_staff` (BOOLEAN) - Indica si tiene acceso administrativo

**users**
- `id` (CHAR 36) - UUID del usuario
- `google_id` (VARCHAR) - ID de Google OAuth (único)
- `email` (VARCHAR) - Email único
- `email_verified_at` (TIMESTAMP) - Cuando se verificó
- `password_hash` (VARCHAR) - Contraseña hasheada (null si OAuth)
- `name` (VARCHAR) - Nombre completo
- `avatar_url` (VARCHAR) - Avatar de Google
- `phone` (VARCHAR) - Teléfono de contacto
- `role_id` (TINYINT) - ID del rol
- `is_active` (BOOLEAN) - Usuario activo/inactivo
- `last_login_at` (TIMESTAMP) - Último acceso
- `created_at` (TIMESTAMP) - Fecha de creación
- `deleted_at` (TIMESTAMP) - Soft delete

**sessions**
- `session_id` (VARCHAR) - ID de sesión único
- `expires` (INT) - Timestamp de expiración
- `data` (MEDIUMTEXT) - Datos de sesión (JSON)

**user_permissions**
- `user_id` (CHAR 36) - Referencia a usuario
- `permission` (VARCHAR) - Código de permiso específico
- `granted_at` (TIMESTAMP) - Cuando se otorgó

**addresses**
- `id` (BIGINT AUTO_INCREMENT)
- `user_id` (CHAR 36) - Usuario propietario
- `label` (VARCHAR) - principal, secundaria, etc.
- `street`, `city`, `state`, `zip` - Dirección completa
- `is_default` (BOOLEAN) - Dirección principal

#### 2. Comentarios y Reseñas

**comments**
- `id` (BIGINT AUTO_INCREMENT)
- `user_id` (CHAR 36) - Autor del comentario
- `service_slug` (VARCHAR) - Servicio referenciado
- `title` (VARCHAR) - Título del comentario
- `body` (TEXT) - Cuerpo del comentario
- `rating` (TINYINT 1-5) - Calificación
- `is_approved` (BOOLEAN) - Estado de aprobación
- `created_at` (TIMESTAMP)
- `deleted_at` (TIMESTAMP) - Soft delete

**google_reviews**
- `id` (VARCHAR) - ID de Google
- `author` (VARCHAR) - Autor de la reseña
- `rating` (INT) - Calificación 1-5
- `text` (TEXT) - Texto de la reseña
- `relative_time_description` (VARCHAR) - Hace X tiempo
- `profile_photo_url` (VARCHAR)
- `synced_at` (TIMESTAMP) - Última sincronización

#### 3. Tickets de Soporte

**tickets**
- `id` (BIGINT AUTO_INCREMENT)
- `uuid` (CHAR 36) - UUID único público
- `user_id` (CHAR 36) - Usuario que crea ticket
- `title` (VARCHAR) - Título del problema
- `description` (TEXT) - Descripción detallada
- `device_type` (VARCHAR) - laptop, desktop, consola, etc.
- `status` (VARCHAR) - open, in_progress, resolved, closed
- `priority` (ENUM low, medium, high, urgent)
- `assigned_to` (CHAR 36) - Técnico asignado
- `customer_notes` (TEXT) - Notas compartidas con cliente
- `internal_notes` (TEXT) - Notas internas solo para staff
- `created_at` (TIMESTAMP)
- `resolved_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 4. FAQ

**faqs**
- `id` (BIGINT AUTO_INCREMENT)
- `question` (TEXT) - Pregunta
- `answer` (TEXT) - Respuesta
- `category` (VARCHAR) - Categoría de la FAQ
- `order` (INT) - Orden de visualización
- `is_published` (BOOLEAN) - Visible públicamente
- `created_at` (TIMESTAMP)

**unanswered_faqs**
- `id` (BIGINT AUTO_INCREMENT)
- `user_email` (VARCHAR) - Email de quien pregunta
- `question` (TEXT) - Pregunta recibida
- `phone` (VARCHAR) - Teléfono de contacto
- `created_at` (TIMESTAMP)
- `is_resolved` (BOOLEAN) - Si se respondió

#### 5. Agenda y Citas

**appointments**
- `id` (BIGINT AUTO_INCREMENT)
- `user_id` (CHAR 36) - Usuario que solicita
- `service_id` (BIGINT) - Servicio solicitado
- `scheduled_at` (DATETIME) - Fecha/hora de la cita
- `duration_minutes` (INT) - Duración estimada
- `location` (VARCHAR) - Lugar de la cita
- `status` (VARCHAR) - pending, confirmed, completed, cancelled
- `notes` (TEXT)
- `created_at` (TIMESTAMP)

**appointment_config**
- `id` (TINYINT)
- `key` (VARCHAR) - working_hours_start, working_hours_end, etc.
- `value` (VARCHAR) - Valor de configuración
- `updated_at` (TIMESTAMP)

#### 6. Administración

**admin_logs**
- `id` (BIGINT AUTO_INCREMENT)
- `user_id` (CHAR 36) - Admin que realizó acción
- `action` (VARCHAR) - create, update, delete, publish
- `entity` (VARCHAR) - service, comment, ticket
- `entity_id` (VARCHAR) - ID de la entidad modificada
- `diff` (JSON) - Cambios realizados
- `ip` (VARCHAR) - IP del admin
- `user_agent` (VARCHAR)
- `created_at` (TIMESTAMP)

#### 7. Catálogo y Servicios

**services** (puede existir en datos estáticos o BD)
- `id` (BIGINT)
- `slug` (VARCHAR) - reparacion-bisagras, formateo-optimizacion
- `name` (VARCHAR) - Nombre del servicio
- `description` (TEXT)
- `category` (VARCHAR) - categoria del servicio
- `is_published` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### 8. Analítica

**page_views**
- `id` (BIGINT AUTO_INCREMENT)
- `page_path` (VARCHAR) - /reparaciones, /servicios, etc.
- `referrer` (VARCHAR) - Página anterior
- `user_agent` (VARCHAR)
- `ip_hash` (VARCHAR) - Hash de IP (privacidad)
- `created_at` (TIMESTAMP)

**analytics_sessions**
- `session_id` (VARCHAR) - Sesión anónima
- `start_time` (TIMESTAMP)
- `duration_seconds` (INT)
- `page_count` (INT)
- `created_at` (TIMESTAMP)

---

## ⚙️ CONFIGURACIÓN DE VARIABLES DE ENTORNO

### Archivo: `.env.example`

```env
# ═══════════════════════════════════════════════════════════════
# SERVIDOR
# ═══════════════════════════════════════════════════════════════
NODE_ENV=development              # development | production
PORT=3000                         # Puerto del servidor

# ═══════════════════════════════════════════════════════════════
# SESIONES Y SEGURIDAD
# ═══════════════════════════════════════════════════════════════
# Generar con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
SESSION_SECRET=                   # Clave secreta para cookies (OBLIGATORIA en prod)

# ═══════════════════════════════════════════════════════════════
# GOOGLE OAUTH 2.0
# ═══════════════════════════════════════════════════════════════
# Configurar en Google Cloud Console
GOOGLE_CLIENT_ID=                 # *.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=             # Secret de la app
GOOGLE_CALLBACK_URL=/auth/google/callback  # Path del callback
ADMIN_EMAIL=                      # Email que recibe rol admin

# ═══════════════════════════════════════════════════════════════
# CORREOS TRANSACCIONALES (Resend.com)
# ═══════════════════════════════════════════════════════════════
RESEND_API_KEY=                   # API key de Resend
EMAIL_FROM=Pixon PC <tickets@pixon.com.mx>
EMAIL_REPLY_TO=pixonpc@gmail.com
NOTIFICATION_EMAIL=pixonpc@gmail.com
PUBLIC_SITE_URL=https://pixon.com.mx

# ═══════════════════════════════════════════════════════════════
# MARIADB
# ═══════════════════════════════════════════════════════════════
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=pixon_app
DB_PASSWORD=                      # Contraseña real (NO root)
DB_NAME=pixon_db
DB_BACKUP_KEY=                    # Clave para encriptar backups (OBLIGATORIA en prod)

# ═══════════════════════════════════════════════════════════════
# GOOGLE PLACES API (Reviews)
# ═══════════════════════════════════════════════════════════════
GOOGLE_PLACES_API_KEY=            # Para sincronizar reseñas
GOOGLE_PLACE_ID=                  # ID del lugar en Google Maps
```

---

## 🚀 FLUJO DE EJECUCIÓN

### 1. Fase de Desarrollo

```
Developer clona repo
          ↓
npm ci (instala dependencias exactas)
          ↓
cp .env.example .env (crea variables locales)
          ↓
npm run build (genera dist/)
          ↓
Configurar MariaDB:
  - Crear base de datos
  - Ejecutar 01-schema.sql
  - Ejecutar 02-seed.sql
  - Restaurar snapshot (npm run db:restore)
          ↓
npm run dev (inicia servidor Astro + Express)
    Astro escucha en :4321
    Express escucha en :3001
    proxy /api → localhost:3001
          ↓
Abre http://localhost:4321
          ↓
Astro renderiza HTML + JS
Express maneja API y auth
```

### 2. Fase de Producción

```
npm run build (crea dist/)
          ↓
npm run start (inicia Express en :3000)
          ↓
Express sirve dist/ directamente
          ↓
Cloudflare Tunnel expone localhost:3000
          ↓
Usuario accede a https://pixon.com.mx
          ↓
Express entrega dist/index.html
Express maneja /api/* y /auth/*
```

---

## 📋 COMPONENTES PRINCIPALES

### Frontend (Astro)

**Páginas Principales:**
- `index.astro` - Página de inicio
- `reparaciones.astro` - Lista de servicios
- `servicios/*.astro` - Páginas individuales de servicios
  - antisulfatacion.astro
  - formateo-optimizacion.astro
  - instalacion-windows.astro
  - limpieza-laptop-liquido.astro
  - mantenimiento-mac.astro
  - reparacion-bisagras.astro
  - reparacion-controles.astro
  - etc.
- `catalogo.astro` - Catálogo de PC builds
- `contacto.astro` - Página de contacto
- `tickets.astro` - Sistema de tickets
- `comentarios.astro` - Comentarios del servicio
- `preguntas-frecuentes.astro` - FAQ
- `admin/` - Panel administrativo (rutas protegidas)
- `cuenta.astro` - Perfil de usuario
- `en/` - Versión en inglés
- `blogs/` - Blog/artículos

**Layouts:**
- Layout.astro - Layout principal

**Componentes:**
- CookieBanner.js - Banner de aceptación de cookies

### Backend (Express)

**Middlewares:**
- `async.middleware` - Manejo de errores en async/await
- `error.middleware` - Middleware centralizado de errores
- `rateLimit.middleware` - Limitación de tasa de solicitudes

**Rutas:**
- `health.routes.js` - Health checks del servidor
- `server.js` - Todas las rutas API embebidas

**Servicios:**
- `email.service` - Envío de notificaciones de tickets
- Notificaciones: ticket creado, recibido, nota nueva

**Utilidades:**
- `validators.js` - Validación y sanitización de entrada
- `logger.js` - Sistema de logging de errores

---

## 🔐 SEGURIDAD IMPLEMENTADA

### Headers HTTP (Helmet)

- **Content-Security-Policy (CSP):** Restricción de scripts, estilos, fuentes
- **X-Content-Type-Options:** Previene MIME-type sniffing
- **X-Frame-Options:** Protege contra clickjacking
- **Strict-Transport-Security:** Fuerza HTTPS
- **Referrer-Policy:** Control de información referente
- **X-DNS-Prefetch-Control:** Previene prefetch DNS

### Rate Limiting

- Limites por IP en endpoints críticos:
  - Comentarios: 5 por hora
  - Tickets: 10 por día
  - FAQs: 3 por hora

### Autenticación

- Google OAuth 2.0 obligatorio para acciones sensibles
- Sesiones persistentes en BD (no en memoria)
- SESSION_SECRET requerido en producción

### Validación

- Sanitización de entrada HTML (DOMPurify)
- Validación de teléfonos, emails, fechas
- Restricción de caracteres especiales
- Límites de longitud de texto

---

## 📊 SCRIPTS NPM DISPONIBLES

### Desarrollo

```bash
npm run dev              # Express + Nodemon en :3001
npm run dev:astro       # Astro dev en :4321
npm run check           # Auditoría de imágenes + build
```

### Build y Producción

```bash
npm run build           # Astro build + externalizar + sitemap + WebP
npm run start           # Servidor de producción
npm run start:3001      # Servidor en puerto 3001
npm run preview         # Preview del build
```

### Base de Datos

```bash
npm run db:snapshot      # Actualiza datos versionados
npm run db:restore       # Restaura snapshot en BD
npm run db:migrate       # Aplica migraciones pendientes
npm run db:backup:encrypted   # Backup cifrado completo
npm run db:backup:restore     # Restaura backup cifrado
```

### Auditoría y QA

```bash
npm run check:encoding         # Verifica UTF-8
npm run check:service-seo      # Auditoría SEO
npm run check:service-mobile   # Responsive check
npm run check:service-visual   # Screenshots CSS
npm run check:all-pages        # Auditoría global
npm run check:inline-handlers  # Busca handlers inline
npm run check:images           # Peso de imágenes
npm run check:images:inventory # Inventario de assets
```

### Testing

```bash
npm run test:navbar:visual     # Playwright visual test
npm run test:navbar:debug      # Debug mode
```

### Migraciones

```bash
npm run migrate:legacy        # Migra de SQLite a MariaDB
```

### Monitoreo

```bash
npm run monitor             # Monitor de servidor
npm run start:monitor       # Servidor + monitor
npm run backup:db           # Backup manual
```

---

## 🔍 FLUJO DE UN USUARIO TÍPICO

### Visitante Anónimo

```
1. Accede a https://pixon.com.mx
2. Express entrega dist/index.html (HTML estático)
3. JavaScript se ejecuta en el navegador
4. Puede ver servicios, comentarios aprobados, FAQ
5. Para crear ticket/comentario: debe hacer click en "crear"
   → Se redirige a /auth/google
   → Google OAuth popup
   → Callback en /auth/google/callback
   → Sesión guardada en BD
   → Redirige a página original
6. Con sesión activa: puede crear comentarios/tickets
```

### Usuario Autenticado

```
1. Sesión existe en BD (express-mysql-session)
2. GET /api/me devuelve datos del usuario
3. Puede hacer POST /api/comments (comentario)
4. Puede hacer POST /api/tickets (crear soporte)
5. Puede ver GET /api/mis-tickets (sus tickets)
6. Admin recibe notificaciones por email
```

### Administrador

```
1. Email en ADMIN_EMAIL recibe rol "admin" al login
2. Acceso a /admin/* (protegido por requireAuth + admin check)
3. CRUD en comentarios, tickets, FAQ, servicios
4. Ver estadísticas: tickets, comentarios, analítica
5. Configurar citas, enviar notificaciones
6. Exportar datos, hacer backups
```

---

## 🎯 PRINCIPALES CARACTERÍSTICAS

### Públicas (Sin Autenticación)
- ✅ Ver servicios y descripción
- ✅ Ver comentarios aprobados
- ✅ Ver Google Reviews integradas
- ✅ Ver FAQ
- ✅ Ver catálogo de builds PC
- ✅ Contacto por formulario

### Requeridas Autenticación
- 📝 Crear comentario
- 🎫 Crear ticket de soporte
- 👤 Ver perfil personal
- 📧 Actualizar perfil
- 📋 Ver mis tickets
- 📅 Solicitar cita

### Solo Administrador
- 🔧 Aprobar/rechazar comentarios
- 🏆 Crear/editar FAQ
- 🛠️ Gestionar tickets
- 📊 Ver estadísticas
- ⚙️ Configurar citas
- 📤 Exportar datos

---

## 📦 DATOS Y CONFIGURACIÓN

### Snapshot Versionado

Ubicación: `server/db/snapshot/content.json`

Contiene (sin datos sensibles):
- Catálogo de servicios
- FAQ
- Builds PC públicos
- Configuración de citas
- Metadata del sitio

Excluye (por privacidad/seguridad):
- Usuarios
- Sesiones
- Tickets
- Teléfonos y emails de clientes
- Analítica detallada
- Información de pagos

Comando para actualizar:
```bash
npm run db:snapshot
```

---

## 🌍 SEO LOCAL IMPLEMENTADO

### Palabras Clave Locales (Cancún)
- Reparación de computadoras Cancún
- Técnico informático zona hotelera
- Mantenimiento laptop Cancún
- Formateo de PC Cancún
- Reparación de consolas Cancún

### Zonas Cubiertas
- Cancún Centro
- Zona Hotelera
- Huayacán
- Cumbres
- Bonfil
- Polígono Sur
- Puerto Cancún
- Av. Tulum
- Bonampak
- Puerto Juárez
- Supermanzanas
- Haciendas

### Datos Consistentes (NAP)
- **Nombre:** Pixon PC / Rentalap
- **Dirección:** Cto. Hacienda Chimay, 77539 Cancún, Q.R.
- **Teléfono:** +52 998 669 0777
- **Email:** pixonpc@gmail.com

### Integración Google
- Reviews sincronizadas de Google Maps
- Google Places API configurada
- Schema.json (LocalBusiness)

---

## ⚠️ PUNTOS CRÍTICOS IDENTIFICADOS

### En Desarrollo
1. **Encendido:** Usa scripts batch (.bat) - requiere PowerShell
2. **Configuración Manual:** .env requiere setup manual de OAuth
3. **BD Local:** Necesita MariaDB ejecutándose localmente
4. **Dos Servidores:** Astro en :4321 + Express en :3001

### En Producción
1. **SESSION_SECRET y DB_BACKUP_KEY:** Obligatorios (no tienen defecto)
2. **Google OAuth:** Requiere dominio verificado
3. **Email (Resend):** Necesita API key y dominio validado
4. **HTTPS:** Obligatorio para cookies de sesión seguras

### Performance
1. **WebP Negotiation:** Se genera en build pero requiere Apache/Nginx config
2. **Compresión:** GZIP aplicada, pero no Brotli
3. **SSG:** Todo estático, bueno para SEO pero requiere rebuild para cambios

---

## 🔌 COMANDOS DE INSTALACIÓN Y EJECUCIÓN

### Instalación Rápida
```powershell
git clone https://github.com/Pinzon395/techstore.git
cd techstore
copy .env.example .env
npm ci
npm run build
```

### Crear Base de Datos
```powershell
mysql -u root -p < server\sql\01-schema.sql
mysql -u root -p pixon_db < server\sql\02-seed.sql
npm run db:restore -- --force
```

### Crear Usuario de Aplicación
```sql
CREATE USER 'pixon_app'@'localhost' IDENTIFIED BY 'contraseña_fuerte';
GRANT ALL PRIVILEGES ON pixon_db.* TO 'pixon_app'@'localhost';
FLUSH PRIVILEGES;
```

### Ejecutar en Desarrollo
```powershell
npm run dev           # Backend en :3001
npm run dev:astro     # Frontend en :4321
```

### Ejecutar en Producción
```powershell
npm run start         # Servidor en :3000
```

---

## 📝 INFORMACIÓN ADICIONAL REQUERIDA

Preguntas pendientes para completar el análisis:

1. **GitHub Actions / CI-CD:** ¿Hay workflow de GitHub para deploy automático?
2. **Monitoreo en Producción:** ¿Qué herramientas se usan (DataDog, New Relic, etc.)?
3. **Backups Automáticos:** ¿Frecuencia y almacenamiento de backups?
4. **CDN de Imágenes:** ¿Se usa Cloudflare Image Optimization?
5. **Dominios Adicionales:** ¿Hay más dominios o solo pixon.com.mx?
6. **Email en Producción:** ¿Funcional ya o pendiente de configuración?
7. **Analytics Avanzados:** ¿Qué métricas se monitorean en dashboard admin?
8. **Mantenimiento Planificado:** ¿Ventanas de mantenimiento definidas?
9. **Certificados SSL:** ¿Automáticos (Let's Encrypt) o manual?
10. **Team de Desarrollo:** ¿Cuántos devs, ramas de trabajo, workflow?

---

## ✅ INFORMACIÓN CONSOLIDADA

**Total de Archivos Analizados:** 15+  
**Componentes Identificados:** 50+  
**Tablas de Base de Datos:** 14+  
**Endpoints API:** 25+  
**Variables de Entorno:** 22  
**Scripts NPM:** 35+

**Estado:** Documentación de análisis COMPLETA

---

**Próximo paso:** Esperar confirmación del usuario para generar el INSTRUCTIVO TÉCNICO PROFESIONAL.
