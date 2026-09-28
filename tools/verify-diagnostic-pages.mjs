import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:4322';
const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/ee9abf8e-8b6c-43db-9e41-92931de3b178/.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const testPages = [
  { url: '/servicios/pc/diagnostico', name: 'pc_diagnostico' },
  { url: '/servicios/laptop/diagnostico', name: 'laptop_diagnostico' },
  { url: '/servicios/mac/diagnostico-mac', name: 'mac_diagnostico' },
  { url: '/servicios/telefono/diagnostico', name: 'telefono_diagnostico' },
  { url: '/servicios/consola/diagnostico', name: 'consola_diagnostico' },
  { url: '/tickets', name: 'tickets' },
  { url: '/preguntas-frecuentes', name: 'faq' },
  { url: '/reparaciones', name: 'reparaciones' },
  { url: '/', name: 'home' }
];

const prohibitedRegexes = [
  /diagn[oó]stico\s+gratis/i,
  /diagn[oó]stico\s+sin\s+costo/i,
  /revisi[oó]n\s+gratis/i,
  /revisi[oó]n\s+sin\s+costo/i,
  /evaluaci[oó]n\s+gratis/i,
  /evaluaci[oó]n\s+gratuita/i,
  /gratis\s+si\s+autorizas/i,
  /gratis\s+al\s+reparar/i,
  /se\s+bonifica\s+si/i
];

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  let failures = 0;

  for (const pageInfo of testPages) {
    // Desktop test
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const desktopPage = await desktopContext.newPage();
    const targetUrl = `${BASE_URL}${pageInfo.url}`;
    console.log(`Checking [DESKTOP] ${targetUrl}...`);
    
    try {
      const response = await desktopPage.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      if (!response || response.status() >= 400) {
        console.error(`ERROR: Status ${response ? response.status() : 'null'} on ${targetUrl}`);
        failures++;
      }
      
      const bodyText = await desktopPage.innerText('body');
      for (const rx of prohibitedRegexes) {
        if (rx.test(bodyText)) {
          console.error(`FAIL: Prohibited phrase matching ${rx} found on desktop ${pageInfo.url}`);
          failures++;
        }
      }

      const desktopShotPath = path.join(ARTIFACTS_DIR, `verify_desktop_${pageInfo.name}.png`);
      await desktopPage.screenshot({ path: desktopShotPath, fullPage: false });
      console.log(`Saved screenshot: ${desktopShotPath}`);
    } catch (e) {
      console.error(`Desktop error on ${pageInfo.url}:`, e.message);
      failures++;
    } finally {
      await desktopContext.close();
    }

    // Mobile test
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    const mobilePage = await mobileContext.newPage();
    console.log(`Checking [MOBILE] ${targetUrl}...`);

    try {
      await mobilePage.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
      const bodyText = await mobilePage.innerText('body');
      for (const rx of prohibitedRegexes) {
        if (rx.test(bodyText)) {
          console.error(`FAIL: Prohibited phrase matching ${rx} found on mobile ${pageInfo.url}`);
          failures++;
        }
      }

      const mobileShotPath = path.join(ARTIFACTS_DIR, `verify_mobile_${pageInfo.name}.png`);
      await mobilePage.screenshot({ path: mobileShotPath, fullPage: false });
      console.log(`Saved screenshot: ${mobileShotPath}`);
    } catch (e) {
      console.error(`Mobile error on ${pageInfo.url}:`, e.message);
      failures++;
    } finally {
      await mobileContext.close();
    }
  }

  await browser.close();
  console.log(`\nBrowser verification complete. Total failures: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
