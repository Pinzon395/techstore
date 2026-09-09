import { test, expect } from '@playwright/test';

const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
const viewports = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920];

for (const width of viewports) {
  test(`English service has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseUrl}/en/graphics-card-repair`, { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await expect(page.locator('h1')).toContainText('Graphics Card Repair');
  });
}
