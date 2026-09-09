'use strict';

const { ACTIVE_STATUSES, SLOT_STATES } = require('./types');

function timeToMinutes(value) {
  if (!value) return 0;
  const [h, m] = String(value).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function parseDateInCancun(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

class CapacityEngine {
  constructor(pool) {
    this.pool = pool;
  }

  async calculateDayAvailability({
    date,
    appointmentType = 'DROP_OFF',
    requestedDuration = null,
    resourceId = null
  }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      throw new Error('Fecha inválida. Formato requerido: YYYY-MM-DD');
    }

    const dayObj = parseDateInCancun(date);
    const weekday = dayObj.getUTCDay();

    // 1. Fetch settings, exceptions, type configs, and manual blocks
    const [[setting]] = await this.pool.execute(
      'SELECT * FROM appointment_settings WHERE weekday = ?',
      [weekday]
    );

    const [[exception]] = await this.pool.execute(
      'SELECT * FROM appointment_exceptions WHERE date = ?',
      [date]
    );

    const [blocks] = await this.pool.execute(
      `SELECT * FROM appointment_blocks
       WHERE date = ?
         AND (resource_id IS NULL OR resource_id = ? OR ? IS NULL)`,
      [date, resourceId, resourceId]
    );

    const [typeConfigs] = await this.pool.execute(
      'SELECT * FROM appointment_type_configs'
    );
    const typeMap = new Map(typeConfigs.map(tc => [tc.appointment_type, tc]));
    const currentTypeConfig = typeMap.get(appointmentType) || typeMap.get('DROP_OFF') || {
      duration_minutes: 30,
      capacity_units: 1,
      is_exclusive: 0,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0
    };

    // Determine if open
    const isClosed = exception?.status === 'closed' || (!exception && setting && !setting.is_open);
    if (isClosed || !setting) {
      return {
        date,
        is_open: false,
        message: 'Taller cerrado o día bloqueado.',
        slots: []
      };
    }

    const startTime = exception?.start_time || setting.start_time || '10:00:00';
    const endTime = exception?.end_time || setting.end_time || '18:00:00';
    const slotMinutes = Number(exception?.slot_minutes || setting.slot_minutes || 30);
    const defaultCapacity = Number(exception?.capacity_override || setting.capacity || 3);
    const duration = Number(requestedDuration || currentTypeConfig.duration_minutes || slotMinutes);
    const neededUnits = Number(currentTypeConfig.capacity_units || 1);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    // 2. Fetch existing active appointments for the day
    const [appointments] = await this.pool.execute(
      `SELECT id, appointment_type, start_at, end_at, duration_minutes,
              capacity_units, status, reservation_expires_at, resource_id
       FROM appointments
       WHERE DATE(start_at) = ?
         AND status IN (${ACTIVE_STATUSES.map(s => `'${s}'`).join(',')})
         AND (reservation_expires_at IS NULL OR reservation_expires_at > NOW())`,
      [date]
    );

    // 3. Build slot array
    const slots = [];
    for (let current = startMinutes; current + duration <= endMinutes; current += slotMinutes) {
      const slotTime = minutesToTime(current);
      const slotEndMinutes = current + duration;
      const slotStartAt = `${date} ${slotTime}:00`;
      const slotEndAt = `${date} ${minutesToTime(slotEndMinutes)}:00`;

      // Check manual blocks
      let isBlockedByAdmin = false;
      for (const block of blocks) {
        if (block.is_all_day) {
          isBlockedByAdmin = true;
          break;
        }
        const bStart = timeToMinutes(block.start_time);
        const bEnd = timeToMinutes(block.end_time);
        if (Math.max(current, bStart) < Math.min(slotEndMinutes, bEnd)) {
          isBlockedByAdmin = true;
          break;
        }
      }

      if (isBlockedByAdmin) {
        slots.push({
          time: slotTime,
          start_at: slotStartAt,
          end_at: slotEndAt,
          duration_minutes: duration,
          state: SLOT_STATES.BLOCKED,
          total_capacity: defaultCapacity,
          used_capacity: defaultCapacity,
          remaining_capacity: 0,
          available: false
        });
        continue;
      }

      // Calculate used capacity for this interval
      let usedUnits = 0;
      let exclusiveOccupied = false;

      for (const apt of appointments) {
        const aptType = typeMap.get(apt.appointment_type) || {};
        const bufferBefore = Number(aptType.buffer_before_minutes || 0);
        const bufferAfter = Number(aptType.buffer_after_minutes || 0);

        const aptStartTime = String(apt.start_at).slice(11, 16);
        const aptEndTime = String(apt.end_at).slice(11, 16);

        const aptMinsStart = Math.max(0, timeToMinutes(aptStartTime) - bufferBefore);
        const aptMinsEnd = timeToMinutes(aptEndTime) + bufferAfter;

        // Overlap check
        if (Math.max(current, aptMinsStart) < Math.min(slotEndMinutes, aptMinsEnd)) {
          if (aptType.is_exclusive) {
            exclusiveOccupied = true;
            usedUnits = defaultCapacity;
            break;
          }
          usedUnits += Number(apt.capacity_units || 1);
        }
      }

      // If current requested appointment is exclusive (e.g. ON_SITE), it requires full capacity
      const isExclusiveRequested = Boolean(currentTypeConfig.is_exclusive);
      const remainingCapacity = Math.max(0, defaultCapacity - usedUnits);

      let available = false;
      if (!exclusiveOccupied) {
        if (isExclusiveRequested) {
          available = usedUnits === 0;
        } else {
          available = remainingCapacity >= neededUnits;
        }
      }

      let state = SLOT_STATES.AVAILABLE;
      if (usedUnits >= defaultCapacity || exclusiveOccupied) {
        state = SLOT_STATES.FULL;
      } else if (usedUnits > 0) {
        state = SLOT_STATES.PARTIAL;
      }

      slots.push({
        time: slotTime,
        start: slotStartAt,
        end: slotEndAt,
        start_at: slotStartAt,
        end_at: slotEndAt,
        duration_minutes: duration,
        state,
        total_capacity: defaultCapacity,
        used_capacity: usedUnits,
        remaining_capacity: remainingCapacity,
        remainingCapacity,
        available
      });
    }

    const availableCount = slots.filter(s => s.available).length;
    return {
      date,
      is_open: true,
      available: availableCount > 0,
      appointment_type: appointmentType,
      lead_time_hours: Number(setting.lead_time_hours || 2),
      booking_window_days: Number(setting.booking_window_days || 30),
      total_slots: slots.length,
      available_slots: availableCount,
      slot_times: slots.filter(s => s.available).map(s => s.time),
      slots
    };
  }
}

module.exports = {
  CapacityEngine,
  timeToMinutes,
  minutesToTime
};
