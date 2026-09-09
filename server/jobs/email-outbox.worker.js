'use strict';

const OUTBOX_LOCK = 'pixon:email-outbox-retry';

function startEmailOutboxWorker({ pool, retryEmailEvent, intervalMs = 5 * 60 * 1000, maxAttempts = 5, batchSize = 10 }) {
    if (!pool || typeof retryEmailEvent !== 'function') {
        throw new TypeError('Email outbox worker requiere pool y retryEmailEvent');
    }

    let running = false;
    const run = async () => {
        if (running || !String(process.env.RESEND_API_KEY || '').trim()) return;
        running = true;
        let locked = false;
        try {
            const [[lock]] = await pool.query('SELECT GET_LOCK(?, 0) AS acquired', [OUTBOX_LOCK]);
            if (Number(lock?.acquired) !== 1) return;
            locked = true;
            const [events] = await pool.execute(
                `SELECT id FROM email_outbox
                  WHERE status IN ('QUEUED', 'FAILED')
                    AND attempts < ?
                    AND (last_attempt_at IS NULL OR last_attempt_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE))
                  ORDER BY created_at ASC
                  LIMIT ?`,
                [Math.max(1, Number(maxAttempts) || 5), Math.max(1, Number(batchSize) || 10)]
            );
            for (const event of events) {
                try { await retryEmailEvent(event.id); } catch (error) {
                    console.error(`[email-outbox] Reintento fallido para ${event.id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('[email-outbox] Worker no disponible:', error.message);
        } finally {
            if (locked) await pool.query('SELECT RELEASE_LOCK(?)', [OUTBOX_LOCK]).catch(() => {});
            running = false;
        }
    };

    const timer = setInterval(run, Math.max(60_000, Number(intervalMs) || 5 * 60 * 1000));
    timer.unref?.();
    run();
    return Object.freeze({ run, stop: () => clearInterval(timer) });
}

module.exports = { startEmailOutboxWorker };
