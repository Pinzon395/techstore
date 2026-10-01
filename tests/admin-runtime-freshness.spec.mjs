import { test, expect } from '@playwright/test';

const BASE_URL = process.env.ADMIN_PREVIEW_URL || 'http://127.0.0.1:4323/admin/admin.html';

async function mockAdmin(page, { serverVersion } = {}) {
  await page.route('**/version.json*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ version: serverVersion || 'same-build' }),
  }));
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/admin/comments/stream') {
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ready\n\n' });
    }
    if (url.pathname === '/api/me') return json({ user: { id: 1, role: 'admin', name: 'QA Admin', email: 'qa@pixon.com.mx' } });
    if (url.pathname === '/api/faqs') return json([{ id: 7, category: 'Servicio', icon: '', question: '¿Pregunta QA?', answer: 'Respuesta QA', display_order: 1 }]);
    if (url.pathname === '/api/admin/faqs/unanswered') return json([]);
    if (url.pathname === '/api/admin/google-reviews') return json([]);
    if (url.pathname === '/api/admin/google-reviews/status') return json({ configured: false });
    if (url.pathname === '/api/admin/repairs' || url.pathname === '/api/admin/tickets') return json([]);
    if (url.pathname === '/api/admin/comments' || url.pathname === '/api/admin/users' || url.pathname === '/api/admin/builds' || url.pathname === '/api/admin/technicians') return json([]);
    if (url.pathname.startsWith('/api/admin/appointments')) return json({ appointments: [], blocks: [], settings: [], exceptions: [], stats: {} });
    if (url.pathname.startsWith('/api/admin/dashboard')) return json({ kpis: {}, operations: {}, series: [], insights: [] });
    if (url.pathname.startsWith('/api/admin/commerce')) return json({ data: [], meta: {}, metrics: {}, items: [] });
    if (url.pathname.startsWith('/api/admin/')) return json({ success: true, data: [], meta: {} });
    return json([]);
  });
}

async function openNav(page, view) {
  const link = page.locator(`.nav-link[data-view="${view}"]`).first();
  const isHidden = await link.evaluate((el) => {
    const items = el.closest('.nav-group')?.querySelector('.nav-group-items');
    return items ? items.hidden : false;
  });
  if (isHidden) {
    await link.evaluateHandle((el) => el.closest('.nav-group')?.querySelector('[data-group-toggle]'))
      .then((handle) => handle.asElement()?.click());
  }
  await link.click();
  await expect(page.locator(`#view-${view}`)).toBeVisible();
}

test('navegación root, aliases e historia funcionan sin errores de runtime', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await mockAdmin(page);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#auth-loading')).toBeHidden();

  const views = ['dashboard', 'repairs', 'agenda', 'commerce-orders', 'commerce-payments', 'commerce-store', 'commerce-dashboard', 'commerce-promotions', 'builds', 'commerce-inventory', 'comments', 'users', 'faqs', 'commerce-settings', 'preferences'];
  for (const view of views) await openNav(page, view);

  await openNav(page, 'agenda');
  await openNav(page, 'repairs');
  await page.goBack();
  await expect(page.locator('#view-agenda')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#view-repairs')).toBeVisible();
  expect(errors).toEqual([]);
});

test('acciones estáticas y dinámicas abren, cierran y no dependen de onclick', async ({ page }) => {
  await mockAdmin(page);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#auth-loading')).toBeHidden();

  await openNav(page, 'repairs');
  await page.locator('[data-admin-action="open-repair-modal"]').first().click();
  await expect(page.locator('#repairModalOverlay')).toHaveClass(/show/);
  await page.locator('#repairModalOverlay [data-admin-action="close-repair-modal"]').first().click();
  await expect(page.locator('#repairModalOverlay')).not.toHaveClass(/show/);

  await openNav(page, 'agenda');
  await page.locator('#agenda-btn-new').click();
  await expect(page.locator('#agenda-new-modal')).toBeVisible();
  await page.locator('#agenda-new-modal [data-close-agenda-modal]').first().click();
  await expect(page.locator('#agenda-new-modal')).toBeHidden();
  await page.locator('#agenda-btn-block').click();
  await expect(page.locator('#agenda-block-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#agenda-block-modal')).toBeHidden();

  await openNav(page, 'faqs');
  await expect(page.locator('[data-admin-action="edit-faq"]')).toHaveCount(1);
  await page.locator('.faq-category-toggle').first().click();
  await page.locator('[data-admin-action="edit-faq"]').click();
  await expect(page.locator('#faqModalOverlay')).toHaveClass(/show/);
  await page.locator('#faqModalOverlay [data-admin-action="close-faq-modal"]').first().click();

  await openNav(page, 'commerce-inventory');
  await page.locator('#inventory-adjust-open').click();
  await expect(page.locator('#inventory-adjust-modal')).toBeVisible();
  await page.locator('#inventory-adjust-modal button[data-market-close]').click();
  await expect(page.locator('#inventory-adjust-modal')).toBeHidden();

  await openNav(page, 'commerce-promotions');
  await page.locator('#promotion-create').click();
  await expect(page.locator('#promotion-modal')).toBeVisible();
  await page.locator('#promotion-modal button[data-market-close]').first().click();
  await expect(page.locator('#promotion-modal')).toBeHidden();
});

test('móvil funciona y una pestaña vieja ofrece actualización sin autoreload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAdmin(page, { serverVersion: 'qa-new-build' });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#pixon-update-notice')).toBeVisible();
  const originalUrl = page.url();
  await page.locator('#adminMobileToggle').click();
  await openNav(page, 'repairs');
  await expect(page.locator('#admin-shell')).not.toHaveClass(/sb-open/);
  // El archivo estático admin.html (sin el gate de Express en /admin) usa rutas por hash;
  // /admin/repairs con path limpio solo aplica cuando el server sirve /admin* con el rewrite.
  await expect(page).toHaveURL(/#repairs$/);
});
