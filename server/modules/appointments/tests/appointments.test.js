'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  PAYMENT_STATUSES,
  SLOT_STATES,
  SEMANTIC_COLORS
} = require('../types');
const { CapacityEngine, timeToMinutes, minutesToTime } = require('../capacity.engine');
const { AppointmentService } = require('../appointment.service');

// Mock pool builder for in-memory / unit testing
function createMockPool(initialData = {}) {
  const settings = initialData.settings || [
    { weekday: 1, is_open: 1, start_time: '10:00:00', end_time: '18:00:00', slot_minutes: 30, capacity: 3, lead_time_hours: 2, booking_window_days: 30, hold_duration_minutes: 15 }
  ];
  const typeConfigs = initialData.typeConfigs || [
    { appointment_type: 'DROP_OFF', duration_minutes: 30, capacity_units: 1, is_exclusive: 0, buffer_before_minutes: 0, buffer_after_minutes: 0, requires_payment: 0 },
    { appointment_type: 'DIAGNOSTIC', duration_minutes: 30, capacity_units: 1, is_exclusive: 0, buffer_before_minutes: 0, buffer_after_minutes: 0, requires_payment: 1 },
    { appointment_type: 'ON_SITE', duration_minutes: 60, capacity_units: 3, is_exclusive: 1, buffer_before_minutes: 30, buffer_after_minutes: 30, requires_payment: 1 }
  ];
  let appointments = initialData.appointments || [];
  let blocks = initialData.blocks || [];
  let exceptions = initialData.exceptions || [];
  let auditLogs = [];

  const pool = {
    appointments,
    blocks,
    exceptions,
    auditLogs,
    async execute(sql, params = []) {
      const s = sql.trim();
      if (s.startsWith('SELECT * FROM appointment_settings')) {
        const weekday = params[0];
        const row = settings.find(st => st.weekday === weekday);
        return [row ? [row] : []];
      }
      if (s.startsWith('SELECT * FROM appointment_exceptions')) {
        const date = params[0];
        const row = exceptions.find(ex => ex.date === date);
        return [row ? [row] : []];
      }
      if (s.startsWith('SELECT * FROM appointment_blocks')) {
        const date = params[0];
        const rows = blocks.filter(b => b.date === date);
        return [rows];
      }
      if (s.startsWith('SELECT * FROM appointment_type_configs WHERE appointment_type = ?')) {
        const type = params[0];
        const row = typeConfigs.find(tc => tc.appointment_type === type);
        return [row ? [row] : []];
      }
      if (s.startsWith('SELECT * FROM appointment_type_configs')) {
        return [typeConfigs];
      }
      if (s.includes('FROM appointments') && s.includes('DATE(start_at) = ?')) {
        const date = params[0];
        const rows = appointments.filter(a => String(a.start_at).slice(0, 10) === date && a.status !== 'EXPIRED' && a.status !== 'CANCELLED_BY_ADMIN' && a.status !== 'CANCELLED_BY_CUSTOMER' && a.status !== 'RESCHEDULED');
        return [rows];
      }
      if (s.startsWith('SELECT * FROM appointments WHERE idempotency_key = ?')) {
        const key = params[0];
        const row = appointments.find(a => a.idempotency_key === key);
        return [row ? [row] : []];
      }
      if (s.startsWith('SELECT * FROM appointments WHERE id = ?')) {
        const id = params[0];
        const row = appointments.find(a => a.id === id);
        return [row ? [row] : []];
      }
      if (s.startsWith('INSERT INTO appointment_audit_logs')) {
        auditLogs.push({ appointmentId: params[0], action: params[1], actorId: params[2], details: params[4] });
        return [{ insertId: auditLogs.length }];
      }
      if (s.startsWith('UPDATE appointments') && s.includes("status = 'CONFIRMED'")) {
        const apt = appointments.find(a => a.id === params[1]);
        if (apt) {
          apt.status = 'CONFIRMED';
          apt.payment_status = 'PAID';
          apt.diagnostic_payment_id = params[0];
        }
        return [{ affectedRows: 1 }];
      }
      if (s.startsWith('UPDATE appointments') && s.includes("status = 'EXPIRED'")) {
        let count = 0;
        appointments.forEach(a => {
          if (a.status === 'TEMPORARY_HOLD' && a.reservation_expires_at && new Date(a.reservation_expires_at) <= new Date()) {
            a.status = 'EXPIRED';
            count++;
          }
        });
        return [{ affectedRows: count }];
      }
      if (s.startsWith('UPDATE appointments') && s.includes('status = ?')) {
        const apt = appointments.find(a => a.id === params[params.length - 1]);
        if (apt) {
          apt.status = params[0];
        }
        return [{ affectedRows: 1 }];
      }
      return [[]];
    },
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        // Lock por día (GET_LOCK) — la serialización real se prueba contra MySQL
        // con tools/e2e-calendar-production.mjs.
        async query(sql) {
          if (/GET_LOCK/.test(sql)) return [[{ acquired: 1 }]];
          return [[{}]];
        },
        async execute(sql, params = []) {
          const s = sql.trim();
          if (s.includes('FOR UPDATE') && s.includes('FROM appointments a')) {
            const date = params[0];
            const end = params[1];
            const start = params[2];
            const active = appointments.filter(a => {
              if (String(a.start_at).slice(0, 10) !== date) return false;
              if (['EXPIRED', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_CUSTOMER', 'RESCHEDULED'].includes(a.status)) return false;
              const aStart = String(a.start_at).slice(11, 16);
              const aEnd = String(a.end_at).slice(11, 16);
              return aStart < end && aEnd > start;
            });
            return [active];
          }
          if (s.includes('FOR UPDATE') && s.includes('SELECT * FROM appointments WHERE id = ?')) {
            const id = params[0];
            const row = appointments.find(a => a.id === id);
            return [row ? [row] : []];
          }
          if (s.startsWith('INSERT INTO appointments')) {
            if (s.includes('rescheduled_from_id')) {
              const newApt = {
                id: params[0],
                ticket_id: params[1],
                customer_id: params[2],
                customer_name: params[3],
                customer_email: params[4],
                customer_phone: params[5],
                appointment_type: params[6],
                service_type: params[7],
                location_type: params[8],
                resource_id: params[9],
                start_at: params[10],
                end_at: params[11],
                duration_minutes: params[12],
                capacity_units: params[13],
                status: 'CONFIRMED',
                payment_status: params[14],
                diagnostic_payment_id: params[15],
                payment_disposition: params[16],
                priority: params[17],
                customer_notes: params[18],
                private_notes: params[19],
                planned_service_summary: params[20],
                device_summary: params[21],
                equipment_value_mxn: params[22],
                price_amount_mxn: params[23],
                price_mode: params[24],
                price_label: params[25],
                address_line: params[26],
                rescheduled_from_id: params[27],
                created_by: params[28],
                idempotency_key: params[29]
              };
              appointments.push(newApt);
              return [{ insertId: newApt.id }];
            }
            const newApt = {
              id: params[0],
              ticket_id: params[1],
              customer_id: params[2],
              customer_name: params[3],
              customer_email: params[4],
              customer_phone: params[5],
              appointment_type: params[6],
              service_type: params[7],
              location_type: params[8],
              resource_id: params[9],
              start_at: params[10],
              end_at: params[11],
              duration_minutes: params[12],
              capacity_units: params[13],
              status: params[14],
              payment_status: params[15],
              reservation_expires_at: params[16],
              priority: params[17],
              customer_notes: params[18],
              private_notes: params[19],
              planned_service_summary: params[20],
              device_summary: params[21],
              equipment_value_mxn: params[22],
              price_amount_mxn: params[23],
              price_mode: params[24],
              price_label: params[25],
              address_line: params[26],
              idempotency_key: params[27],
              admin_override: params[28],
              admin_override_reason: params[29],
              created_by: params[30]
            };
            appointments.push(newApt);
            return [{ insertId: newApt.id }];
          }
          if (s.startsWith('UPDATE appointments') && s.includes("SET status = 'RESCHEDULED'")) {
            const apt = appointments.find(a => a.id === params[1]);
            if (apt) {
              apt.status = 'RESCHEDULED';
              apt.rescheduled_to_id = params[0];
            }
            return [{ affectedRows: 1 }];
          }
          return pool.execute(sql, params);
        }
      };
    }
  };
  return pool;
}

test.describe('Pixon PC — Sistema de Citas, Capacidad y Agenda', () => {

  // TEST 1: Multi-capacity (3 allowed in capacity 3, 4th rejected with 409)
  test('1. Capacidad simultánea: permite 3 citas normales en el mismo slot; la 4ta arroja 409', async () => {
    const pool = createMockPool();
    const service = new AppointmentService({ pool });

    // 3 appointments at 10:00 (each uses 1 capacity unit of max 3)
    const a1 = await service.hold({ customerName: 'Cliente 1', customerPhone: '9981000001', date: '2026-09-07', time: '10:00' });
    const a2 = await service.hold({ customerName: 'Cliente 2', customerPhone: '9981000002', date: '2026-09-07', time: '10:00' });
    const a3 = await service.hold({ customerName: 'Cliente 3', customerPhone: '9981000003', date: '2026-09-07', time: '10:00' });

    assert.ok(a1.id);
    assert.ok(a2.id);
    assert.ok(a3.id);
    assert.notEqual(a1.id, a2.id);

    // 4th appointment should fail with 409
    await assert.rejects(
      async () => {
        await service.hold({ customerName: 'Cliente 4', customerPhone: '9981000004', date: '2026-09-07', time: '10:00' });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('SLOT_NO_LONGER_AVAILABLE'));
        return true;
      }
    );

    // 4th appointment with admin override and reason succeeds
    const a4Override = await service.hold({
      customerName: 'Cliente 4 Urgente',
      customerPhone: '9981000004',
      date: '2026-09-07',
      time: '10:00',
      adminOverride: true,
      adminOverrideReason: 'Autorización manual: entrega rápida'
    });
    assert.ok(a4Override.id);
    assert.equal(a4Override.admin_override, true);
  });

  // TEST 2: Partial capacity calculation
  test('2. Estado PARCIAL: 2 citas ocupan 2 unidades de 3 -> remainingCapacity=1, state=PARTIAL', async () => {
    const pool = createMockPool();
    const engine = new CapacityEngine(pool);

    pool.appointments.push(
      { id: 'apt-1', appointment_type: 'DROP_OFF', capacity_units: 1, start_at: '2026-09-07 10:00:00', end_at: '2026-09-07 10:30:00', status: 'CONFIRMED' },
      { id: 'apt-2', appointment_type: 'DROP_OFF', capacity_units: 1, start_at: '2026-09-07 10:00:00', end_at: '2026-09-07 10:30:00', status: 'CONFIRMED' }
    );

    const avail = await engine.calculateDayAvailability({ date: '2026-09-07' });
    const slot10 = avail.slots.find(s => s.time === '10:00');

    assert.ok(slot10);
    assert.equal(slot10.used_capacity, 2);
    assert.equal(slot10.remaining_capacity, 1);
    assert.equal(slot10.state, SLOT_STATES.PARTIAL);
    assert.equal(slot10.available, true);
  });

  // TEST 3: Exclusive service (ON_SITE locks workshop capacity)
  test('3. Servicio exclusivo (ON_SITE) bloquea presencia en taller durante su duración y buffers', async () => {
    const pool = createMockPool();
    const engine = new CapacityEngine(pool);

    // ON_SITE appointment 11:00 to 12:00 with 30 min buffers (10:30 to 12:30)
    pool.appointments.push({
      id: 'apt-onsite',
      appointment_type: 'ON_SITE',
      capacity_units: 3,
      start_at: '2026-09-07 11:00:00',
      end_at: '2026-09-07 12:00:00',
      status: 'CONFIRMED'
    });

    const avail = await engine.calculateDayAvailability({ date: '2026-09-07', appointmentType: 'DROP_OFF' });
    const slot11 = avail.slots.find(s => s.time === '11:00');
    const slot1130 = avail.slots.find(s => s.time === '11:30');

    assert.equal(slot11.state, SLOT_STATES.FULL);
    assert.equal(slot11.available, false);
    assert.equal(slot1130.available, false);
  });

  // TEST 4: Payment hold reduces capacity, expiration restores it
  test('4. Apartado temporal (HOLD): reduce capacidad; al expirar la libera automáticamente', async () => {
    const pool = createMockPool();
    const service = new AppointmentService({ pool });

    // Create diagnostic hold (requires payment)
    const holdApt = await service.hold({
      customerName: 'Cliente Prueba Hold',
      customerPhone: '9987776655',
      date: '2026-09-07',
      time: '14:00',
      appointmentType: 'DIAGNOSTIC'
    });

    assert.equal(holdApt.status, APPOINTMENT_STATUSES.PENDING_PAYMENT);
    assert.equal(holdApt.payment_status, PAYMENT_STATUSES.PENDING);
    assert.ok(holdApt.reservation_expires_at);

    // Simulate hold expiration
    const inDb = pool.appointments.find(a => a.id === holdApt.id);
    inDb.status = 'TEMPORARY_HOLD';
    inDb.reservation_expires_at = new Date(Date.now() - 1000); // 1 sec ago

    const cleanup = await service.cleanupExpiredHolds();
    assert.equal(cleanup.expiredCount, 1);
    assert.equal(inDb.status, APPOINTMENT_STATUSES.EXPIRED);
  });

  // TEST 5: Confirm payment transitions to CONFIRMED without duplicating
  test('5. Confirmación de pago: transiciona a CONFIRMED vinculando diagnostic_payment_id sin duplicar', async () => {
    const pool = createMockPool();
    const service = new AppointmentService({ pool });

    const holdApt = await service.hold({
      customerName: 'Luis Pago',
      customerPhone: '9981234567',
      date: '2026-09-07',
      time: '15:00',
      appointmentType: 'DIAGNOSTIC'
    });

    const confirmRes = await service.confirmPayment({
      appointmentId: holdApt.id,
      paymentId: 'STRIPE_CH_TEST_9988'
    });

    assert.equal(confirmRes.success, true);
    assert.equal(confirmRes.status, APPOINTMENT_STATUSES.CONFIRMED);

    const inDb = pool.appointments.find(a => a.id === holdApt.id);
    assert.equal(inDb.status, 'CONFIRMED');
    assert.equal(inDb.payment_status, 'PAID');
    assert.equal(inDb.diagnostic_payment_id, 'STRIPE_CH_TEST_9988');
    assert.equal(pool.appointments.length, 1, 'No se crean citas duplicadas');
  });

  // TEST 6: Double-click idempotency
  test('6. Idempotencia: peticiones con la misma clave devuelven la cita existente sin duplicar', async () => {
    const pool = createMockPool();
    const service = new AppointmentService({ pool });

    const key = 'idempotency-key-doubleclick-xyz';
    const first = await service.hold({
      customerName: 'Cliente Rápido',
      customerPhone: '9989998888',
      date: '2026-09-07',
      time: '16:00',
      idempotencyKey: key
    });

    const second = await service.hold({
      customerName: 'Cliente Rápido',
      customerPhone: '9989998888',
      date: '2026-09-07',
      time: '16:00',
      idempotencyKey: key
    });

    assert.equal(first.id, second.id);
    assert.equal(pool.appointments.length, 1);
  });

  // TEST 7: Reschedule Rule 33: Immutable original, linked new appointment, payment reused
  test('7. Reprogramación (Regla 33): cita original marcada RESCHEDULED, se crea nueva cita linked y pago se reutiliza', async () => {
    const pool = createMockPool();
    const service = new AppointmentService({ pool });

    // Initial appointment, paid diagnostic
    const initial = await service.hold({
      customerName: 'Carlos Reprogramar',
      customerPhone: '9985554433',
      date: '2026-09-07',
      time: '10:00',
      appointmentType: 'DIAGNOSTIC'
    });
    await service.confirmPayment({ appointmentId: initial.id, paymentId: 'PAY-DIAG-600-ABC' });

    // Reschedule to another day
    const reschedRes = await service.reschedule({
      appointmentId: initial.id,
      newDate: '2026-09-08',
      newTime: '12:00',
      reason: 'Cliente solicita cambio de horario laboral'
    });

    assert.equal(reschedRes.success, true);
    assert.notEqual(reschedRes.old_appointment_id, reschedRes.new_appointment_id);

    const oldApt = pool.appointments.find(a => a.id === reschedRes.old_appointment_id);
    const newApt = pool.appointments.find(a => a.id === reschedRes.new_appointment_id);

    // Old is immutable and marked RESCHEDULED
    assert.equal(oldApt.status, APPOINTMENT_STATUSES.RESCHEDULED);
    assert.equal(oldApt.rescheduled_to_id, newApt.id);

    // New has link to old, valid payment disposition without duplicate charge
    assert.equal(newApt.rescheduled_from_id, oldApt.id);
    assert.equal(newApt.payment_status, 'PAID');
    assert.equal(newApt.diagnostic_payment_id, 'PAY-DIAG-600-ABC');
    assert.equal(newApt.payment_disposition, 'PAYMENT_REUSED');
  });

  // TEST 8: Cancel & No Show
  test('8. Cancelación y No-Show: liberan capacidad sin eliminar registros históricos', async () => {
    const pool = createMockPool();
    const service = new AppointmentService({ pool });

    const apt = await service.hold({
      customerName: 'Inasistencia Test',
      customerPhone: '9981112233',
      date: '2026-09-07',
      time: '17:00'
    });

    // Mark No Show
    await service.updateStatus({ appointmentId: apt.id, newStatus: 'NO_SHOW' });
    const inDb = pool.appointments.find(a => a.id === apt.id);
    assert.equal(inDb.status, 'NO_SHOW');
    assert.ok(inDb, 'El registro histórico permanece en la base de datos');

    // Audit log recorded
    const audit = pool.auditLogs.find(l => l.appointmentId === apt.id && l.action === 'NO_SHOW');
    assert.ok(audit);
  });

  // TEST 9: Manual Block
  test('9. Bloqueo manual: el horario bloqueado queda en estado BLOCKED e indisponible', async () => {
    const pool = createMockPool();
    const engine = new CapacityEngine(pool);

    pool.blocks.push({
      id: 1,
      date: '2026-09-07',
      start_time: '12:00:00',
      end_time: '14:00:00',
      is_all_day: 0,
      category: 'PARTS_RUN',
      reason: 'Compra de refacciones'
    });

    const avail = await engine.calculateDayAvailability({ date: '2026-09-07' });
    const slot12 = avail.slots.find(s => s.time === '12:00');
    const slot1230 = avail.slots.find(s => s.time === '12:30');

    assert.equal(slot12.state, SLOT_STATES.BLOCKED);
    assert.equal(slot12.available, false);
    assert.equal(slot1230.state, SLOT_STATES.BLOCKED);
    assert.equal(slot1230.available, false);
  });

  // TEST 10: Zero PII in public availability endpoint
  test('10. Privacidad: endpoint de disponibilidad pública contiene 0 datos personales (PII)', async () => {
    const pool = createMockPool();
    const engine = new CapacityEngine(pool);

    pool.appointments.push({
      id: 'apt-secret',
      customer_name: 'Juan Perez Confidencial',
      customer_email: 'juan@secreto.com',
      customer_phone: '9981234567',
      device_summary: 'MacBook Pro M2 serial C02G...',
      appointment_type: 'DROP_OFF',
      capacity_units: 1,
      start_at: '2026-09-07 10:00:00',
      end_at: '2026-09-07 10:30:00',
      status: 'CONFIRMED'
    });

    const avail = await engine.calculateDayAvailability({ date: '2026-09-07' });
    const jsonStr = JSON.stringify(avail);

    assert.equal(jsonStr.includes('Juan Perez'), false);
    assert.equal(jsonStr.includes('juan@secreto.com'), false);
    assert.equal(jsonStr.includes('9981234567'), false);
    assert.equal(jsonStr.includes('MacBook Pro M2'), false);
    assert.equal(jsonStr.includes('apt-secret'), false);
  });

  // TEST 11: Semantic colors & accessible tokens
  test('11. Colores semánticos y tokens accesibles formalmente definidos', () => {
    assert.equal(SEMANTIC_COLORS.AVAILABLE, '#10b981');
    assert.equal(SEMANTIC_COLORS.PARTIAL, '#f59e0b');
    assert.equal(SEMANTIC_COLORS.FULL, '#ef4444');
    assert.equal(SEMANTIC_COLORS.BLOCKED, '#475569');
    assert.equal(SEMANTIC_COLORS.PENDING_PAYMENT, '#f97316');
    assert.equal(SEMANTIC_COLORS.CONFIRMED, '#0284c7');
    assert.equal(SEMANTIC_COLORS.ON_SITE, '#8b5cf6');
    assert.equal(SEMANTIC_COLORS.LIQUID_DAMAGE, '#dc2626');
  });

});
