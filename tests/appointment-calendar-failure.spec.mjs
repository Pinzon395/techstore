import { test, expect } from '@playwright/test';

const site = 'http://127.0.0.1:4321';

test('API month failure never presents fabricated availability', async ({ page }) => {
  await page.route('**/api/appointments/availability/month?**', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));

  await page.goto(site, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#hac-days-grid')).toContainText('No pudimos consultar la disponibilidad');
  await expect(page.locator('#hac-days-grid .hac-day-cell.clickable')).toHaveCount(0);
  await expect(page.locator('#hac-retry-month')).toBeVisible();
});

test('API slot failure never presents fabricated slots', async ({ page }) => {
  await page.route('**/api/appointments/availability/month?**', (route) => {
    const month = new URL(route.request().url()).searchParams.get('month');
    const date = `${month}-15`;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ days: [{ date, status: 'AVAILABLE', available_slots: 2 }] }) });
  });
  await page.route('**/api/appointments/availability?**', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));

  await page.goto(site, { waitUntil: 'domcontentloaded' });
  await page.locator('#hac-btn-next-month').click();
  await page.locator('#hac-days-grid .hac-day-cell.clickable').first().click();
  await expect(page.locator('#hac-slots-container')).toContainText('No pudimos consultar los horarios');
  await expect(page.locator('#hac-slots-container [data-time]')).toHaveCount(0);
});
