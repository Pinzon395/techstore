# 📊 Sistema de Monitoreo - Pixon PC

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `server/monitor.js` | Script de monitoreo + backup automático |
| `server/start-with-monitor.js` | Inicia servidor + monitor juntos |
| `.env.monitor.example` | Configuración de alertas |
| `backups/` | Carpeta para backups automáticos |

---

## 🎯 Cómo Usar

### 1. Configurar Alertas (Telegram recomendado)

Copia las variables a tu `.env`:

```env
# Obtén el token de @BotFather en Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Obtén tu Chat ID de @userinfobot
TELEGRAM_CHAT_ID=123456789
```

### 2. Iniciar el sistema

```powershell
# Opción A: Solo monitoreo (servidor ya corriendo)
npm run monitor

# Opción B: Servidor + Monitor juntos
npm run start:monitor
```

### 3. Verificar

- El monitor verificará el sitio cada 30 segundos
- Si falla 3 veces consecutivas, reiniciará automáticamente
- Hará backup de la DB cada hora

---

## ⚙️ Configuración

Edita `server/monitor.js` si necesitas cambiar:

```javascript
const CONFIG = {
    checkIntervalMs: 30000,    // Chequeo cada 30s
    maxRetries: 3,            // Reiniciar después de 3 fallos
    backupIntervalMs: 3600000 // Backup cada hora
};
```

---

## 🗑️ Backups

- Se guardan en: `backups/db/`
- Formato: `pixon_backup_YYYY-MM-DD-HH-mm-ss.sql.gz`
- Se mantienen los últimos 7 días automáticamente

---

## 🚨 Alertas

| Evento | Acción |
|--------|--------|
| Servidor caído | WhatsApp/Telegram |
| Reinicio automático | WhatsApp/Telegram |
| Backup completado | Solo en logs |

---

## ✅ Verificación del Tag

```powershell
cd C:\Users\Pinzon\Documents\techstore
git tag -l
# Debe mostrar: AntesImplementacionServidor
```