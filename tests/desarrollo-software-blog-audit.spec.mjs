import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BLOG_SOFTWARE_URL || 'http://127.0.0.1:4322/desarrollo-software-paginas-web-cancun.html';

test.describe('Landing Desarrollo Software, Páginas Web y SEO en Cancún — Auditoría Completa', () => {
    test('SEO On-page: único H1, title, meta description y jerarquía de encabezados', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Un solo H1
        const h1s = page.locator('h1');
        await expect(h1s).toHaveCount(1);
        await expect(h1s).toContainText('Desarrollo de Software, Páginas Web y SEO en Cancún');

        // Title y Meta Description
        await expect(page).toHaveTitle('Desarrollo de Software y Páginas Web en Cancún | SEO | Pixon PC');
        const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
        expect(metaDesc).toContain('Desarrollo de software, páginas web y sistemas a medida en Cancún');

        // Jerarquía de H2s
        const h2s = page.locator('h2');
        expect(await h2s.count()).toBeGreaterThanOrEqual(10);

        // JSON-LD Schemas presentes
        const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
        const parsedSchemas = schemas.map(s => JSON.parse(s)).flat();
        const types = parsedSchemas.map(s => s['@type']);
        expect(types).toContain('WebPage');
        expect(types).toContain('Service');
        expect(types).toContain('BreadcrumbList');
    });

    test('Estructura de Secciones: Software, Web, SEO, Google, Hosting, Sistemas y Proyectos Privados', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#software')).toBeVisible();
        await expect(page.locator('#web')).toBeVisible();
        await expect(page.locator('#seo')).toBeVisible();
        await expect(page.locator('#google')).toBeVisible();
        await expect(page.locator('#hosting')).toBeVisible();
        await expect(page.locator('#sistemas')).toBeVisible();
        await expect(page.locator('#proyectos-privados')).toBeVisible();
        await expect(page.locator('#precio')).toBeVisible();
        await expect(page.locator('#ticket-software')).toBeVisible();
        await expect(page.locator('#faq-desarrollo-cancun')).toBeVisible();
    });

    test('Conversión y CTAs: botones de WhatsApp, Crear ticket y NAP visible', async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        const waBtns = page.locator('a[href*="wa.me/529986690777"]');
        expect(await waBtns.count()).toBeGreaterThanOrEqual(3);

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
        await expect(page.locator('.sd-cockpit')).toBeVisible();
        await expect(page.locator('.sd-family').first()).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    });
});
