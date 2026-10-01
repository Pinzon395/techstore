import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('tmp/mac-diag-qa');
await fs.mkdir(outDir, { recursive: true });

const origin = 'http://127.0.0.1:3001';
const browser = await chromium.launch({ headless: true });

async function runMacDiagnosisQA() {
  console.log('====================================================');
  console.log('  PIXON PC — DIAGNÓSTICO MAC SEO & RESPONSIVE QA    ');
  console.log('====================================================\n');

  const viewports = [
    { name: '360x800', width: 360, height: 800, isMobile: true },
    { name: '390x844', width: 390, height: 844, isMobile: true },
    { name: '430x932', width: 430, height: 932, isMobile: true },
    { name: '768x1024', width: 768, height: 1024, isMobile: true },
    { name: '820x1180', width: 820, height: 1180, isMobile: true },
    { name: '1366x768', width: 1366, height: 768, isMobile: false },
    { name: '1440x900', width: 1440, height: 900, isMobile: false },
    { name: '1920x1080', width: 1920, height: 1080, isMobile: false }
  ];

  let allPass = true;

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(() => {
      try {
        localStorage.setItem('pixon_cookie_consent', 'all');
      } catch (e) {}
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    const response = await page.goto(`${origin}/servicios/mac/diagnostico-mac`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const data = await page.evaluate((isMobile) => {
      const h1s = [...document.querySelectorAll('h1')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h2s = [...document.querySelectorAll('h2')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h3s = [...document.querySelectorAll('h3')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
      const overflow = document.documentElement.scrollWidth > window.innerWidth;

      // Check mobile photo obstruction
      const mobilePhoto = document.querySelector('.md-hero__visual--mobile img');
      let mobilePhotoVisible = false;
      let mobilePhotoObstructed = false;
      if (mobilePhoto) {
        const rect = mobilePhoto.getBoundingClientRect();
        mobilePhotoVisible = rect.width > 0 && rect.height > 0;
        // Check center point element
        const elemAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        mobilePhotoObstructed = elemAtPoint && elemAtPoint !== mobilePhoto && !mobilePhoto.contains(elemAtPoint);
      }

      // Check text color outside hero
      const mainP = document.querySelector('.md-section p');
      const pColor = mainP ? window.getComputedStyle(mainP).color : '';

      return {
        statusCode: 200,
        title,
        metaDesc,
        canonical,
        h1s,
        h2sCount: h2s.length,
        h3sCount: h3s.length,
        overflow,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        mobilePhotoVisible,
        mobilePhotoObstructed,
        pColor
      };
    }, vp.isMobile);

    const shotPath = path.join(outDir, `mac-diag-${vp.name}-full.png`);
    await page.screenshot({ path: shotPath, fullPage: true });

    const heroShotPath = path.join(outDir, `mac-diag-${vp.name}-hero.png`);
    const heroElem = await page.$('.md-hero');
    if (heroElem) {
      await heroElem.screenshot({ path: heroShotPath });
    }

    console.log(`[Viewport ${vp.name}]`);
    console.log(`  H1: "${data.h1s[0]}" (Count: ${data.h1s.length})`);
    console.log(`  Title: "${data.title}"`);
    console.log(`  Overflow: ${data.overflow ? 'FAIL' : 'PASS'} (scrollWidth: ${data.scrollWidth}, innerWidth: ${data.innerWidth})`);
    if (vp.isMobile) {
      console.log(`  Mobile photo visible: ${data.mobilePhotoVisible}, Obstructed: ${data.mobilePhotoObstructed}`);
    }
    console.log(`  Outside text color: ${data.pColor}`);
    console.log(`  Console errors: ${consoleErrors.length}`);
    console.log(`  Screenshot: ${shotPath}\n`);

    if (data.h1s.length !== 1 || data.overflow || consoleErrors.length > 0 || (vp.isMobile && data.mobilePhotoObstructed)) {
      allPass = false;
    }

    await context.close();
  }

  // Also test DARK THEME on 390x844 and 1366x768
  console.log('--- Testing Dark Theme ---');
  for (const darkVp of [{ name: '390x844', width: 390, height: 844 }, { name: '1366x768', width: 1366, height: 768 }]) {
    const context = await browser.newContext({ viewport: { width: darkVp.width, height: darkVp.height } });
    const page = await context.newPage();
    await page.goto(`${origin}/servicios/mac/diagnostico-mac`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.classList.add('theme-dark');
      document.body.classList.add('theme-dark');
    });
    await page.waitForTimeout(300);
    const darkShotPath = path.join(outDir, `mac-diag-${darkVp.name}-dark-full.png`);
    await page.screenshot({ path: darkShotPath, fullPage: true });
    console.log(`Dark theme screenshot captured: ${darkShotPath}`);
    await context.close();
  }

  await browser.close();

  console.log('====================================================');
  console.log(`  OVERALL QA RESULT: ${allPass ? 'ALL PASS (YES)' : 'FAIL (NO)'}`);
  console.log('====================================================');
}

runMacDiagnosisQA().catch(console.error);
