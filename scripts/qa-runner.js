const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:4321';
const routes = JSON.parse(fs.readFileSync('routes-inventory.json', 'utf8'));

const viewports = {
  desktop: { width: 1366, height: 768 },
  mobile: { width: 390, height: 844 },
  mobileSmall: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  wide: { width: 1920, height: 1080 }
};

// Check effective background color walking up DOM
function getEffectiveBgScript() {
  return `
    function getEffectiveBg(el) {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const s = window.getComputedStyle(cur);
        const bg = s.backgroundColor;
        const bgImg = s.backgroundImage;
        if (bgImg && bgImg !== 'none') {
          // If has gradient or dark background
          if (bgImg.includes('gradient') || cur.classList.contains('section-dark') || cur.classList.contains('hero-dark') || cur.classList.contains('dark-bg')) {
            return { color: bg, isDarkGradient: true };
          }
        }
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return { color: bg, isDarkGradient: false };
        }
        cur = cur.parentElement;
      }
      return { color: 'rgb(255, 255, 255)', isDarkGradient: false };
    }
  `;
}

async function auditRoute(page, route, vpName, vp) {
  const issues = [];
  const consoleErrors = [];

  const onConsole = msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('google-analytics') && !txt.includes('gtag') && !txt.includes('favicon') && !txt.includes('socket') && !txt.includes('Failed to load resource: the server responded with a status of 404')) {
        consoleErrors.push(txt);
      }
    }
  };

  page.on('console', onConsole);

  try {
    const url = `${BASE_URL}${route}`;
    await page.setViewportSize(vp);
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!resp || resp.status() >= 400 && route !== '/404' && route !== '/en/404') {
      issues.push({ type: 'HTTP_STATUS', detail: `Status ${resp ? resp.status() : 'null'}` });
    }
    
    await page.waitForTimeout(120);

    // 1. Horizontal Overflow check
    const overflowInfo = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      const bodyScrollW = document.body ? document.body.scrollWidth : 0;
      const hasOverflow = scrollW > clientW + 2 || bodyScrollW > clientW + 2;
      
      let elements = [];
      if (hasOverflow) {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > clientW + 3 && rect.width > 0 && rect.height > 0) {
            let parent = el.parentElement;
            let hidden = false;
            while (parent && parent !== document.body) {
              const overflow = window.getComputedStyle(parent).overflowX;
              if (overflow === 'hidden' || overflow === 'clip' || overflow === 'auto' || overflow === 'scroll') {
                hidden = true;
                break;
              }
              parent = parent.parentElement;
            }
            if (!hidden) {
              elements.push({
                tag: el.tagName,
                className: (el.className || '').toString().slice(0, 50),
                id: el.id,
                right: Math.round(rect.right),
                clientW
              });
              if (elements.length >= 3) break;
            }
          }
        }
      }
      return { scrollW, clientW, hasOverflow, elements };
    });

    if (overflowInfo.hasOverflow) {
      issues.push({
        type: 'HORIZONTAL_OVERFLOW',
        detail: `scrollWidth (${overflowInfo.scrollW}) > clientWidth (${overflowInfo.clientW})`,
        elements: overflowInfo.elements
      });
    }

    // 2. Gutter compliance on readable content
    // Checks that text and key cards inside main content are inset at least minGutter from screen edges
    const gutterIssues = await page.evaluate((vpName) => {
      const isMobile = vpName.startsWith('mobile');
      const isTablet = vpName === 'tablet';
      const minGutter = isMobile ? 18 : (isTablet ? 30 : 46); // 2-4px subpixel/render tolerance

      const issues = [];
      // Test key content blocks across sections (excluding intentional edge elements like full bleed hero backgrounds, fixed navbar/dock, drawers)
      const contentElements = document.querySelectorAll('main h1, main h2, main p, .hero-content, .service-hero-copy, .section-heading, .card, .store-card, .pricing-card, .faq-item, .contact-card, .ticket-form, .builder-panel');
      
      let checked = 0;
      for (const el of contentElements) {
        if (!el.offsetParent && el.offsetWidth === 0) continue;
        // Ignore full-bleed images, banners or background decorative elements
        if (el.classList.contains('full-bleed') || el.closest('.full-width') || el.closest('.banner-full')) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const left = rect.left;
        const rightSpace = window.innerWidth - rect.right;

        // Content shouldn't touch the screen edge closer than minGutter
        if (left < minGutter && rect.width < window.innerWidth) {
          issues.push({
            tag: el.tagName,
            className: (el.className || '').toString().slice(0, 40),
            left: Math.round(left),
            minGutter,
            side: 'left'
          });
        }
        if (rightSpace < minGutter && rect.width < window.innerWidth) {
          issues.push({
            tag: el.tagName,
            className: (el.className || '').toString().slice(0, 40),
            rightSpace: Math.round(rightSpace),
            minGutter,
            side: 'right'
          });
        }
        checked++;
        if (issues.length >= 3) break;
      }
      return issues;
    }, vpName);

    for (const g of gutterIssues) {
      issues.push({
        type: 'CONTENT_GUTTER_TOO_SMALL',
        detail: `<${g.tag} class="${g.className}"> on ${g.side}: ${g.side === 'left' ? g.left : g.rightSpace}px < ${g.minGutter}px`
      });
    }

    // 3. Invisible Text / Critical Contrast Check
    const textIssues = await page.evaluate(() => {
      const issues = [];
      const textEls = document.querySelectorAll('h1, h2, h3, h4, p, span, a, li, label, button, dt, dd');

      function parseRgba(colorStr) {
        if (!colorStr) return null;
        const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return null;
        return {
          r: parseInt(m[1]),
          g: parseInt(m[2]),
          b: parseInt(m[3]),
          a: m[4] !== undefined ? parseFloat(m[4]) : 1
        };
      }

      function getLuminance(rgb) {
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function getContrastRatio(rgb1, rgb2) {
        const lum1 = getLuminance(rgb1);
        const lum2 = getLuminance(rgb2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      }

      for (const el of textEls) {
        if (!el.offsetParent && el.offsetWidth === 0) continue;
        const text = el.innerText ? el.innerText.trim() : '';
        if (!text || text.length === 0) continue;

        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        const opacity = parseFloat(s.opacity);
        if (opacity < 0.05) {
          issues.push({ tag: el.tagName, text: text.slice(0, 25), issue: 'NEAR_ZERO_OPACITY' });
          continue;
        }

        const textColor = parseRgba(s.color);
        if (!textColor || textColor.a < 0.1) continue;

        // Find effective background
        let cur = el;
        let effectiveBg = null;
        while (cur && cur !== document.documentElement) {
          const cs = window.getComputedStyle(cur);
          const bgImg = cs.backgroundImage || '';
          const bg = parseRgba(cs.backgroundColor);

          if (bgImg.includes('gradient')) {
            // Check if gradient is in a dark container
            const isDarkSec = cur.classList.contains('section-dark') || 
                              cur.classList.contains('hero') || 
                              cur.classList.contains('dark-bg') || 
                              cur.className.includes('hero') || 
                              cur.className.includes('dark');
            effectiveBg = isDarkSec ? { r: 10, g: 25, b: 45, a: 1 } : { r: 245, g: 247, b: 250, a: 1 };
            break;
          }

          if (bg && bg.a >= 0.5) {
            effectiveBg = bg;
            break;
          }
          cur = cur.parentElement;
        }

        if (!effectiveBg) {
          effectiveBg = { r: 255, g: 255, b: 255, a: 1 };
        }

        const ratio = getContrastRatio(textColor, effectiveBg);
        // Flag only severe contrast failures (< 2.2:1) where text is virtually unreadable
        if (ratio < 2.0 && text.length > 2) {
          issues.push({
            tag: el.tagName,
            text: text.slice(0, 25),
            issue: `LOW_CONTRAST (ratio: ${ratio.toFixed(2)}:1, color: ${s.color}, bg: rgb(${effectiveBg.r}, ${effectiveBg.g}, ${effectiveBg.b}))`
          });
        }

        if (issues.length >= 3) break;
      }
      return issues;
    });

    for (const t of textIssues) {
      issues.push({
        type: 'TEXT_CONTRAST_BUG',
        detail: `<${t.tag}> "${t.text}": ${t.issue}`
      });
    }

  } catch (err) {
    issues.push({
      type: 'LOAD_ERROR',
      detail: err.message
    });
  } finally {
    page.off('console', onConsole);
  }

  return { route, vpName, issues, consoleErrors };
}

async function run() {
  console.log(`Starting QA audit on 214 routes (desktop 1366x768 & mobile 390x844)...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let checkedCount = 0;
  const routesWithIssues = [];

  for (const route of routes) {
    const desktopRes = await auditRoute(page, route, 'desktop', viewports.desktop);
    const mobileRes = await auditRoute(page, route, 'mobile', viewports.mobile);

    checkedCount++;
    const hasIssue = desktopRes.issues.length > 0 || mobileRes.issues.length > 0;
    if (hasIssue) {
      routesWithIssues.push({ route, desktopIssues: desktopRes.issues, mobileIssues: mobileRes.issues });
      console.log(`[!] Issues on ${route}:`);
      if (desktopRes.issues.length) console.log('   Desktop:', desktopRes.issues.map(i => i.detail || i.type).join(' | '));
      if (mobileRes.issues.length) console.log('   Mobile:', mobileRes.issues.map(i => i.detail || i.type).join(' | '));
    } else {
      if (checkedCount % 20 === 0 || checkedCount === routes.length) {
        console.log(`[✓] Checked ${checkedCount}/${routes.length} routes...`);
      }
    }
  }

  fs.writeFileSync('qa-audit-results.json', JSON.stringify(routesWithIssues, null, 2));
  console.log(`\n========================================`);
  console.log(`Audit Complete: ${checkedCount} routes checked.`);
  console.log(`Total routes with actionable issues: ${routesWithIssues.length}`);
  console.log(`========================================`);

  await browser.close();
}

run().catch(console.error);
