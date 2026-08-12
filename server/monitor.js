/**
 * ============================================================
 *  Monitor de Disponibilidad + Backup Automático
 *  ============================================================
 *
 *  Este script:
 *  1. Monitorea si el servidor responde
 *  2. Reinicia automáticamente si se cae
 *  3. Envía alerta por WhatsApp/Telegram si hay problemas
 *  4.Hace backup automático de la DB
 *
 *  Ejecutar: node server/monitor.js
 *  ============================================================
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

// Configuración
const CONFIG = {
    // URL del sitio a monitorear
    checkUrl: process.env.MONITOR_URL || 'http://localhost:3001',

    // Intervalo de chequeo (ms)
    checkIntervalMs: 30000, // 30 segundos

    // Intervalo de backup (ms)
    backupIntervalMs: 3600000, // 1 hora

    // Maximo reintentos antes de reiniciar
    maxRetries: 3,

    // Tiempo de espera por respuesta (ms)
    timeoutMs: 10000,

    // Rutas de backup
    backupPath: path.join(__dirname, '../backups'),
    dbBackupPath: path.join(__dirname, '../backups/db'),

    // Webhook de alertas (configurar en .env)
    whatsappWebhook: process.env.WHATSAPP_WEBHOOK || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || ''
};

// Variables de estado
let consecutiveFailures = 0;
let lastBackupTime = Date.now();
let serverPid = null;

// Crear carpetas si no existen
function ensureDirectories() {
    [CONFIG.backupPath, CONFIG.dbBackupPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[Monitor] Carpeta creada: ${dir}`);
        }
    });
}

// Hacer petición HTTP
function checkServer() {
    return new Promise((resolve) => {
        const url = new URL(CONFIG.checkUrl);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.get(CONFIG.checkUrl, { timeout: CONFIG.timeoutMs }, (res) => {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
        });

        req.on('error', (err) => {
            resolve({ ok: false, error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ ok: false, error: 'timeout' });
        });
    });
}

// Reiniciar el servidor Node
function restartServer() {
    console.log('[Monitor] 🔄 Reiniciando servidor...');

    // Primero matar proceso existente si hay
    if (serverPid) {
        try {
            process.kill(serverPid);
            console.log('[Monitor] Proceso anterior terminado');
        } catch (e) {
            // Ignorar si no existe
        }
    }

    // Iniciar nuevo proceso
    const serverProcess = exec('node server/server.js', {
        cwd: path.join(__dirname, '..'),
        detached: true,
        stdio: 'ignore'
    });

    serverPid = serverProcess.pid;
    serverProcess.unref();

    console.log(`[Monitor] ✅ Servidor reiniciado (PID: ${serverPid})`);

    // Notificar reinicio
    sendAlert('🔄 SERVIDOR REINICIADO\n\nEl servidor se cayó y fue reiniciado automáticamente.\n\nHora: ' + new Date().toLocaleString('es-MX'));
}

// Backup de la base de datos MariaDB
async function backupDatabase() {
    if (!process.env.DB_HOST) {
        console.log('[Monitor] No hay config de DB, saltando backup');
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pixon_backup_${timestamp}.sql`;
    const gzipPath = path.join(CONFIG.dbBackupPath, filename + '.gz');

    return new Promise((resolve) => {
        const zlib = require('zlib');
        const dump = spawn('mysqldump', [
            '-h', String(process.env.DB_HOST),
            '-P', String(process.env.DB_PORT || 3306),
            '-u', String(process.env.DB_USER || 'pixon_app'),
            String(process.env.DB_NAME)
        ], {
            env: {
                ...process.env,
                MYSQL_PWD: String(process.env.DB_PASSWORD || '')
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        const gzip = zlib.createGzip();
        const output = fs.createWriteStream(gzipPath);
        let stderr = '';
        let settled = false;
        let dumpFinished = false;
        let outputFinished = false;

        function finish(ok, message) {
            if (settled) return;
            settled = true;
            if (!ok) {
                console.log(`[Monitor] Backup fallo: ${message || 'error desconocido'}`);
                try { fs.unlinkSync(gzipPath); } catch (_error) {}
                resolve(false);
                return;
            }
            console.log(`[Monitor] Backup guardado: ${filename}.gz`);
            cleanupOldBackups();
            resolve(true);
        }

        function finishIfComplete() {
            if (dumpFinished && outputFinished) finish(true);
        }

        dump.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        dump.on('error', (error) => finish(false, error.message));
        dump.on('close', (code) => {
            if (code !== 0) finish(false, stderr.trim() || `mysqldump salio con codigo ${code}`);
            else {
                dumpFinished = true;
                finishIfComplete();
            }
        });
        dump.stdout.on('error', (error) => finish(false, error.message));
        gzip.on('error', (error) => finish(false, error.message));
        output.on('error', (error) => finish(false, error.message));
        output.on('finish', () => {
            outputFinished = true;
            finishIfComplete();
        });
        dump.stdout.pipe(gzip).pipe(output);
    });
}

// Limpiar backups viejos
function cleanupOldBackups() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
    const now = Date.now();

    try {
        const files = fs.readdirSync(CONFIG.dbBackupPath);
        files.forEach(file => {
            const filepath = path.join(CONFIG.dbBackupPath, file);
            const stats = fs.statSync(filepath);
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filepath);
                console.log(`[Monitor] 🗑️ Backup viejo eliminado: ${file}`);
            }
        });
    } catch (e) {
        // Ignorar errores de limpieza
    }
}

// Enviar alerta por WhatsApp o Telegram
async function sendAlert(message) {
    // Telegram
    if (CONFIG.telegramBotToken && CONFIG.telegramChatId) {
        const telegramUrl = `https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`;
        const body = JSON.stringify({
            chat_id: CONFIG.telegramChatId,
            text: `🔔 [Pixon PC Monitor]\n\n${message}`,
            parse_mode: 'HTML'
        });

        try {
            require('https').request(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, (res) => {
                console.log('[Monitor] 📱 Alerta Telegram enviada');
            }).end(body);
        } catch (e) {
            console.log('[Monitor] ⚠️ Error enviando Telegram:', e.message);
        }
    }

    // WhatsApp webhook
    if (CONFIG.whatsappWebhook) {
        console.log(`[Monitor] 📱 WhatsApp: ${message}`);
        // Enviar al webhook configurado
    }
}

// Loop principal de monitoreo
async function monitorLoop() {
    console.log(`[Monitor] ⏰ Monitoreando: ${CONFIG.checkUrl}`);

    const result = await checkServer();

    if (result.ok) {
        console.log(`[Monitor] ✅ Servidor OK (Status: ${result.status})`);
        consecutiveFailures = 0;
    } else {
        consecutiveFailures++;
        console.log(`[Monitor] ❌ Fallo ${consecutiveFailures}/${CONFIG.maxRetries}: ${result.error || result.status}`);

        if (consecutiveFailures >= CONFIG.maxRetries) {
            await sendAlert('⚠️ SERVIDOR CAIDO\n\nEl sitio no responde después de ' + CONFIG.maxRetries + ' intentos.\n\nIntentando reiniciar...');
            await restartServer();
            consecutiveFailures = 0;
        }
    }

    // Backup periódico
    if (Date.now() - lastBackupTime > CONFIG.backupIntervalMs) {
        console.log('[Monitor] 💾 Ejecutando backup...');
        await backupDatabase();
        lastBackupTime = Date.now();
    }
}

// Iniciar
function start() {
    console.log('='*60);
    console.log('🚀 Pixon PC - Monitor de Servidor');
    console.log('='*60);
    console.log(`Intervalo de chequeo: ${CONFIG.checkIntervalMs / 1000}s`);
    console.log(`Intervalo de backup:   ${CONFIG.backupIntervalMs / 1000 / 60}min`);
    console.log('');

    ensureDirectories();

    // Primer backup inmediato
    backupDatabase();

    // Loop de monitoreo
    setInterval(monitorLoop, CONFIG.checkIntervalMs);

    // Mensaje inicial
    console.log('[Monitor] 👀 Monitoreando... (Ctrl+C para detener)');
}

start();
