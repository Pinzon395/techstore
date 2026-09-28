'use strict';

const SYNC_LOCK = 'pixon:google-reviews-sync';

/**
 * Reconciliación periódica (regla 4): Pub/Sub es el evento principal, este
 * cron es solo respaldo por si se pierde una notificación. Por defecto cada
 * 12h (configurable con GOOGLE_REVIEWS_SYNC_INTERVAL_HOURS), nunca más
 * frecuente que 1h (regla 5 — nada de polling agresivo).
 */
function startGoogleReviewsSyncWorker({ pool, syncService, intervalHours }) {
    if (!pool || !syncService) {
        throw new TypeError('google-reviews-sync worker requiere pool y syncService');
    }

    const hours = Math.max(1, Number(intervalHours ?? process.env.GOOGLE_REVIEWS_SYNC_INTERVAL_HOURS ?? 12));
    const intervalMs = hours * 60 * 60 * 1000;

    let running = false;
    const run = async () => {
        if (running) return;
        running = true;
        let locked = false;
        try {
            const [[lock]] = await pool.query('SELECT GET_LOCK(?, 0) AS acquired', [SYNC_LOCK]);
            if (Number(lock?.acquired) !== 1) return;
            locked = true;
            const result = await syncService.runSync({ trigger: 'CRON' });
            if (!result.ok && result.reason !== 'EXTERNAL_REQUIRED') {
                console.error('[google-reviews-sync] Reconciliación falló:', result.detail);
            }
        } catch (error) {
            console.error('[google-reviews-sync] Worker no disponible:', error.message);
        } finally {
            if (locked) await pool.query('SELECT RELEASE_LOCK(?)', [SYNC_LOCK]).catch(() => {});
            running = false;
        }
    };

    const timer = setInterval(run, intervalMs);
    timer.unref?.();
    // No corre inmediatamente al arrancar: evita que cada reinicio del
    // servidor dispare una sync; el cron respeta su propio intervalo y
    // Pub/Sub cubre el caso "en vivo".
    return Object.freeze({ run, stop: () => clearInterval(timer) });
}

module.exports = { startGoogleReviewsSyncWorker };
