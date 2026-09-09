/**
 * ============================================================
 *  src/lib/business.ts — Single source of truth for Pixon PC
 *  commercial policies, identity and configurable business rules.
 *
 *  EVERY public-facing claim MUST derive from this module.
 *  Do NOT hardcode prices, warranties, turnaround times,
 *  diagnostic costs or pickup/delivery promises elsewhere.
 * ============================================================
 */

// ─── Identity ───────────────────────────────────────────────
export const business = {
  name: 'Pixon PC',
  siteUrl: 'https://pixon.com.mx',
  phone: '+529986690777',
  phoneDisplay: '+52 998 669 0777',
  email: 'pixonpc@gmail.com',
  currency: 'MXN',
  timezone: 'America/Cancun',
  address: {
    street: 'Cto. Hacienda Chimay',
    postalCode: '77539',
    locality: 'Cancún',
    region: 'Quintana Roo',
    country: 'MX',
  },
  englishSupport: { type: 'WRITTEN' as const },
} as const;

// ─── Appointment ────────────────────────────────────────────
export const appointmentPolicy = {
  appointmentOnly: true,
} as const;

// ─── Diagnostic ─────────────────────────────────────────────
export const diagnosticPolicy = {
  enabled: true,
  startingPriceMXN: 600,
  prepaid: true,
  requiredForBooking: true,
  creditedToRepair: true,
} as const;

// ─── Warranty ───────────────────────────────────────────────
export type WarrantyMode = 'SERVICE_OR_PART_SPECIFIC';
export const warrantyPolicy = {
  mode: 'SERVICE_OR_PART_SPECIFIC' as WarrantyMode,
  /**
   * Each service/part may define warrantyDays or warrantyText.
   * When no specific duration is configured, use fallback copy.
   */
} as const;

// ─── Liquid Damage ──────────────────────────────────────────
export const liquidDamagePolicy = {
  cleaningIsRepair: false,
  guaranteesPowerOn: false,
  guaranteesDataRecovery: false,
  guaranteesFutureReliability: false,
  guaranteesNoFutureCorrosion: false,
  repairQuotedSeparately: true,
} as const;

// ─── Preventive Maintenance (Computer) ──────────────────────
export const computerPreventiveMaintenance = {
  pricingMode: 'EQUIPMENT_VALUE_REFERENCE' as const,
  referencePercentage: 0.20,
  /** Manual override per case is allowed. */
  manualQuoteOverride: true,
} as const;

export const confirmedPolicyCopy = {
  es: {
    maintenance: 'El mantenimiento preventivo se cotiza de acuerdo con el valor, diseño, complejidad y nivel de intervención del equipo. Como referencia, el servicio puede calcularse alrededor del 20% del valor del equipo.',
    liquidDamage: 'El servicio inicial por daño de líquido corresponde a limpieza técnica, descontaminación e inspección; no constituye una reparación garantizada. Debido a que el líquido puede causar daños progresivos, ocultos o irreversibles, no podemos garantizar que el equipo vuelva a encender, permanezca funcionando, recupere datos o que no aparezcan fallas posteriores. Cualquier reparación necesaria después de la limpieza se diagnostica y cotiza por separado.',
  },
  en: {
    maintenance: "Preventive maintenance is quoted according to the equipment's value, design, complexity and required level of intervention. As a reference, service pricing may be calculated at around 20% of the equipment's value.",
    liquidDamage: 'Initial liquid-damage service covers technical cleaning, decontamination and inspection; it is not a guaranteed repair. Because liquid exposure can cause progressive, hidden or irreversible damage, we cannot guarantee that the device will power on, remain operational, recover data or avoid future faults. Any repair required after cleaning is diagnosed and quoted separately.',
  },
} as const;

// ─── Maintenance Responsibility ─────────────────────────────
export const maintenanceResponsibility = {
  coversServiceCausedDamage: true,
  coversPreExistingFaults: false,
  coversUnrelatedFutureFaults: false,
} as const;

// ─── Pickup & Delivery ──────────────────────────────────────
export const pickupDeliveryPolicy = {
  pickupEnabled: false,
  deliveryEnabled: false,
} as const;

// ─── Turnaround ─────────────────────────────────────────────
export const turnaroundPolicy = {
  type: 'CONFIRMED_AFTER_DIAGNOSIS' as const,
} as const;

// ─── Payments (runtime-driven) ──────────────────────────────
export type PaymentMethodKey = 'cash' | 'terminal' | 'bankTransfer' | 'paypal' | 'mercadoPago';
export const defaultPaymentMethods: Record<PaymentMethodKey, boolean> = {
  cash: true,
  terminal: true,
  bankTransfer: true,
  paypal: false,
  mercadoPago: false,
};

// ─── Commercial Copy ────────────────────────────────────────
export const commercialCopy = {
  es: {
    appointment: 'Atención únicamente con cita previa.',
    diagnostic: 'El diagnóstico técnico inicia desde $600 MXN. El pago del diagnóstico se realiza por adelantado para confirmar la cita, el día y la hora de atención; si aceptas la reparación cotizada, se abona al monto final.',
    warranty: 'La garantía aplicable se confirma según la reparación y la pieza instalada.',
    liquidDamage: 'El servicio por daño de líquido corresponde inicialmente a limpieza e inspección. Debido a que el líquido puede causar daños progresivos o irreversibles, no se garantiza que el equipo vuelva a encender ni que no aparezcan fallas posteriores. Cualquier reparación necesaria después de la limpieza se diagnostica y cotiza por separado.',
    turnaround: 'El tiempo estimado se confirma después de la revisión.',
    logistics: 'La recolección o entrega se coordina según zona, disponibilidad y tipo de equipo.',
    payment: 'Los métodos de pago disponibles se muestran al confirmar el pedido.',
    maintenanceResponsibility: 'Si el equipo ingresa funcionando y se produce un daño directamente atribuible al mantenimiento realizado por Pixon PC, nos responsabilizamos de corregirlo. Esta responsabilidad no cubre fallas preexistentes, intermitentes o independientes de la intervención.',
    maintenancePricing: 'El costo del mantenimiento preventivo se cotiza según el tipo de equipo, su valor, complejidad y el alcance requerido.',
  },
  en: {
    appointment: 'Service by appointment only.',
    diagnostic: 'Diagnostics start at MXN $600. Diagnostic payment is required in advance to confirm the appointment date and time; if the repair quote is accepted, it is credited toward the final repair total.',
    warranty: 'Applicable warranty terms are confirmed according to the repair and installed part.',
    liquidDamage: 'Liquid-damage service initially covers cleaning and inspection. Because liquid exposure can cause progressive or irreversible damage, powering on the device or preventing future failures cannot be guaranteed. Any repair required after cleaning is diagnosed and quoted separately.',
    turnaround: 'Estimated turnaround is confirmed after inspection.',
    logistics: 'Pickup or delivery is coordinated according to area, availability and device type.',
    payment: 'Available payment methods are shown when the order is confirmed.',
    maintenanceResponsibility: 'If the device is received in working condition and suffers damage directly attributable to the maintenance performed by Pixon PC, we take responsibility for correcting it. This responsibility does not cover pre-existing, intermittent or unrelated faults.',
    maintenancePricing: 'Preventive maintenance cost is quoted based on device type, value, complexity and required scope.',
  },
} as const;

// ─── Convenience re-exports ─────────────────────────────────
export function resolveWarranty(serviceType?: string) {
  if (serviceType === 'LIQUID_DAMAGE') {
    return {
      warrantyText: commercialCopy.es.liquidDamage,
      warrantyDays: 0,
      recoveryGuaranteed: false,
    };
  }
  return {
    warrantyText: commercialCopy.es.warranty,
    warrantyDays: null,
    recoveryGuaranteed: null,
  };
}
