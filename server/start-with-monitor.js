/**
 * Inicio automático del servidor + monitor
 * Ejecuta ambos procesos y los mantiene vivos
 *
 * Uso: node server/start-with-monitor.js
 */

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

console.log('='*60);
console.log('🚀 Pixon PC - Inicio Automático');
console.log('='*60);

// Función para iniciar un proceso
function startProcess(name, command, args = []) {
    console.log(`\n[${name}] Iniciando...`);

    const proc = spawn(command, args, {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
        detached: false
    });

    proc.on('error', (err) => {
        console.error(`[${name}] Error: ${err.message}`);
    });

    proc.on('exit', (code) => {
        console.log(`[${name}] Proceso terminado con código: ${code}`);
    });

    return proc;
}

// Iniciar servidor
const serverProc = startProcess('SERVER', 'node', ['server/server.js']);

// Esperar 5 segundos antes de iniciar monitor
setTimeout(() => {
    console.log('\n[MONITOR] Iniciando monitoreo...\n');
    const monitorProc = startProcess('MONITOR', 'node', ['server/monitor.js']);

    // Manejar cierre limpio
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Deteniendo procesos...');
        serverProc.kill();
        monitorProc.kill();
        process.exit();
    });
}, 5000);

console.log('\n⚡ Servidor y monitor iniciados');
console.log('Presiona Ctrl+C para detener');