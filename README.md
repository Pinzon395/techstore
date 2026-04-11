# 🚀 Pixon PC — Guía de Despliegue en pizon.com.mx

## Arquitectura de producción

```
[Visitante] → pizon.com.mx → Cloudflare → Tunnel → [Tu PC] → servidor Node.js (puerto 3000)
                                                               ├── /               → dist/ (Vite build)
                                                               └── /api/comments   → SQLite en RAM
```

---

## 1 — Prerrequisitos

| Software | Versión mínima | Cómo instalar |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Incluido con Node |
| cloudflared | latest | Paso 4 ↓ |

---

## 2 — Instalar dependencias

```powershell
cd C:\Users\Pinzon\Documents\techstore
npm install
```

---

## 3 — Build del sitio

```powershell
npm run build
```

Esto genera `dist/` con todos los HTML, CSS y JS minificados.  
**Solo necesitas hacer esto cuando cambias el código.**

---

## 4 — Instalar Cloudflare Tunnel (`cloudflared`)

```powershell
# Descargar la última versión
winget install Cloudflare.cloudflared
```

O descarga manual: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

---

## 5 — Autenticar Cloudflare

```powershell
cloudflared tunnel login
# Abre el navegador → autoriza tu cuenta Cloudflare
```

---

## 6 — Crear el tunnel para pizon.com.mx

```powershell
# Crear tunnel (solo una vez)
cloudflared tunnel create pixon-tunnel

# Listar tunnels para ver su ID
cloudflared tunnel list
```

---

## 7 — Configurar el tunnel

Crea el archivo `C:\Users\Pinzon\.cloudflared\config.yml`:

```yaml
tunnel: <TU-TUNNEL-ID>   # Reemplaza con el ID del paso anterior
credentials-file: C:\Users\Pinzon\.cloudflared\<TU-TUNNEL-ID>.json

ingress:
  # Todo el tráfico de pizon.com.mx va al servidor Express en :3000
  - hostname: pizon.com.mx
    service: http://localhost:3000
  # Regla catch-all requerida por cloudflared
  - service: http_status:404
```

---

## 8 — Apuntar el DNS

```powershell
cloudflared tunnel route dns pixon-tunnel pizon.com.mx
```

Esto crea automáticamente el registro CNAME en Cloudflare.

---

## 9 — Arrancar en producción

Abre **dos terminales**:

### Terminal 1 — Servidor Node.js
```powershell
cd C:\Users\Pinzon\Documents\techstore
npm run start
# Inicia Express en :3000 sirviendo dist/ y /api/*
```

### Terminal 2 — Cloudflare Tunnel
```powershell
cloudflared tunnel run pixon-tunnel
# Conecta pizon.com.mx → localhost:3000
```

---

## 10 — Arranque automático con Windows (opcional)

Para que el servidor arranque solo al encender la PC:

```powershell
# Instalar cloudflared como servicio de Windows
cloudflared service install

# Crear tarea programada para Node.js
$action = New-ScheduledTaskAction -Execute "node.exe" -Argument "server/server.js" -WorkingDirectory "C:\Users\Pinzon\Documents\techstore"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "PixonPC-Server" -Action $action -Trigger $trigger -RunLevel Highest
```

---

## Comandos de referencia rápida

| Comando | Descripción |
|---|---|
| `npm run dev` | Vite dev server en :5173 |
| `npm run dev:server` | Solo el API en :3000 |
| `npm run dev:all` | Ambos en paralelo |
| `npm run build` | Build de producción en dist/ |
| `npm run start` | Producción en :3000 (requiere build) |
| `cloudflared tunnel run pixon-tunnel` | Tunnel hacia pizon.com.mx |

---

## Estructura del proyecto

```
techstore/
├── index.html          ← Home (todas las secciones)
├── paquetes.html       ← Paquetes de mantenimiento
├── ensambles.html      ← Catálogo de ensambles PC
├── catalogo.html       ← Catálogo de videos
├── comentarios.html    ← Reseñas de clientes
├── contacto.html       ← Mapa y contacto
├── style.css           ← Estilos globales
├── script.js           ← JS global (navbar, WA, tabs, videos)
├── comments.js         ← Carrusel + CRUD de comentarios (API/localStorage)
├── vite.config.js      ← Configuración de build
├── package.json        ← Dependencias y scripts
├── assets/
│   ├── logos/          ← Logo SVG
│   └── images/         ← Imágenes optimizadas
└── server/
    ├── server.js       ← API Express (GET/POST /api/comments)
    ├── database.js     ← SQLite via sql.js (WebAssembly)
    └── pixon.db        ← Base de datos (ignorada en git)
```

---

## Hoja de ruta futura (marketplace)

Cuando el negocio crezca, estas son las carpetas y pasos a agregar:

```
server/
├── routes/
│   ├── comments.js     ← Ya existe
│   ├── products.js     ← Componentes en venta (tipo Amazon)
│   ├── orders.js       ← Pedidos de clientes
│   └── auth.js         ← Login / registro de clientes
└── database.js         ← Agregar tablas: products, orders, users
```

```
tienda/
├── index.html          ← Homepage de la tienda
├── producto.html       ← Ficha de producto
└── carrito.html        ← Carrito de compras
```

---

> **Nota de seguridad**: La base de datos `server/pixon.db` está en `.gitignore` 
> porque contiene comentarios reales de clientes. Haz backups manuales periódicos 
> copiando ese archivo a una ubicación segura (pendrive, nube privada, etc).
