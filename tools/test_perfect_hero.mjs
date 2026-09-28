import playwright from 'playwright';

async function test() {
  const browser = await playwright.chromium.launch();

  for (const vp of [{ w: 500, h: 717, name: '500x717' }, { w: 390, h: 844, name: '390x844' }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto('http://localhost:3000/');

    await page.addStyleTag({
      content: `
        @media (max-width: 768px) {
          .hero {
            height: auto !important;
            min-height: calc(100svh - 120px) !important;
            padding: 18px 0 28px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
          }
          .hero-content {
            padding: 10px 16px !important;
            max-width: 100% !important;
          }
          .hero-content h1 {
            font-size: 1.85rem !important;
            line-height: 1.25 !important;
            margin-bottom: 12px !important;
          }
          .hero-content p {
            font-size: 0.92rem !important;
            line-height: 1.45 !important;
            margin-bottom: 16px !important;
          }
          .hero-features {
            margin: 12px 0 20px !important;
            --row-spacing: 12px !important;
            --item-spacing: 14px !important;
            --icon-size: 26px !important;
            --text-size: 0.75rem !important;
          }
        }
      `
    });

    await page.screenshot({ path: `tools/perfect_hero_${vp.name}.png` });
    await page.close();
  }

  await browser.close();
  console.log('Done testing perfect hero');
}

test().catch(console.error);
