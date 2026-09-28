import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/ee9abf8e-8b6c-43db-9e41-92931de3b178';
const URL = 'http://127.0.0.1:4322/mantenimiento-pc-laptop-domicilio-cancun.html';

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // Desktop
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const sec = page.locator('#limpieza-title').locator('xpath=ancestor::section');
  await sec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await sec.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_section4_desktop.png') });
  await page.close();

  // Mobile
  const pageMob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pageMob.goto(URL, { waitUntil: 'networkidle' });
  await pageMob.waitForTimeout(400);

  const secMob = pageMob.locator('#limpieza-title').locator('xpath=ancestor::section');
  await secMob.scrollIntoViewIfNeeded();
  await pageMob.waitForTimeout(200);
  await secMob.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_section4_mobile.png') });
  await pageMob.close();

  await browser.close();
  console.log('Captured section 4 successfully!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
