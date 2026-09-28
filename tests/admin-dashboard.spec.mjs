import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('dotenv').config();
const { createPoolFromEnv } = require('../server/db/connection');
const { DashboardService } = require('../server/modules/dashboard/dashboard.service');

const BASE_URL = process.env.ADMIN_PREVIEW_URL || 'http://127.0.0.1:4322/admin/admin.html';
let pool;
let report;

test.beforeAll(async () => {
    pool = createPoolFromEnv();
    report = await new DashboardService({ pool }).getDashboard({ preset: 'last30' });
});

test.afterAll(async () => {
    await pool?.end();
});

async function prepare(page, dashboardReport = report) {
    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.pathname === '/api/admin/dashboard') return json(dashboardReport);
        if (url.pathname === '/api/me') return json({ user: { id: 'test-admin', name: 'Admin Pixon', role: 'admin', avatar: '' } });
        if (url.pathname === '/api/admin/analytics/live') return json({ active: 0, window_views: 0, window_visitors: 0, per_minute: [], grouped_pages: [] });
        return json([]);
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#dashboard-kpis')).toHaveAttribute('aria-busy', 'false');
}

test('prioriza Mi Jornada y conserva el análisis bajo demanda', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await prepare(page);

    await expect(page.locator('[data-dashboard-kpi]')).toHaveCount(8);
    await expect(page.locator('#admin-page-title')).toHaveText('Mi jornada');
    await expect(page.locator('#journey-title')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Atención ahora' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible();
    await expect(page.locator('#dashboard-period-label')).toHaveText(report.period.label);

    await page.locator('.journey-analysis > summary').click();
    await expect(page.locator('.dashboard-primary-grid')).toBeVisible();

    await page.locator('#dashboard-period-trigger').click();
    await expect(page.locator('#dashboard-period-popover')).toBeVisible();
    await expect(page.locator('[data-dashboard-preset]')).toHaveCount(7);
    await page.keyboard.press('Escape');
    await expect(page.locator('#dashboard-period-popover')).toBeHidden();
    await expect(page.locator('#dashboard-period-trigger')).toBeFocused();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: 'test-results/admin-dashboard-desktop.png', fullPage: true });
});

test('mantiene Mi Jornada operable y sin desbordamiento en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page);

    await expect(page.getByRole('heading', { name: 'Atención ahora' })).toBeVisible();
    await expect(page.locator('.journey-summary-grid')).toBeVisible();
    await expect(page.locator('.journey-primary-action')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: 'test-results/admin-dashboard-mobile.png', fullPage: true });
});

test('resiste importes y textos extremos sin desbordamiento horizontal', async ({ page }) => {
    const extreme = structuredClone(report);
    extreme.kpis.sales = { ...extreme.kpis.sales, state: 'value', value: '9999999999.99', format: 'currency' };
    extreme.traffic.top_pages = [{ path: `/servicios/${'reparacion-especializada-'.repeat(12)}`, views: 987654321, visitors: 123 }];
    await page.setViewportSize({ width: 320, height: 720 });
    await prepare(page, extreme);
    await page.locator('.journey-analysis > summary').click();
    await page.locator('.command-disclosure--wide summary').click();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-dashboard-kpi="sales"] [data-kpi-value]')).not.toHaveText('0');
});

test('un error de red se explica y permite reintentar sin mostrar ceros', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/admin/dashboard') {
            return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fuente temporalmente no disponible' }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.pathname === '/api/me' ? { user: { name: 'Admin', role: 'admin' } } : []) });
    });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('[data-dashboard-kpi="sales"] [data-kpi-value]')).toHaveText('Error');
    await expect(page.locator('#dashboard-status')).toContainText('Fuente temporalmente no disponible');
});
