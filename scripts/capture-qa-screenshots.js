const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:4321';
const outDir = path.resolve('C:/Users/Usuario/.gemini/antigravity-ide/brain/ee9abf8e-8b6c-43db-9e41-92931de3b178');

const routes = [
  { name: 'home', path: '/' },
  { name: 'servicios_hub', path: '/servicios' },
  { name: 'ensambles', path: '/ensambles' },
  { name: 'tienda', path: '/tienda' },
  { name: 'carrito', path: '/carrito' },
  { name: 'contacto', path: '/contacto' },
  { name: 'b2b', path: '/b2b' },
  { name: 'en_home', path: '/en' },
  { name: 'en_computer_repair', path: '/en/computer-repair' }
];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const r of routes) {
    // Desktop 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    const deskPath = path.join(outDir, `qa_${r.name}_desktop.png`);
    await page.screenshot({ path: deskPath, fullPage: false });

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(200);
    const mobPath = path.join(outDir, `qa_${r.name}_mobile.png`);
    await page.screenshot({ path: mobPath, fullPage: false });

    console.log(`[✓] Captured screenshots for ${r.name}`);
  }

  await browser.close();
}

run().catch(console.error);
