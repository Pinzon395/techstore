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
// Política oficial (2026-10-12, copy ajustado 2026-10-22): abierto 24/7, se agenda por WhatsApp o en línea;
// emergencias sin cita con aviso previo por WhatsApp. La agenda pública (appointment_settings) solo define qué turnos se ofrecen
// en línea; fuera de ellos se coordina por WhatsApp. No reintroducir horarios por día en el copy.
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const openingHours = {
  is247: true,
  specification: [{ dayOfWeek: ALL_DAYS, opens: '00:00', closes: '23:59' }],
  es: 'Abierto 24/7 · agenda por WhatsApp o en línea',
  esShort: 'Abierto 24/7',
  en: 'Open 24/7 · book on WhatsApp or online',
  enShort: 'Open 24/7',
} as const;

// ─── Emergencias ────────────────────────────────────────────
export const emergencyPolicy = {
  noAppointmentNeeded: true,
  requiresPriorNotice: true,
  noticeChannels: ['whatsapp', 'email'] as const,
  es: 'En una emergencia (equipo mojado, que dejó de encender, olor a quemado, corto o sobrecalentamiento grave) lo recibimos de inmediato, sin cita. Solo mándanos un WhatsApp antes de salir para tener la mesa lista.',
  esShort: 'Emergencias 24/7 sin cita: mándanos WhatsApp y tráelo',
  en: 'In an emergency (liquid spill, device stopped powering on, burning smell, short circuit or severe overheating) we take it in right away, no appointment needed. Just send us a WhatsApp before you leave so the bench is ready.',
  enShort: '24/7 emergencies, no appointment: WhatsApp us and bring it',
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
// Política oficial (2026-10-22, decisión del dueño): el diagnóstico cuesta $600 MXN y se abona
// completo a la reparación (si el cliente repara con Pixon, el diagnóstico le sale gratis).
// No se cobra por adelantado para agendar. Normalmente se entrega en menos de 1 día; depende del
// día y la hora en que llega el equipo y de la falla. Fallas visibles (pantalla rota, batería,
// puerto de carga) se cotizan directo por modelo, sin diagnóstico. No se publican precios de reparación.
export const diagnosticPolicy = {
  enabled: true,
  priceMXN: 600,
  /** Alias histórico: el precio ya no es "desde", es fijo. */
  startingPriceMXN: 600,
  creditedToRepair: true,
  prepaid: false,
  requiredForBooking: false,
  typicalMaxHours: 24,
  visibleFaultsQuotedDirectly: true,
  coversDiagnosisOnly: true,
  repairsQuotedSeparately: true,
} as const;

export const diagnosticCopy = {
  es: {
    promo: 'Diagnóstico GRATIS si reparas con nosotros',
    promoTag: 'Mega promoción',
    price: 'Diagnóstico de $600 MXN gratis si reparas con nosotros',
    credit: 'El diagnóstico cuesta $600 MXN y se abona completo a tu reparación: si reparas con Pixon, te sale gratis. Solo lo pagas si decides no reparar.',
    time: 'menos de 1 día',
    timeNote: 'El tiempo depende del día y la hora en que traigas el equipo y de la falla que tenga.',
    noPrepay: 'No pagas nada para agendar.',
    visibleFaults: 'Pantalla rota, batería o puerto de carga: te cotizamos directo por modelo, sin diagnóstico.',
    full: 'El diagnóstico cuesta $600 MXN y se abona completo a tu reparación: si reparas con Pixon, te sale gratis. Normalmente lo tienes en menos de 1 día; el tiempo depende del día y la hora en que traigas el equipo y de la falla. Antes de reparar te explicamos la falla, la solución y el costo, y no hacemos ningún trabajo sin tu autorización.',
  },
  en: {
    promo: 'FREE diagnosis when you repair with us',
    promoTag: 'Special offer',
    price: 'MXN $600 diagnosis, free when you repair with us',
    credit: 'Diagnosis costs MXN $600 and is fully credited toward your repair: if you repair with Pixon, it is free. You only pay it if you decide not to repair.',
    time: 'less than 1 day',
    timeNote: 'Timing depends on the day and time you bring the device and on the fault.',
    noPrepay: 'Nothing to pay to book.',
    visibleFaults: 'Cracked screen, battery or charging port: we quote directly by model, no diagnosis needed.',
    full: 'Diagnosis costs MXN $600 and is fully credited toward your repair: if you repair with Pixon, it is free. It usually takes less than 1 day, depending on the day and time you bring the device and on the fault. Before any repair we explain the fault, the fix and the cost; no work is done without your approval.',
  },
} as const;

/** Servicios de falla visible (pantalla, batería, puerto de carga): se cotizan directo por modelo, sin diagnóstico. */
export const visibleFaultSlugPattern = /pantalla|bateria|carga/;
export const visibleFaultQuoteLabel = 'Cotización directa por modelo, sin diagnóstico';

// ─── Warranty ───────────────────────────────────────────────
// Política oficial (2026-10-22): 90 días contra defectos de fábrica en reparaciones con piezas
// originales; mantenimiento preventivo garantizado a la entrega y por el material térmico aplicado;
// equipos mojados sin garantía (daño progresivo), con atención inmediata.
export type WarrantyMode = 'SERVICE_OR_PART_SPECIFIC';
export const warrantyCopy = {
  es: {
    short: '90 días de garantía con piezas originales',
    parts: '90 días de garantía por escrito contra defectos de fábrica en reparaciones con piezas originales.',
    maintenance: 'Mantenimiento preventivo: te entregamos el equipo probado. Si después ves temperaturas altas, lo revisamos sin costo para verificar nuestro trabajo (ventiladores conectados, cantidad y aplicación de pasta o pads térmicos). Si la causa es nuestra intervención, lo corregimos gratis; si es otra, te la explicamos con evidencia antes de cotizar.',
    liquid: 'Equipos mojados: no llevan garantía porque el líquido sigue dañando por dentro, pero los atendemos de inmediato para salvar el equipo y tus datos.',
  },
  en: {
    short: '90-day warranty with original parts',
    parts: '90-day written warranty against manufacturing defects on repairs with original parts.',
    maintenance: 'Preventive maintenance: we hand over the device tested. If you later see high temperatures, we inspect it at no cost to verify our work (fans connected, amount and application of thermal paste or pads). If the cause is our work, we fix it for free; if it is something else, we show you the evidence before quoting.',
    liquid: 'Liquid-damaged devices carry no warranty because liquid keeps causing damage inside, but we take them in right away to save the device and your data.',
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
    appointment: 'Abierto 24/7: agenda por WhatsApp o en línea. En emergencias lo recibimos sin cita; solo avísanos por WhatsApp antes de salir.',
    diagnostic: 'El diagnóstico cuesta $600 MXN y se abona completo a tu reparación: si reparas con nosotros, te sale gratis. Normalmente está en menos de 1 día, según el día y la hora en que traigas el equipo y la falla. Las piezas y la reparación se cotizan antes de trabajar y solo con tu autorización.',
    warranty: '90 días de garantía por escrito contra defectos de fábrica en reparaciones con piezas originales.',
    liquidDamage: 'El servicio por daño de líquido corresponde inicialmente a limpieza e inspección. Debido a que el líquido puede causar daños progresivos o irreversibles, no se garantiza que el equipo vuelva a encender ni que no aparezcan fallas posteriores. Cualquier reparación necesaria después de la limpieza se diagnostica y cotiza por separado.',
    turnaround: 'El tiempo estimado se confirma después de la revisión.',
    logistics: 'La recolección o entrega se coordina según zona, disponibilidad y tipo de equipo.',
    payment: 'Los métodos de pago disponibles se muestran al confirmar el pedido.',
    maintenanceResponsibility: 'Si el equipo ingresa funcionando y se produce un daño directamente atribuible al mantenimiento realizado por Pixon PC, nos responsabilizamos de corregirlo. Esta responsabilidad no cubre fallas preexistentes, intermitentes o independientes de la intervención.',
    maintenancePricing: 'El costo del mantenimiento preventivo se cotiza según el tipo de equipo, su valor, complejidad y el alcance requerido.',
  },
  en: {
    appointment: 'Open 24/7: book on WhatsApp or online. Emergencies are taken in without an appointment; just WhatsApp us before you leave.',
    diagnostic: 'Diagnosis costs MXN $600 and is fully credited toward your repair: if you repair with us, it is free. It usually takes less than 1 day, depending on the day and time you bring the device and on the fault. Parts and repair are quoted before any work and only done with your approval.',
    warranty: '90-day written warranty against manufacturing defects on repairs with original parts.',
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
