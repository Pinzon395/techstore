import playwright from 'playwright';

async function run() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:3000/');

  const css = `
    @media (max-width: 768px) {
      .hero {
        padding-top: 75px !important;
        padding-bottom: 24px !important;
        min-height: auto !important;
        align-items: flex-start !important;
      }
      .hero-content {
        padding: 12px 18px !important;
      }
      .hero-content h1 {
        font-size: 1.8rem !important;
        margin-bottom: 14px !important;
        line-height: 1.25 !important;
      }
      .hero-content p {
        font-size: 0.95rem !important;
        margin-bottom: 16px !important;
        line-height: 1.45 !important;
      }
      .hero-features {
        margin-top: 14px !important;
        margin-bottom: 20px !important;
        --row-spacing: 12px !important;
        --item-spacing: 14px !important;
        --icon-size: 26px !important;
        --text-size: 0.75rem !important;
      }
    }
  `;

  await page.addStyleTag({ content: css });
  await page.screenshot({ path: 'tools/hero_iphone_adjusted.png' });

  await page.setViewportSize({ width: 500, height: 717 });
  await page.screenshot({ path: 'tools/hero_500x717_adjusted.png' });

  // Let's also check if user literally wants programmatic scroll, what that would look like
  const page2 = await browser.newPage({ viewport: { width: 500, height: 717 } });
  await page2.goto('http://localhost:3000/');
  // Scroll 40% of hero or 40% of screen
  await page2.evaluate(() => window.scrollTo(0, 200));
  await page2.screenshot({ path: 'tools/hero_scroll_200.png' });

  await browser.close();
  console.log('Screenshots generated successfully');
}

run().catch(console.error);
