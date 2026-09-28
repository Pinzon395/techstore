import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('tmp/corrective-seo-qa');
await fs.mkdir(outDir, { recursive: true });

const origin = 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true });

async function runPcCorrectiveSeoQA() {
  console.log('================================================================');
  console.log('  PIXON PC — PC MANTENIMIENTO CORRECTIVO & REPARACIÓN QA SUITE  ');
  console.log('================================================================\n');

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

    const response = await page.goto(`${origin}/servicios/pc/mantenimiento-correctivo`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const data = await page.evaluate((isMobile) => {
      const h1s = [...document.querySelectorAll('h1')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h2s = [...document.querySelectorAll('h2')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const h3s = [...document.querySelectorAll('h3')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const title = document.title;
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
      const overflow = document.documentElement.scrollWidth > window.innerWidth;
      
      const symptomCards = document.querySelectorAll('.pcc-symptom-card');
      const componentCards = document.querySelectorAll('.pcc-component-card');
      const diagCards = document.querySelectorAll('.pcc-triage-col');
      const compareCols = document.querySelectorAll('.pcc-compare-card');
      const decisionCards = document.querySelectorAll('.pcc-decision-card');
      const processSteps = document.querySelectorAll('.pcc-step-card');
      const relatedLinks = [...document.querySelectorAll('.pcc-related-card')].map(a => a.getAttribute('href'));
      const faqCards = document.querySelectorAll('.faq-item');
      
      const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => {
        try { return JSON.parse(e.textContent); } catch (err) { return null; }
      }).filter(Boolean);

      // Check if schema contains any Offer with price
      const hasOfferPrice = schemas.some(s => {
        if (s['@type'] === 'Offer' && s.price) return true;
        if (s.offers && (s.offers.price || (Array.isArray(s.offers) && s.offers.some(o => o.price)))) return true;
        return false;
      });

      // Price checks in text/html
      const bodyHtml = document.body.innerHTML;
      const has650Price = bodyHtml.includes('$650') || bodyHtml.includes('650 MXN') || bodyHtml.includes('650MXN');
      const hasFixedEta = bodyHtml.includes('24-48') || bodyHtml.includes('24-72') || bodyHtml.includes('24 a 48 horas') || bodyHtml.includes('24 a 72 horas');

      // Unsafe claim checks
      const lowerHtml = bodyHtml.toLowerCase();
      const hasComoNuevo = lowerHtml.includes('como nuevo') || lowerHtml.includes('funcionando como nuevo');
      const hasSolucionDefinitiva = lowerHtml.includes('solución definitiva') || lowerHtml.includes('solucion definitiva');
      const hasCeroRiesgo = lowerHtml.includes('cero riesgo');
      const hasGarantiaUniversal = lowerHtml.includes('garantía en cada intervención') || lowerHtml.includes('garantia en cada intervencion');
      const has24hStress = lowerHtml.includes('24 horas de stress') || lowerHtml.includes('24h de stress');
      const hasAseguramosArchivos = lowerHtml.includes('aseguramos tus archivos');
      const hasCertificamosNoFalle = lowerHtml.includes('certificamos que no vuelva a fallar');
      const hasGarantiaOficial = lowerHtml.includes('garantía oficial') || lowerHtml.includes('garantia oficial');

      // Hero order check
      const h1El = document.querySelector('#pcc-hero-title');
      const mediaEl = document.querySelector('.pcc-hero__visual-wrap');
      const summaryEl = document.querySelector('.pcc-hero__summary');

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

      // WhatsApp link check
      const waLinks = [...document.querySelectorAll('a[data-wa-link], a[href*="wa.me"]')].map(a => a.getAttribute('href'));
      const hasValidWaLink = waLinks.length > 0 && waLinks.some(link => link.includes('presenta+una+falla') || link.includes('falla'));

      // Ticket link check
      const hasTicketLink = document.querySelectorAll('a[href*="ticket"], a[href="#ticket-form"]').length > 0;

      // Sample heading color outside hero
      const sampleH2 = document.querySelector('.pcc-symptoms h2, #sintomas h2');
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
        symptomCount: symptomCards.length,
        componentCount: componentCards.length,
        diagCount: diagCards.length,
        compareCount: compareCols.length,
        decisionCount: decisionCards.length,
        processCount: processSteps.length,
        relatedCount: relatedLinks.length,
        faqCount: faqCards.length,
        hasOfferPrice,
        has650Price,
        hasFixedEta,
        hasComoNuevo,
        hasSolucionDefinitiva,
        hasCeroRiesgo,
        hasGarantiaUniversal,
        has24hStress,
        hasAseguramosArchivos,
        hasCertificamosNoFalle,
        hasGarantiaOficial,
        heroOrderOk,
        hasValidWaLink,
        hasTicketLink,
        sampleH2Color,
        h1Box: h1Box ? { top: Math.round(h1Box.top), bottom: Math.round(h1Box.bottom), left: Math.round(h1Box.left), right: Math.round(h1Box.right) } : null,
        mediaBox: mediaBox ? { top: Math.round(mediaBox.top), bottom: Math.round(mediaBox.bottom), left: Math.round(mediaBox.left), right: Math.round(mediaBox.right) } : null,
        summaryBox: summaryBox ? { top: Math.round(summaryBox.top), bottom: Math.round(summaryBox.bottom) } : null
      };
    }, vp.isMobile);

    const failedChecks = [];
    if (response.status() !== 200) failedChecks.push(`status: ${response.status()}`);
    if (data.h1Count !== 1) failedChecks.push(`h1Count: ${data.h1Count}`);
    if (!data.h1Text.includes('Mantenimiento correctivo y reparación de PC en Cancún')) failedChecks.push(`h1Text: ${data.h1Text}`);
    if (!data.title.includes('Mantenimiento Correctivo y Reparación de PC en Cancún')) failedChecks.push(`title: ${data.title}`);
    if (data.metaDesc.length <= 50) failedChecks.push(`metaDesc.length: ${data.metaDesc.length}`);
    if (data.canonical !== 'https://pixon.com.mx/servicios/pc/mantenimiento-correctivo') failedChecks.push(`canonical: ${data.canonical}`);
    if (data.overflow) failedChecks.push('overflow');
    if (data.symptomCount !== 10) failedChecks.push(`symptomCount: ${data.symptomCount}`);
    if (data.componentCount !== 8) failedChecks.push(`componentCount: ${data.componentCount}`);
    if (data.diagCount !== 2) failedChecks.push(`diagCount: ${data.diagCount}`);
    if (data.compareCount !== 2) failedChecks.push(`compareCount: ${data.compareCount}`);
    if (data.decisionCount !== 2) failedChecks.push(`decisionCount: ${data.decisionCount}`);
    if (data.processCount !== 6) failedChecks.push(`processCount: ${data.processCount}`);
    if (data.relatedCount < 9) failedChecks.push(`relatedCount: ${data.relatedCount}`);
    if (data.faqCount < 18) failedChecks.push(`faqCount: ${data.faqCount}`);
    if (data.hasOfferPrice) failedChecks.push('hasOfferPrice');
    if (data.has650Price) failedChecks.push('has650Price');
    if (data.hasFixedEta) failedChecks.push('hasFixedEta');
    if (data.hasComoNuevo) failedChecks.push('hasComoNuevo');
    if (data.hasSolucionDefinitiva) failedChecks.push('hasSolucionDefinitiva');
    if (data.hasCeroRiesgo) failedChecks.push('hasCeroRiesgo');
    if (data.hasGarantiaUniversal) failedChecks.push('hasGarantiaUniversal');
    if (data.has24hStress) failedChecks.push('has24hStress');
    if (data.hasAseguramosArchivos) failedChecks.push('hasAseguramosArchivos');
    if (data.hasCertificamosNoFalle) failedChecks.push('hasCertificamosNoFalle');
    if (data.hasGarantiaOficial) failedChecks.push('hasGarantiaOficial');
    if (!data.hasValidWaLink) failedChecks.push('hasValidWaLink');
    if (!data.hasTicketLink) failedChecks.push('hasTicketLink');
    if (!data.heroOrderOk) failedChecks.push('heroOrderOk');
    if (consoleErrors.length > 0) failedChecks.push(`consoleErrors: ${consoleErrors.join(', ')}`);

    const checksPass = failedChecks.length === 0;

    if (!checksPass) {
      allPass = false;
      console.log(`  - FAILED CHECKS: ${failedChecks.join(' | ')}`);
    }

    console.log(`[Viewport ${vp.name}] ${checksPass ? 'PASS' : 'FAIL'}`);
    console.log(`  - Status: ${response.status()}`);
    console.log(`  - H1: [${data.h1Count}] "${data.h1Text}"`);
    console.log(`  - Title: ${data.title}`);
    console.log(`  - Canonical: ${data.canonical}`);
    console.log(`  - Overflow: ${data.overflow} (scroll: ${data.scrollWidth}, inner: ${data.innerWidth})`);
    console.log(`  - Hero Order (H1 -> Media -> Summary): ${data.heroOrderOk}`);
    console.log(`  - Zero Prices: has650=${data.has650Price}, hasOffer=${data.hasOfferPrice}`);
    console.log(`  - Safe Claims: fixedEta=${data.hasFixedEta}, ceroRiesgo=${data.hasCeroRiesgo}, definitiva=${data.hasSolucionDefinitiva}`);
    console.log(`  - Symptom Cards: ${data.symptomCount}/10, Components: ${data.componentCount}/8, Diag: ${data.diagCount}/2`);
    console.log(`  - Process Steps: ${data.processCount}/6, Decision: ${data.decisionCount}/2, FAQs: ${data.faqCount}, Related: ${data.relatedCount}`);
    console.log(`  - WA Link: ${data.hasValidWaLink}, Ticket Link: ${data.hasTicketLink}`);
    console.log(`  - Console Errors: ${consoleErrors.length}`);

    // Take screenshot
    await page.screenshot({ path: path.join(outDir, `hero-${vp.name}.png`), clip: { x: 0, y: 0, width: vp.width, height: Math.min(1100, vp.height * 1.3) } });

    await context.close();
  }

  await browser.close();

  console.log('\n================================================================');
  console.log(`  FINAL RESULT: ${allPass ? 'ALL TESTS PASSED (PC_CORRECTIVE_SEO_READY=YES)' : 'FAILURES DETECTED'}`);
  console.log('================================================================');

  if (!allPass) {
    process.exit(1);
  }
}

runPcCorrectiveSeoQA().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
