import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BLOG_PREVIEW_URL || 'http://127.0.0.1:4322/blogs/reparacion-bisagras-carcasas-laptop-cancun.html';

test.describe('Blog Reparación de Bisagras y Carcasas en Cancún — SEO, UI/UX & Responsive', () => {
    test('SEO On-page: único H1, title, meta description y jerarquía de encabezados', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Un solo H1
        const h1s = page.locator('h1');
        await expect(h1s).toHaveCount(1);
        await expect(h1s).toContainText('Reparación de Bisagras y Carcasas de Laptop en Cancún');

        // Title y Meta Description
        await expect(page).toHaveTitle(/Reparación de Bisagras y Carcasas de Laptop en Cancún \| Pixon PC/);
        const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
        expect(metaDesc).toContain('Reparación y reconstrucción de bisagras');
        expect(metaDesc).toContain('Cancún');

        // Jerarquía de H2s
        const h2s = page.locator('h2');
        expect(await h2s.count()).toBeGreaterThanOrEqual(6);

        // JSON-LD Schemas presentes
        const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
        const parsedSchemas = schemas.map(s => JSON.parse(s)).flat();
        const types = parsedSchemas.map(s => s['@type']);
        expect(types).toContain('Service');
        expect(types).toContain('HowTo');
        expect(types).toContain('BreadcrumbList');
    });

    test('Conversión y CTAs: botones de WhatsApp, Crear ticket y NAP visible', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Botones de WhatsApp presentes y con texto pre-llenado
        const waBtns = page.locator('a[href*="wa.me/529986690777"]');
        expect(await waBtns.count()).toBeGreaterThanOrEqual(3);

        // Formulario de ticket existe y está intacto
        await expect(page.locator('#ticket-bisagras')).toBeVisible();

        // NAP local presente
        const bodyText = await page.textContent('body');
        expect(bodyText).toContain('Pixon PC');
        expect(bodyText).toContain('Cto. Hacienda Chimay');
        expect(bodyText).toContain('+52 998 669 0777');
        expect(bodyText).toContain('pixonpc@gmail.com');
    });

    test('Responsive móvil (390px): renderizado sin desbordamiento horizontal', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('.hb-hero__showcase')).toBeVisible();
        await expect(page.locator('.hb-case-card').first()).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    });

    test('Layout visual: sin espacio sobrante entre banner English Support y Breadcrumb', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        const banner = page.locator('.english-support-banner');
        const breadcrumb = page.locator('.breadcrumb-container');

        if (await banner.isVisible() && await breadcrumb.isVisible()) {
            const bannerBox = await banner.boundingBox();
            const breadcrumbBox = await breadcrumb.boundingBox();

            if (bannerBox && breadcrumbBox) {
                // El breadcrumb debe comenzar exactamente o casi de inmediato tras el banner (sin 70px de gap)
                const gap = breadcrumbBox.y - (bannerBox.y + bannerBox.height);
                expect(gap).toBeLessThanOrEqual(5);
            }
        }
    });
});
