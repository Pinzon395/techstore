'use strict';

const crypto = require('node:crypto');
const {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  ACTIVE_STATUSES,
  PAYMENT_STATUSES,
  SLOT_STATES
} = require('./types');
const { CapacityEngine, timeToMinutes, minutesToTime } = require('./capacity.engine');
const emailService = require('../../services/email.service');
const { computePricing } = require('./pricing.policy');
const { generateUniqueTicketCode } = require('../../database');

function cancunNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Cancun',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`;
}

function cancunToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Cancun',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}

class AppointmentService {
  constructor({ pool }) {
    this.pool = pool;
    this.capacityEngine = new CapacityEngine(pool);
  }

  async audit(connection, appointmentId, action, actorId = null, actorRole = 'SYSTEM', details = null) {
    const executor = connection || this.pool;
    await executor.execute(
      `INSERT INTO appointment_audit_logs (appointment_id, action, actor_id, actor_role, details)
       VALUES (?, ?, ?, ?, ?)`,
      [appointmentId, action, actorId, actorRole, details ? JSON.stringify(details) : null]
    );
  }

  async recordConversionEvent(eventType, metadata = {}) {
    try {
      await this.pool.execute(
        `INSERT INTO conversion_events (event_name, metadata) VALUES (?, ?)`,
        [eventType, JSON.stringify(metadata)]
      );
    } catch {
      // Non-blocking
    }
  }

  // Serializa reservas por día (GET_LOCK es por conexión y funciona en MySQL y
  // MariaDB). Evita los deadlocks de gap-locks de FOR UPDATE sobre rangos vacíos
  // cuando varias reservas compiten por el mismo horario.
  async _acquireDayLock(connection, date) {
    const name = `pixon_appt_${String(date).slice(0, 10)}`;
    const [[row]] = await connection.query('SELECT GET_LOCK(?, 15) AS acquired', [name]);
    if (Number(row?.acquired) !== 1) {
      const error = new Error('SLOT_BUSY: Hay mucha demanda en este horario, intenta de nuevo en unos segundos.');
      error.statusCode = 409;
      throw error;
    }
    return name;
  }

  async _releaseDayLock(connection, name) {
    if (!name) return;
    try { await connection.query('SELECT RELEASE_LOCK(?)', [name]); } catch (_e) { /* la conexión libera el lock al cerrarse */ }
  }

  async _assertSlotCapacity(connection, { date, time, endTime, appointmentType, capacityUnits, excludeId = null }) {
    const [[typeConfig]] = await connection.execute(
      'SELECT is_exclusive FROM appointment_type_configs WHERE appointment_type = ?',
      [appointmentType]
    );
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
    const [[setting]] = await connection.execute('SELECT * FROM appointment_settings WHERE weekday = ?', [dayOfWeek]);
    const [[exception]] = await connection.execute('SELECT * FROM appointment_exceptions WHERE date = ?', [date]);
    if (exception?.status === 'closed' || (!exception && setting && !setting.is_open)) {
      const error = new Error('SLOT_BLOCKED: El taller está cerrado ese día.');
      error.statusCode = 409;
      throw error;
    }
    const maxCapacity = Number(exception?.capacity_override || setting?.capacity || 3);
    const [rows] = await connection.execute(
      `SELECT a.capacity_units, tc.is_exclusive
       FROM appointments a
       LEFT JOIN appointment_type_configs tc ON tc.appointment_type = a.appointment_type
       WHERE DATE(a.start_at) = ?
         AND a.id <> ?
         AND a.status IN (${ACTIVE_STATUSES.map(s => `'${s}'`).join(',')})
         AND (a.reservation_expires_at IS NULL OR a.reservation_expires_at > NOW())
         AND TIME(a.start_at) < ? AND TIME(a.end_at) > ?`,
      [date, excludeId || '', endTime, time]
    );
    const [blocks] = await connection.execute(
      `SELECT id FROM appointment_blocks
       WHERE date = ? AND (is_all_day = 1 OR (TIME(start_time) < ? AND TIME(end_time) > ?))`,
      [date, endTime, time]
    );
    let used = 0;
    let hasExclusive = false;
    for (const row of rows) {
      if (row.is_exclusive) hasExclusive = true;
      used += Number(row.capacity_units || 1);
    }
    const full = blocks.length > 0 || hasExclusive || used + capacityUnits > maxCapacity || (typeConfig?.is_exclusive && used > 0);
    if (full) {
      const error = new Error('SLOT_NO_LONGER_AVAILABLE: El horario ya no cuenta con capacidad disponible.');
      error.statusCode = 409;
      throw error;
    }
  }

  async hold({
    ticketId = null,
    customerId = null,
    customerName,
    customerEmail = null,
    customerPhone,
    appointmentType = 'DROP_OFF',
    serviceType = 'GENERAL',
    locationType = 'WORKSHOP',
    resourceId = null,
    date,
    time,
    customerNotes = null,
    privateNotes = null,
    plannedServiceSummary = null,
    deviceSummary = null,
    equipmentValueMxn = null,
    addressLine = null,
    idempotencyKey = null,
    adminOverride = false,
    adminOverrideReason = null,
    actorId = null,
    actorRole = 'CUSTOMER'
  }) {
    if (!customerName || !customerPhone || !date || !time) {
      throw new Error('Nombre, teléfono, fecha y hora son obligatorios.');
    }
    // Entradas públicas: se reutilizan en emails HTML y en notas internas.
    const plain = (value, max) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim().slice(0, max);
    customerName = plain(customerName, 120);
    serviceType = plain(serviceType, 60) || 'GENERAL';
    if (!customerName) throw new Error('Nombre, teléfono, fecha y hora son obligatorios.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}(:\d{2})?$/.test(String(time))) {
      throw new Error('Formato de fecha u hora inválido (YYYY-MM-DD, HH:MM).');
    }

    // Fast check idempotency
    if (idempotencyKey) {
      const [[existing]] = await this.pool.execute(
        'SELECT * FROM appointments WHERE idempotency_key = ?',
        [idempotencyKey]
      );
      if (existing) return existing;
    }

    // Clean up expired holds first
    await this.cleanupExpiredHolds();

    const connection = await this.pool.getConnection();
    let lockName = null;
    try {
      lockName = await this._acquireDayLock(connection, date);
    } catch (err) {
      connection.release();
      throw err;
    }
    await connection.beginTransaction();

    try {
      // 1. Fetch type config
      const [[typeConfig]] = await connection.execute(
        'SELECT * FROM appointment_type_configs WHERE appointment_type = ?',
        [appointmentType]
      );
      const duration = Number(typeConfig?.duration_minutes || 30);
      const capacityUnits = Number(typeConfig?.capacity_units || 1);
      const requiresPayment = Boolean(typeConfig?.requires_payment);
      const isExclusive = Boolean(typeConfig?.is_exclusive);

      // 2. Fetch default settings
      const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
      const [[setting]] = await connection.execute(
        'SELECT * FROM appointment_settings WHERE weekday = ?',
        [dayOfWeek]
      );
      const [[exception]] = await connection.execute(
        'SELECT * FROM appointment_exceptions WHERE date = ?',
        [date]
      );
      const maxCapacity = Number(exception?.capacity_override || setting?.capacity || 3);
      const holdDuration = Number(setting?.hold_duration_minutes || 15);

      const startAt = `${date} ${time}:00`;
      const startMins = timeToMinutes(time);
      const endMins = startMins + duration;
      const endAt = `${date} ${minutesToTime(endMins)}:00`;

      // 3. Lock active appointments overlapping this range with FOR UPDATE
      const [existingActive] = await connection.execute(
        `SELECT a.id, a.capacity_units, a.appointment_type, a.status, tc.is_exclusive,
                tc.buffer_before_minutes, tc.buffer_after_minutes, a.start_at, a.end_at
         FROM appointments a
         LEFT JOIN appointment_type_configs tc ON tc.appointment_type = a.appointment_type
         WHERE DATE(a.start_at) = ?
           AND a.status IN (${ACTIVE_STATUSES.map(s => `'${s}'`).join(',')})
           AND (a.reservation_expires_at IS NULL OR a.reservation_expires_at > NOW())
           AND (
             (TIME(a.start_at) < ? AND TIME(a.end_at) > ?)
           )
         FOR UPDATE`,
        [date, minutesToTime(endMins), time]
      );

      // Check blocks
      const [blocks] = await connection.execute(
        `SELECT * FROM appointment_blocks
         WHERE date = ?
           AND (
             is_all_day = 1 OR
             (TIME(start_time) < ? AND TIME(end_time) > ?)
           )`,
        [date, minutesToTime(endMins), time]
      );

      if (blocks.length > 0 && !adminOverride) {
        throw new Error('SLOT_BLOCKED: El horario seleccionado está bloqueado por el taller.');
      }

      let usedUnits = 0;
      let hasExclusive = false;
      for (const row of existingActive) {
        if (row.is_exclusive) hasExclusive = true;
        usedUnits += Number(row.capacity_units || 1);
      }

      const isSlotFull = hasExclusive || (usedUnits + capacityUnits > maxCapacity) || (isExclusive && usedUnits > 0);

      if (isSlotFull && !adminOverride) {
        const error = new Error('SLOT_NO_LONGER_AVAILABLE: El horario ya no cuenta con capacidad disponible.');
        error.statusCode = 409;
        throw error;
      }

      // 4. Create or link unified workshop ticket (repairs)
      let effectiveTicketId = ticketId ? Number(ticketId) : null;
      let ticketCode = null;

      if (effectiveTicketId) {
        const [[existingRepair]] = await connection.execute(
          'SELECT id, ticket_code FROM repairs WHERE id = ? LIMIT 1',
          [effectiveTicketId]
        );
        if (existingRepair) {
          ticketCode = existingRepair.ticket_code;
          await connection.execute(
            `UPDATE repairs
             SET appointment_type = ?,
                 appointment_date = ?,
                 appointment_time = ?,
                 appointment_datetime = ?,
                 appointment_status = 'confirmada',
                 appointment_at = ?,
                 appointment_note = COALESCE(?, appointment_note)
             WHERE id = ?`,
            [appointmentType, date, time, startAt, startAt, customerNotes, effectiveTicketId]
          );
        } else {
          effectiveTicketId = null;
        }
      }

      if (!effectiveTicketId) {
        ticketCode = await generateUniqueTicketCode(connection);
        const deviceType = (deviceSummary || 'Equipo').slice(0, 40);
        const serviceSummary = plannedServiceSummary || serviceType || 'Revisión técnica';
        const reportedIssueParts = [
          `Servicio agendado: ${serviceSummary}`,
          customerNotes ? `Nota del cliente: ${customerNotes}` : null,
          addressLine ? `Ubicación: ${addressLine}` : null
        ].filter(Boolean).join('\n');

        const internalNotes = `Cita y ticket unificado generado vía calendario (${locationType === 'ON_SITE' ? 'Domicilio' : 'Taller'}). Cliente: ${customerName}`;

        const priorityMap = {
          URGENT: 'urgent',
          HIGH: 'high',
          NORMAL: 'normal'
        };
        const cleanPriority = priorityMap[typeConfig?.default_priority] || 'normal';

        const [repairResult] = await connection.execute(
          `INSERT INTO repairs (
            ticket_code, user_id, device_type, device_brand, device_model,
            reported_issue, contact_phone, contact_email, priority,
            notes_internal, status, appointment_type, appointment_date,
            appointment_time, appointment_datetime, appointment_status, appointment_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ticketCode, customerId || null, deviceType, '', '',
            reportedIssueParts, customerPhone, customerEmail || null, cleanPriority,
            internalNotes, 'new', appointmentType, date,
            time, startAt, 'confirmada', startAt
          ]
        );
        effectiveTicketId = repairResult.insertId;
      }

      // 5. Create appointment
      const id = crypto.randomUUID();
      const status = requiresPayment ? APPOINTMENT_STATUSES.PENDING_PAYMENT : APPOINTMENT_STATUSES.CONFIRMED;
      const paymentStatus = requiresPayment ? PAYMENT_STATUSES.PENDING : PAYMENT_STATUSES.NOT_REQUIRED;
      const reservationExpiresAt = requiresPayment
        ? new Date(Date.now() + holdDuration * 60 * 1000)
        : null;

      const effectiveResourceId = resourceId || (isExclusive ? 'res-field-service' : 'res-workshop-main');

      // Snapshot de precio: se fija en la cita al crearla y no se recalcula
      // retroactivamente si la politica general cambia despues (ver #109/#110).
      const pricing = computePricing(appointmentType, equipmentValueMxn);

      await connection.execute(
        `INSERT INTO appointments (
          id, ticket_id, customer_id, customer_name, customer_email, customer_phone,
          appointment_type, service_type, location_type, resource_id,
          start_at, end_at, duration_minutes, capacity_units,
          status, payment_status, reservation_expires_at,
          priority, customer_notes, private_notes,
          planned_service_summary, device_summary, equipment_value_mxn,
          price_amount_mxn, price_mode, price_label, address_line,
          idempotency_key, admin_override, admin_override_reason,
          created_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?
        )`,
        [
          id, effectiveTicketId, customerId, customerName, customerEmail, customerPhone,
          appointmentType, serviceType, locationType, effectiveResourceId,
          startAt, endAt, duration, capacityUnits,
          status, paymentStatus, reservationExpiresAt,
          typeConfig?.default_priority || 'NORMAL', customerNotes, privateNotes,
          plannedServiceSummary, deviceSummary, equipmentValueMxn || null,
          pricing.amount, pricing.mode, pricing.label, addressLine,
          idempotencyKey, adminOverride ? 1 : 0, adminOverrideReason,
          actorId
        ]
      );

      // Audit log
      await this.audit(connection, id, adminOverride ? 'OVERRIDE' : 'HOLD', actorId, actorRole, {
        capacityUnits,
        startAt,
        requiresPayment,
        adminOverride,
        priceMode: pricing.mode,
        priceAmount: pricing.amount,
        ticketId: effectiveTicketId,
        ticketCode
      });

      await connection.commit();

      // First party analytics without PII
      await this.recordConversionEvent('appointment_hold_created', {
        appointment_type: appointmentType,
        location_type: locationType,
        duration_minutes: duration,
        ticket_code: ticketCode
      });

      // Send payment required email if applicable
      if (requiresPayment && customerEmail) {
        await emailService.sendTransactionalEmail({
          to: customerEmail,
          subject: 'Horario reservado - Confirmación de diagnóstico Pixon PC',
          html: `<p>Hola ${customerName},</p><p>Tu cita para <strong>${serviceType}</strong> ha sido reservada para el día <strong>${date}</strong> a las <strong>${time}</strong> con el folio <strong>#${ticketCode}</strong>.</p><p>Para confirmar tu espacio en taller, por favor realiza el abono del diagnóstico de $600 MXN en los próximos ${holdDuration} minutos.</p>`,
          text: `Hola ${customerName}, tu cita para ${serviceType} ha sido reservada para el ${date} a las ${time} (Folio #${ticketCode}). Realiza tu pago de diagnóstico para confirmarla.`,
          eventType: 'payment_required'
        }).catch(() => {});
      }

      // Enviar notificaciones automáticas de nuevo ticket de taller
      if (!ticketId && effectiveTicketId) {
        const ticketNotificationPayload = {
          id: effectiveTicketId,
          ticket_code: ticketCode,
          user_name: customerName,
          customer_name: customerName,
          contact_phone: customerPhone,
          contact_email: customerEmail,
          device_type: (deviceSummary || 'Equipo').slice(0, 40),
          reported_issue: plannedServiceSummary || serviceType || 'Revisión técnica',
          appointment_date: date,
          appointment_time: time,
          appointment_datetime: startAt
        };
        Promise.allSettled([
          emailService.notifyOwnerTicketCreated(ticketNotificationPayload),
          customerEmail ? emailService.notifyCustomerTicketCreated(ticketNotificationPayload) : Promise.resolve()
        ]).catch(() => {});
      }

      return {
        id,
        ticket_id: effectiveTicketId,
        ticket_code: ticketCode,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        appointment_type: appointmentType,
        service_type: serviceType,
        start_at: startAt,
        end_at: endAt,
        duration_minutes: duration,
        status,
        payment_status: paymentStatus,
        reservation_expires_at: reservationExpiresAt,
        admin_override: adminOverride
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      await this._releaseDayLock(connection, lockName);
      connection.release();
    }
  }

  async confirmPayment({ appointmentId, paymentId, actor = 'SYSTEM' }) {
    const [[apt]] = await this.pool.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [appointmentId]
    );
    if (!apt) throw new Error('Cita no encontrada.');

    await this.pool.execute(
      `UPDATE appointments
       SET status = 'CONFIRMED',
           payment_status = 'PAID',
           diagnostic_payment_id = ?,
           reservation_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(paymentId), appointmentId]
    );

    await this.audit(null, appointmentId, 'PAYMENT_CONFIRM', null, actor, { paymentId });

    await this.recordConversionEvent('appointment_confirmed', {
      appointment_type: apt.appointment_type,
      payment_id: String(paymentId)
    });

    if (apt.customer_email) {
      await emailService.sendTransactionalEmail({
        to: apt.customer_email,
        subject: '¡Cita confirmada! - Taller Pixon PC Cancún',
        html: `<p>Hola ${String(apt.customer_name || '').replace(/[<>&"']/g, '')},</p><p>Tu cita ha sido <strong>confirmada</strong> para el día <strong>${String(apt.start_at).slice(0, 16)}</strong> en nuestro taller.</p><p>Los $600 MXN abonados de diagnóstico serán aplicados al costo final si aceptas la cotización de reparación.</p>`,
        text: `Hola ${apt.customer_name}, tu cita para el ${String(apt.start_at).slice(0, 16)} está confirmada.`,
        eventType: 'appointment_confirmed'
      }).catch(() => {});
    }

    return { success: true, appointmentId, status: 'CONFIRMED', payment_status: 'PAID' };
  }

  async reschedule({ appointmentId, newDate, newTime, actor = 'CUSTOMER', actorRole = 'CUSTOMER', reason = null, idempotencyKey = null }) {
    if (!newDate || !newTime) throw new Error('Nueva fecha y hora requeridas.');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(newDate)) || !/^\d{2}:\d{2}$/.test(String(newTime))) {
      throw new Error('Formato de fecha u hora inválido (YYYY-MM-DD, HH:MM).');
    }

    const connection = await this.pool.getConnection();
    let lockName = null;
    try {
      lockName = await this._acquireDayLock(connection, newDate);
    } catch (err) {
      connection.release();
      throw err;
    }
    await connection.beginTransaction();

    try {
      const [[oldApt]] = await connection.execute(
        'SELECT * FROM appointments WHERE id = ? FOR UPDATE',
        [appointmentId]
      );
      if (!oldApt) throw new Error('Cita original no encontrada.');

      if (oldApt.status === APPOINTMENT_STATUSES.RESCHEDULED) {
        throw new Error('Esta cita ya fue reprogramada anteriormente.');
      }
      if (!ACTIVE_STATUSES.includes(oldApt.status)) {
        throw new Error('Solo se pueden reprogramar citas activas.');
      }

      // Check capacity for new slot (excluye la cita original)
      const newAptId = crypto.randomUUID();
      const newStartAt = `${newDate} ${newTime}:00`;
      const duration = Number(oldApt.duration_minutes || 30);
      const newEndMins = timeToMinutes(newTime) + duration;
      const newEndAt = `${newDate} ${minutesToTime(newEndMins)}:00`;
      if (actorRole !== 'ADMIN') {
        await this._assertSlotCapacity(connection, {
          date: newDate,
          time: newTime,
          endTime: minutesToTime(newEndMins),
          appointmentType: oldApt.appointment_type,
          capacityUnits: Number(oldApt.capacity_units || 1),
          excludeId: appointmentId
        });
      }

      // Create new appointment, retaining valid payment
      const paymentStatus = oldApt.payment_status === 'PAID' ? 'PAID' : oldApt.payment_status;
      const paymentDisposition = oldApt.payment_status === 'PAID' ? 'PAYMENT_REUSED' : 'NONE';

      await connection.execute(
        `INSERT INTO appointments (
          id, ticket_id, customer_id, customer_name, customer_email, customer_phone,
          appointment_type, service_type, location_type, resource_id,
          start_at, end_at, duration_minutes, capacity_units,
          status, payment_status, diagnostic_payment_id, payment_disposition,
          priority, customer_notes, private_notes,
          planned_service_summary, device_summary, equipment_value_mxn,
          price_amount_mxn, price_mode, price_label, address_line,
          rescheduled_from_id, created_by, idempotency_key
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          'CONFIRMED', ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?
        )`,
        [
          newAptId, oldApt.ticket_id, oldApt.customer_id, oldApt.customer_name, oldApt.customer_email, oldApt.customer_phone,
          oldApt.appointment_type, oldApt.service_type, oldApt.location_type, oldApt.resource_id,
          newStartAt, newEndAt, duration, oldApt.capacity_units,
          paymentStatus, oldApt.diagnostic_payment_id, paymentDisposition,
          oldApt.priority, oldApt.customer_notes, oldApt.private_notes,
          oldApt.planned_service_summary, oldApt.device_summary, oldApt.equipment_value_mxn,
          oldApt.price_amount_mxn, oldApt.price_mode, oldApt.price_label, oldApt.address_line,
          appointmentId, actor, idempotencyKey
        ]
      );

      // Rule 33: Mark old appointment as RESCHEDULED, linking to new appointment
      await connection.execute(
        `UPDATE appointments
         SET status = 'RESCHEDULED',
             rescheduled_to_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newAptId, appointmentId]
      );

      // Sincronizar ticket de taller si existe
      if (oldApt.ticket_id) {
        await connection.execute(
          `UPDATE repairs
           SET appointment_date = ?,
               appointment_time = ?,
               appointment_datetime = ?,
               appointment_at = ?,
               appointment_status = 'reagendada',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [newDate, newTime, newStartAt, newStartAt, oldApt.ticket_id]
        );
      }

      await this.audit(connection, appointmentId, 'RESCHEDULE', actor, actorRole, {
        rescheduled_to: newAptId,
        reason,
        old_start: oldApt.start_at,
        new_start: newStartAt
      });
      await this.audit(connection, newAptId, 'CREATE', actor, actorRole, {
        rescheduled_from: appointmentId
      });

      await connection.commit();

      await this.recordConversionEvent('appointment_rescheduled', {
        old_id: appointmentId,
        new_id: newAptId
      });

      if (oldApt.customer_email) {
        await emailService.sendTransactionalEmail({
          to: oldApt.customer_email,
          subject: 'Cita reprogramada - Pixon PC Cancún',
          html: `<p>Hola ${String(oldApt.customer_name || "").replace(/[<>&"']/g, "")},</p><p>Tu cita programada originalmente para <strong>${String(oldApt.start_at).slice(0, 16)}</strong> ha sido reprogramada con éxito.</p><p>Tu nuevo horario confirmado es: <strong>${newStartAt}</strong>.</p>`,
          text: `Hola ${oldApt.customer_name}, tu cita previa del ${String(oldApt.start_at).slice(0, 16)} ha sido reprogramada para el ${newStartAt}.`,
          eventType: 'appointment_rescheduled'
        }).catch(() => {});
      }

      return {
        success: true,
        old_appointment_id: appointmentId,
        new_appointment_id: newAptId,
        start_at: newStartAt,
        end_at: newEndAt
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      await this._releaseDayLock(connection, lockName);
      connection.release();
    }
  }

  async cancel({ appointmentId, reason = null, actor = 'CUSTOMER', actorRole = 'CUSTOMER' }) {
    const status = actorRole === 'ADMIN' ? 'CANCELLED_BY_ADMIN' : 'CANCELLED_BY_CUSTOMER';
    const [[apt]] = await this.pool.execute(
      'SELECT * FROM appointments WHERE id = ?',
      [appointmentId]
    );
    if (!apt) throw new Error('Cita no encontrada.');

    await this.pool.execute(
      `UPDATE appointments
       SET status = ?,
           cancelled_at = CURRENT_TIMESTAMP,
           cancellation_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, reason, appointmentId]
    );

    // Sincronizar ticket de taller si existe
    if (apt.ticket_id) {
      await this.pool.execute(
        `UPDATE repairs SET status = 'cancelled', appointment_status = 'cancelada', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [apt.ticket_id]
      ).catch(() => {});
    }

    await this.audit(null, appointmentId, 'CANCEL', actor, actorRole, { reason });
    await this.recordConversionEvent('appointment_cancelled', { appointment_id: appointmentId, reason });

    if (apt.customer_email) {
      await emailService.sendTransactionalEmail({
        to: apt.customer_email,
        subject: 'Cita cancelada - Taller Pixon PC',
        html: `<p>Hola ${String(apt.customer_name || '').replace(/[<>&"']/g, '')},</p><p>Te informamos que tu cita del <strong>${String(apt.start_at).slice(0, 16)}</strong> ha sido cancelada.</p>`,
        text: `Hola ${apt.customer_name}, tu cita del ${String(apt.start_at).slice(0, 16)} ha sido cancelada.`,
        eventType: 'appointment_cancelled'
      }).catch(() => {});
    }

    return { success: true, appointmentId, status };
  }

  async updateStatus({ appointmentId, newStatus, actor = 'ADMIN', actorRole = 'ADMIN', reason = null }) {
    const validStatuses = Object.values(APPOINTMENT_STATUSES);
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Estado inválido: ${newStatus}`);
    }

    const updates = ['status = ?'];
    const params = [newStatus];

    if (newStatus === 'CHECKED_IN') updates.push('checked_in_at = CURRENT_TIMESTAMP');
    if (newStatus === 'DEVICE_RECEIVED') updates.push('device_received_at = CURRENT_TIMESTAMP');
    if (newStatus === 'COMPLETED') updates.push('completed_at = CURRENT_TIMESTAMP');
    if (newStatus.includes('CANCELLED')) {
      updates.push('cancelled_at = CURRENT_TIMESTAMP');
      if (reason) { updates.push('cancellation_reason = ?'); params.push(reason); }
    }

    params.push(appointmentId);
    await this.pool.execute(
      `UPDATE appointments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    // Sincronizar con expediente técnico en repairs
    const [[apt]] = await this.pool.execute('SELECT id, ticket_id FROM appointments WHERE id = ?', [appointmentId]);
    if (apt?.ticket_id) {
      const repairUpdates = [];
      const repairParams = [];

      if (newStatus === 'CHECKED_IN' || newStatus === 'DEVICE_RECEIVED') {
        repairUpdates.push("status = IF(status = 'new', 'received', status)", "appointment_status = 'confirmada'");
      } else if (newStatus === 'IN_PROGRESS') {
        repairUpdates.push("status = 'in_progress'", "appointment_status = 'confirmada'");
      } else if (newStatus === 'COMPLETED') {
        repairUpdates.push("status = 'ready'", "appointment_status = 'completada'");
      } else if (newStatus === 'DEVICE_DELIVERED') {
        repairUpdates.push("status = 'delivered'", "appointment_status = 'completada'");
      } else if (newStatus.includes('CANCELLED')) {
        repairUpdates.push("status = 'cancelled'", "appointment_status = 'cancelada'");
      } else if (newStatus === 'NO_SHOW') {
        repairUpdates.push("appointment_status = 'cancelada'");
      }

      if (repairUpdates.length > 0) {
        repairParams.push(apt.ticket_id);
        await this.pool.execute(
          `UPDATE repairs SET ${repairUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          repairParams
        ).catch(() => {});
      }
    }

    await this.audit(null, appointmentId, newStatus, actor, actorRole, { newStatus, reason });
    return { success: true, appointmentId, status: newStatus };
  }

  async cleanupExpiredHolds() {
    const [rows] = await this.pool.execute(
      `UPDATE appointments
       SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'TEMPORARY_HOLD'
         AND reservation_expires_at < NOW()`
    );
    return { expiredCount: rows.affectedRows || 0 };
  }

  async getAdminCalendar({ from, to, type = null, status = null, search = null }) {
    const start = from || cancunToday();
    const end = to || start;

    let query = `
      SELECT a.*,
             DATE_FORMAT(a.start_at, '%Y-%m-%d') AS appointment_date,
             DATE_FORMAT(a.start_at, '%H:%i') AS appointment_time,
             a.status AS appointment_status,
             COALESCE(a.device_summary, r.device_type, 'Equipo') AS device_type,
             r.ticket_code, tc.display_color, tc.name_es as type_name_es, tc.name_en as type_name_en
      FROM appointments a
      LEFT JOIN repairs r ON r.id = a.ticket_id
      LEFT JOIN appointment_type_configs tc ON tc.appointment_type = a.appointment_type
      WHERE DATE(a.start_at) BETWEEN ? AND ?
    `;
    const params = [start, end];

    if (type) {
      query += ' AND a.appointment_type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (search) {
      query += ` AND (
        a.customer_name LIKE ? OR
        a.customer_phone LIKE ? OR
        a.customer_email LIKE ? OR
        a.device_summary LIKE ? OR
        r.ticket_code LIKE ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    query += ' ORDER BY a.start_at ASC, a.created_at ASC';
    const [rows] = await this.pool.execute(query, params);
    return rows;
  }

  async getTodayBoard() {
    const today = cancunToday();
    const [appointments] = await this.pool.execute(
      `SELECT a.*,
              DATE_FORMAT(a.start_at, '%Y-%m-%d') AS appointment_date,
              DATE_FORMAT(a.start_at, '%H:%i') AS appointment_time,
              a.status AS appointment_status,
              COALESCE(a.device_summary, r.device_type, 'Equipo') AS device_type,
              r.ticket_code, tc.display_color, tc.name_es as type_name
       FROM appointments a
       LEFT JOIN repairs r ON r.id = a.ticket_id
       LEFT JOIN appointment_type_configs tc ON tc.appointment_type = a.appointment_type
       WHERE DATE(a.start_at) = ?
       ORDER BY a.start_at ASC`,
      [today]
    );

    const board = appointments.map(apt => {
      let nextAction = 'Recibir equipo';
      if (apt.status === 'PENDING_PAYMENT') nextAction = 'Esperando pago de diagnóstico';
      else if (apt.status === 'CONFIRMED') nextAction = apt.location_type === 'ON_SITE' ? 'Ir a domicilio' : 'Cliente por llegar';
      else if (apt.status === 'CHECKED_IN') nextAction = 'Recibir equipo e ingresar a banco';
      else if (apt.status === 'DEVICE_RECEIVED') nextAction = 'Diagnóstico / Trabajo en proceso';
      else if (apt.status === 'CUSTOMER_ARRIVED') nextAction = 'Entregar equipo';
      else if (apt.status === 'DEVICE_DELIVERED' || apt.status === 'COMPLETED') nextAction = 'Completado';
      else if (apt.status === 'RESCHEDULED') nextAction = 'Reprogramado';
      else if (apt.status === 'NO_SHOW') nextAction = 'No se presentó';

      return {
        ...apt,
        next_action: nextAction
      };
    });

    return {
      date: today,
      count: board.length,
      appointments: board
    };
  }

  async getStats() {
    const today = cancunToday();
    const nowCancun = cancunNow();

    const [[stats]] = await this.pool.execute(
      `SELECT
        COUNT(*) as total_today,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'PENDING_PAYMENT' THEN 1 ELSE 0 END) as pending_payment,
        SUM(CASE WHEN status IN ('CHECKED_IN', 'DEVICE_RECEIVED') THEN 1 ELSE 0 END) as in_shop,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN appointment_type = 'ON_SITE' THEN 1 ELSE 0 END) as on_site,
        SUM(CASE WHEN appointment_type = 'LIQUID_DAMAGE' THEN 1 ELSE 0 END) as liquid_damage
       FROM appointments
       WHERE DATE(start_at) = ?`,
      [today]
    );

    // Próxima cita hoy / próxima
    const [[nextAppointment]] = await this.pool.execute(
      `SELECT a.*, r.ticket_code, tc.name_es as type_name,
              DATE_FORMAT(a.start_at, '%H:%i') as start_time_label
       FROM appointments a
       LEFT JOIN repairs r ON r.id = a.ticket_id
       LEFT JOIN appointment_type_configs tc ON tc.appointment_type = a.appointment_type
       WHERE a.start_at >= ?
         AND a.status IN ('CONFIRMED', 'PENDING_PAYMENT', 'CHECKED_IN')
       ORDER BY a.start_at ASC
       LIMIT 1`,
      [nowCancun]
    );

    // Próximo espacio disponible
    let nextAvailable = null;
    try {
      const dayAvail = await this.capacityEngine.calculateDayAvailability({ date: today });
      const currentMins = timeToMinutes(nowCancun.slice(11, 16));
      const nextSlot = dayAvail.slots?.find(s => s.available && timeToMinutes(s.time) >= currentMins);
      if (nextSlot) {
        nextAvailable = `${today} ${nextSlot.time} (${nextSlot.remaining_capacity} disp.)`;
      }
    } catch {
      // Non-blocking
    }

    return {
      ...(stats || {}),
      next_appointment: nextAppointment || null,
      next_available_slot: nextAvailable
    };
  }
}

module.exports = {
  AppointmentService,
  cancunNow,
  cancunToday
};
