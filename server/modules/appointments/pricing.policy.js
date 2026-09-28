'use strict';

/**
 * Fuente unica de verdad de precios de agenda.
 * NO duplicar montos ($600, $1000, 15%) en otros modulos: importar esto.
 */

const DIAGNOSTIC_STARTING_PRICE = 600;
const MAINTENANCE_MIN_PRICE = 1000;
const MAINTENANCE_REFERENCE_PERCENT = 0.15;

const PRICE_MODES = {
  CONFIRMED: 'CONFIRMED',
  ESTIMATE: 'ESTIMATE',
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
};

/**
 * Calcula el snapshot de precio para un tipo de cita.
 * El resultado se guarda en la cita al crearla (no se recalcula despues
 * si cambia la politica general).
 */
function computePricing(appointmentType, equipmentValueMxn = null) {
  switch (appointmentType) {
    case 'DIAGNOSTIC':
      return {
        mode: PRICE_MODES.PENDING_CONFIRMATION,
        amount: DIAGNOSTIC_STARTING_PRICE,
        label: 'Diagnóstico técnico desde $600 MXN'
      };

    case 'LIQUID_DAMAGE':
      return {
        mode: PRICE_MODES.PENDING_CONFIRMATION,
        amount: null,
        label: 'Limpieza técnica / descontaminación inicial — precio por confirmar'
      };

    case 'MAINTENANCE': {
      const value = Number(equipmentValueMxn);
      if (value > 0) {
        const suggested = Math.max(MAINTENANCE_MIN_PRICE, Math.round(value * MAINTENANCE_REFERENCE_PERCENT));
        return {
          mode: PRICE_MODES.ESTIMATE,
          amount: suggested,
          label: `Referencia estimada: $${suggested.toLocaleString('es-MX')} MXN (según valor del equipo, sujeto a confirmación)`
        };
      }
      return {
        mode: PRICE_MODES.PENDING_CONFIRMATION,
        amount: MAINTENANCE_MIN_PRICE,
        label: 'Mantenimiento preventivo desde $1,000 MXN — el costo final se confirma según el equipo'
      };
    }

    default:
      return {
        mode: PRICE_MODES.NOT_APPLICABLE,
        amount: null,
        label: null
      };
  }
}

module.exports = {
  DIAGNOSTIC_STARTING_PRICE,
  MAINTENANCE_MIN_PRICE,
  MAINTENANCE_REFERENCE_PERCENT,
  PRICE_MODES,
  computePricing
};
