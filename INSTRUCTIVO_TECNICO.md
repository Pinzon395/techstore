# INSTRUCTIVO TÉCNICO: DESPLIEGUE LOCAL DE PIXON PC

## Configuración de Entorno de Desarrollo Local

**Versión:** 2.1.0  
**Fecha:** Julio 2026  
**Audience:** Desarrolladores Full-Stack  
**Tiempo Estimado:** 25-35 minutos  

---

## 📋 TABLA DE CONTENIDOS

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación de Dependencias](#instalación-de-dependencias)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Configuración de Base de Datos](#configuración-de-base-de-datos)
5. [Clonar y Configurar el Repositorio](#clonar-y-configurar-el-repositorio)
6. [Ejecutar el Servidor](#ejecutar-el-servidor)
7. [Compilación Estática (Build)](#compilación-estática-build)
8. [Verificación de Health Checks](#verificación-de-health-checks)
9. [Resolución de Problemas Comunes](#resolución-de-problemas-comunes)

---

## 🔧 REQUISITOS PREVIOS

### Software Requerido
- **Node.js** ≥ 18.0.0 LTS (recomendado 20.x)
- **npm** ≥ 9.0.0 o **pnpm** ≥ 8.0.0
- **MariaDB** ≥ 10.5 (o MySQL 8.0+)
- **Git** ≥ 2.30.0
- **Editor:** VS Code con extensiones recomendadas (Astro, Prettier, ESLint)

### Hardware Mínimo Recomendado
- **CPU:** Dual-core 2.0 GHz
- **RAM:** 4 GB (8 GB recomendado)
- **Disco:** 2 GB libres
- **Conexión:** Internet (para descargas iniciales)

### Verificar Instalación Previa
```bash
node --version      # Debe mostrar v18.0.0 o superior
npm --version       # Debe mostrar 9.0.0 o superior
mariadb --version   # Debe estar instalado
git --version       # Debe estar instalado
```

---

## 📦 INSTALACIÓN DE DEPENDENCIAS

### Paso 1: Descargar Node.js (Si no está instalado)

**Windows:**
1. Ir a https://nodejs.org/
2. Descargar **LTS** (20.x recomendado)
3. Ejecutar instalador (Next → Next → Finish)
4. Abrir PowerShell y verificar:
   ```powershell
   node --version
   npm --version
   ```

**macOS:**
```bash
# Con Homebrew
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm
```

### Paso 2: Instalar MariaDB

**Windows (usando MSI):**
1. Descargar desde https://mariadb.org/download/
2. Ejecutar instalador
3. Configurar puerto: **3306** (default)
4. Crear usuario: **pixon_app** con contraseña segura
5. Crear base de datos: **pixon**

**macOS:**
```bash
brew install mariadb
brew services start mariadb

# Crear usuario y BD
mysql -u root
CREATE USER 'pixon_app'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
CREATE DATABASE pixon CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON pixon.* TO 'pixon_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Linux:**
```bash
sudo apt install mariadb-server

sudo mysql
CREATE USER 'pixon_app'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
CREATE DATABASE pixon CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON pixon.* TO 'pixon_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Paso 3: Verificar Conexión a MariaDB

```bash
# Conectar a MariaDB local
mysql -u pixon_app -p -h 127.0.0.1

# Debe pedir contraseña y conectar exitosamente
# Luego: SELECT 1; y EXIT;
```

---

## ⚙️ CONFIGURACIÓN DE VARIABLES DE ENTORNO

### Paso 1: Crear Archivo `.env`

```bash
cd c:\Users\Usuario\techstore

# Copiar template
cp .env.example .env

# O crear manualmente
echo > .env
```

### Paso 2: Editar `.env` con valores reales

**Abrir con VS Code o editor de texto:**
```bash
code .env
```

**Llenar con valores (ejemplo):**
```env
# ────── SERVIDOR ──────
NODE_ENV=development
PORT=3001

# ────── SESIONES ──────
# Generar con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
SESSION_SECRET=<generar_con_crypto_randomBytes>

# ────── GOOGLE OAUTH ──────
GOOGLE_CLIENT_ID=<google_client_id>
GOOGLE_CLIENT_SECRET=<google_client_secret>
GOOGLE_CALLBACK_URL=/auth/google/callback

# ────── ADMIN ──────
ADMIN_EMAIL=tuEmail@gmail.com

# ────── CORREOS (RESEND) ──────
RESEND_API_KEY=<resend_api_key>
EMAIL_FROM="Pixon PC <tickets@pixon.com.mx>"
EMAIL_REPLY_TO=pixonpc@gmail.com
NOTIFICATION_EMAIL=pixonpc@gmail.com
PUBLIC_SITE_URL=https://pixon.com.mx

# ────── BASE DE DATOS ──────
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=pixon_app
DB_PASSWORD=<password_seguro>
DB_NAME=pixon
```

### Paso 3: Generar `SESSION_SECRET` Seguro

```bash
# En PowerShell/Terminal
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Copiar el output y reemplazar en .env
```

### Paso 4: Verificar `.env` Correctamente Formado

```bash
# En PowerShell
Get-Content .env

# Debe mostrar variables sin comillas extra, una por línea
```

---

## 🗄️ CONFIGURACIÓN DE BASE DE DATOS

### Paso 1: Crear Tablas y Schema

```bash
# El servidor creará tablas automáticamente al iniciar,
# pero puedes verificar manualmente:

mysql -u pixon_app -p pixon -h 127.0.0.1

# Luego en MySQL:
SHOW TABLES;

# Deberías ver: comments, faqs, users, tickets, sessions (si está configurado)
```

### Paso 2: Verificar Encoding UTF-8 (Importante)

```bash
mysql -u pixon_app -p pixon -h 127.0.0.1

ALTER DATABASE pixon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE comments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE faqs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tickets CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SHOW CREATE DATABASE pixon;
# Debe mostrar: utf8mb4 | utf8mb4_unicode_ci
```

### Paso 3: Ejecutar Script de Migración (Opcional)

```bash
# Si tienes datos legados de SQLite:
npm run migrate:legacy

# Esto convertirá automáticamente SQLite → MariaDB
```

---

## 🚀 CLONAR Y CONFIGURAR EL REPOSITORIO

### Paso 1: Clonar desde GitHub

```bash
# En la carpeta donde quieras el proyecto:
git clone https://github.com/tuUsuario/pixon-pc.git
cd pixon-pc
```

### Paso 2: Instalar Dependencias

**Con npm:**
```bash
npm ci                    # Clean install (recomendado en CI/CD)
# O
npm install               # Install regular
```

**Con pnpm:**
```bash
pnpm install
```

### Paso 3: Inicializar Git Hooks (Opcional pero Recomendado)

```bash
npm run setup:git-hooks   # Configura pre-commit hooks
```

---

## 🖥️ EJECUTAR EL SERVIDOR

### Opción 1: Desarrollo (Modo Interactivo)

```bash
# Terminal 1 - Servidor Express (puerto 3001)
npm run dev

# Expected output:
# 🗄️  MariaDB conectada → 127.0.0.1:3306/pixon
# ✅ Servidor escuchando en http://localhost:3001
```

### Opción 2: Astro Dev Server (Con Hot Reload)

```bash
# Terminal 2 - Frontend Astro (puerto 4321)
npm run dev:astro

# Expected output:
# 🚀 dev server running at http://localhost:4321/
```

### Opción 3: Producción (One-liner)

```bash
npm start

# Expected output:
# NODE_ENV=production
# ✅ Servidor escuchando en http://localhost:3001
```

### Acceder a la Aplicación

- **Frontend:** http://localhost:4321
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/health

---

## 🔨 COMPILACIÓN ESTÁTICA (BUILD)

### Paso 1: Build de Producción

```bash
# Compila Astro → HTML estático en dist/
npm run build

# Expected output:
# 160 page(s) built in 4.83s
# Sitemap generado: 153 URLs indexables
```

### Paso 2: Preview del Build

```bash
npm run preview

# Abre http://localhost:4173 para ver la versión compilada
```

### Paso 3: Verificar Optimizaciones

```bash
# Ejecutar suite de auditoría
npm run check:all-pages    # Audita SEO, mobile, HTML/CSS

# Resultados en: tools/audit-results/
```

---

## ✅ VERIFICACIÓN DE HEALTH CHECKS

### Verificar Servidor Corriendo

```bash
# En una terminal (mientras el servidor está activo):

# Test 1: Health Check API
curl http://localhost:3001/health

# Expected response (JSON):
# {
#   "ok": true,
#   "ts": "2026-07-14T12:34:56.789Z",
#   "clients": 1,
#   "db": "mariadb"
# }
```

### Verificar Base de Datos

```bash
mysql -u pixon_app -p pixon -h 127.0.0.1

# Una vez conectado:
SELECT COUNT(*) as total_comentarios FROM comments;
SELECT COUNT(*) as total_faqs FROM faqs;
SELECT COUNT(*) as total_usuarios FROM users;

EXIT;
```

### Verificar Frontend Cargando

```bash
# En navegador:
1. Abrir http://localhost:4321
2. Ctrl+Shift+I (DevTools)
3. Network tab
4. Recargar
5. Buscar errores (4xx o 5xx)
6. Console tab → No debe haber errores rojos
```

---

## 🔍 RESOLUCIÓN DE PROBLEMAS COMUNES

### Error: "ECONNREFUSED 127.0.0.1:3306"

**Problema:** MariaDB no está corriendo.

**Solución:**
```bash
# Iniciar MariaDB
# Windows:
NET START MariaDB

# macOS:
brew services start mariadb

# Linux:
sudo systemctl start mariadb
```

---

### Error: "Access denied for user 'pixon_app'@'localhost'"

**Problema:** Credenciales de BD incorrectas.

**Solución:**
1. Verificar contraseña en `.env`
2. Resetear contraseña en MariaDB:
   ```bash
   mysql -u root
   ALTER USER 'pixon_app'@'localhost' IDENTIFIED BY 'nueva_contraseña';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Actualizar `.env` con nueva contraseña

---

### Error: "ENOENT: no such file or directory, open '.env'"

**Problema:** Archivo `.env` no existe.

**Solución:**
```bash
cp .env.example .env
# Luego llenar .env con valores reales
```

---

### Error: "Port 3001 already in use"

**Problema:** Otro proceso está usando puerto 3001.

**Solución - Windows:**
```powershell
# Encontrar proceso usando puerto 3001
netstat -ano | findstr :3001

# Matar proceso (reemplazar PID)
taskkill /PID 12345 /F

# O usar puerto diferente:
set PORT=3002
npm run dev
```

---

### Error: "Cannot find module 'mysql2'"

**Problema:** Dependencias no instaladas.

**Solución:**
```bash
npm ci --legacy-peer-deps
# O
pnpm install --force
```

---

### Frontend carga pero API devuelve 404

**Problema:** Proxy de Astro no está configurado.

**Solución:**
1. Verificar `astro.config.ts` línea 20-30:
   ```ts
   server: {
     proxy: {
       '/api': { target: 'http://localhost:3001', changeOrigin: true },
     }
   }
   ```
2. Reiniciar Astro dev server (`npm run dev:astro`)

---

## 📊 ESTRUCTURA DE CARPETAS IMPORTANTE

```
pixon-pc/
├── src/
│   ├── pages/           # Rutas Astro (index.astro, servicios/[...].astro)
│   ├── components/      # Componentes reutilizables (BackToTopButton, etc)
│   ├── layouts/         # Layouts base (Base.astro)
│   ├── styles/          # CSS global
│   └── data/            # Datos de servicios (JSON-like)
│
├── server/
│   ├── server.js        # Express app principal
│   ├── database.js      # Pool de MariaDB
│   ├── routes/          # Endpoints API
│   ├── services/        # Lógica de negocio (email, etc)
│   ├── middlewares/     # Rate limiting, error handling
│   └── db/              # Conexión, queries, migrations
│
├── public/
│   ├── styles/          # CSS público (legacy)
│   ├── scripts/         # JS público
│   └── assets/          # Imágenes, iconos, fonts
│
├── dist/                # Build estático (generado por npm run build)
├── .env                 # Variables de entorno (NO commitar a Git)
├── .env.example         # Template (SÍ commitar)
├── astro.config.ts      # Configuración Astro
├── package.json         # Scripts y dependencias
└── README.md            # Este documento
```

---

## 🎯 COMANDOS ÚTILES DE DESARROLLO

```bash
# Desarrollo completo (ambas terminales)
npm run dev              # Terminal 1: Express servidor
npm run dev:astro        # Terminal 2: Astro dev server

# Build & Preview
npm run build            # Compilar
npm run preview          # Ver compilado localmente

# Auditoría de Calidad
npm run check:service-seo        # SEO
npm run check:service-mobile     # Responsive
npm run check:all-pages          # Todo

# Base de datos
npm run db:snapshot              # Snapshot de BD
npm run db:restore               # Restaurar snapshot
npm run db:backup:encrypted      # Backup encriptado

# Testing
npm run test:navbar:visual       # Tests Playwright (navbar)

# Mantenimiento
npm run check:encoding           # Verificar UTF-8
npm run fix:encoding             # Corregir encoding automático
```

---

## 🔐 SEGURIDAD - CHECKLIST PRE-PRODUCCIÓN

- [ ] `.env` NO está en Git (revisar `.gitignore`)
- [ ] `SESSION_SECRET` es un hash criptográfico seguro
- [ ] Contraseña de BD es fuerte (>12 caracteres, alphanumeric + símbolos)
- [ ] `GOOGLE_CLIENT_SECRET` nunca se expone en frontend
- [ ] `RESEND_API_KEY` nunca se expone en frontend
- [ ] Rate limiting está activo (100 req/10min por IP)
- [ ] Helmet.js está habilitado
- [ ] CORS está restringido a dominios permitidos
- [ ] Base de datos tiene encoding UTF-8mb4
- [ ] Backups encriptados funcionan correctamente

---

## 📞 SOPORTE Y CONTACTO

- **Email:** pixonpc@gmail.com
- **Teléfono:** +52 998 669 0777
- **GitHub Issues:** [Link]

---

## ✍️ REGISTRO DE CAMBIOS

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 2.1.0 | 2026-07-14 | Migración completa a MariaDB, Astro SSG |
| 2.0.0 | 2026-06-15 | Seguridad mejorada, rate limiting |
| 1.0.0 | 2026-01-10 | Release inicial |

---

**Última actualización:** Julio 14, 2026  
**Autor:** Equipo de Desarrollo Pixon PC  
**Licencia:** Privada - Uso interno únicamente
