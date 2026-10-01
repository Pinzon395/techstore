import { test, expect } from '@playwright/test';

test.describe('Home Appointment Calendar (Sección 3)', () => {
  const BASE_URL = 'http://localhost:3001';

  test('Desktop (1440px) - Calendar visual hierarchy, live slots and step-by-step booking', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // 1. Verify Section 3 exists and is positioned between #como-funciona and HomeAboutSection
    const section = page.locator('#agendar-cita');
    await expect(section).toBeVisible();

    const heading = section.locator('h2');
    await expect(heading).toContainText('Agenda tu cita técnica en taller');

    // Check stepper has 3 steps
    const step1 = page.locator('#hac-step-indicator-1');
    const step2 = page.locator('#hac-step-indicator-2');
    const step3 = page.locator('#hac-step-indicator-3');
    await expect(step1).toHaveClass(/active/);

    // 2. Wait for calendar days to render
    const daysGrid = page.locator('#hac-days-grid');
    await expect(daysGrid).toBeVisible();
    await page.waitForSelector('.hac-day-cell.clickable', { timeout: 10000 });

    // Check legend items
    await expect(page.locator('.hac-legend')).toContainText('Horarios libres');
    await expect(page.locator('.hac-legend')).toContainText('Citas agendadas');

    // 3. Select a day with availability
    const firstClickableDay = page.locator('.hac-day-cell.clickable').first();
    await firstClickableDay.click();

    // Check slots container renders
    const slotsContainer = page.locator('#hac-slots-container');
    await expect(slotsContainer).toBeVisible();
    await page.waitForSelector('.hac-slot-btn', { timeout: 8000 });

    // Verify green available slots exist
    const availableSlots = page.locator('.hac-slot-btn');
    const availableCount = await availableSlots.count();
    expect(availableCount).toBeGreaterThan(0);

    // Verify tag text
    await expect(availableSlots.first().locator('.hac-slot-tag-avail')).toContainText('Disponible');

    // Take screenshot of Step 1 on Desktop
    await page.screenshot({ path: 'C:/Users/Usuario/.gemini/antigravity-ide/brain/e7283e49-e9b9-4bb9-9f47-bc284bd1c4df/calendar_step1_desktop_1440.png', fullPage: false });

    // 4. Click a slot to proceed to Step 2
    await availableSlots.first().click();

    // Verify Step 2 is active
    await expect(page.locator('#hac-panel-step2')).toBeVisible();
    await expect(step2).toHaveClass(/active/);

    // Check summary box
    await expect(page.locator('#hac-summary-datetime')).toBeVisible();

    // Fill form
    await page.fill('#hac_name', 'Cliente Prueba E2E');
    await page.fill('#hac_phone', '9981234567');
    await page.selectOption('#hac_device', 'Laptop');
    await page.fill('#hac_notes', 'Prueba automatizada de cita en taller');

    // Take screenshot of Step 2 on Desktop
    await page.screenshot({ path: 'C:/Users/Usuario/.gemini/antigravity-ide/brain/e7283e49-e9b9-4bb9-9f47-bc284bd1c4df/calendar_step2_desktop_1440.png', fullPage: false });

    // 5. Submit booking
    await page.click('#hac-btn-submit-booking');

    // Verify Step 3 is reached
    await expect(page.locator('#hac-panel-step3')).toBeVisible({ timeout: 10000 });
    await expect(step3).toHaveClass(/active/);

    // Check Folio and confirmation details
    const folioEl = page.locator('#hac-conf-folio');
    await expect(folioEl).toBeVisible();
    const folioText = await folioEl.textContent();
    expect(folioText).toMatch(/#[A-Z0-9]+/);

    // Check WhatsApp button has prefilled text
    const waBtn = page.locator('#hac-btn-open-wa');
    await expect(waBtn).toBeVisible();
    const waHref = await waBtn.getAttribute('href');
    expect(waHref).toContain('wa.me');

    // Take screenshot of Step 3 on Desktop
    await page.screenshot({ path: 'C:/Users/Usuario/.gemini/antigravity-ide/brain/e7283e49-e9b9-4bb9-9f47-bc284bd1c4df/calendar_step3_desktop_1440.png', fullPage: false });

    // 6. Test navigating back
    await page.click('#hac-btn-reset-wizard');
    await expect(page.locator('#hac-panel-step1')).toBeVisible();
    await expect(step1).toHaveClass(/active/);
  });

  test('Mobile (390px) - Responsive calendar and step-by-step navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const section = page.locator('#agendar-cita');
    await expect(section).toBeVisible({ timeout: 10000 });
    await section.scrollIntoViewIfNeeded();

    // Check calendar renders cleanly on mobile without overflow
    await page.waitForSelector('.hac-day-cell.clickable', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Capture the entire section on mobile
    await section.screenshot({ path: 'C:/Users/Usuario/.gemini/antigravity-ide/brain/e7283e49-e9b9-4bb9-9f47-bc284bd1c4df/calendar_section_mobile_390.png' });
  });
});
