'use strict';

const { cleanEmail } = require('../utils/validators');
const { logWarn, structuredLog, maskEmail } = require('../utils/logger');

const DEFAULT_OWNER_EMAIL = 'pixonpc@gmail.com';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_TIMEOUT_MS = 8000;

function getEmailConfig() {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    const from = String(process.env.EMAIL_FROM || '').trim();
    const replyTo = String(process.env.EMAIL_REPLY_TO || process.env.NOTIFICATION_EMAIL || DEFAULT_OWNER_EMAIL).trim();
    const ownerEmail = cleanEmail(process.env.NOTIFICATION_EMAIL || DEFAULT_OWNER_EMAIL);
    const siteUrl = String(process.env.PUBLIC_SITE_URL || 'https://pixon.com.mx').replace(/\/+$/, '');

    const enabled = Boolean(apiKey && from);

    // Diagnóstico de configuración en startup
    if (!apiKey) structuredLog({ level: 'warn', event: 'email_config', message: 'RESEND_API_KEY no está configurado en .env — los correos no se enviarán.' });
    if (!from) structuredLog({ level: 'warn', event: 'email_config', message: 'EMAIL_FROM no está configurado en .env — los correos no se enviarán.' });

    return {
        enabled,
        apiKey,
        from,
        replyTo: cleanEmail(replyTo) || ownerEmail || DEFAULT_OWNER_EMAIL,
        ownerEmail: ownerEmail || DEFAULT_OWNER_EMAIL,
        siteUrl
    };
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function textPreview(value, max = 900) {
    const text = String(value || '').replace(/\r\n/g, '\n').trim();
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function getTicketClientName(ticket) {
    const internalName = String(ticket?.notes_internal || '').match(/Cliente:\s*([^\n\r]+)/i)?.[1]?.trim();
    return ticket?.user_name || internalName || 'Cliente Pixon PC';
}

/**
 * Correo de la CUENTA del cliente (con el que creo el ticket / user_email).
 * Este es el unico destinatario valido para la confirmacion automatica.
 * NUNCA usa contact_email (correo alternativo de contacto).
 */
function getTicketAccountEmail(ticket) {
    return cleanEmail(ticket?.user_email || ticket?.customer_email || '');
}

/**
 * Correo alternativo de contacto ingresado por el cliente en el formulario.
 * Solo se usa para mostrar en el panel admin. NUNCA para enviar correos automaticos.
 */
function getTicketContactEmail(ticket) {
    return cleanEmail(ticket?.contact_email || '');
}

function getTicketService(ticket) {
    const service = String(ticket?.reported_issue || '').match(/Servicio solicitado:\s*([^\n\r]+)/i)?.[1]?.trim();
    return service || 'Revision tecnica';
}

function getTicketDetail(ticket, label) {
    const escapedLabel = String(label || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(ticket?.reported_issue || '').match(new RegExp(`${escapedLabel}:\\s*([^\\n\\r]+)`, 'i'))?.[1]?.trim() || '';
}

function getTicketContactPreference(ticket) {
    return getTicketDetail(ticket, 'Contacto pref') || 'WhatsApp';
}

function getContactPreferenceMessage(ticket) {
    const preference = getTicketContactPreference(ticket);
    const normalized = preference.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes('correo')) return 'Te contactaremos por correo electronico lo antes posible.';
    if (normalized.includes('llamada')) return 'Te llamaremos al telefono registrado lo antes posible.';
    if (normalized.includes('cualquiera')) return 'Te contactaremos por el medio mas rapido disponible.';
    return 'Te contactaremos por WhatsApp lo antes posible.';
}

function formatTicketDate(ticket) {
    const date = ticket?.appointment_date ? String(ticket.appointment_date).slice(0, 10) : '';
    const time = ticket?.appointment_time ? String(ticket.appointment_time).slice(0, 5) : '';
    if (date && time) return `${date} ${time}`;
    return date || 'Por confirmar';
}

function ticketUrl(ticket, config = getEmailConfig()) {
    return `${config.siteUrl}/cuenta`;
}

function layout({ title, eyebrow, body, ctaUrl, ctaLabel }) {
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#071F3A;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#0a0e1a;padding:32px;border-bottom:3px solid #22d3ee;text-align:center;">
              <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#22d3ee;font-weight:700;margin-bottom:8px;">${escapeHtml(eyebrow)}</div>
              <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:800;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;line-height:1.6;font-size:15px;color:#071F3A;">
              ${body}
              ${ctaUrl ? `
              <div style="margin-top:32px;text-align:center;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:8px;box-shadow:0 4px 12px rgba(14,165,233,0.3);text-align:center;">${escapeHtml(ctaLabel || 'Ver ticket de reparación')}</a>
              </div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;background:#0a0e1a;border-top:1px solid #1e293b;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
              <p style="margin:0 0 10px;font-weight:700;color:#ffffff;font-size:13px;">Pixon PC</p>
              <p style="margin:0 0 6px;">Cto. Hacienda Chimay, 77539 Cancún, Q.R.</p>
              <p style="margin:0 0 6px;">Teléfono/WhatsApp: <a href="tel:+529986690777" style="color:#22d3ee;text-decoration:none;">+52 998 669 0777</a></p>
              <p style="margin:0 0 14px;">Email: <a href="mailto:pixonpc@gmail.com" style="color:#22d3ee;text-decoration:none;">pixonpc@gmail.com</a></p>
              <p style="margin:0;font-size:11px;color:#64748b;border-top:1px solid #1e293b;padding-top:12px;">Notificación transaccional del sistema de taller técnico.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Filas del resumen del ticket.
 * Para el correo del ADMIN muestra ambos correos (cuenta + contacto alternativo).
 * El parametro showBothEmails=true activa la fila extra de correo alternativo.
 */
function ticketSummaryRows(ticket, showBothEmails = false) {
    const accountEmail  = getTicketAccountEmail(ticket);
    const contactEmail  = getTicketContactEmail(ticket);
    const rows = [
        ['Folio',   `#${ticket?.ticket_code || ''}`],
        ['Cliente', getTicketClientName(ticket)],
        ['Equipo',  [ticket?.device_type, ticket?.device_brand, ticket?.device_model].filter(Boolean).join(' ')],
        ['Servicio', getTicketService(ticket)],
        ['Teléfono', ticket?.contact_phone || ''],
        ...(showBothEmails ? [
            ['Correo cuenta',    accountEmail  || 'No proporcionado'],
            ['Correo contacto',  contactEmail  || 'No proporcionado']
        ] : []),
        ['Contacto preferido', getTicketContactPreference(ticket)],
        ['Cita', formatTicketDate(ticket)]
    ];
    return rows.map(([label, value]) => `
        <tr>
          <td style="padding:9px 0;color:#64748b;font-size:13px;width:145px;">${escapeHtml(label)}</td>
          <td style="padding:9px 0;color:#0f172a;font-size:14px;font-weight:700;">${escapeHtml(value || 'No especificado')}</td>
        </tr>`).join('');
}

// Estados oficiales del Outbox Transaccional
const OUTBOX_STATUSES = Object.freeze({
    QUEUED: 'QUEUED',
    PROCESSING: 'PROCESSING',
    ACCEPTED_BY_PROVIDER: 'ACCEPTED_BY_PROVIDER',
    DELIVERED: 'DELIVERED',
    BOUNCED: 'BOUNCED',
    FAILED: 'FAILED'
});

// Registro en memoria de eventos de correo (anillo de hasta 500 eventos como espejo de acceso rápido)
const emailLedger = [];
const idempotencyMap = new Map(); // key -> { id, status, timestamp, providerId }
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000; // 15 minutos

function getDbPool() {
    try {
        const { getDB } = require('../database');
        return getDB();
    } catch (_) {
        return null;
    }
}

async function persistOutboxRecord(entry) {
    const pool = getDbPool();
    if (!pool) return;
    try {
        await pool.execute(
            `INSERT INTO email_outbox
              (id, idempotency_key, ticket_id, event_type, recipient, subject, html, text, tags_json, raw_params_json, status, provider_id, attempts, last_error)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               status = VALUES(status),
               attempts = VALUES(attempts),
               provider_id = VALUES(provider_id),
               last_error = VALUES(last_error),
               last_attempt_at = CURRENT_TIMESTAMP`,
            [
                entry.id,
                entry.idempotency_key || null,
                entry.ticket_id || null,
                entry.event_type || 'transactional',
                entry.recipient || '',
                entry.subject || '',
                entry.raw_params?.html || entry.html || null,
                entry.raw_params?.text || entry.text || null,
                JSON.stringify(entry.tags || []),
                JSON.stringify(entry.raw_params || {}),
                entry.status || OUTBOX_STATUSES.QUEUED,
                entry.provider_id || null,
                entry.attempts || 1,
                entry.error || null
            ]
        );
    } catch (err) {
        logWarn(`No se pudo persistir el outbox de correo: ${err.message}`);
    }
}

async function updateOutboxStatusInDb(id, status, { providerId = null, error = null } = {}) {
    const pool = getDbPool();
    if (!pool) return;
    try {
        await pool.execute(
            `UPDATE email_outbox
             SET status = ?,
                 provider_id = COALESCE(?, provider_id),
                 last_error = ?,
                 last_attempt_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [status, providerId, error, id]
        );
    } catch (err) {
        logWarn(`No se pudo actualizar estado outbox de correo: ${err.message}`);
    }
}

async function updateEmailDeliveryStatus(providerId, newStatus, error = null) {
    const validStatuses = new Set([
        OUTBOX_STATUSES.DELIVERED,
        OUTBOX_STATUSES.BOUNCED,
        OUTBOX_STATUSES.FAILED
    ]);
    if (!validStatuses.has(newStatus)) {
        throw new Error(`Estado de entrega no válido: ${newStatus}`);
    }
    const entry = emailLedger.find(e => e.provider_id === providerId);
    if (entry) {
        entry.status = newStatus;
        if (error) entry.error = error;
    }
    const pool = getDbPool();
    if (pool) {
        await pool.execute(
            `UPDATE email_outbox SET status = ?, last_error = COALESCE(?, last_error) WHERE provider_id = ?`,
            [newStatus, error, providerId]
        ).catch(err => logWarn(`Error actualizando entrega en outbox: ${err.message}`));
    }
    return { ok: true, status: newStatus };
}

function recordLedgerEvent(entry) {
    emailLedger.unshift(entry);
    if (emailLedger.length > 500) emailLedger.pop();
    persistOutboxRecord(entry).catch(() => {});
    return entry;
}

function getEmailEventsForTicket(ticketId) {
    if (!ticketId) return [];
    return emailLedger.filter(e => String(e.ticket_id) === String(ticketId));
}

function getEmailHealthSummary() {
    const config = getEmailConfig();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const events24h = emailLedger.filter(e => new Date(e.created_at).getTime() >= oneDayAgo);
    const accepted24h = events24h.filter(e => e.status === OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER || e.status === 'accepted' || e.status === OUTBOX_STATUSES.DELIVERED).length;
    const failed24h = events24h.filter(e => e.status === OUTBOX_STATUSES.FAILED || e.status === 'failed').length;
    const skipped24h = events24h.filter(e => e.status === 'skipped').length;
    const lastAccepted = emailLedger.find(e => e.status === OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER || e.status === 'accepted' || e.status === OUTBOX_STATUSES.DELIVERED);
    const lastFailed = emailLedger.find(e => e.status === OUTBOX_STATUSES.FAILED || e.status === 'failed');

    let providerStatus = 'healthy';
    if (!config.enabled) {
        providerStatus = 'unconfigured';
    } else if (failed24h > 0 && accepted24h === 0) {
        providerStatus = 'down';
    } else if (failed24h > 0) {
        providerStatus = 'degraded';
    }

    return {
        provider: 'resend',
        status: providerStatus,
        configured: config.enabled,
        accepted_24h: accepted24h,
        failed_24h: failed24h,
        skipped_24h: skipped24h,
        total_24h: events24h.length,
        last_accepted_at: lastAccepted?.created_at || null,
        last_failed_at: lastFailed?.created_at || null,
        last_failed_error: lastFailed?.error || null
    };
}

async function retryEmailEvent(eventId) {
    let event = emailLedger.find(e => e.id === eventId);
    if (!event) {
        const pool = getDbPool();
        if (pool) {
            const [rows] = await pool.execute(
                `SELECT * FROM email_outbox WHERE id = ? LIMIT 1`,
                [eventId]
            ).catch(() => [[]]);
            if (rows && rows.length) {
                const r = rows[0];
                event = {
                    id: r.id,
                    created_at: r.created_at,
                    ticket_id: r.ticket_id,
                    event_type: r.event_type,
                    recipient: r.recipient,
                    subject: r.subject,
                    status: r.status,
                    provider_id: r.provider_id,
                    error: r.last_error,
                    attempts: r.attempts,
                    idempotency_key: r.idempotency_key,
                    raw_params: typeof r.raw_params_json === 'string' ? JSON.parse(r.raw_params_json) : (r.raw_params_json || {})
                };
            }
        }
    }
    if (!event) return { ok: false, error: 'Evento no encontrado en outbox o historial.' };
    if (!event.raw_params || Object.keys(event.raw_params).length === 0) {
        return { ok: false, error: 'Los parámetros originales de este correo no están disponibles para reintento.' };
    }

    if ([OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER, OUTBOX_STATUSES.DELIVERED].includes(event.status)) {
        return { ok: true, status: event.status, id: event.provider_id, deduplicated: true };
    }

    event.attempts = (event.attempts || 1) + 1;
    event.status = OUTBOX_STATUSES.PROCESSING;
    event.last_retry_at = new Date().toISOString();

    const result = await sendTransactionalEmail({
        ...event.raw_params,
        isRetry: true,
        existingEventId: event.id
    });
    return result;
}

/**
 * Motor central de envío vía Resend (HTTP API) con Transactional Outbox.
 * Soporta idempotencia, persistencia en MariaDB, y semántica estricta:
 * Resend accepted != delivered. Solo un evento webhook marca DELIVERED.
 */
async function sendTransactionalEmail({
    to,
    subject,
    html,
    text,
    tags = [],
    correlationId = null,
    ticketId = null,
    eventType = 'transactional',
    idempotencyKey = null,
    isRetry = false,
    existingEventId = null
}) {
    const config = getEmailConfig();
    const recipients = (Array.isArray(to) ? to : [to]).map(cleanEmail).filter(Boolean);
    const maskedRecipients = recipients.map(maskEmail).join(', ');

    // Validación de idempotencia en memoria y DB
    if (idempotencyKey && !isRetry) {
        const cached = idempotencyMap.get(idempotencyKey);
        if (cached && (Date.now() - cached.timestamp < IDEMPOTENCY_TTL_MS) && [OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER, 'accepted', OUTBOX_STATUSES.DELIVERED].includes(cached.status)) {
            structuredLog({
                level: 'info',
                event: 'email_idempotent_skip',
                entity_type: 'email',
                correlation_id: correlationId,
                status: OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER,
                message: `Envío duplicado omitido por clave de idempotencia (${idempotencyKey}) | Resend ID: ${cached.providerId}`
            });
            return { ok: true, status: OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER, id: cached.providerId, deduplicated: true };
        }

        const pool = getDbPool();
        if (pool) {
            try {
                const [rows] = await pool.execute(
                    `SELECT id, provider_id, status FROM email_outbox WHERE idempotency_key = ? LIMIT 1`,
                    [idempotencyKey]
                );
                if (rows.length && [OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER, OUTBOX_STATUSES.DELIVERED].includes(rows[0].status)) {
                    return { ok: true, status: rows[0].status, id: rows[0].provider_id, deduplicated: true };
                }
            } catch (_) {}
        }
    }

    const eventId = existingEventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ledgerEntry = isRetry && existingEventId
        ? emailLedger.find(e => e.id === existingEventId)
        : recordLedgerEvent({
            id: eventId,
            created_at: new Date().toISOString(),
            ticket_id: ticketId || null,
            event_type: eventType,
            recipient: maskedRecipients || 'sin_destinatario',
            subject: subject || 'Sin asunto',
            status: OUTBOX_STATUSES.PROCESSING,
            provider_id: null,
            error: null,
            attempts: 1,
            correlation_id: correlationId,
            idempotency_key: idempotencyKey || null,
            raw_params: { to, subject, html, text, tags, correlationId, ticketId, eventType }
        });

    if (recipients.length === 0) {
        structuredLog({
            level: 'warn',
            event: 'email_skipped',
            entity_type: 'email',
            correlation_id: correlationId,
            status: 'skipped',
            message: 'Email no enviado: no se proporcionaron destinatarios validos.'
        });
        if (ledgerEntry) {
            ledgerEntry.status = OUTBOX_STATUSES.FAILED;
            ledgerEntry.error = 'missing_recipient';
            updateOutboxStatusInDb(eventId, OUTBOX_STATUSES.FAILED, { error: 'missing_recipient' }).catch(() => {});
        }
        return { ok: false, status: OUTBOX_STATUSES.FAILED, reason: 'missing_recipient' };
    }

    if (!config.enabled) {
        structuredLog({
            level: 'warn',
            event: 'email_disabled',
            entity_type: 'email',
            correlation_id: correlationId,
            status: 'skipped',
            message: `Email no enviado a <${maskedRecipients}>: faltan credenciales en .env.`
        });
        if (ledgerEntry) {
            ledgerEntry.status = OUTBOX_STATUSES.FAILED;
            ledgerEntry.error = 'email_disabled';
            updateOutboxStatusInDb(eventId, OUTBOX_STATUSES.FAILED, { error: 'email_disabled' }).catch(() => {});
        }
        return { ok: false, status: 'skipped', reason: 'email_disabled' };
    }

    if (typeof fetch !== 'function') {
        structuredLog({
            level: 'error',
            event: 'email_fetch_unavailable',
            entity_type: 'email',
            correlation_id: correlationId,
            status: OUTBOX_STATUSES.FAILED,
            message: 'fetch no disponible en este runtime de Node.'
        });
        if (ledgerEntry) {
            ledgerEntry.status = OUTBOX_STATUSES.FAILED;
            ledgerEntry.error = 'fetch_unavailable';
            updateOutboxStatusInDb(eventId, OUTBOX_STATUSES.FAILED, { error: 'fetch_unavailable' }).catch(() => {});
        }
        return { ok: false, status: OUTBOX_STATUSES.FAILED, reason: 'fetch_unavailable' };
    }

    structuredLog({
        level: 'info',
        event: 'email_attempt',
        entity_type: 'email',
        provider: 'resend',
        correlation_id: correlationId,
        status: OUTBOX_STATUSES.PROCESSING,
        message: `Enviando correo a <${maskedRecipients}> | Asunto: "${subject}"`
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
    try {
        const response = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: config.from,
                to: recipients,
                reply_to: config.replyTo,
                subject,
                html,
                text,
                tags
            }),
            signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errMsg = payload?.message || `HTTP ${response.status}`;
            structuredLog({
                level: 'error',
                event: 'email_provider_error',
                entity_type: 'email',
                provider: 'resend',
                correlation_id: correlationId,
                status: OUTBOX_STATUSES.FAILED,
                message: `Error Resend (${errMsg}) para <${maskedRecipients}>`,
                data: payload
            });
            if (ledgerEntry) {
                ledgerEntry.status = OUTBOX_STATUSES.FAILED;
                ledgerEntry.error = errMsg;
                updateOutboxStatusInDb(eventId, OUTBOX_STATUSES.FAILED, { error: errMsg }).catch(() => {});
            }
            return { ok: false, status: OUTBOX_STATUSES.FAILED, http_status: response.status, error: errMsg };
        }

        const providerId = payload.id || null;
        structuredLog({
            level: 'info',
            event: 'email_accepted',
            entity_type: 'email',
            provider: 'resend',
            correlation_id: correlationId,
            status: OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER,
            message: `Correo aceptado por Resend para <${maskedRecipients}> | Resend ID: ${providerId || 'n/a'}`
        });

        if (ledgerEntry) {
            ledgerEntry.status = OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER;
            ledgerEntry.provider_id = providerId;
            ledgerEntry.error = null;
            updateOutboxStatusInDb(eventId, OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER, { providerId }).catch(() => {});
        }

        if (idempotencyKey) {
            idempotencyMap.set(idempotencyKey, {
                id: providerId,
                status: OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER,
                timestamp: Date.now(),
                providerId
            });
        }

        return { ok: true, status: OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER, id: providerId };
    } catch (error) {
        const isTimeout = error?.name === 'AbortError';
        const msg = isTimeout ? `timeout (${EMAIL_TIMEOUT_MS}ms)` : (error?.message || 'error desconocido');
        structuredLog({
            level: 'error',
            event: 'email_exception',
            entity_type: 'email',
            provider: 'resend',
            correlation_id: correlationId,
            status: OUTBOX_STATUSES.FAILED,
            message: `Excepción enviando correo a <${maskedRecipients}> | ${msg}`
        });
        if (ledgerEntry) {
            ledgerEntry.status = OUTBOX_STATUSES.FAILED;
            ledgerEntry.error = msg;
            updateOutboxStatusInDb(eventId, OUTBOX_STATUSES.FAILED, { error: msg }).catch(() => {});
        }
        return { ok: false, status: OUTBOX_STATUSES.FAILED, error: msg, is_timeout: isTimeout };
    } finally {
        clearTimeout(timeout);
    }
}


async function notifyOwnerTicketCreated(ticket, { correlationId = null } = {}) {
    // REGLA 1: el admin SIEMPRE recibe en el correo fijo del negocio, nunca en el del cliente.
    const ADMIN_DEST = DEFAULT_OWNER_EMAIL; // pixonpc@gmail.com — hardcoded, no cambia.
    const config = getEmailConfig();

    const accountEmail = getTicketAccountEmail(ticket);
    const contactEmail = getTicketContactEmail(ticket);
    const subject = `🔔 Nuevo ticket #${ticket?.ticket_code || ''} — ${getTicketClientName(ticket)}`;
    const issue = textPreview(String(ticket?.reported_issue || '').replace(/Servicio solicitado:\s*[^\n\r]+/i, '').trim(), 1000);

    const body = `
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Se genero una nueva solicitud desde la pagina web. Revisa el panel para validar disponibilidad, prioridad y datos de contacto.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:18px 0;">${ticketSummaryRows(ticket, true)}</table>
      <p style="margin:16px 0 6px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;">Descripcion de la falla</p>
      <p style="margin:0 0 16px;color:#172033;white-space:pre-line;line-height:1.6;background:#f8fafc;padding:12px 16px;border-radius:8px;border-left:3px solid #22d3ee;">${escapeHtml(issue || 'Sin descripcion')}</p>
      <p style="margin:0;font-size:12px;color:#64748b;">Correo de cuenta del cliente: <strong>${escapeHtml(accountEmail || 'No proporcionado')}</strong>${contactEmail ? ` &nbsp;|&nbsp; Correo de contacto alternativo: <strong>${escapeHtml(contactEmail)}</strong>` : ''}</p>
    `;
    const result = await sendTransactionalEmail({
        to: ADMIN_DEST,
        subject,
        html: layout({ title: 'Nuevo ticket generado', eyebrow: 'Solicitud web — Pixon PC', body, ctaUrl: `${config.siteUrl}/admin#repairs`, ctaLabel: 'Abrir panel de tickets' }),
        text: `Nuevo ticket #${ticket?.ticket_code || ''}\nCliente: ${getTicketClientName(ticket)}\nEquipo: ${ticket?.device_type || ''}\nTelefono: ${ticket?.contact_phone || ''}\nCorreo cuenta: ${accountEmail || 'N/A'}\nCorreo contacto: ${contactEmail || 'N/A'}\n\n${issue}`,
        tags: [{ name: 'event', value: 'ticket_created' }],
        correlationId,
        ticketId: ticket?.id,
        eventType: 'ticket_created_admin',
        idempotencyKey: ticket?.id ? `ticket-created:${ticket.id}:admin` : null
    });
    return result;
}

async function notifyCustomerTicketCreated(ticket, { correlationId = null } = {}) {
    // REGLA 2 y 6: el correo de confirmacion va UNICAMENTE al correo de la cuenta
    // del usuario que creo el ticket (user_email). NUNCA al correo de contacto alternativo.
    const to = getTicketAccountEmail(ticket);
    if (!to) {
        structuredLog({ level: 'warn', event: 'email_skipped', entity_type: 'ticket', entity_id: ticket?.id || null, status: 'skipped', message: `Confirmación omitida para ticket #${ticket?.ticket_code || 'N/A'}: no hay correo de cuenta.` });
        return { ok: false, skipped: true, reason: 'missing_account_email' };
    }
    const config = getEmailConfig();
    const body = `
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Hola <strong>${escapeHtml(getTicketClientName(ticket))}</strong>, recibimos tu solicitud de servicio en Pixon PC.</p>
      <p style="margin:0 0 20px;color:#334155;line-height:1.6;">Nos pondremos en contacto contigo en el menor tiempo posible para confirmar los detalles de la cita, diagnóstico y cotización.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:18px 0;">${ticketSummaryRows(ticket, false)}</table>
      <p style="margin:18px 0 0;color:#334155;line-height:1.6;">Conserva tu folio <strong style="font-size:18px;color:#0ea5e9;">#${escapeHtml(ticket?.ticket_code || '')}</strong>. Si necesitas agregar información adicional, respóndenos este correo o escíbenos por WhatsApp mencionando tu folio.</p>
    `;
    const result = await sendTransactionalEmail({
        to,
        subject: `✅ Confirmacion de tu solicitud #${ticket?.ticket_code || ''} — Pixon PC`,
        html: layout({ title: 'Tu ticket fue recibido', eyebrow: 'Confirmacion de servicio', body, ctaUrl: ticketUrl(ticket, config), ctaLabel: 'Ver mis tickets' }),
        text: `Hola ${getTicketClientName(ticket)}, recibimos tu ticket #${ticket?.ticket_code || ''} en Pixon PC.\nNos pondremos en contacto en el menor tiempo posible.\nEquipo: ${ticket?.device_type || ''}\nServicio: ${getTicketService(ticket)}\nCita: ${formatTicketDate(ticket)}\n\nPixon PC | pixonpc@gmail.com | +52 998 669 0777 | pixon.com.mx`,
        tags: [{ name: 'event', value: 'ticket_customer_confirmation' }],
        correlationId,
        ticketId: ticket?.id,
        eventType: 'ticket_created_customer',
        idempotencyKey: ticket?.id ? `ticket-created:${ticket.id}:customer` : null
    });
    return result;
}

async function notifyCustomerTicketReceived(ticket, note = '', { correlationId = null } = {}) {
    // Siempre al correo de la cuenta del cliente, nunca al alternativo.
    const to = getTicketAccountEmail(ticket);
    const config = getEmailConfig();
    const body = `
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Hola ${escapeHtml(getTicketClientName(ticket))}, tu ticket ya fue marcado como recibido por el taller. A partir de aqui podemos continuar con revision, diagnostico o confirmacion de cita segun corresponda.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:18px 0;">${ticketSummaryRows(ticket)}</table>
      ${note ? `<p style="margin:16px 0 6px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;">Nota del taller</p><p style="margin:0;color:#172033;white-space:pre-line;line-height:1.6;">${escapeHtml(textPreview(note, 1200))}</p>` : ''}
      <p style="margin:18px 0 0;color:#334155;line-height:1.6;">Si necesitas agregar informacion adicional, responde este correo o contactanos por WhatsApp mencionando tu folio.</p>
    `;
    return sendTransactionalEmail({
        to,
        subject: `Tu ticket #${ticket?.ticket_code || ''} fue recibido`,
        html: layout({ title: 'Ticket recibido por Pixon PC', eyebrow: 'Actualizacion de servicio', body, ctaUrl: ticketUrl(ticket, config), ctaLabel: 'Ver mis tickets' }),
        text: `Hola ${getTicketClientName(ticket)}, tu ticket #${ticket?.ticket_code || ''} fue marcado como recibido.\nEquipo: ${ticket?.device_type || ''}\nServicio: ${getTicketService(ticket)}\n${note ? `\nNota del taller:\n${note}\n` : ''}`,
        tags: [{ name: 'event', value: 'ticket_received' }],
        correlationId,
        ticketId: ticket?.id,
        eventType: 'ticket_received'
    });
}

async function notifyCustomerTicketNote(ticket, note, { correlationId = null } = {}) {
    const cleanNote = textPreview(note, 1200);
    if (!cleanNote) return { ok: false, skipped: true, reason: 'empty_note' };
    const config = getEmailConfig();
    const body = `
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Hola ${escapeHtml(getTicketClientName(ticket))}, tenemos una actualizacion sobre tu ticket.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:18px 0;">${ticketSummaryRows(ticket)}</table>
      <p style="margin:16px 0 6px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;">Nota del taller</p>
      <p style="margin:0;color:#172033;white-space:pre-line;line-height:1.6;">${escapeHtml(cleanNote)}</p>
    `;
    return sendTransactionalEmail({
        to: getTicketAccountEmail(ticket),
        subject: `Actualizacion de tu ticket #${ticket?.ticket_code || ''}`,
        html: layout({ title: 'Actualizacion de ticket', eyebrow: 'Nota del taller', body, ctaUrl: ticketUrl(ticket, config), ctaLabel: 'Ver mis tickets' }),
        text: `Actualizacion de ticket #${ticket?.ticket_code || ''}\n\n${cleanNote}`,
        tags: [{ name: 'event', value: 'ticket_note' }],
        correlationId,
        ticketId: ticket?.id,
        eventType: 'ticket_note'
    });
}

function moneyLabel(amount, currency = 'MXN') {
    const numeric = Number(amount || 0);
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number.isFinite(numeric) ? numeric : 0);
}

function orderUrl(order, config = getEmailConfig()) {
    return `${config.siteUrl}/pedido/${encodeURIComponent(order?.folio || '')}`;
}

function orderItemsTable(order) {
    const rows = (order?.items || []).map((item) => `
      <tr>
        <td style="padding:10px 0;color:#0f172a;font-weight:700;">${escapeHtml(item.title)}</td>
        <td style="padding:10px 8px;color:#64748b;text-align:center;">${escapeHtml(item.quantity)}</td>
        <td style="padding:10px 0;color:#0f172a;text-align:right;">${escapeHtml(moneyLabel(item.line_total, order?.pricing?.currency))}</td>
      </tr>`).join('');
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:18px 0;">
      <tr><th style="padding:8px 0;text-align:left;color:#64748b;font-size:12px;">ARTICULO</th><th style="padding:8px;text-align:center;color:#64748b;font-size:12px;">CANT.</th><th style="padding:8px 0;text-align:right;color:#64748b;font-size:12px;">IMPORTE</th></tr>
      ${rows}
      <tr><td colspan="2" style="padding:9px 0;color:#64748b;">Subtotal</td><td style="padding:9px 0;text-align:right;">${escapeHtml(moneyLabel(order?.pricing?.subtotal, order?.pricing?.currency))}</td></tr>
      <tr><td colspan="2" style="padding:9px 0;color:#64748b;">Descuento</td><td style="padding:9px 0;text-align:right;">-${escapeHtml(moneyLabel(order?.pricing?.discount_total, order?.pricing?.currency))}</td></tr>
      <tr><td colspan="2" style="padding:12px 0;color:#071F3A;font-weight:800;">Total</td><td style="padding:12px 0;text-align:right;color:#0b5ed7;font-size:18px;font-weight:800;">${escapeHtml(moneyLabel(order?.pricing?.total, order?.pricing?.currency))}</td></tr>
    </table>`;
}

function transferBlock(order) {
    if (!order?.transfer) return '';
    const transfer = order.transfer;
    const rows = [
        ['Beneficiario', transfer.beneficiary],
        ['Banco', transfer.bank],
        ['CLABE', transfer.clabe],
        ['Cuenta', transfer.account],
        ['Referencia', order.folio],
        ['Monto exacto', moneyLabel(order?.pricing?.total, order?.pricing?.currency)]
    ].filter(([, value]) => value);
    return `<div style="margin:20px 0;padding:18px;background:#eaf8fc;border:1px solid #b9e8f2;border-radius:10px;">
      <p style="margin:0 0 10px;color:#071F3A;font-weight:800;">Datos para transferencia</p>
      ${rows.map(([label, value]) => `<p style="margin:6px 0;color:#334155;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}
      ${transfer.instructions ? `<p style="margin:12px 0 0;color:#334155;white-space:pre-line;">${escapeHtml(transfer.instructions)}</p>` : ''}
    </div>`;
}

async function notifyOwnerOrderCreated(order) {
    const config = getEmailConfig();
    return sendTransactionalEmail({
        to: config.ownerEmail,
        subject: `Nuevo pedido pendiente de pago ${order?.folio || ''} - ${order?.customer?.name || ''}`,
        html: layout({
            title: 'Nuevo pedido pendiente de pago', eyebrow: 'Marketplace Pixon PC',
            body: `<p>Se creo el pedido <strong>${escapeHtml(order?.folio)}</strong> para ${escapeHtml(order?.customer?.name)} y el inventario correspondiente quedo reservado temporalmente.</p>${orderItemsTable(order)}<p>Metodo solicitado: <strong>${escapeHtml(order?.payment?.method)}</strong></p><p><strong>Accion requerida:</strong> contactar al cliente, confirmar entrega y dar seguimiento al pago.</p><p>Telefono: <strong>${escapeHtml(order?.customer?.phone || 'No proporcionado')}</strong><br>Correo: <strong>${escapeHtml(order?.customer?.email || 'No proporcionado')}</strong></p>`,
            ctaUrl: `${config.siteUrl}/admin#commerce-orders`, ctaLabel: 'Abrir pedidos'
        }),
        text: `Nuevo pedido pendiente de pago ${order?.folio}\nCliente: ${order?.customer?.name}\nTelefono: ${order?.customer?.phone || 'N/A'}\nCorreo: ${order?.customer?.email || 'N/A'}\nTotal: ${moneyLabel(order?.pricing?.total, order?.pricing?.currency)}\nAccion: contactar al cliente y dar seguimiento al pago.`,
        tags: [{ name: 'event', value: 'commerce_order_created_owner' }]
    });
}

async function notifyCustomerOrderCreated(order) {
    const config = getEmailConfig();
    return sendTransactionalEmail({
        to: order?.customer?.email,
        subject: `Pedido ${order?.folio || ''} pendiente de pago - Pixon PC`,
        html: layout({
            title: 'Pedido registrado, pago pendiente', eyebrow: 'Confirmacion de pedido',
            body: `<p>Hola <strong>${escapeHtml(order?.customer?.name)}</strong>, recibimos tu pedido y reservamos temporalmente los articulos disponibles.</p><p>Folio: <strong style="color:#0b5ed7;font-size:18px;">${escapeHtml(order?.folio)}</strong></p>${orderItemsTable(order)}<p>Metodo solicitado: <strong>${escapeHtml(order?.payment?.method)}</strong></p><div style="margin:18px 0;padding:16px;background:#fff8e9;border:1px solid #f2cf85;border-radius:10px;color:#071F3A;"><strong>Tu pago aun no esta confirmado.</strong><br>Pixon PC se pondra en contacto contigo para validar disponibilidad final, entrega y el siguiente paso del pago.</div>${transferBlock(order)}<p>No compartas datos completos de tu tarjeta por correo, WhatsApp o telefono. Si eliges pago con tarjeta, utiliza un enlace o terminal oficial de Pixon PC.</p>`,
            ctaUrl: orderUrl(order, config), ctaLabel: 'Ver mi pedido'
        }),
        text: `Pedido registrado, pago pendiente\nFolio: ${order?.folio}\nTotal: ${moneyLabel(order?.pricing?.total, order?.pricing?.currency)}\nMetodo: ${order?.payment?.method}\nTu pago aun no esta confirmado. Pixon PC te contactara para validar disponibilidad final, entrega y el siguiente paso del pago.`,
        tags: [{ name: 'event', value: 'commerce_order_created_customer' }]
    });
}

async function notifyCustomerPaymentReview(order) {
    const config = getEmailConfig();
    return sendTransactionalEmail({
        to: order?.customer?.email,
        subject: `Comprobante recibido ${order?.folio || ''} - Pixon PC`,
        html: layout({ title: 'Comprobante recibido', eyebrow: 'Pago en revision', body: `<p>Recibimos el comprobante del pedido <strong>${escapeHtml(order?.folio)}</strong>. Lo verificaremos antes de confirmar el pago.</p>`, ctaUrl: orderUrl(order, config), ctaLabel: 'Ver mi pedido' }),
        text: `Comprobante recibido para ${order?.folio}. Tu pago esta en revision.`,
        tags: [{ name: 'event', value: 'commerce_payment_review' }]
    });
}

async function notifyCustomerPaymentApproved(order) {
    const config = getEmailConfig();
    return sendTransactionalEmail({
        to: order?.customer?.email,
        subject: `Pago confirmado ${order?.folio || ''} - Pixon PC`,
        html: layout({ title: 'Pago confirmado', eyebrow: 'Pedido pagado', body: `<p>Confirmamos el pago de <strong>${escapeHtml(moneyLabel(order?.pricing?.total, order?.pricing?.currency))}</strong> para el pedido <strong>${escapeHtml(order?.folio)}</strong>.</p><p>Te avisaremos cuando el pedido este listo.</p>`, ctaUrl: orderUrl(order, config), ctaLabel: 'Ver mi pedido' }),
        text: `Pago confirmado para ${order?.folio}. Total: ${moneyLabel(order?.pricing?.total, order?.pricing?.currency)}.`,
        tags: [{ name: 'event', value: 'commerce_payment_approved' }]
    });
}

async function notifyCustomerPaymentRejected(order, reason) {
    const config = getEmailConfig();
    return sendTransactionalEmail({
        to: order?.customer?.email,
        subject: `Necesitamos otro comprobante para ${order?.folio || ''}`,
        html: layout({ title: 'Comprobante no aprobado', eyebrow: 'Accion requerida', body: `<p>No pudimos aprobar el comprobante del pedido <strong>${escapeHtml(order?.folio)}</strong>.</p><p><strong>Motivo:</strong> ${escapeHtml(reason)}</p><p>Puedes abrir tu pedido y subir otro archivo.</p>`, ctaUrl: orderUrl(order, config), ctaLabel: 'Subir otro comprobante' }),
        text: `Comprobante rechazado para ${order?.folio}. Motivo: ${reason}`,
        tags: [{ name: 'event', value: 'commerce_payment_rejected' }]
    });
}

async function notifyCustomerOrderReady(order) {
    const config = getEmailConfig();
    return sendTransactionalEmail({
        to: order?.customer?.email,
        subject: `Tu pedido ${order?.folio || ''} esta listo`,
        html: layout({ title: 'Tu pedido esta listo', eyebrow: 'Pedido listo', body: `<p>El pedido <strong>${escapeHtml(order?.folio)}</strong> ya esta listo. Revisa el seguimiento y contactanos si necesitas coordinar la entrega.</p>`, ctaUrl: orderUrl(order, config), ctaLabel: 'Ver mi pedido' }),
        text: `Tu pedido ${order?.folio} esta listo.`,
        tags: [{ name: 'event', value: 'commerce_order_ready' }]
    });
}

async function notifyCustomerOrderCompleted(order) {
    const config = getEmailConfig();
    return sendTransactionalEmail({
        to: order?.customer?.email,
        subject: `Pedido completado ${order?.folio || ''} - Pixon PC`,
        html: layout({ title: 'Pedido completado', eyebrow: 'Compra finalizada', body: `<p>El pedido <strong>${escapeHtml(order?.folio)}</strong> fue marcado como completado. Gracias por elegir Pixon PC.</p>`, ctaUrl: orderUrl(order, config), ctaLabel: 'Ver pedido' }),
        text: `Pedido ${order?.folio} completado. Gracias por elegir Pixon PC.`,
        tags: [{ name: 'event', value: 'commerce_order_completed' }]
    });
}

module.exports = {
    OUTBOX_STATUSES,
    sendTransactionalEmail,
    updateEmailDeliveryStatus,
    getEmailEventsForTicket,
    getEmailHealthSummary,
    retryEmailEvent,
    notifyOwnerTicketCreated,
    notifyCustomerTicketCreated,
    notifyCustomerTicketReceived,
    notifyCustomerTicketNote,
    notifyOwnerOrderCreated,
    notifyCustomerOrderCreated,
    notifyCustomerPaymentReview,
    notifyCustomerPaymentApproved,
    notifyCustomerPaymentRejected,
    notifyCustomerOrderReady,
    notifyCustomerOrderCompleted
};
