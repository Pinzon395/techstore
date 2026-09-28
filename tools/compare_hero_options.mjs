import playwright from 'playwright';

async function run() {
  const browser = await playwright.chromium.launch();
  
  // Viewports to test: 500x717 (user's active IDE viewport) and 390x844 (standard mobile iPhone)
  const viewports = [
    { name: '500x717', width: 500, height: 717 },
    { name: '390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:3000/');

    // Option 1: Baseline
    await page.screenshot({ path: `tools/comp_${vp.name}_baseline.png` });

    // Option 2: Programmatic scroll 40% of viewport
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.4));
    await page.screenshot({ path: `tools/comp_${vp.name}_scroll40.png` });

    // Option 3: CSS elevation (shifting hero content ~40% higher)
    await page.goto('http://localhost:3000/');
    await page.addStyleTag({
      content: `
        @media (max-width: 768px) {
          .hero {
            min-height: auto !important;
            padding-top: 10px !important;
            padding-bottom: 24px !important;
            align-items: flex-start !important;
          }
          .hero-content {
            padding: 10px 16px 20px !important;
            transform: translateY(0) !important;
          }
          .hero-content h1 {
            font-size: 1.85rem !important;
            margin-bottom: 12px !important;
            line-height: 1.25 !important;
          }
          .hero-content p {
            font-size: 0.92rem !important;
            margin-bottom: 16px !important;
            line-height: 1.45 !important;
          }
          .hero-features {
            margin: 14px 0 20px !important;
            --row-spacing: 12px !important;
            --item-spacing: 14px !important;
            --icon-size: 26px !important;
            --text-size: 0.75rem !important;
          }
        }
      `
    });
    await page.screenshot({ path: `tools/comp_${vp.name}_css_framed.png` });

    await page.close();
  }

  await browser.close();
  console.log('Comparisons created successfully');
}

run().catch(console.error);
