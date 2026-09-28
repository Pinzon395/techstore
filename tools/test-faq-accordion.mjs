import { chromium } from '@playwright/test';

async function testFaq() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto('http://127.0.0.1:4322/mantenimiento-pc-laptop-domicilio-cancun.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const firstQuestion = page.locator('.faq-section .faq-question').first();
  console.log('Initial aria-expanded:', await firstQuestion.getAttribute('aria-expanded'));

  // Click to open
  await firstQuestion.click();
  await page.waitForTimeout(400);

  const afterClick = await page.evaluate(() => {
    const item = document.querySelector('.faq-section .faq-item');
    const answer = item?.querySelector('.faq-answer');
    return {
      isOpenClass: item?.classList.contains('faq-item--open'),
      ariaExpanded: item?.querySelector('.faq-question')?.getAttribute('aria-expanded'),
      maxHeight: answer?.style.maxHeight,
      offsetHeight: answer?.offsetHeight,
      ariaHidden: answer?.getAttribute('aria-hidden')
    };
  });
  console.log('After first click (should be open):', afterClick);

  // Click to close
  await firstQuestion.click();
  await page.waitForTimeout(400);
  const afterSecondClick = await page.evaluate(() => {
    const item = document.querySelector('.faq-section .faq-item');
    const answer = item?.querySelector('.faq-answer');
    return {
      isOpenClass: item?.classList.contains('faq-item--open'),
      ariaExpanded: item?.querySelector('.faq-question')?.getAttribute('aria-expanded'),
      maxHeight: answer?.style.maxHeight,
      offsetHeight: answer?.offsetHeight,
      ariaHidden: answer?.getAttribute('aria-hidden')
    };
  });
  console.log('After second click (should be closed):', afterSecondClick);

  await browser.close();
}

testFaq().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
