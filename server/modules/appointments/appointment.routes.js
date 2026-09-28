'use strict';

const express = require('express');
const { AppointmentService } = require('./appointment.service');

function createAppointmentRouter({ pool, requireAdmin, requireAuth, rateLimiter }) {
  const router = express.Router();
  const service = new AppointmentService({ pool });

  // -------------------------------------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------------------------------------

  // 1. Config for booking
  router.get('/config', async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const [settings] = await pool.execute('SELECT * FROM appointment_settings ORDER BY weekday ASC');
      const [exceptions] = await pool.execute('SELECT * FROM appointment_exceptions ORDER BY date ASC');
      const [types] = await pool.execute(
        'SELECT appointment_type, name_es, name_en, duration_minutes, capacity_units, is_exclusive, requires_payment, default_priority, display_color FROM appointment_type_configs WHERE allows_customer_booking = 1'
      );
      res.json({ success: true, settings, exceptions, types });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. Public Availability - ZERO PII
  router.get('/availability', async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const { date, type = 'DROP_OFF', duration = null } = req.query;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
        return res.status(400).json({ success: false, message: 'Fecha inválida. Formato: YYYY-MM-DD' });
      }

      const result = await service.capacityEngine.calculateDayAvailability({
        date,
        appointmentType: type,
        requestedDuration: duration ? Number(duration) : null
      });

      res.status(result.is_open ? 200 : 409).json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2b. Public Month Summary - ZERO PII
  // Returns aggregated availability status per calendar day.
  // Response: { month: "2026-09", days: [{ date, status: "AVAILABLE"|"LIMITED"|"FULL"|"CLOSED", available_slots: N }] }
  // Privacy guarantee: no appointment objects are returned; only computed slot counts.
  router.get('/availability/month', async (req, res) => {
    try {
      res.set('Cache-Control', 'no-store');
      const { month, type = 'DROP_OFF' } = req.query;
      if (!month || !/^\d{4}-\d{2}$/.test(String(month))) {
        return res.status(400).json({ success: false, message: 'Parámetro month inválido. Formato: YYYY-MM' });
      }

      const [year, mo] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(year, mo, 0)).getUTCDate();

      // Run per-day availability checks in parallel (capped at 31 days)
      const dayPromises = Array.from({ length: daysInMonth }, (_, i) => {
        const d = String(i + 1).padStart(2, '0');
        const dateStr = `${month}-${d}`;
        return service.capacityEngine.calculateDayAvailability({
          date: dateStr,
          appointmentType: type,
          requestedDuration: null
        }).then(result => {
          if (!result.is_open) {
            return { date: dateStr, status: 'CLOSED', available_slots: 0 };
          }
          const total = result.total_slots || 0;
          const avail = result.available_slots || 0;
          let status;
          if (avail === 0) {
            status = 'FULL';
          } else if (avail <= Math.max(1, Math.ceil(total * 0.3))) {
            status = 'LIMITED';
          } else {
            status = 'AVAILABLE';
          }
          return { date: dateStr, status, available_slots: avail };
        }).catch(() => ({ date: `${month}-${d}`, status: 'CLOSED', available_slots: 0 }));
      });

      const days = await Promise.all(dayPromises);
      res.json({ success: true, month, days });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });



  // 3. Create Hold / Booking
  router.post('/hold', async (req, res) => {
    try {
      const idempotencyKey = req.header('X-Idempotency-Key') || req.body.idempotency_key || null;
      const {
        ticket_id, customer_id, customer_name, customer_email, customer_phone,
        appointment_type, service_type, location_type, date, time,
        customer_notes, address_line, device_summary, equipment_value_mxn
      } = req.body;

      const appointment = await service.hold({
        ticketId: ticket_id,
        customerId: customer_id || req.user?.id || null,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        appointmentType: appointment_type || 'DROP_OFF',
        serviceType: service_type || 'GENERAL',
        locationType: location_type || 'WORKSHOP',
        date,
        time,
        customerNotes: customer_notes,
        addressLine: address_line,
        deviceSummary: device_summary,
        equipmentValueMxn: equipment_value_mxn,
        idempotencyKey,
        actorId: req.user?.id || null,
        actorRole: req.user?.role === 'admin' ? 'ADMIN' : 'CUSTOMER'
      });

      res.status(201).json({ success: true, appointment });
    } catch (err) {
      const status = err.statusCode || (err.message.includes('SLOT_') ? 409 : 400);
      res.status(status).json({ success: false, message: err.message });
    }
  });

  // 4. Confirm Payment
  router.post('/:id/confirm-payment', async (req, res) => {
    try {
      const { payment_id } = req.body;
      if (!payment_id) {
        return res.status(400).json({ success: false, message: 'payment_id es requerido.' });
      }
      const result = await service.confirmPayment({
        appointmentId: req.params.id,
        paymentId: payment_id,
        actor: req.user?.id || 'PUBLIC_GATEWAY'
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 5. Customer / Public Reschedule
  router.post('/:id/reschedule', async (req, res) => {
    try {
      const { date, time, reason } = req.body;
      const idempotencyKey = req.header('X-Idempotency-Key') || req.body.idempotency_key || null;
      const result = await service.reschedule({
        appointmentId: req.params.id,
        newDate: date,
        newTime: time,
        actor: req.user?.id || 'CUSTOMER',
        actorRole: req.user?.role === 'admin' ? 'ADMIN' : 'CUSTOMER',
        reason,
        idempotencyKey
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 6. Customer / Public Cancel
  router.post('/:id/cancel', async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await service.cancel({
        appointmentId: req.params.id,
        reason,
        actor: req.user?.id || 'CUSTOMER',
        actorRole: req.user?.role === 'admin' ? 'ADMIN' : 'CUSTOMER'
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 7. Get single appointment
  router.get('/:id', async (req, res) => {
    try {
      const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
      if (!apt) return res.status(404).json({ success: false, message: 'Cita no encontrada.' });

      // If not admin, sanitize private notes and check ownership
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isAdmin) {
        delete apt.private_notes;
        delete apt.admin_override;
        delete apt.admin_override_reason;
      }
      res.json({ success: true, appointment: apt });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return { router, service };
}

function createAdminAppointmentRouter({ pool, requireAdmin }) {
  const router = express.Router();
  const service = new AppointmentService({ pool });

  router.use(requireAdmin);

  // 1. Calendar query with range and filters
  router.get('/', async (req, res) => {
    try {
      const { from, to, type, status, search } = req.query;
      const appointments = await service.getAdminCalendar({ from, to, type, status, search });
      res.json({ success: true, appointments });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. Operational Today Board
  router.get('/today', async (_req, res) => {
    try {
      const board = await service.getTodayBoard();
      res.json({ success: true, board });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3. Stats KPIs
  router.get('/stats', async (_req, res) => {
    try {
      const stats = await service.getStats();
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. Admin Create Appointment (with optional override)
  router.post('/', async (req, res) => {
    try {
      const {
        ticket_id, customer_id, customer_name, customer_email, customer_phone,
        appointment_type, service_type, location_type, resource_id,
        date, time, customer_notes, private_notes, planned_service_summary,
        device_summary, equipment_value_mxn, address_line, admin_override, admin_override_reason
      } = req.body;

      const appointment = await service.hold({
        ticketId: ticket_id,
        customerId: customer_id,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        appointmentType: appointment_type || 'DROP_OFF',
        serviceType: service_type || 'GENERAL',
        locationType: location_type || 'WORKSHOP',
        resourceId: resource_id,
        date,
        time,
        customerNotes: customer_notes,
        privateNotes: private_notes,
        plannedServiceSummary: planned_service_summary,
        deviceSummary: device_summary,
        equipmentValueMxn: equipment_value_mxn,
        addressLine: address_line,
        adminOverride: Boolean(admin_override),
        adminOverrideReason: admin_override_reason,
        actorId: req.user?.id || 'admin',
        actorRole: 'ADMIN'
      });

      res.status(201).json({ success: true, appointment });
    } catch (err) {
      const status = err.statusCode || (err.message.includes('SLOT_') ? 409 : 400);
      res.status(status).json({ success: false, message: err.message });
    }
  });

  // 5. Admin Update Status (Check-in, Received, Completed, No-show)
  router.patch('/:id/status', async (req, res) => {
    try {
      const { status, reason } = req.body;
      const result = await service.updateStatus({
        appointmentId: req.params.id,
        newStatus: status,
        actor: req.user?.id || 'admin',
        actorRole: 'ADMIN',
        reason
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 6. Admin Reschedule
  router.post('/:id/reschedule', async (req, res) => {
    try {
      const { date, time, reason } = req.body;
      const result = await service.reschedule({
        appointmentId: req.params.id,
        newDate: date,
        newTime: time,
        actor: req.user?.id || 'admin',
        actorRole: 'ADMIN',
        reason
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 7. Admin Cancel
  router.post('/:id/cancel', async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await service.cancel({
        appointmentId: req.params.id,
        reason,
        actor: req.user?.id || 'admin',
        actorRole: 'ADMIN'
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // 8. Admin Manual Blocks
  router.get('/blocks', async (req, res) => {
    try {
      const { date } = req.query;
      let query = 'SELECT * FROM appointment_blocks';
      const params = [];
      if (date) {
        query += ' WHERE date = ?';
        params.push(date);
      }
      query += ' ORDER BY date DESC, start_time ASC';
      const [blocks] = await pool.execute(query, params);
      res.json({ success: true, blocks });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/blocks', async (req, res) => {
    try {
      const { date, start_time, end_time, category = 'UNAVAILABLE', reason, is_all_day = 0, resource_id = null } = req.body;
      if (!date) return res.status(400).json({ success: false, message: 'Fecha requerida.' });

      const [result] = await pool.execute(
        `INSERT INTO appointment_blocks (date, start_time, end_time, category, reason, is_all_day, resource_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [date, start_time || '00:00:00', end_time || '23:59:59', category, reason || null, is_all_day ? 1 : 0, resource_id, req.user?.id || 'admin']
      );
      res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  router.delete('/blocks/:id', async (req, res) => {
    try {
      await pool.execute('DELETE FROM appointment_blocks WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 9. Admin Settings & Exceptions Configuration
  router.get('/config', async (_req, res) => {
    try {
      const [settings] = await pool.execute('SELECT * FROM appointment_settings ORDER BY weekday ASC');
      const [exceptions] = await pool.execute('SELECT * FROM appointment_exceptions ORDER BY date ASC');
      const [types] = await pool.execute('SELECT * FROM appointment_type_configs ORDER BY appointment_type ASC');
      const [resources] = await pool.execute('SELECT * FROM schedule_resources ORDER BY type, name');
      res.json({ success: true, settings, exceptions, types, resources });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  const saveConfigHandler = async (req, res) => {
    try {
      const { settings = [], exceptions = [], types = [] } = req.body;

      for (const row of settings) {
        await pool.execute(
          `INSERT INTO appointment_settings (weekday, is_open, start_time, end_time, slot_minutes, capacity, lead_time_hours, booking_window_days, allow_same_day, hold_duration_minutes, allowed_types)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             is_open = VALUES(is_open),
             start_time = VALUES(start_time),
             end_time = VALUES(end_time),
             slot_minutes = VALUES(slot_minutes),
             capacity = VALUES(capacity),
             lead_time_hours = VALUES(lead_time_hours),
             booking_window_days = VALUES(booking_window_days),
             allow_same_day = VALUES(allow_same_day),
             hold_duration_minutes = VALUES(hold_duration_minutes),
             allowed_types = VALUES(allowed_types)`,
          [
            Number(row.weekday),
            row.is_open ? 1 : 0,
            row.start_time || null,
            row.end_time || null,
            Number(row.slot_minutes) || 30,
            Number(row.capacity) || 3,
            Number(row.lead_time_hours) || 2,
            Number(row.booking_window_days) || 30,
            row.allow_same_day ? 1 : 0,
            Number(row.hold_duration_minutes) || 15,
            row.allowed_types || 'recepcion,diagnostico,entrega,otro'
          ]
        );
      }

      for (const row of exceptions) {
        if (!row.date) continue;
        await pool.execute(
          `INSERT INTO appointment_exceptions (date, status, start_time, end_time, slot_minutes, capacity_override, allowed_types, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             status = VALUES(status),
             start_time = VALUES(start_time),
             end_time = VALUES(end_time),
             slot_minutes = VALUES(slot_minutes),
             capacity_override = VALUES(capacity_override),
             allowed_types = VALUES(allowed_types),
             reason = VALUES(reason)`,
          [
            row.date,
            row.status || 'closed',
            row.start_time || null,
            row.end_time || null,
            row.slot_minutes ? Number(row.slot_minutes) : null,
            row.capacity_override ? Number(row.capacity_override) : null,
            row.allowed_types || null,
            row.reason || null
          ]
        );
      }

      for (const t of types) {
        if (!t.appointment_type) continue;
        await pool.execute(
          `UPDATE appointment_type_configs
           SET duration_minutes = COALESCE(?, duration_minutes),
               capacity_units = COALESCE(?, capacity_units),
               is_exclusive = COALESCE(?, is_exclusive),
               buffer_before_minutes = COALESCE(?, buffer_before_minutes),
               buffer_after_minutes = COALESCE(?, buffer_after_minutes),
               requires_payment = COALESCE(?, requires_payment),
               allows_customer_booking = COALESCE(?, allows_customer_booking),
               display_color = COALESCE(?, display_color)
           WHERE appointment_type = ?`,
          [
            t.duration_minutes,
            t.capacity_units,
            t.is_exclusive,
            t.buffer_before_minutes,
            t.buffer_after_minutes,
            t.requires_payment,
            t.allows_customer_booking,
            t.display_color,
            t.appointment_type
          ]
        );
      }

      res.json({ success: true, message: 'Configuración de agenda actualizada con éxito.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };

  router.put('/config', saveConfigHandler);
  router.patch('/config', saveConfigHandler);

  // 10. Customer autocomplete search for appointment form
  router.get('/customers', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q || q.length < 2) return res.json({ success: true, customers: [] });

      const term = `%${q}%`;
      const [rows] = await pool.execute(
        `SELECT id, name, email, phone FROM users WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) AND role != 'admin'
         UNION
         SELECT DISTINCT customer_id as id, customer_name as name, customer_email as email, customer_phone as phone
         FROM appointments
         WHERE (customer_name LIKE ? OR customer_email LIKE ? OR customer_phone LIKE ?)
         LIMIT 10`,
        [term, term, term, term, term, term]
      );
      res.json({ success: true, customers: rows });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}

module.exports = {
  createAppointmentRouter,
  createAdminAppointmentRouter
};
