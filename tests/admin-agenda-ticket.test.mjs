import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

// Regression test for the P0 bug: clicking "Ver Ticket" in the agenda drawer
// opened a BLANK new-ticket form (window.openRepairModal, which takes no
// arguments) instead of loading the existing ticket by id
// (window.openRepairTicket(ticketId)). See admin-agenda.js openTicket().

const source = fs.readFileSync(new URL('../public/scripts/admin-agenda.js', import.meta.url), 'utf8');

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
