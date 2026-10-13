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
  // Pin del perfil de Google Maps del negocio (maps.app.goo.gl/yRr626kNbtchtDTs6 → 21.157872,-86.896027);
  // cae en CP 77539, igual que la dirección. Las coordenadas anteriores (21.0512,-86.8475) eran Lagos del Sol, CP 77569.
  geo: { latitude: 21.157875, longitude: -86.896057 },
  mapsUrl: 'https://maps.app.goo.gl/yRr626kNbtchtDTs6',
  englishSupport: { type: 'WRITTEN' as const },
} as const;

// ─── Appointment ────────────────────────────────────────────
export const appointmentPolicy = {
  appointmentOnly: true,
} as const;

// ─── Horario / disponibilidad ───────────────────────────────
// Política oficial (2026-10-12): atención 24/7 con cita previa; emergencias 24/7 con aviso previo
// por WhatsApp o correo. La agenda pública (appointment_settings) solo define qué turnos se ofrecen
// en línea; fuera de ellos se coordina por WhatsApp. No reintroducir horarios por día en el copy.
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const openingHours = {
  is247: true,
  specification: [{ dayOfWeek: ALL_DAYS, opens: '00:00', closes: '23:59' }],
  es: 'Atención 24/7 con cita previa',
  esShort: '24/7 con cita',
  en: 'Open 24/7 by appointment',
  enShort: '24/7 by appointment',
} as const;

// ─── Emergencias ────────────────────────────────────────────
export const emergencyPolicy = {
  noAppointmentNeeded: true,
  requiresPriorNotice: true,
  noticeChannels: ['whatsapp', 'email'] as const,
  es: 'En una emergencia (equipo mojado, que dejó de encender, olor a quemado, corto o sobrecalentamiento grave) puedes traer tu equipo sin esperar una cita normal. Solo avísanos antes por WhatsApp o correo para estar listos para recibirlo.',
  esShort: 'Emergencias 24/7: avísanos por WhatsApp antes de venir',
  en: 'In an emergency (liquid spill, device stopped powering on, burning smell, short circuit or severe overheating) you can bring your device without waiting for a regular appointment. Just message us on WhatsApp or by email before coming so we are ready to receive it.',
  enShort: '24/7 emergencies: message us on WhatsApp before coming',
} as const;

export function buildOpeningHoursSchema() {
  return openingHours.specification.map((slot) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: slot.dayOfWeek,
    opens: slot.opens,
    closes: slot.closes,
  }));
}

// ─── Diagnostic ─────────────────────────────────────────────
export const diagnosticPolicy = {
  enabled: true,
  startingPriceMXN: 600,
  /** Tiempo habitual de diagnóstico: 8 horas a 2 días según equipo, falla y pruebas necesarias. */
  minHours: 8,
  maxDays: 2,
  prepaid: true,
  requiredForBooking: true,
  coversDiagnosisOnly: true,
  repairsQuotedSeparately: true,
} as const;

// ─── Warranty ───────────────────────────────────────────────
export type WarrantyMode = 'SERVICE_OR_PART_SPECIFIC';
export const diagnosticCopy = {
  es: {
    price: 'Diagnóstico desde $600 MXN',
    time: 'de 8 horas a 2 días',
    full: 'El diagnóstico tiene un costo desde $600 MXN. El tiempo habitual es de 8 horas a 2 días, según el tipo de equipo, la falla y las pruebas necesarias. Antes de reparar te informamos el diagnóstico, la solución propuesta y el costo; no hacemos ningún trabajo sin tu autorización.',
  },
  en: {
    price: 'Diagnosis from MXN $600',
    time: '8 hours to 2 days',
    full: 'Diagnosis starts at MXN $600. It usually takes 8 hours to 2 days, depending on the device, the fault and the tests required. Before any repair we explain the diagnosis, the proposed fix and the cost; no work is done without your approval.',
  },
} as const;

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
  referencePercentage: 0.15,
  startingPriceMXN: 1000,
  /** Manual override per case is allowed. */
  manualQuoteOverride: true,
} as const;

export const confirmedPolicyCopy = {
  es: {
    maintenance: 'El mantenimiento preventivo se cotiza desde $1,000 MXN. Como referencia, el servicio puede calcularse alrededor del 15% del valor del equipo según complejidad, riesgo y materiales; el costo final se confirma antes de realizar el servicio.',
    liquidDamage: 'El servicio inicial por daño de líquido corresponde a limpieza técnica, descontaminación e inspección; no constituye una reparación garantizada. Debido a que el líquido puede causar daños progresivos, ocultos o irreversibles, no podemos garantizar que el equipo vuelva a encender, permanezca funcionando, recupere datos o que no aparezcan fallas posteriores. Cualquier reparación necesaria después de la limpieza se diagnostica y cotiza por separado.',
  },
  en: {
    maintenance: "Preventive maintenance is quoted starting at $1,000 MXN. As a reference, service pricing may be calculated at around 15% of the equipment's value depending on complexity, risk and materials; the final cost is confirmed before the service is performed.",
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
    appointment: 'Atención 24/7 con cita previa. En emergencias, avísanos por WhatsApp o correo antes de venir.',
    diagnostic: 'El diagnóstico comienza desde $600 MXN y puede variar según el tipo de dispositivo y la complejidad de la revisión; normalmente toma de 8 horas a 2 días. Este costo corresponde únicamente al diagnóstico; cualquier reparación, pieza o trabajo adicional se cotiza por separado.',
    warranty: 'La garantía aplicable se confirma según la reparación y la pieza instalada.',
    liquidDamage: 'El servicio por daño de líquido corresponde inicialmente a limpieza e inspección. Debido a que el líquido puede causar daños progresivos o irreversibles, no se garantiza que el equipo vuelva a encender ni que no aparezcan fallas posteriores. Cualquier reparación necesaria después de la limpieza se diagnostica y cotiza por separado.',
    turnaround: 'El tiempo estimado se confirma después de la revisión.',
    logistics: 'La recolección o entrega se coordina según zona, disponibilidad y tipo de equipo.',
    payment: 'Los métodos de pago disponibles se muestran al confirmar el pedido.',
    maintenanceResponsibility: 'Si el equipo ingresa funcionando y se produce un daño directamente atribuible al mantenimiento realizado por Pixon PC, nos responsabilizamos de corregirlo. Esta responsabilidad no cubre fallas preexistentes, intermitentes o independientes de la intervención.',
    maintenancePricing: 'El costo del mantenimiento preventivo se cotiza según el tipo de equipo, su valor, complejidad y el alcance requerido.',
  },
  en: {
    appointment: 'Open 24/7 by appointment. For emergencies, message us on WhatsApp or by email before coming.',
    diagnostic: 'Diagnostics start from MXN $600 and may vary depending on device type and inspection complexity; they usually take 8 hours to 2 days. This fee covers diagnosis only; any repair, parts or additional work are quoted separately.',
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
