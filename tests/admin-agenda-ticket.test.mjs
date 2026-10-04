import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

// Regression test for the P0 bug: clicking "Ver Ticket" in the agenda drawer
// opened a BLANK new-ticket form (window.openRepairModal, which takes no
// arguments) instead of loading the existing ticket by id
// (window.openRepairTicket(ticketId)). See admin-agenda.js openTicket().

const source = fs.readFileSync(new URL('../public/scripts/admin-agenda.js', import.meta.url), 'utf8');

test('weekly agenda displays a real appointment at 21:30 using configured opening hours', () => {
  const window = loadAgendaManager();
  const agenda = window.adminAgenda;
  agenda.currentDate = '2026-10-08';
  agenda.view = 'week';
  agenda.config = { settings: Array.from({ length: 7 }, (_, weekday) => ({ weekday, is_open: 1, start_time: '11:00:00', end_time: '22:00:00', slot_minutes: 30 })), exceptions: [] };
  const container = window.document.createElement('div');
  agenda.renderWeekView(container, [{ id: 'late-booking', start_at: '2026-10-08 21:30:00', customer_name: 'Late customer', appointment_type: 'DROP_OFF', status: 'CONFIRMED', capacity_units: 1 }]);
  assert.match(container.textContent, /Late customer/);
  assert.ok(container.querySelector('[data-date="2026-10-08"][data-time="21:30"]'));
  assert.equal(container.querySelector('[data-time="09:00"]'), null);
  window.close();
});

test('agenda keeps appointments outside changed or closed opening hours visible', () => {
  const window = loadAgendaManager();
  const agenda = window.adminAgenda;
  agenda.config = { settings: [{ weekday: 4, is_open: 0, start_time: '11:00:00', end_time: '18:00:00' }], exceptions: [] };
  assert.deepEqual(Array.from(agenda.getTimeSlots(['2026-10-08'], [{ start_at: '2026-10-08 21:30:00' }])), ['21:30']);
  window.close();
});

function loadAgendaManager() {
  const dom = new JSDOM(
    `<!doctype html><html><body><script>${source}</script></body></html>`,
    { url: 'http://localhost/admin/agenda', runScripts: 'dangerously' }
  );
  // init()/startPolling() do a real fetch() and a setInterval() meant for a
  // live browser tab; neutralize them synchronously (before DOMContentLoaded
  // fires) so the test doesn't hang on a real network call or a live timer.
  dom.window.adminAgenda.init = () => {};
  dom.window.adminAgenda.startPolling = () => {};
  return dom.window;
}

test('openTicket() calls window.openRepairTicket (existing ticket), never openRepairModal (blank form)', () => {
  const window = loadAgendaManager();
  let calledWith = null;
  window.openRepairModal = () => { throw new Error('openTicket must NOT call openRepairModal (creates a blank ticket)'); };
  window.openRepairTicket = (id) => { calledWith = id; };

  window.adminAgenda.openTicket(42);

  assert.equal(calledWith, 42, 'openRepairTicket should receive the appointment\'s ticket_id');
});

test('openTicket() with no ticket_id shows a human toast instead of throwing or opening a blank form', () => {
  const window = loadAgendaManager();
  window.document.body.innerHTML = '<div id="agenda-toast-container"></div>';
  let repairModalCalled = false;
  window.openRepairModal = () => { repairModalCalled = true; };
  window.openRepairTicket = () => { throw new Error('should not be called when ticketId is falsy'); };

  assert.doesNotThrow(() => window.adminAgenda.openTicket(null));
  assert.equal(repairModalCalled, false);
  assert.match(window.document.getElementById('agenda-toast-container').textContent, /no tiene un ticket/i);
});

test('openTicket() falls back to the repairs hash route only when openRepairTicket is unavailable', () => {
  // jsdom's window.location is non-configurable, so we can't spy on the
  // assignment directly; assert the fallback branch targets the repairs
  // view (never openRepairModal) by inspecting openTicket()'s source.
  const match = source.match(/openTicket\(ticketId\)\s*{([\s\S]*?)\n\s{4}}/);
  assert.ok(match, 'openTicket() method not found');
  const body = match[1];
  assert.match(body, /window\.openRepairTicket/);
  assert.match(body, /location\.href\s*=\s*`\/admin#repairs`/);
  assert.doesNotMatch(body, /openRepairModal/);
});
