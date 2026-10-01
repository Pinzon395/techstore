import { test, expect } from '@playwright/test';

test('Google reviews render all ratings and escape external text', async ({ page }) => {
  await page.route('**/api/reviews/google*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      rating: 3.5,
      total: 2,
      reviews: [
        { author_name: '<img src=x onerror=alert(1)>', rating: 1, text: '<script id="unsafe-review">alert(1)</script>', date: 'hoy' },
        { author_name: 'Cliente real', rating: 5, text: 'Buen servicio', date: 'ayer' },
      ],
    }),
  }));

  await page.route('**/scripts/home.js*', (route) => route.abort());

  await page.goto('http://127.0.0.1:4321', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const section = document.createElement('section');
    section.id = 'google-reviews';
    section.setAttribute('data-google-reviews', '');
    section.innerHTML = '<h2 data-google-review-summary>Opiniones</h2><div data-review-list></div>';
    document.body.prepend(section);
  });
  await page.unroute('**/scripts/home.js*');
  await page.addScriptTag({ url: 'http://127.0.0.1:4321/scripts/home.js' });
  await page.locator('#google-reviews').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-review-list] .google-review-card')).toHaveCount(2);
  await expect(page.locator('[data-review-list]')).toContainText('<script id="unsafe-review">alert(1)</script>');
  await expect(page.locator('#unsafe-review')).toHaveCount(0);
  await expect(page.locator('[data-google-review-summary]')).toContainText('3.5 estrellas');
});
