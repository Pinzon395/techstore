import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://127.0.0.1:4321';

for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) {
  test(`Mobile navigation stays usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(base, { waitUntil: 'networkidle' });
    const toggle = page.locator('#mobile-menu');
    const menu = page.locator('#nav-menu');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#dd-servicios-trigger').click();
    const category = page.locator('#dd-servicios-menu .cascade-cat-link').first();
    await category.click();
    await expect(category).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => menu.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    const rect = await menu.boundingBox();
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await menu.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    // Scrolling past either boundary must not dismiss the drawer.
    await menu.evaluate(el => { el.scrollTop = 0; });
    await menu.hover({ position: { x: 10, y: 10 } });
    await page.mouse.wheel(0, -160);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, -160);
    await page.waitForTimeout(200);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await menu.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, 160);
    await page.waitForTimeout(200);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('body')).toHaveClass(/navbar-menu-open/);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await toggle.click();
    await page.locator('#dd-servicios-trigger').click();
    await category.click();
    const destination = page.locator('#dd-servicios-menu .cascade-item').first().locator('.v3-sub-link[href]').first();
    const href = await destination.getAttribute('href');
    await destination.click();
    await expect(page).toHaveURL(new RegExp(new URL(href, base).pathname + '(?:[/?#]|$)'));
    await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-expanded', 'false');
  });
}

test('Drawer resets when switching to desktop and desktop menus still open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#mobile-menu').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await page.locator('#dd-servicios-trigger').hover();
  await expect(page.locator('#dd-servicios-menu')).toBeVisible();
  await expect(page.locator('#navbar')).toBeVisible();
});

test('Phone services support the third menu level and collapse cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#mobile-menu').click();
  await page.locator('#dd-servicios-trigger').click();
  await page.locator('#dd-servicios-menu .cascade-cat-link').filter({ hasText: 'Celular' }).first().click();
  const trigger = page.locator('#dd-servicios-menu .cascade-item.open .v3-sub-trigger').first();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const link = page.locator('#dd-servicios-menu .v3-sub-item.open .v3-l3-link').first();
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(link).toBeHidden();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});
