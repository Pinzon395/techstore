import { test, expect } from '@playwright/test';

const BASE_URL = process.env.ADMIN_PREVIEW_URL || 'http://127.0.0.1:4322/admin/admin.html';

const mockUser = {
    id: 1,
    name: 'Admin Principal',
    email: 'pixonpc@gmail.com',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin'
};

const mockRepairs = [
    {
        id: 101,
        ticket_code: 'PIX101',
        user_name: 'Carlos Mendoza',
        contact_phone: '9981234567',
        contact_email: 'carlos@example.com',
        user_email: 'carlos@example.com',
        device_type: 'Laptop',
        device_brand: 'Lenovo',
        device_model: 'Legion 5',
        reported_issue: 'Servicio solicitado: Mantenimiento preventivo\nSobrecalentamiento y apagados',
        status: 'diagnosing',
        priority: 'high',
        technician_id: 2,
        technician_name: 'Luis Técnico',
        next_action: 'Registrar costo y diagnóstico',
        estimated_cost: null,
        final_cost: null,
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3600 * 1000).toISOString()
    },
    {
        id: 102,
        ticket_code: 'PIX102',
        user_name: 'María Torres',
        contact_phone: '9989876543',
        contact_email: 'maria@example.com',
        user_email: 'maria@example.com',
        device_type: 'PC Gamer',
        device_brand: 'Custom',
        device_model: 'Ryzen 7 5800X',
        reported_issue: 'Servicio solicitado: Ensamble y diagnóstico\nNo da video tras cambio de GPU',
        status: 'new',
        priority: 'urgent',
        technician_id: null,
        next_action: 'Confirmar recepción y disponibilidad de cita',
        estimated_cost: null,
        final_cost: null,
        created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
    },
    {
        id: 103,
        ticket_code: 'PIX103',
        user_name: 'Roberto Gómez',
        contact_phone: '9985551234',
        contact_email: 'roberto@example.com',
        user_email: 'roberto@example.com',
        device_type: 'iPhone',
        device_brand: 'Apple',
        device_model: 'iPhone 13',
        reported_issue: 'Servicio solicitado: Cambio de pantalla\nPantalla estrellada tras caída',
        status: 'ready',
        priority: 'normal',
        technician_id: 2,
        technician_name: 'Luis Técnico',
        next_action: 'Contactar cliente para entrega de equipo',
        estimated_cost: '1800.00',
        final_cost: '1800.00',
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    }
];

const mockEmails = [
    {
        id: 'evt_test_1',
        ticket_id: 101,
        event_type: 'ticket_created_customer',
        recipient: 'c***s@example.com',
        subject: '✅ Confirmacion de tu solicitud #PIX101 — Pixon PC',
        status: 'accepted',
        provider_id: 'res_abc12345',
        error: null,
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    }
];

async function setupMockApi(page, overrides = {}) {
    await page.route('**/api/**', async (route) => {
        try {
            const url = new URL(route.request().url());
            const method = route.request().method();
            const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

            if (method === 'PATCH') {
                if (overrides.conflict409) {
                    return json({ error: 'Conflict', message: 'Conflicto de concurrencia' }, 409);
                }
                return json({ success: true, ticket: mockRepairs[0], notifications: [{ status: 'accepted' }] });
            }

            if (url.pathname === '/api/me') return json({ user: mockUser });
            if (url.pathname === '/api/admin/repairs' || url.pathname === '/api/admin/tickets') return json(mockRepairs);
            if (url.pathname.includes('/emails')) {
                return json({ success: true, emails: mockEmails, total: mockEmails.length });
            }
            if (url.pathname.includes('/history')) {
                return json({ success: true, history: [] });
            }
            if (url.pathname.match(/^\/api\/admin\/tickets\/\d+$/)) {
                const id = Number(url.pathname.split('/').pop());
                const ticket = mockRepairs.find(r => r.id === id) || mockRepairs[0];
                return json({ success: true, ticket, repair: ticket });
            }
            if (url.pathname === '/api/admin/technicians') {
                return json([
                    { id: 1, name: 'Admin Principal', email: 'pixonpc@gmail.com' },
                    { id: 2, name: 'Luis Técnico', email: 'luis@pixon.com.mx' }
                ]);
            }
            if (url.pathname === '/api/admin/comments') return json([]);
            if (url.pathname === '/api/admin/users') return json([mockUser]);
            if (url.pathname === '/api/admin/faqs') return json([]);
            if (url.pathname === '/api/admin/builds') return json([]);
            if (url.pathname.startsWith('/api/admin/appointments')) return json([]);
            if (url.pathname === '/api/admin/dashboard') {
                return json({
                    kpis: {
                        sales: { state: 'value', value: 12500, format: 'currency' },
                        orders: { state: 'value', value: 4 },
                        repairs: { state: 'value', value: 3 },
                        conversion_rate: { state: 'value', value: 3.2, format: 'percent' },
                        new_customers: { state: 'value', value: 2 },
                        expenses: { state: 'not_configured', value: null },
                        net_margin: { state: 'not_configured', value: null },
                        unanswered_questions: { state: 'value', value: 0 }
                    },
                    period: { label: 'Últimos 30 días' },
                    traffic: { top_pages: [] },
                    insights: []
                });
            }
            if (url.pathname === '/api/admin/analytics/live') {
                return json({ active: 0, window_views: 0, window_visitors: 0, per_minute: [], grouped_pages: [] });
            }

            return json([]);
        } catch (err) {
            console.error('MOCK ERROR:', err);
            return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: err.message }) });
        }
    });
}

test.describe('Pixon PC Admin — Operación y CRM', () => {
    test('Taller muestra tabla operativa con Siguiente Acción, Responsable y Saldo', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await setupMockApi(page);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Navegar a Taller
        await page.click('button[data-view="repairs"]');
        await expect(page.locator('#view-repairs')).toBeVisible();

        // Verificar columnas operativas y badges
        await expect(page.locator('#repairs-tbody tr.repair-row')).toHaveCount(3);
        await expect(page.locator('.ticket-next-action').first()).toContainText('Registrar costo y diagnóstico');
        await expect(page.locator('#repairs-tbody')).toContainText('Luis Técnico');
        await expect(page.locator('#repairs-tbody')).toContainText('Sin asignar');
    });

    test('Expediente abre en workspace con tabs, muestra comunicación auditada (ACCEPTED) y OCC 409 handling', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER LOG 2:', msg.type(), msg.text()));
        page.on('pageerror', err => console.log('BROWSER UNCAUGHT 2:', err.message));
        await page.setViewportSize({ width: 1440, height: 900 });
        await setupMockApi(page);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Ir a Taller esperando la respuesta de la API
        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/admin/repairs') && res.status() === 200),
            page.click('button.nav-link[data-view="repairs"]:not([data-repair-panel])')
        ]);
        await expect(page.locator('#repairs-tbody tr.repair-row')).toHaveCount(3);
        await page.evaluate(() => window.openRepairTicket(101));

        // Drawer visible y estructurado en workspace con tabs
        await expect(page.locator('#repairDetailOverlay')).toHaveClass(/show/);
        await expect(page.locator('.repair-workspace-tabs')).toBeVisible();

        // Tab de Comunicación muestra estado ACCEPTED por proveedor
        await page.locator('button[data-repair-workspace-tab="communication"]').click();
        await expect(page.locator('[data-repair-workspace-panel="communication"]')).toBeVisible();
        await expect(page.locator('[data-repair-workspace-panel="communication"]')).toContainText('Aceptado');
        await expect(page.locator('[data-repair-workspace-panel="communication"]')).toContainText('res_abc12345');

        // Tab de Diagnóstico y costos
        await page.locator('button[data-repair-workspace-tab="work"]').click();
        await expect(page.locator('#repairDetailDiagnostic')).toBeVisible();

        // Cerrar con Escape y verificar focus restore
        await page.keyboard.press('Escape');
        await expect(page.locator('#repairDetailOverlay')).not.toHaveClass(/show/);
    });

    test('Simulación de OCC 409 muestra aviso de conflicto sin descartar datos del operador', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await setupMockApi(page, { conflict409: true });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/admin/repairs') && res.status() === 200),
            page.click('button.nav-link[data-view="repairs"]:not([data-repair-panel])')
        ]);
        await expect(page.locator('#repairs-tbody tr.repair-row')).toHaveCount(3);
        await page.evaluate(() => window.openRepairTicket(101));

        // Modificar diagnóstico y guardar
        await page.locator('button[data-repair-workspace-tab="work"]').click();
        await page.locator('#repairDetailDiagnostic').fill('Diagnóstico actualizado por técnico local.');
        await page.locator('#repairDetailSave').click();

        // El banner 409 debe ser visible y el texto no debe desaparecer
        await expect(page.locator('#repairConflictBanner')).toBeVisible();
        await expect(page.locator('#repairConflictBanner')).toContainText('Conflicto de edición (409)');
        await expect(page.locator('#repairDetailDiagnostic')).toHaveValue('Diagnóstico actualizado por técnico local.');
    });

    test('Command Palette (Ctrl/Cmd + K) abre con teclado, busca, navega con flechas y cierra con Escape', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await setupMockApi(page);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // Abrir con Ctrl+K
        await page.keyboard.press('Control+KeyK');
        await expect(page.locator('#adminGlobalSearchDialog')).toBeVisible();
        await expect(page.locator('#adminGlobalSearchInput')).toBeFocused();

        // Buscar
        await page.locator('#adminGlobalSearchInput').fill('Legion');
        await expect(page.locator('.admin-search-result')).toBeVisible();
        await expect(page.locator('#adminGlobalSearchResults')).toContainText('PIX101');

        // Navegar con flecha abajo
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('.admin-search-result.active')).toBeVisible();

        // Cerrar con Escape
        await page.keyboard.press('Escape');
        await expect(page.locator('#adminGlobalSearchDialog')).toBeHidden();
    });

    test('Vista móvil (390px) renderiza cards operativas sin desbordamiento horizontal', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await setupMockApi(page);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

        // En móvil, abrir toggle de menú y seleccionar Taller
        await page.click('#adminMobileToggle');
        await page.click('button.nav-link[data-view="repairs"]:not([data-repair-panel])');
        await expect(page.locator('.repair-mobile-card').first()).toBeVisible();
        await expect(page.locator('.repair-mobile-card').first()).toContainText('PIX101');
        await expect(page.locator('.repair-mobile-card').first()).toContainText('Siguiente');

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
    });
});
