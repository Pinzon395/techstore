import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/lib/business.ts', import.meta.url), 'utf8');

test('confirmed commercial policy invariants remain explicit', () => {
  assert.match(source, /startingPriceMXN:\s*600/);
  assert.match(source, /prepaid:\s*true/);
  assert.match(source, /appointmentOnly:\s*true/);
  assert.match(source, /pricingMode:\s*'EQUIPMENT_VALUE_REFERENCE'/);
  assert.match(source, /referencePercentage:\s*0\.20/);
  assert.match(source, /coversServiceCausedDamage:\s*true/);
  assert.match(source, /coversPreExistingFaults:\s*false/);
  assert.match(source, /cleaningIsRepair:\s*false/);
  assert.match(source, /guaranteesPowerOn:\s*false/);
  assert.match(source, /guaranteesDataRecovery:\s*false/);
  assert.match(source, /repairQuotedSeparately:\s*true/);
});
