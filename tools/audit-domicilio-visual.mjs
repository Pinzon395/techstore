import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/Usuario/.gemini/antigravity-ide/brain/ee9abf8e-8b6c-43db-9e41-92931de3b178';
const URL = 'http://127.0.0.1:4322/mantenimiento-pc-laptop-domicilio-cancun.html';

async function runAudit() {
  console.log('=== Starting Real Visual Browser Audit for Domicilio Page ===');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1366', width: 1366, height: 768 },
    { name: 'desktop_1440', width: 1440, height: 900 },
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_390', width: 390, height: 844 },
    { name: 'mobile_360', width: 360, height: 800 },
    { name: 'mobile_430', width: 430, height: 932 }
  ];

  const report = {
    overflowIssues: [],
    textIssues: [],
    layoutIssues: [],
    sections: [],
    interactiveResults: {}
  };

  for (const vp of viewports) {
    console.log(`\n--- Auditing viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 1. Check Horizontal Overflow
    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.offsetWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const hasOverflow = scrollWidth > window.innerWidth || bodyScrollWidth > window.innerWidth;
      
      let offendingElements = [];
      if (hasOverflow) {
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth + 1 || rect.left < -1) {
            offendingElements.push({
              tag: el.tagName,
              id: el.id,
              className: el.className,
              rect: { left: rect.left, right: rect.right, width: rect.width }
            });
          }
        });
      }
      return { hasOverflow, docWidth, scrollWidth, windowWidth: window.innerWidth, offendingElements: offendingElements.slice(0, 10) };
    });

    if (overflow.hasOverflow) {
      console.warn(`[OVERFLOW DETECTED] in ${vp.name}:`, overflow);
      report.overflowIssues.push({ viewport: vp.name, overflow });
    } else {
      console.log(`[PASS] No horizontal overflow in ${vp.name}`);
    }

    // 2. Check lateral gutters (padding on content containers)
    const gutterCheck = await page.evaluate((isMobile) => {
      const main = document.querySelector('main');
      const containers = Array.from(document.querySelectorAll('.container, [class*="container"], section > div'));
      const minExpected = isMobile ? 16 : 32;
      const issues = [];

      containers.forEach(c => {
        const style = window.getComputedStyle(c);
        const rect = c.getBoundingClientRect();
        // check distance to viewport edges if not full bleed
        if (!c.classList.contains('full-bleed') && rect.width < window.innerWidth) {
          const leftSpace = rect.left;
          const rightSpace = window.innerWidth - rect.right;
          if (leftSpace < minExpected && !c.closest('.full-width') && !c.classList.contains('no-gutter')) {
            issues.push({
              tag: c.tagName,
              className: c.className.toString(),
              leftSpace,
              rightSpace
            });
          }
        }
      });
      return issues.slice(0, 5);
    }, vp.width <= 768);

    // Capture Full Page Screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, `domicilio_${vp.name}_full.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot: ${screenshotPath}`);

    // If 1366, 390, 768, capture viewport scroll-through checkpoints
    if (['desktop_1366', 'mobile_390', 'tablet_768'].includes(vp.name)) {
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(`Page total height in ${vp.name}: ${scrollHeight}px`);

      // Scroll through in increments of viewport height
      let scrollPos = 0;
      let shotIndex = 1;
      while (scrollPos < scrollHeight) {
        await page.evaluate((y) => window.scrollTo(0, y), scrollPos);
        await page.waitForTimeout(150);
        const chunkPath = path.join(ARTIFACTS_DIR, `domicilio_${vp.name}_part${shotIndex}.png`);
        await page.screenshot({ path: chunkPath });
        scrollPos += vp.height * 0.85;
        shotIndex++;
        if (shotIndex > 12) break; // cap at 12 slices
      }
    }

    // 3. Inspect detailed typography & empty spaces in 1366 & 390
    if (vp.name === 'desktop_1366' || vp.name === 'mobile_390') {
      const textAudit = await page.evaluate((isMobile) => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span, a, button, label'));
        const issues = [];
        elements.forEach(el => {
          const text = el.innerText ? el.innerText.trim() : '';
          if (!text || el.offsetParent === null) return;
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
          const color = style.color;
          const rect = el.getBoundingClientRect();

          // Too small check
          if (fontSize < 11 && !el.closest('svg') && !el.closest('.badge-micro')) {
            issues.push({ type: 'too_small', text: text.slice(0, 30), fontSize, tag: el.tagName, class: el.className });
          }

          // Line width too wide (desktop only)
          if (!isMobile && (el.tagName === 'P' || el.tagName === 'LI') && rect.width > 1050) {
            issues.push({ type: 'too_wide', text: text.slice(0, 30), width: rect.width, tag: el.tagName, class: el.className });
          }

          // Text overlap / zero height with overflow
          if (rect.height === 0 && rect.width > 0 && text.length > 0 && style.overflow !== 'hidden') {
            issues.push({ type: 'zero_height_text', text: text.slice(0, 30), tag: el.tagName });
          }
        });

        // Section gaps check
        const sections = Array.from(document.querySelectorAll('section, header, footer'));
        const gaps = [];
        for (let i = 0; i < sections.length - 1; i++) {
          const s1 = sections[i].getBoundingClientRect();
          const s2 = sections[i + 1].getBoundingClientRect();
          const gap = s2.top - s1.bottom;
          if (gap > 160) {
            gaps.push({ gap, s1: sections[i].className, s2: sections[i + 1].className });
          }
        }

        // Cards check
        const cards = Array.from(document.querySelectorAll('.card, [class*="card"], [class*="__card"], [class*="-card"]'));
        const cardIssues = [];
        cards.forEach(c => {
          const rect = c.getBoundingClientRect();
          const text = c.innerText ? c.innerText.trim() : '';
          if (rect.height > 60 && text.length < 5) {
            cardIssues.push({ type: 'empty_or_near_empty_card', className: c.className });
          }
          if (rect.height > 500 && text.length < 80) {
            cardIssues.push({ type: 'huge_sparse_card', height: rect.height, textLength: text.length, className: c.className });
          }
        });

        // Buttons check
        const buttons = Array.from(document.querySelectorAll('button, a.btn, a[class*="button"], a[class*="btn"], .cta-btn'));
        const buttonIssues = [];
        buttons.forEach(b => {
          const rect = b.getBoundingClientRect();
          const text = b.innerText ? b.innerText.trim() : '';
          const style = window.getComputedStyle(b);
          if (rect.height > 0 && rect.width > 0) {
            // check text wrapping into too many lines
            const lines = Math.round(rect.height / (parseFloat(style.lineHeight) || 20));
            if (lines > 2 && text.length < 40) {
              buttonIssues.push({ type: 'button_wrapped_badly', text, lines, rect, className: b.className });
            }
          }
        });

        return { issues: issues.slice(0, 10), gaps, cardIssues, buttonIssues };
      }, vp.width <= 768);

      report.textIssues.push({ viewport: vp.name, textAudit });
      console.log(`[AUDIT] ${vp.name} text & layout issues:`, textAudit);
    }

    // 4. Test interactive elements in desktop_1366 and mobile_390
    if (vp.name === 'desktop_1366') {
      console.log('Testing FAQ accordion and Form in desktop...');
      // Click FAQ items
      const faqButtons = page.locator('.faq-section .faq-question');
      const faqCount = await faqButtons.count();
      console.log(`Found ${faqCount} FAQ accordion buttons`);
      if (faqCount > 0) {
        await faqButtons.first().click();
        await page.waitForTimeout(350);
        const faqStatus = await page.evaluate(() => {
          const first = document.querySelector('.faq-section .faq-item');
          const answer = first?.querySelector('.faq-answer');
          return {
            isOpenClass: first?.classList.contains('faq-item--open'),
            ariaExpanded: first?.querySelector('.faq-question')?.getAttribute('aria-expanded'),
            answerHeight: answer ? answer.offsetHeight : 0,
            ariaHidden: answer?.getAttribute('aria-hidden')
          };
        });
        report.interactiveResults.faqStatus = faqStatus;
        console.log('FAQ accordion status after click:', faqStatus);
      }

      // Check Section backgrounds
      const sectionStyles = await page.evaluate(() => {
        const results = [];
        const sections = Array.from(document.querySelectorAll('main > section'));
        sections.forEach((sec, idx) => {
          const computed = window.getComputedStyle(sec);
          const h2 = sec.querySelector('h2');
          const h2Computed = h2 ? window.getComputedStyle(h2) : null;
          results.push({
            index: idx + 1,
            className: sec.className,
            id: sec.id,
            bg: computed.backgroundColor,
            color: computed.color,
            h2Title: h2?.innerText?.slice(0, 40) || '',
            h2Color: h2Computed?.color || ''
          });
        });
        return results;
      });
      report.sections = sectionStyles;
      console.log('Found', sectionStyles.length, 'sections. Navy section:', sectionStyles.find(s => s.className.includes('navy')));

      // Check Home Visit Form
      const form = page.locator('#home-visit-maintenance-form, #solicitar-visita');
      const formExists = (await form.count()) > 0;
      console.log('Home visit form exists:', formExists);
      if (formExists) {
        const inputs = page.locator('#home-visit-maintenance-form input, #home-visit-maintenance-form select, #home-visit-maintenance-form textarea');
        const inputCount = await inputs.count();
        console.log(`Form inputs count: ${inputCount}`);
        const submitBtn = page.locator('#home-visit-maintenance-form button[type="submit"]');
        const submitVisible = await submitBtn.isVisible();
        console.log('Submit button visible:', submitVisible);
        report.interactiveResults.form = { exists: true, inputCount, submitVisible };
      }
    }

    await page.close();
  }

  await browser.close();

  // Save report
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'domicilio_visual_audit_report.json'), JSON.stringify(report, null, 2));
  console.log('=== Finished Real Visual Browser Audit ===');
  return report;
}

runAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
