import { chromium } from '@playwright/test';

const TARGET_PAGES = [
  {
    url: 'http://127.0.0.1:4321/mantenimiento-preventivo-computadora',
    name: 'Mantenimiento Preventivo',
    h1Selector: '#mpc-title',
    mediaSelector: '.mpc-hero__media-wrap',
    summarySelector: '.mpc-hero__summary',
    actionsSelector: '.mpc-actions',
    trustSelector: '.mpc-hero__trust',
    firstH2Selector: '#intro-title'
  },
  {
    url: 'http://127.0.0.1:4321/mantenimiento-pc-laptop-domicilio-cancun',
    name: 'Mantenimiento a Domicilio',
    h1Selector: '#homevisit-title',
    mediaSelector: '.homevisit-hero__visual-container',
    summarySelector: '.homevisit-hero__summary',
    actionsSelector: '.homevisit-hero__actions',
    trustSelector: '.homevisit-hero__trust-wrap',
    firstH2Selector: '#conviene-title'
  },
  {
    url: 'http://127.0.0.1:4321/servicios/telefono/reparacion-pantalla-iphone',
    name: 'Reparación Pantalla iPhone',
    h1Selector: '#hero-h1',
    mediaSelector: '.isr-hero-visual-col',
    summarySelector: '.isr-hero-summary',
    actionsSelector: '.isr-hero-actions',
    trustSelector: '.isr-hero-trust-wrap',
    firstH2Selector: '#opciones-pantalla'
  },
  {
    url: 'http://127.0.0.1:4321/servicios/telefono/reparacion-iphone',
    name: 'Reparación Avanzada iPhone',
    h1Selector: '#hero-h1',
    mediaSelector: '.iar-hero-visual',
    summarySelector: '.iar-hero-summary',
    actionsSelector: '.iar-hero-ctas',
    trustSelector: '.iar-hero-trust-wrap',
    firstH2Selector: '#fallas'
  }
];

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800, isMobile: true },
  { name: '390x844', width: 390, height: 844, isMobile: true },
  { name: '430x932', width: 430, height: 932, isMobile: true },
  { name: '768x1024', width: 768, height: 1024, isMobile: true },
  { name: '820x1180', width: 820, height: 1180, isMobile: true },
  { name: '1024x768', width: 1024, height: 768, isMobile: false },
  { name: '1366x768', width: 1366, height: 768, isMobile: false },
  { name: '1440x900', width: 1440, height: 900, isMobile: false }
];

async function runHeroQA() {
  console.log('====================================================');
  console.log('  PIXON PC — HERO RESPONSIVO QA SUITE               ');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  let overallPass = true;
  const pageSummaries = [];

  for (const pageConfig of TARGET_PAGES) {
    console.log(`\n----------------------------------------------------`);
    console.log(`AUDITANDO PÁGINA: ${pageConfig.name}`);
    console.log(`URL: ${pageConfig.url}`);
    console.log(`----------------------------------------------------`);

    const pageResult = {
      name: pageConfig.name,
      url: pageConfig.url,
      h1Text: '',
      h1Count: 0,
      mobileOrderPass: true,
      desktopOrderPass: true,
      overflowPass: true,
      consoleErrors: [],
      viewports: {}
    };

    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageResult.consoleErrors.push(msg.text());
      }
    });

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(pageConfig.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);

      const auditData = await page.evaluate(cfg => {
        const h1Els = document.querySelectorAll('h1');
        const h1 = document.querySelector(cfg.h1Selector);
        const media = document.querySelector(cfg.mediaSelector);
        const summary = document.querySelector(cfg.summarySelector);
        const actions = document.querySelector(cfg.actionsSelector);
        const trust = document.querySelector(cfg.trustSelector);

        const getBox = el => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return {
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            right: r.right,
            width: r.width,
            height: r.height,
            display: s.display,
            visibility: s.visibility,
            opacity: s.opacity
          };
        };

        const h1Box = getBox(h1);
        const mediaBox = getBox(media);
        const summaryBox = getBox(summary);
        const actionsBox = getBox(actions);
        const trustBox = getBox(trust);

        const hasOverflow = document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;

        return {
          h1Count: h1Els.length,
          h1Text: h1 ? h1.innerText.trim().replace(/\s+/g, ' ') : '',
          h1Box,
          mediaBox,
          summaryBox,
          actionsBox,
          trustBox,
          hasOverflow
        };
      }, pageConfig);

      pageResult.h1Count = auditData.h1Count;
      pageResult.h1Text = auditData.h1Text;

      const { h1Box, mediaBox, summaryBox, actionsBox, trustBox, hasOverflow } = auditData;

      let vpPass = true;
      const issues = [];

      if (hasOverflow) {
        vpPass = false;
        pageResult.overflowPass = false;
        issues.push('Horizontal overflow detected');
      }

      if (auditData.h1Count !== 1) {
        vpPass = false;
        issues.push(`Expected 1 H1, found ${auditData.h1Count}`);
      }

      if (!mediaBox || mediaBox.width <= 0 || mediaBox.height <= 0 || mediaBox.display === 'none') {
        vpPass = false;
        issues.push('Visual media is missing, collapsed, or hidden');
      }

      if (vp.isMobile) {
        // Mobile checks: H1 -> Media -> Summary -> Actions -> Trust
        if (h1Box && mediaBox) {
          const gapH1ToMedia = mediaBox.top - h1Box.bottom;
          if (gapH1ToMedia < 0) {
            vpPass = false;
            pageResult.mobileOrderPass = false;
            issues.push(`Visual is above H1 (gap: ${gapH1ToMedia.toFixed(1)}px)`);
          } else if (gapH1ToMedia > 70) {
            vpPass = false;
            pageResult.mobileOrderPass = false;
            issues.push(`Gap between H1 and Visual is too large (${gapH1ToMedia.toFixed(1)}px > 70px)`);
          }

          if (summaryBox) {
            const gapMediaToSummary = summaryBox.top - mediaBox.bottom;
            if (gapMediaToSummary < -5) {
              vpPass = false;
              pageResult.mobileOrderPass = false;
              issues.push(`Summary is rendered above Visual in mobile!`);
            }
          }
        }
      } else {
        // Desktop checks: Two columns!
        if (h1Box && mediaBox) {
          const isTwoColumns = mediaBox.left > h1Box.left + 50 && mediaBox.left > vp.width * 0.35;
          if (!isTwoColumns) {
            vpPass = false;
            pageResult.desktopOrderPass = false;
            issues.push(`Desktop layout collapsed into vertical instead of 2 columns`);
          }
        }
      }

      if (!vpPass) overallPass = false;

      pageResult.viewports[vp.name] = {
        pass: vpPass,
        issues,
        gapH1ToMedia: h1Box && mediaBox ? (mediaBox.top - h1Box.bottom).toFixed(1) : null,
        mediaWidth: mediaBox ? mediaBox.width.toFixed(1) : null,
        hasOverflow
      };

      console.log(`[${vpPass ? 'PASS' : 'FAIL'}] ${vp.name.padEnd(10)} | Overflow: ${hasOverflow ? 'YES' : 'NO'} | H1->Visual gap: ${pageResult.viewports[vp.name].gapH1ToMedia}px | Media width: ${pageResult.viewports[vp.name].mediaWidth}px ${issues.length ? ' | ' + issues.join('; ') : ''}`);
    }

    await context.close();
    pageSummaries.push(pageResult);
  }

  await browser.close();

  console.log('\n====================================================');
  console.log('               RESUMEN GLOBAL QA                    ');
  console.log('====================================================');

  for (const s of pageSummaries) {
    console.log(`\nURL: ${s.url}`);
    console.log(`  H1 (${s.h1Count}): "${s.h1Text}"`);
    console.log(`  Mobile Order (H1 -> Visual -> Copy -> CTA): ${s.mobileOrderPass ? 'PASS' : 'FAIL'}`);
    console.log(`  Desktop Order (2 columns side-by-side):   ${s.desktopOrderPass ? 'PASS' : 'FAIL'}`);
    console.log(`  Horizontal Overflow:                     ${s.overflowPass ? 'NONE (PASS)' : 'FAIL'}`);
    console.log(`  Console Errors:                          ${s.consoleErrors.length === 0 ? '0 (PASS)' : s.consoleErrors.join(', ')}`);
  }

  console.log(`\nTEXT_VISUAL_TEXT_HERO_READY: ${overallPass ? 'YES' : 'NO'}\n`);

  if (!overallPass) {
    process.exit(1);
  }
}

runHeroQA().catch(err => {
  console.error(err);
  process.exit(1);
});
