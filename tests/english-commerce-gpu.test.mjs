import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');

test('English product and order entry points render English private commerce UI', () => {
  const product = read('dist/en/store/item.html');
  const order = read('dist/en/order/seguimiento.html');
  assert.match(product, /<html lang="en"/);
  assert.match(product, /Pixon PC store listing/);
  assert.match(product, /data-runtime-product/);
  assert.match(order, /<html lang="en"/);
  assert.match(order, /Your Pixon PC order/);
  assert.match(order, /id="order-access-form"/);
});

test('English commerce preserves the canonical entity and order security path', () => {
  const store = read('public/scripts/store.js');
  const checkout = read('public/scripts/checkout.js');
  const order = read('public/scripts/order-page.js');
  assert.match(store, /\/en\/store\/item\?slug=/);
  assert.match(checkout, /\/en\/order\/seguimiento\?folio=/);
  assert.match(order, /new URLSearchParams\(location\.search\)\.get\('folio'\)/);
});

test('GPU maintenance has one owner section and no universal thermal promises', () => {
  const gpu = read('src/components/views/PcGpuView.astro');
  assert.equal((gpu.match(/id="mantenimiento-gpu"/g) || []).length, 1);
  assert.match(gpu, /según el modelo y diagnóstico/);
  assert.match(gpu, /no se usan espesores genéricos/);
  assert.doesNotMatch(gpu, /0\.5mm, 1\.0mm, 1\.5mm, 2\.0mm/);
  assert.match(gpu, /No prometemos promesas engañosas/);
});
