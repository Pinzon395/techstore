import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/ee9abf8e-8b6c-43db-9e41-92931de3b178';
const BASE_URL = 'http://127.0.0.1:4322/admin/admin.html';

async function run() {
  console.log('--- Starting Admin Interactive Navigation Full Audit ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(err.message));

  // 1. Abrir /admin
  console.log('1. Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 2. Dashboard visible
  const dashboardVisible = await page.isVisible('#view-dashboard');
  console.log('2. Dashboard visible:', dashboardVisible);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_desktop_dashboard_expanded.png') });

  // 3-7. Groups collapse & expand testing
  const groups = ['hoy', 'operacion', 'comercio', 'clientes', 'contenido', 'configuracion'];
  const groupResults = {};

  for (const g of groups) {
    const groupHeader = page.locator(`.nav-group[data-nav-group="${g}"] [data-group-toggle]`);
    const groupItems = page.locator(`.nav-group[data-nav-group="${g}"] .nav-group-items`);
    
    // Check initial state
    const initialHidden = await groupItems.getAttribute('hidden') !== null;
    
    // Click to toggle
    await groupHeader.click();
    await page.waitForTimeout(200);
    const afterFirstClickHidden = await groupItems.getAttribute('hidden') !== null;
    
    // Click again to toggle back
    await groupHeader.click();
    await page.waitForTimeout(200);
    const afterSecondClickHidden = await groupItems.getAttribute('hidden') !== null;

    groupResults[g] = {
      initialHidden,
      toggled: afterFirstClickHidden !== initialHidden,
      restored: afterSecondClickHidden === initialHidden
    };
    console.log(`Group ${g}:`, groupResults[g]);
  }

  // Ensure all are expanded for testing
  for (const g of groups) {
    const groupItems = page.locator(`.nav-group[data-nav-group="${g}"] .nav-group-items`);
    const isHidden = await groupItems.getAttribute('hidden') !== null;
    if (isHidden) {
      await page.locator(`.nav-group[data-nav-group="${g}"] [data-group-toggle]`).click();
      await page.waitForTimeout(150);
    }
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_groups_expanded.png') });

  // 8. Contraer sidebar completa
  console.log('8. Toggling sidebar collapse...');
  const sbToggle = page.locator('#adminSbToggle');
  await sbToggle.click();
  await page.waitForTimeout(300);
  const isCollapsed = await page.evaluate(() => document.getElementById('admin-shell')?.classList.contains('sb-collapsed'));
  console.log('Sidebar is collapsed:', isCollapsed);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_desktop_sidebar_collapsed.png') });

  // 9-10. Tooltips on collapsed mode
  const agendaLink = page.locator('.nav-link[data-view="agenda"]');
  await agendaLink.hover();
  await page.waitForTimeout(200);
  const tooltipAttr = await agendaLink.getAttribute('data-tooltip');
  console.log('10. Agenda tooltip attr:', tooltipAttr);

  // 11-12. Navegar en modo colapsado y confirmar activo correcto
  const routesToTest = [
    { view: 'agenda', id: '#view-agenda' },
    { view: 'repairs', id: '#view-repairs' },
    { view: 'commerce-payments', id: '#view-commerce-payments' },
    { view: 'commerce-store', id: '#view-commerce-store' },
    { view: 'users', id: '#view-users' },
    { view: 'preferences', id: '#view-preferences' }
  ];

  for (const r of routesToTest) {
    const link = page.locator(`.nav-link[data-view="${r.view}"]`).first();
    await link.click();
    await page.waitForTimeout(250);
    const viewVisible = await page.isVisible(r.id);
    const isLinkActive = await link.evaluate(el => el.classList.contains('active'));
    console.log(`Navigated to ${r.view}: visible=${viewVisible}, active=${isLinkActive}`);
  }

  // 13. Expandir sidebar
  console.log('13. Expanding sidebar back...');
  await sbToggle.click();
  await page.waitForTimeout(300);
  const isExpanded = await page.evaluate(() => !document.getElementById('admin-shell')?.classList.contains('sb-collapsed'));
  console.log('Sidebar is expanded:', isExpanded);

  // 14-15. Test Persistence on reload
  // Collapse it again, reload, check if it stays collapsed
  await sbToggle.click();
  await page.waitForTimeout(200);
  console.log('14. Reloading while collapsed...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const isStillCollapsed = await page.evaluate(() => document.getElementById('admin-shell')?.classList.contains('sb-collapsed'));
  console.log('15. Persistent collapsed state after reload:', isStillCollapsed);

  // Re-expand
  await page.locator('#adminSbToggle').click();
  await page.waitForTimeout(300);

  // 16. Browser Back / Forward
  console.log('16. Testing browser Back / Forward history...');
  await page.locator('.nav-link[data-view="agenda"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('.nav-link[data-view="repairs"]').first().click();
  await page.waitForTimeout(300);
  console.log('Current view is repairs. Going back in history...');
  await page.goBack();
  await page.waitForTimeout(300);
  const backViewAgenda = await page.isVisible('#view-agenda');
  console.log('After Back, Agenda is visible:', backViewAgenda);
  await page.goBack();
  await page.waitForTimeout(300);
  const backViewDashboard = await page.isVisible('#view-preferences') || await page.isVisible('#view-dashboard');
  console.log('After second Back, previous view is visible:', backViewDashboard);

  // 17. Search Admin trigger
  console.log('17. Testing search dialog trigger...');
  const searchTrigger = page.locator('#adminGlobalSearchTrigger');
  await searchTrigger.click();
  await page.waitForTimeout(300);
  const searchDialogVisible = await page.isVisible('#adminGlobalSearchDialog');
  console.log('Search dialog opened:', searchDialogVisible);
  if (searchDialogVisible) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // 18. Notifications dropdown
  console.log('18. Testing notifications bell...');
  const bell = page.locator('#notificationsBellBtn');
  await bell.click();
  await page.waitForTimeout(300);
  const notifOpen = await page.evaluate(() => document.getElementById('notificationsDropdown')?.classList.contains('show'));
  console.log('Notifications dropdown opened:', notifOpen);
  await bell.click();
  await page.waitForTimeout(200);

  // 19. Profile user block click
  console.log('19. Testing profile user block click...');
  await page.locator('#admin-user-block').click();
  await page.waitForTimeout(300);
  const prefVisible = await page.isVisible('#view-preferences');
  console.log('Profile click opened preferences:', prefVisible);

  // 21. Ver sitio público link
  const publicLink = page.locator('a[title="Ver sitio público"]');
  const publicHref = await publicLink.getAttribute('href');
  const publicTarget = await publicLink.getAttribute('target');
  console.log('21. Public site link:', { href: publicHref, target: publicTarget });

  // 22-28. MOBILE 390x844
  console.log('22. Testing Mobile viewport 390x844...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_mobile_view.png') });

  // 23. Abrir sidebar en mobile
  const mobileToggle = page.locator('#adminMobileToggle');
  await mobileToggle.click();
  await page.waitForTimeout(300);
  const mobileDrawerOpen = await page.evaluate(() => document.getElementById('admin-shell')?.classList.contains('sb-open'));
  console.log('23. Mobile drawer opened:', mobileDrawerOpen);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_mobile_drawer_open.png') });

  // 24-26. Expandir Operación y click Taller -> drawer closes
  const operacionHeader = page.locator('.nav-group[data-nav-group="operacion"] [data-group-toggle]');
  const operacionItems = page.locator('.nav-group[data-nav-group="operacion"] .nav-group-items');
  if (await operacionItems.getAttribute('hidden') !== null) {
    await operacionHeader.click();
    await page.waitForTimeout(200);
  }
  const tallerLink = page.locator('.nav-link[data-view="repairs"]').first();
  await tallerLink.click();
  await page.waitForTimeout(300);
  const mobileDrawerClosedAfterNav = await page.evaluate(() => !document.getElementById('admin-shell')?.classList.contains('sb-open'));
  console.log('26. Mobile drawer closed automatically after navigation:', mobileDrawerClosedAfterNav);
  const tallerVisible = await page.isVisible('#view-repairs');
  console.log('Taller view is active on mobile:', tallerVisible);

  // 27. Test close button and ESC
  await mobileToggle.click();
  await page.waitForTimeout(300);
  await page.locator('#adminSidebarMobileClose').click();
  await page.waitForTimeout(200);
  const closedByX = await page.evaluate(() => !document.getElementById('admin-shell')?.classList.contains('sb-open'));
  console.log('27. Closed via mobile X button:', closedByX);

  await mobileToggle.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const closedByEsc = await page.evaluate(() => !document.getElementById('admin-shell')?.classList.contains('sb-open'));
  console.log('Closed via ESC:', closedByEsc);

  // Test tablet 768x1024
  console.log('Testing Tablet 768x1024...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_tablet_view.png') });

  // Test Desktop 1440x900
  console.log('Testing Desktop 1440x900...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  // 28. Walkthrough of ALL 19 views and functional checks
  const allViews = [
    { view: 'dashboard', id: '#view-dashboard', name: 'Dashboard' },
    { view: 'agenda', id: '#view-agenda', name: 'Agenda' },
    { view: 'repairs', id: '#view-repairs', name: 'Taller' },
    { view: 'commerce-orders', id: '#view-commerce-orders', name: 'Pedidos' },
    { view: 'commerce-payments', id: '#view-commerce-payments', name: 'Pagos' },
    { view: 'commerce-inventory', id: '#view-commerce-inventory', name: 'Inventario' },
    { view: 'builds', id: '#view-builds', name: 'Ensambles' },
    { view: 'commerce', id: '#view-commerce', name: 'Resumen comercial' },
    { view: 'commerce-store', id: '#view-commerce-store', name: 'Catálogo' },
    { view: 'commerce-dashboard', id: '#view-commerce-dashboard', name: 'Ventas' },
    { view: 'commerce-promotions', id: '#view-commerce-promotions', name: 'Promociones' },
    { view: 'commerce-settings', id: '#view-commerce-settings', name: 'Métodos de pago' },
    { view: 'comments', id: '#view-comments', name: 'Comentarios' },
    { view: 'users', id: '#view-users', name: 'Usuarios' },
    { view: 'faqs', id: '#view-faqs', name: 'Preguntas Frecuentes' },
    { view: 'preferences', id: '#view-preferences', name: 'Preferencias' }
  ];

  console.log('\n--- Auditing all individual views ---');
  const viewAuditResults = [];
  for (const v of allViews) {
    const link = page.locator(`.nav-link[data-view="${v.view}"]`).first();
    await link.click();
    await page.waitForTimeout(200);
    const visible = await page.isVisible(v.id);
    const titleText = await page.locator('#admin-page-title').textContent();
    viewAuditResults.push({ view: v.view, name: v.name, visible, title: titleText });
    console.log(`[VIEW AUDIT] ${v.name} (${v.view}): visible=${visible}, title="${titleText}"`);
  }

  console.log('\nConsole logs count:', consoleLogs.length);
  const severeErrors = consoleLogs.filter(l => l.type === 'error');
  console.log('Console errors:', severeErrors);
  console.log('Page errors:', pageErrors);

  await browser.close();
  console.log('--- Finished Admin Interactive Navigation Audit ---');
}

run().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
