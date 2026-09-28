import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('tmp/animation-reuse-qa');
await fs.mkdir(outDir, { recursive: true });

const origin = 'http://127.0.0.1:4321';
const viewports = [
  { name: '360x800', width: 360, height: 800, isMobile: true },
  { name: '390x844', width: 390, height: 844, isMobile: true },
  { name: '430x932', width: 430, height: 932, isMobile: true },
  { name: '768x1024', width: 768, height: 1024, isMobile: true },
  { name: '820x1180', width: 820, height: 1180, isMobile: true },
  { name: '1024x768', width: 1024, height: 768, isMobile: false },
  { name: '1366x768', width: 1366, height: 768, isMobile: false },
  { name: '1440x900', width: 1440, height: 900, isMobile: false }
];

const browser = await chromium.launch({ headless: true });

async function runTests() {
  console.log('====================================================');
  console.log('  PIXON PC — ANIMATION REUSE QA SUITE               ');
  console.log('====================================================\n');

  let allPass = true;

  // 1. Test Domicilio page (Source regression test)
  console.log('--- Testing Source: /mantenimiento-pc-laptop-domicilio-cancun ---');
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto(`${origin}/mantenimiento-pc-laptop-domicilio-cancun`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const check = await page.evaluate(() => {
      const h1 = document.querySelectorAll('h1');
      const hasHouse = !!document.querySelector('.hv-destination-home');
      const hasTech = !!document.querySelector('.hv-technician-actor');
      const hasHub = !!document.querySelector('.hv-origin-hub');
      const hasWorkstation = !!document.querySelector('.hv-workstation');
      const hasFans = !!document.querySelector('.hv-fan-blades');
      const hasDust = !!document.querySelector('.hv-dust-particles');
      const overflow = document.documentElement.scrollWidth > window.innerWidth;
      return {
        h1Count: h1.length,
        hasHouse,
        hasTech,
        hasHub,
        hasWorkstation,
        hasFans,
        hasDust,
        overflow
      };
    });

    const pass = check.h1Count === 1 && check.hasHouse && check.hasTech && check.hasHub && check.hasWorkstation && check.hasFans && !check.overflow;
    if (!pass) allPass = false;
    console.log(`[${vp.name}] Domicilio -> ${pass ? 'PASS' : 'FAIL'} (House: ${check.hasHouse}, Tech: ${check.hasTech}, Workstation: ${check.hasWorkstation}, Overflow: ${check.overflow})`);

    if (vp.name === '390x844' || vp.name === '1366x768') {
      await page.screenshot({ path: path.join(outDir, `domicilio-${vp.name}.png`), fullPage: false });
    }
    await context.close();
  }

  // 2. Test Preventive page (Target reuse test)
  console.log('\n--- Testing Target: /mantenimiento-preventivo-computadora ---');
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto(`${origin}/mantenimiento-preventivo-computadora`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const check = await page.evaluate((isMobile) => {
      const h1 = document.querySelector('#mpc-title');
      const h1Count = document.querySelectorAll('h1').length;
      const media = document.querySelector('.mpc-hero__media-wrap');
      const summary = document.querySelector('.mpc-hero__summary');
      const hasHouse = !!document.querySelector('.hv-destination-home');
      const hasTech = !!document.querySelector('.hv-technician-actor');
      const hasHub = !!document.querySelector('.hv-origin-hub');
      const hasWorkstation = !!document.querySelector('.hv-workstation');
      const hasFans = !!document.querySelector('.hv-fan-blades');
      const hasDust = !!document.querySelector('.hv-dust-particles');
      const hasAirflow = !!document.querySelector('.hv-airflow-streams');
      const hasSheen = !!document.querySelector('.hv-sheen-sweep');
      const hasBadge = !!document.querySelector('.hv-success-badge');
      const overflow = document.documentElement.scrollWidth > window.innerWidth;

      const h1Box = h1?.getBoundingClientRect();
      const mediaBox = media?.getBoundingClientRect();
      const summaryBox = summary?.getBoundingClientRect();

      let orderCorrect = false;
      let gapH1ToMedia = 0;
      let gapMediaToSummary = 0;

      if (h1Box && mediaBox && summaryBox) {
        if (isMobile) {
          // Strict vertical stack
          orderCorrect = (mediaBox.top >= h1Box.bottom - 4) && (summaryBox.top >= mediaBox.bottom - 4);
          gapH1ToMedia = mediaBox.top - h1Box.bottom;
          gapMediaToSummary = summaryBox.top - mediaBox.bottom;
        } else {
          // Desktop 2-column side by side
          orderCorrect = mediaBox.left >= h1Box.right - 50;
        }
      }

      return {
        h1Count,
        hasHouse, // Should be false!
        hasTech,  // Should be false!
        hasHub,   // Should be false!
        hasWorkstation, // Should be true!
        hasFans,        // Should be true!
        hasDust,        // Should be true!
        hasAirflow,     // Should be true!
        hasSheen,       // Should be true!
        hasBadge,       // Should be true!
        overflow,
        orderCorrect,
        gapH1ToMedia,
        gapMediaToSummary,
        h1Box,
        mediaBox
      };
    }, vp.isMobile);

    const houseExcluded = !check.hasHouse && !check.hasTech && !check.hasHub;
    const elementsIncluded = check.hasWorkstation && check.hasFans && check.hasDust && check.hasAirflow && check.hasSheen && check.hasBadge;
    const pass = check.h1Count === 1 && houseExcluded && elementsIncluded && check.orderCorrect && !check.overflow;
    if (!pass) allPass = false;

    console.log(`[${vp.name}] Preventive -> ${pass ? 'PASS' : 'FAIL'} (HouseExcluded: ${houseExcluded}, ComputerIncluded: ${elementsIncluded}, Order: ${check.orderCorrect}, Gap H1->Media: ${check.gapH1ToMedia.toFixed(1)}px, Overflow: ${check.overflow})`);

    if (vp.name === '390x844' || vp.name === '430x932' || vp.name === '768x1024' || vp.name === '1366x768' || vp.name === '1440x900') {
      await page.screenshot({ path: path.join(outDir, `preventive-${vp.name}.png`), fullPage: false });
    }
    await context.close();
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`FINAL RESULT: ${allPass ? 'MAINTENANCE_ANIMATION_REUSE_READY: YES' : 'FAIL'}`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
