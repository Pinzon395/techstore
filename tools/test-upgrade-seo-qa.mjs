import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('tmp/upgrade-seo-qa');
await fs.mkdir(outDir, { recursive: true });

const origin = 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

async function runPcUpgradeSeoQA() {
  console.log('====================================================');
  console.log('  PIXON PC — PC UPGRADE SEO & RESPONSIVE QA SUITE   ');
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
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    const response = await page.goto(`${origin}/servicios/pc/upgrade`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const data = await page.evaluate((isMobile) => {
      const h1s = [...document.querySelectorAll('h1')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h2s = [...document.querySelectorAll('h2')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h3s = [...document.querySelectorAll('h3')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
      const overflow = document.documentElement.scrollWidth > window.innerWidth;
      
      const bottleneckCards = document.querySelectorAll('.pcup-bottleneck-card');
      const componentCards = document.querySelectorAll('.pcup-component-card');
      const triageCards = document.querySelectorAll('.pcup-triage-card');
      const processSteps = document.querySelectorAll('.pcup-step-card');
      const relatedLinks = [...document.querySelectorAll('.pcup-related-card')].map(a => a.getAttribute('href'));
      const faqCards = document.querySelectorAll('.faq-item');
      
      const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => {
        try { return JSON.parse(e.textContent); } catch (err) { return null; }
      }).filter(Boolean);

      // Check if schema contains any Offer with price
      const hasOfferPrice = schemas.some(s => {
        if (s['@type'] === 'Offer' && s.price) return true;
        if (s.offers && s.offers.price) return true;
        return false;
      });

      // Price checks in entire text/html
      const bodyHtml = document.body.innerHTML;
      const has800Price = bodyHtml.includes('$800') || bodyHtml.includes('800 MXN');
      const has300Price = bodyHtml.includes('$300') || bodyHtml.includes('300 MXN');
      const hasPlusPieza = bodyHtml.includes('+$ pieza');

      // Unsafe claim checks
      const hasZeroRisk = bodyHtml.toLowerCase().includes('cero riesgo');
      const hasExactSame = bodyHtml.toLowerCase().includes('exactamente igual');
      const hasEliminaSwap = bodyHtml.toLowerCase().includes('elimina el swap');
      const has15Seconds = bodyHtml.includes('15 segundos') || bodyHtml.includes('15s');

      // Dead button / link checks
      const deadButtons = [...document.querySelectorAll('a[href="#"], button:not([type]):not([id])')].length;

      // Hero order check
      const h1El = document.querySelector('#pcup-hero-title');
      const mediaEl = document.querySelector('.pcup-hero__visual-wrap');
      const summaryEl = document.querySelector('.pcup-hero__summary');

      const h1Box = h1El?.getBoundingClientRect();
      const mediaBox = mediaEl?.getBoundingClientRect();
      const summaryBox = summaryEl?.getBoundingClientRect();

      let heroOrderOk = false;
      if (h1Box && mediaBox && summaryBox) {
        if (isMobile) {
          // In mobile: H1 -> Media -> Summary
          heroOrderOk = (mediaBox.top >= h1Box.bottom - 4) && (summaryBox.top >= mediaBox.bottom - 4);
        } else {
          // In desktop: Media is in column to the right
          heroOrderOk = mediaBox.left >= h1Box.right - 80;
        }
      }

      // Check non-hero heading color
      const sampleH2 = document.querySelector('.pcup-bottleneck h2');
      const sampleH2Color = sampleH2 ? window.getComputedStyle(sampleH2).color : '';

      return {
        h1Count: h1s.length,
        h1Text: h1s[0] || '',
        h2Count: h2s.length,
        h2s,
        title,
        metaDesc,
        canonical,
        overflow,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        bottleneckCount: bottleneckCards.length,
        componentCount: componentCards.length,
        triageCount: triageCards.length,
        processCount: processSteps.length,
        relatedCount: relatedLinks.length,
        faqCount: faqCards.length,
        hasOfferPrice,
        has800Price,
        has300Price,
        hasPlusPieza,
        hasZeroRisk,
        hasExactSame,
        hasEliminaSwap,
        has15Seconds,
        deadButtons,
        heroOrderOk,
        sampleH2Color,
        h1Box: h1Box ? { top: h1Box.top, bottom: h1Box.bottom, left: h1Box.left, right: h1Box.right } : null,
        mediaBox: mediaBox ? { top: mediaBox.top, bottom: mediaBox.bottom, left: mediaBox.left, right: mediaBox.right } : null,
        summaryBox: summaryBox ? { top: summaryBox.top, bottom: summaryBox.bottom } : null
      };
    }, vp.isMobile);

    const checksPass = (
      response.status() === 200 &&
      data.h1Count === 1 &&
      data.h1Text.includes('Upgrade de PC en Cancún') &&
      data.title.includes('Upgrade de PC en Cancún') &&
      data.metaDesc.length > 50 &&
      data.canonical === 'https://pixon.com.mx/servicios/pc/upgrade' &&
      !data.overflow &&
      data.bottleneckCount === 5 &&
      data.componentCount === 8 &&
      data.triageCount === 6 &&
      data.processCount === 5 &&
      data.relatedCount >= 8 &&
      data.faqCount >= 18 &&
      !data.hasOfferPrice &&
      !data.has800Price &&
      !data.has300Price &&
      !data.hasPlusPieza &&
      !data.hasZeroRisk &&
      !data.hasExactSame &&
      !data.hasEliminaSwap &&
      !data.has15Seconds &&
      data.heroOrderOk &&
      consoleErrors.length === 0
    );

    if (!checksPass) allPass = false;

    console.log(`[Viewport ${vp.name}] ${checksPass ? 'PASS' : 'FAIL'}`);
    console.log(`  - Status: ${response.status()}`);
    console.log(`  - H1 count: ${data.h1Count} ("${data.h1Text}")`);
    console.log(`  - Title: ${data.title}`);
    console.log(`  - Canonical: ${data.canonical}`);
    console.log(`  - Overflow: ${data.overflow} (scrollWidth: ${data.scrollWidth}, innerWidth: ${data.innerWidth})`);
    console.log(`  - Hero Order (H1 -> Visual -> Summary): ${data.heroOrderOk}`);
    console.log(`  - Zero Prices: has800=${data.has800Price}, has300=${data.has300Price}, hasOffer=${data.hasOfferPrice}`);
    console.log(`  - Safe Claims: zeroRisk=${data.hasZeroRisk}, exactSame=${data.hasExactSame}, 15s=${data.has15Seconds}`);
    console.log(`  - Bottleneck Cards: ${data.bottleneckCount}/5, Component Cards: ${data.componentCount}/8, Triage Cards: ${data.triageCount}/6`);
    console.log(`  - Process Steps: ${data.processCount}/5, FAQs: ${data.faqCount}, Related: ${data.relatedCount}`);
    console.log(`  - Console Errors: ${consoleErrors.length}`);

    // Take screenshot of hero and full page
    await page.screenshot({ path: path.join(outDir, `hero-${vp.name}.png`), clip: { x: 0, y: 0, width: vp.width, height: Math.min(1000, vp.height * 1.2) } });

    await context.close();
  }

  await browser.close();

  console.log('\n====================================================');
  console.log(`  FINAL RESULT: ${allPass ? 'ALL TESTS PASSED (PC_UPGRADE_SEO_READY=YES)' : 'FAILURES DETECTED'}`);
  console.log('====================================================');

  if (!allPass) {
    process.exit(1);
  }
}

runPcUpgradeSeoQA().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
