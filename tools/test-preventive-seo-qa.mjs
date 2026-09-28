import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('tmp/preventive-seo-qa');
await fs.mkdir(outDir, { recursive: true });

const origin = 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

async function runPreventiveSeoQA() {
  console.log('====================================================');
  console.log('  PIXON PC — PREVENTIVE SEO & SYMPTOM QA SUITE      ');
  console.log('====================================================\n');

  const viewports = [
    { name: '390x844', width: 390, height: 844, isMobile: true },
    { name: '1366x768', width: 1366, height: 768, isMobile: false }
  ];

  let allPass = true;

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    const response = await page.goto(`${origin}/mantenimiento-preventivo-computadora`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const data = await page.evaluate((isMobile) => {
      const h1s = [...document.querySelectorAll('h1')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h2s = [...document.querySelectorAll('h2')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h3s = [...document.querySelectorAll('h3')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
      const overflow = document.documentElement.scrollWidth > window.innerWidth;
      
      const symptomsCards = document.querySelectorAll('.mpc-symptom-card');
      const triageCards = document.querySelectorAll('.mpc-triage-card');
      const relatedLinks = [...document.querySelectorAll('.mpc-related__grid a')].map(a => a.getAttribute('href'));
      const faqCards = document.querySelectorAll('.faq-item');
      
      const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => {
        try { return JSON.parse(e.textContent); } catch (err) { return null; }
      }).filter(Boolean);
      const serviceSchema = schemas.find(s => s['@type'] === 'Service' || (Array.isArray(s['@graph']) && s['@graph'].some(g => g['@type'] === 'Service')));

      // Hero order check
      const h1El = document.querySelector('#mpc-title');
      const mediaEl = document.querySelector('.mpc-hero__media-wrap');
      const summaryEl = document.querySelector('.mpc-hero__summary');

      const h1Box = h1El?.getBoundingClientRect();
      const mediaBox = mediaEl?.getBoundingClientRect();
      const summaryBox = summaryEl?.getBoundingClientRect();

      let heroOrderOk = false;
      if (h1Box && mediaBox && summaryBox) {
        if (isMobile) {
          heroOrderOk = (mediaBox.top >= h1Box.bottom - 4) && (summaryBox.top >= mediaBox.bottom - 4);
        } else {
          heroOrderOk = mediaBox.left >= h1Box.right - 50;
        }
      }

      return {
        h1Count: h1s.length,
        h1Text: h1s[0] || '',
        h2Count: h2s.length,
        h2s,
        title,
        metaDesc,
        canonical,
        overflow,
        symptomsCount: symptomsCards.length,
        triageCount: triageCards.length,
        relatedCount: relatedLinks.length,
        faqCount: faqCards.length,
        hasServiceSchema: !!serviceSchema,
        schemas: schemas.map(s => s['@type'] || (s['@graph'] ? 'Graph' : 'Unknown')),
        heroOrderOk,
        gapH1ToMedia: h1Box && mediaBox ? mediaBox.top - h1Box.bottom : 0
      };
    }, vp.isMobile);

    const checksPass = (
      response.status() === 200 &&
      data.h1Count === 1 &&
      data.h1Text.includes('Mantenimiento preventivo de computadoras en Cancún') &&
      data.title.includes('Mantenimiento Preventivo') &&
      data.metaDesc.length > 50 &&
      !data.overflow &&
      data.symptomsCount === 10 &&
      data.triageCount === 12 &&
      data.faqCount >= 18 &&
      data.heroOrderOk &&
      consoleErrors.length === 0
    );

    if (!checksPass) allPass = false;

    console.log(`[${vp.name}] Result: ${checksPass ? 'PASS' : 'FAIL'}`);
    console.log(`  H1: "${data.h1Text}" (Count: ${data.h1Count})`);
    console.log(`  Title: "${data.title}"`);
    console.log(`  Meta Description: "${data.metaDesc}"`);
    console.log(`  Overflow: ${data.overflow}`);
    console.log(`  Hero Order OK: ${data.heroOrderOk} (Gap H1->Media: ${data.gapH1ToMedia.toFixed(1)}px)`);
    console.log(`  Symptoms cards: ${data.symptomsCount} (Expected: 10)`);
    console.log(`  Triage cards: ${data.triageCount} (Expected: 12)`);
    console.log(`  FAQs in Schema: ${data.faqCount}`);
    console.log(`  Console errors: ${consoleErrors.length}\n`);

    await page.screenshot({ path: path.join(outDir, `preventive-${vp.name}-full.png`), fullPage: true });
    await context.close();
  }

  await browser.close();

  console.log('====================================================');
  console.log(`OVERALL STATUS: ${allPass ? 'PREVENTIVE_SYMPTOM_SEO_READY: YES' : 'FAIL'}`);
  console.log('====================================================');
}

runPreventiveSeoQA().catch(err => {
  console.error(err);
  process.exit(1);
});
