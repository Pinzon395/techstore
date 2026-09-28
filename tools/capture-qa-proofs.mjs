import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/ee9abf8e-8b6c-43db-9e41-92931de3b178';
const BASE_URL = 'http://127.0.0.1:4322';

function cancunTodayISO() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Cancun',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}
const TODAY = cancunTodayISO();

const mockTodayAppts = [
  {
    id: 'apt-1',
    customer_name: 'Alexander Vaughn',
    customer_phone: '9981112233',
    customer_email: 'alex@gmail.com',
    appointment_type: 'LIQUID_DAMAGE',
    location_type: 'WORKSHOP',
    start_at: `${TODAY}T10:00:00.000Z`,
    end_at: `${TODAY}T10:30:00.000Z`,
    capacity_units: 1,
    status: 'CONFIRMED',
    payment_status: 'PENDING',
    price_mode: 'PENDING_CONFIRMATION',
    device_summary: 'Celular Vivo V30 Lite',
    planned_service_summary: 'Equipo mojado / Descontaminación',
    ticket_id: 't-101',
    ticket_code: 'TK-101',
    next_action: 'Cliente llega a las 10:00'
  },
  {
    id: 'apt-2',
    customer_name: 'Manuel Rodríguez',
    customer_phone: '9982223344',
    appointment_type: 'MAINTENANCE',
    location_type: 'WORKSHOP',
    start_at: `${TODAY}T13:00:00.000Z`,
    end_at: `${TODAY}T13:45:00.000Z`,
    capacity_units: 1,
    status: 'TEMPORARY_HOLD',
    payment_status: 'PENDING',
    price_mode: 'ESTIMATE',
    price_amount_mxn: 1200,
    device_summary: 'Laptop Dell Inspiron 15',
    planned_service_summary: 'Mantenimiento y pasta térmica',
    next_action: 'Pendiente de confirmación'
  },
  {
    id: 'apt-3',
    customer_name: 'Carlos López',
    customer_phone: '9983334455',
    appointment_type: 'ON_SITE',
    location_type: 'ON_SITE',
    start_at: `${TODAY}T15:00:00.000Z`,
    end_at: `${TODAY}T17:00:00.000Z`,
    capacity_units: 3,
    status: 'CONFIRMED',
    payment_status: 'PAID',
    device_summary: 'PC Gamer RTX 4070',
    planned_service_summary: 'Revisión y configuración a domicilio',
    address_line: 'Av. Huayacán Residencial Aqua',
    ticket_id: 't-102',
    ticket_code: 'TK-102',
    next_action: 'Preparar salida a domicilio'
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
          total_today: 3,
          confirmed: 2,
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
    if (url.pathname.includes('/availability')) {
      return json({
        success: true,
        date: TODAY,
        status: 'AVAILABLE',
        availableSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'],
        slots: [
          { time: '09:00', status: 'AVAILABLE', remainingCapacity: 3 },
          { time: '10:00', status: 'LIMITED', remainingCapacity: 1 },
          { time: '11:00', status: 'AVAILABLE', remainingCapacity: 3 },
          { time: '13:00', status: 'LIMITED', remainingCapacity: 2 },
          { time: '15:00', status: 'FULL', remainingCapacity: 0 }
        ]
      });
    }
    return json([]);
  });
}

async function run() {
  console.log('Launching browser to capture QA proofs with realistic agenda data...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await setupMocks(page);

  // 1. Month View
  console.log('1. Capturing Month view...');
  await page.goto(`${BASE_URL}/admin/admin.html?view=month&date=${TODAY.slice(0, 7)}#agenda`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.agenda-month-grid');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_proof_month.png') });

  // 2. Day View
  console.log('2. Navigating to Day view and capturing PENDIENTES DEL DÍA & capacity lanes...');
  await page.goto(`${BASE_URL}/admin/admin.html?view=day&date=${TODAY}#agenda`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.agenda-day-view-container');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_proof_day.png') });

  // 3. Appointment Detail
  console.log('3. Clicking appointment card and capturing Detail drawer...');
  const apptCard = page.locator('#view-agenda .agenda-pending-card, #view-agenda .agenda-day-lane-cell[data-agenda-action="openDetails"], #view-agenda .btn-action-fast').first();
  await apptCard.click();
  await page.waitForSelector('#agenda-details-drawer', { state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_proof_detail.png') });

  // 4. Ticket View
  console.log('4. Checking Ver Ticket / Ticket view...');
  await page.goto(`${BASE_URL}/admin/admin.html#repairs`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#view-repairs', { state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_proof_ticket.png') });

  // 5. Booking from free slot
  console.log('5. Clicking free slot in Agenda and capturing New Appointment modal...');
  await page.goto(`${BASE_URL}/admin/admin.html?view=day&date=${TODAY}#agenda`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.agenda-day-view-container');
  const freeSlot = page.locator('.lane-empty-slot, [data-agenda-action="openNewAppointmentModal"]').first();
  await freeSlot.click();
  await page.waitForSelector('#agenda-new-modal', { state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_proof_booking.png') });

  // 6. Public Availability Calendar in tickets.html
  console.log('6. Navigating to tickets.html and capturing Public Availability...');
  await page.goto(`${BASE_URL}/tickets.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const pubSection = page.locator('#public-availability-section, .public-avail-card, .availability-hero-strip').first();
  if (await pubSection.isVisible()) {
    await pubSection.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_proof_public.png') });

  await browser.close();
  console.log('SUCCESS: All 6 QA proofs captured!');
}

run().catch(err => {
  console.error('Error capturing QA proofs:', err);
  process.exit(1);
});
