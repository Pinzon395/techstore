import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('dotenv').config();

const BASE_URL = process.env.ADMIN_PREVIEW_URL || 'http://127.0.0.1:4322/admin/admin.html';

const mockTodayAppts = [
  {
    id: 'apt-1',
    customer_name: 'Juan Pérez',
    customer_phone: '9981112233',
    customer_email: 'juan@gmail.com',
    appointment_type: 'DROP_OFF',
    location_type: 'WORKSHOP',
    start_at: '2026-09-08T10:00:00.000Z',
    end_at: '2026-09-08T10:20:00.000Z',
    capacity_units: 1,
    status: 'CONFIRMED',
    payment_status: 'PAID',
    device_summary: 'MacBook Pro M1',
    planned_service_summary: 'Diagnóstico general',
    next_action: 'Cliente llega a las 10:00'
  },
  {
    id: 'apt-2',
    customer_name: 'María Gómez',
    customer_phone: '9982223344',
    appointment_type: 'LIQUID_DAMAGE',
    location_type: 'WORKSHOP',
    start_at: '2026-09-08T10:00:00.000Z',
    end_at: '2026-09-08T10:30:00.000Z',
    capacity_units: 1,
    status: 'CHECKED_IN',
    payment_status: 'PAID',
    device_summary: 'iPhone 14 Pro Max',
    planned_service_summary: 'Revisión equipo mojado',
    next_action: 'Recibir equipo a banco'
  },
  {
    id: 'apt-3',
    customer_name: 'Carlos López',
    customer_phone: '9983334455',
    appointment_type: 'ON_SITE',
    location_type: 'ON_SITE',
    start_at: '2026-09-08T13:00:00.000Z',
    end_at: '2026-09-08T15:00:00.000Z',
    capacity_units: 3,
    status: 'CONFIRMED',
    payment_status: 'PENDING',
    device_summary: 'PC Gamer RTX 4070',
    planned_service_summary: 'No da video a domicilio',
    address_line: 'Av. Huayacán Residencial Aqua',
    next_action: 'Preparar salida a domicilio'
  },
  {
    id: 'apt-4',
    customer_name: 'Roberto Méndez',
    customer_phone: '9984445566',
    appointment_type: 'DROP_OFF',
    location_type: 'WORKSHOP',
    start_at: '2026-09-08T10:00:00.000Z',
    end_at: '2026-09-08T10:30:00.000Z',
    capacity_units: 1,
    status: 'CONFIRMED',
    payment_status: 'PAID',
    device_summary: 'ThinkPad T14',
    planned_service_summary: 'Mantenimiento preventivo',
    next_action: 'Recepción'
  }
];

async function setupMocks(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/me') {
      return json({ user: { id: 'admin-1', name: 'Técnico Pixon', role: 'admin' } });
    }
    if (url.pathname === '/api/admin/appointments/today') {
      return json({ success: true, board: { appointments: mockTodayAppts } });
    }
    if (url.pathname === '/api/admin/appointments/stats') {
      return json({
        success: true,
        stats: {
          total_today: 4,
          confirmed: 3,
          pending_payment: 1,
          on_site: 1,
          liquid_damage: 1,
          no_shows: 0
        }
      });
    }
    if (url.pathname === '/api/admin/appointments/blocks') {
      return json({ success: true, blocks: [] });
    }
    if (url.pathname === '/api/admin/appointments/config') {
      return json({ success: true, settings: [], exceptions: [], types: [] });
    }
    if (url.pathname === '/api/admin/appointments') {
      return json({ success: true, appointments: mockTodayAppts });
    }
    return json([]);
  });
}

test('agenda operativa: inicia en vista Hoy por defecto y muestra timeline operativa', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // 1. Verificar pestaña Hoy activa por defecto
  const activeTab = page.locator('.agenda-tab.active');
  await expect(activeTab).toHaveAttribute('data-agenda-view-tab', 'today');

  // 2. Verificar resumen superior de máximo 5 indicadores + Next action
  await expect(page.locator('#agenda-kpi-today-count')).toContainText('citas');
  await expect(page.locator('#agenda-kpi-next-action-summary')).toBeVisible();

  // 3. Verificar barra de alertas inteligente
  await expect(page.locator('#agenda-smart-alert-bar')).toBeVisible();

  // 4. Verificar que las citas de hoy aparecen con badges semánticos
  await expect(page.locator('.agenda-today-timeline')).toBeVisible();
  await expect(page.locator('.timeline-customer-name', { hasText: 'Juan Pérez' })).toBeVisible();
  await expect(page.locator('.timeline-customer-name', { hasText: 'María Gómez' })).toBeVisible();
  await expect(page.locator('.timeline-customer-name', { hasText: 'Roberto Méndez' })).toBeVisible();
  await expect(page.locator('.chip-badge.badge-liquid')).toBeVisible();
  await expect(page.locator('.chip-badge.badge-onsite')).toBeVisible();
});

test('vista semanal: cuadrícula unificada con una sola columna de horas y un solo scroll', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // Cambiar a vista Semana
  await page.click('button[data-agenda-view-tab="week"]');
  await expect(page.locator('.agenda-week-timetable')).toBeVisible();

  // Regla absoluta: CERO scrolls independientes por columna
  const individualDayScrolls = await page.locator('.agenda-week-slots').count();
  expect(individualDayScrolls).toBe(0);

  // El único contenedor de scroll debe ser el wrapper principal
  const timetableWrapper = page.locator('#agenda-timetable-scroll');
  await expect(timetableWrapper).toBeVisible();

  // Debe existir la columna de horas a la izquierda
  await expect(page.locator('.agenda-tt-time-label', { hasText: '09:00' })).toBeVisible();
  await expect(page.locator('.agenda-tt-time-label', { hasText: '10:00' })).toBeVisible();

  // Debe haber 7 encabezados de días alineados
  const dayHeaders = page.locator('.agenda-tt-day-header');
  await expect(dayHeaders).toHaveCount(7);

  // Verificar soporte de citas simultáneas a las 10:00
  await expect(page.locator('.chip-customer', { hasText: 'Juan Pérez' })).toBeVisible();
  await expect(page.locator('.chip-customer', { hasText: 'María Gómez' })).toBeVisible();
});

test('vista Día: renderiza 3 capacity lanes (Espacio 1, 2, 3), resumen operativo y evento a domicilio expandido', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // Cambiar a vista Día
  await page.click('button[data-agenda-view-tab="day"]');
  await expect(page.locator('.agenda-day-lanes-timetable')).toBeVisible();

  // Encabezados de lanes de capacidad
  await expect(page.locator('.agenda-lane-header', { hasText: 'Espacio 1' })).toBeVisible();
  await expect(page.locator('.agenda-lane-header', { hasText: 'Espacio 2' })).toBeVisible();
  await expect(page.locator('.agenda-lane-header', { hasText: 'Espacio 3' })).toBeVisible();

  // Citas simultáneas en lanes
  await expect(page.locator('.agenda-day-lane-cell strong', { hasText: 'Juan Pérez' })).toBeVisible();
  await expect(page.locator('.agenda-day-lane-cell strong', { hasText: 'María Gómez' })).toBeVisible();
  await expect(page.locator('.agenda-day-lane-cell strong', { hasText: 'Roberto Méndez' })).toBeVisible();

  // Evento a domicilio exclusivo a las 13:00 ocupa ancho extendido
  const onsiteExclusive = page.locator('.agenda-day-lane-cell.is-onsite-exclusive');
  await expect(onsiteExclusive).toBeVisible();
  await expect(onsiteExclusive).toContainText('SERVICIO A DOMICILIO');
});

test('interacción entre vistas: Mes -> click celda navega a Día, Semana -> click encabezado navega a Día', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // Ir a Mes
  await page.click('button[data-agenda-view-tab="month"]');
  await expect(page.locator('.agenda-month-grid')).toBeVisible();

  // Click en una celda de día en el mes (ejemplo celda del día de hoy o celda con número)
  const monthCell = page.locator('.agenda-month-cell:not(.is-empty)').first();
  await monthCell.click();

  // Debe haber cambiado a la vista Día
  await expect(page.locator('.agenda-tab.active')).toHaveAttribute('data-agenda-view-tab', 'day');
  await expect(page.locator('.agenda-day-lanes-timetable')).toBeVisible();

  // Ahora cambiar a Semana
  await page.click('button[data-agenda-view-tab="week"]');
  await expect(page.locator('.agenda-week-timetable')).toBeVisible();

  // Click en encabezado de día en Semana
  const firstDayHeader = page.locator('.agenda-tt-day-header').first();
  await firstDayHeader.click();

  // Debe volver a Día para esa fecha
  await expect(page.locator('.agenda-tab.active')).toHaveAttribute('data-agenda-view-tab', 'day');
  await expect(page.locator('.agenda-day-lanes-timetable')).toBeVisible();
});

test('navegación temporal: stepper ← / Hoy / → actualiza rango en Día y Semana', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // En vista Hoy/Día, hacer click en día siguiente →
  const initialLabel = await page.locator('#agenda-current-range-label').textContent();
  await page.click('#agenda-btn-next');
  await expect(page.locator('#agenda-current-range-label')).not.toHaveText(initialLabel);

  // Volver a Hoy
  await page.click('#agenda-btn-today');
  await expect(page.locator('#agenda-current-range-label')).toContainText('Hoy');

  // En vista Semana, retroceder una semana
  await page.click('button[data-agenda-view-tab="week"]');
  const weekInitial = await page.locator('#agenda-current-range-label').textContent();
  await page.click('#agenda-btn-prev');
  await expect(page.locator('#agenda-current-range-label')).not.toHaveText(weekInitial);
});

test('filtros y búsqueda: Todos, Taller, Domicilio, Mojados y filtrado de citas', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // Filtro Domicilio
  await page.click('button[data-agenda-filter-type="ON_SITE"]');
  await expect(page.locator('.timeline-customer-name', { hasText: 'Carlos López' })).toBeVisible();
  await expect(page.locator('.timeline-customer-name', { hasText: 'Juan Pérez' })).toBeHidden();

  // Filtro Mojados
  await page.click('button[data-agenda-filter-type="LIQUID_DAMAGE"]');
  await expect(page.locator('.timeline-customer-name', { hasText: 'María Gómez' })).toBeVisible();
  await expect(page.locator('.timeline-customer-name', { hasText: 'Carlos López' })).toBeHidden();

  // Filtro Todos
  await page.click('button[data-agenda-filter-type="ALL"]');
  await expect(page.locator('.timeline-customer-name', { hasText: 'Juan Pérez' })).toBeVisible();
  await expect(page.locator('.timeline-customer-name', { hasText: 'Carlos López' })).toBeVisible();

  // Búsqueda por texto
  await page.fill('#agenda-search-input', 'iPhone');
  await expect(page.locator('.timeline-customer-name', { hasText: 'María Gómez' })).toBeVisible();
  await expect(page.locator('.timeline-customer-name', { hasText: 'Juan Pérez' })).toBeHidden();

  // Limpiar búsqueda
  await page.fill('#agenda-search-input', '');
  await expect(page.locator('.timeline-customer-name', { hasText: 'Juan Pérez' })).toBeVisible();
});

test('click slot vacío abre modal de Nueva Cita con fecha y hora preseleccionadas', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // Click en el botón agendar de un slot disponible a las 09:00
  const slotRow = page.locator('.timeline-slot-row[data-time="09:00"]');
  await slotRow.locator('.btn-slot-quick-add').click();

  // El modal debe abrirse con la hora 09:00
  const modal = page.locator('#agenda-new-modal');
  await expect(modal).toBeVisible();
  const timeVal = await page.locator('#new-apt-time').inputValue();
  expect(timeVal).toBe('09:00');

  // Cerrar modal
  await page.locator('#agenda-new-modal .agenda-modal-close').click();
  await expect(modal).toBeHidden();
});

test('verificación CSS y layout: elementos estructurados como grid/flex y sin texto plano', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // 1. Hoy: timeline slot row debe ser CSS grid
  const slotDisplay = await page.locator('.timeline-slot-row').first().evaluate(el => window.getComputedStyle(el).display);
  expect(slotDisplay).toBe('grid');

  // 2. Semana: tabla semanal debe ser CSS grid
  await page.click('button[data-agenda-view-tab="week"]');
  const weekDisplay = await page.locator('.agenda-week-timetable').evaluate(el => window.getComputedStyle(el).display);
  expect(weekDisplay).toBe('grid');

  // 3. Día: lanes deben ser CSS grid con 4 columnas (hora + 3 lanes)
  await page.click('button[data-agenda-view-tab="day"]');
  const dayDisplay = await page.locator('.agenda-day-lanes-timetable').evaluate(el => window.getComputedStyle(el).display);
  expect(dayDisplay).toBe('grid');

  // 4. Tabs no tienen text-decoration underline
  const tabDecoration = await page.locator('.agenda-tab.active').evaluate(el => window.getComputedStyle(el).textDecorationLine);
  expect(tabDecoration).toBe('none');
});

test('drawer lateral derecho: se abre con datos completos y quick actions', async ({ page }) => {
  await setupMocks(page);
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // Abrir detalle de Juan Pérez
  await page.locator('.btn-action-fast', { hasText: 'Detalle' }).first().click();

  // Verificar que el drawer está visible
  const drawer = page.locator('#agenda-details-drawer');
  await expect(drawer).toBeVisible();
  await expect(page.locator('.drawer-customer-title')).toBeVisible();

  // Quick actions presentes
  await expect(page.locator('.drawer-quick-actions button', { hasText: 'Reprogramar' })).toBeVisible();
  await expect(page.locator('.drawer-quick-actions button', { hasText: 'Cancelar' })).toBeVisible();

  // Cerrar drawer
  await page.locator('.agenda-modal-close').first().click();
  await expect(drawer).toBeHidden();
});

test('capturas visuales en 1440px y 390px', async ({ page }) => {
  await setupMocks(page);

  // Desktop 1440px
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}#agenda`);
  await expect(page.locator('#view-agenda')).toBeVisible();

  // Hoy 1440
  await page.screenshot({ path: 'tests/screenshots/agenda_hoy_1440.png', fullPage: false });

  // Semana 1440
  await page.click('button[data-agenda-view-tab="week"]');
  await expect(page.locator('.agenda-week-timetable')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/agenda_semana_1440.png', fullPage: false });

  // Día 1440
  await page.click('button[data-agenda-view-tab="day"]');
  await expect(page.locator('.agenda-day-lanes-timetable')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/agenda_dia_1440.png', fullPage: false });

  // Mes 1440
  await page.click('button[data-agenda-view-tab="month"]');
  await expect(page.locator('.agenda-month-grid')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/agenda_mes_1440.png', fullPage: false });

  // Mobile 390px
  await page.setViewportSize({ width: 390, height: 844 });

  // Hoy 390
  await page.click('button[data-agenda-view-tab="today"]');
  await expect(page.locator('.agenda-today-timeline')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/agenda_hoy_390.png', fullPage: false });

  // Día 390
  await page.click('button[data-agenda-view-tab="day"]');
  await expect(page.locator('.agenda-day-lanes-timetable')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/agenda_dia_390.png', fullPage: false });
});

test('responsive: sin desbordamiento horizontal en 320, 390, 768, 1024, 1440', async ({ page }) => {
  const viewports = [
    { width: 320, height: 600 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 }
  ];

  await setupMocks(page);
  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.goto(`${BASE_URL}#agenda`);
    await expect(page.locator('#view-agenda')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
