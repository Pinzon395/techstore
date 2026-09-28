import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/ee9abf8e-8b6c-43db-9e41-92931de3b178';
const URL = 'http://127.0.0.1:4322/mantenimiento-pc-laptop-domicilio-cancun.html';

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1366x768
  const pageDesk = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await pageDesk.goto(URL, { waitUntil: 'networkidle' });
  await pageDesk.waitForTimeout(500);

  // Accept cookies if present to clear overlay
  const cookieBtn = pageDesk.locator('#cookie-banner button, .cookie-banner button, [data-accept-cookies]');
  if (await cookieBtn.count() > 0) {
    try { await cookieBtn.first().click(); await pageDesk.waitForTimeout(200); } catch(e) {}
  }

  // Section 7 (Navy)
  const sec7 = pageDesk.locator('.homevisit-section--navy');
  await sec7.scrollIntoViewIfNeeded();
  await pageDesk.waitForTimeout(200);
  await sec7.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_desktop_section7_navy.png') });

  // Home Visit Form
  const formSec = pageDesk.locator('#solicitar-visita');
  await formSec.scrollIntoViewIfNeeded();
  await pageDesk.waitForTimeout(200);
  await formSec.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_desktop_form.png') });

  // FAQ Expanded
  const faqSec = pageDesk.locator('#homevisit-faq');
  await faqSec.scrollIntoViewIfNeeded();
  await pageDesk.locator('#homevisit-faq .faq-question').first().click();
  await pageDesk.waitForTimeout(350);
  await faqSec.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_desktop_faq_expanded.png') });

  // Ticket Section
  const ticketSec = pageDesk.locator('#homevisit-ticket');
  await ticketSec.scrollIntoViewIfNeeded();
  await pageDesk.waitForTimeout(200);
  await ticketSec.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_desktop_ticket.png') });

  // Registration Offer (Coupon)
  const couponSec = pageDesk.locator('.registration-offer');
  if (await couponSec.count() > 0) {
    await couponSec.scrollIntoViewIfNeeded();
    await pageDesk.waitForTimeout(200);
    await couponSec.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_desktop_coupon.png') });
  }

  await pageDesk.close();

  // 2. Mobile 390x844
  const pageMob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pageMob.goto(URL, { waitUntil: 'networkidle' });
  await pageMob.waitForTimeout(500);

  // Mobile Header / Hero
  await pageMob.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_hero.png') });

  // Mobile Section 7
  const mobSec7 = pageMob.locator('.homevisit-section--navy');
  await mobSec7.scrollIntoViewIfNeeded();
  await pageMob.waitForTimeout(200);
  await mobSec7.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_section7_navy.png') });

  // Mobile Form
  const mobForm = pageMob.locator('#solicitar-visita');
  await mobForm.scrollIntoViewIfNeeded();
  await pageMob.waitForTimeout(200);
  await mobForm.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_form.png') });

  // Mobile FAQ Expanded
  const mobFaq = pageMob.locator('#homevisit-faq');
  await mobFaq.scrollIntoViewIfNeeded();
  await pageMob.locator('#homevisit-faq .faq-question').first().click();
  await pageMob.waitForTimeout(350);
  await mobFaq.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_faq_expanded.png') });

  // Mobile Coupon
  const mobCoupon = pageMob.locator('.registration-offer');
  if (await mobCoupon.count() > 0) {
    await mobCoupon.scrollIntoViewIfNeeded();
    await pageMob.waitForTimeout(200);
    await mobCoupon.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_coupon.png') });
  }

  // Mobile Footer
  const mobFooter = pageMob.locator('footer');
  await mobFooter.scrollIntoViewIfNeeded();
  await pageMob.waitForTimeout(200);
  await mobFooter.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_footer.png') });

  // Mobile Nav open
  await pageMob.evaluate(() => window.scrollTo(0, 0));
  await pageMob.waitForTimeout(200);
  const burger = pageMob.locator('.navbar-toggle, .mobile-menu-btn, .hamburger, [aria-label*="menú"], [aria-label*="menu"]');
  if (await burger.count() > 0) {
    await burger.first().click();
    await pageMob.waitForTimeout(300);
    await pageMob.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_menu_open.png') });
  }

  await pageMob.close();
  await browser.close();
  console.log('Milestone captures complete!');
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
