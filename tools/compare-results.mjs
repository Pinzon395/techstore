import fs from 'node:fs';
import path from 'node:path';

const before = JSON.parse(fs.readFileSync(path.resolve('tools/baseline-raw.json'), 'utf8'));
const after = JSON.parse(fs.readFileSync(path.resolve('tools/after-raw.json'), 'utf8'));

// Map key = `${urlPath}:::${profile}:::${isWarm}`
const beforeMap = new Map();
for (const item of before) {
  const key = `${item.urlPath}:::${item.profile}:::${item.isWarm ? 'warm' : 'cold'}`;
  beforeMap.set(key, item);
}

const comparisons = [];
const uniqueUrls = [...new Set(after.map(a => a.urlPath))];

for (const urlPath of uniqueUrls) {
  const afterItem = after.find(a => a.urlPath === urlPath && a.profile === 'DESKTOP_FAST');
  const afterMid = after.find(a => a.urlPath === urlPath && a.profile === 'MID_MOBILE');
  const afterLow = after.find(a => a.urlPath === urlPath && a.profile === 'LOW_END_MOBILE');

  const beforeColdDesktop = beforeMap.get(`${urlPath}:::DESKTOP_FAST:::cold`) || {};
  const beforeMidCold = beforeMap.get(`${urlPath}:::MID_MOBILE:::cold`) || {};
  const beforeLowCold = beforeMap.get(`${urlPath}:::LOW_END_MOBILE:::cold`) || {};

  comparisons.push({
    urlPath,
    desktop: {
      before: {
        domNodes: beforeColdDesktop.domNodes || 0,
        navNodes: beforeColdDesktop.navNodes || 0,
        navLinks: beforeColdDesktop.navLinks || 0,
        fcp: beforeColdDesktop.fcpMs || 0,
        lcp: beforeColdDesktop.lcpMs || 0,
        cls: beforeColdDesktop.cls || 0,
        longTasks: beforeColdDesktop.longTasksCount || 0,
        htmlKb: beforeColdDesktop.htmlKb || 0,
        jsKb: beforeColdDesktop.jsKb || 0,
        cssKb: beforeColdDesktop.cssKb || 0,
        totalKb: beforeColdDesktop.totalKb || 0,
        requests: beforeColdDesktop.totalRequests || 0,
      },
      after: {
        domNodes: afterItem?.cold?.domNodes || 0,
        navNodes: afterItem?.cold?.navNodes || 0,
        navLinks: afterItem?.cold?.navLinks || 0,
        fcp: Math.round(afterItem?.cold?.fcp || 0),
        lcp: Math.round(afterItem?.cold?.perfData?.lcp || 0),
        cls: Number((afterItem?.cold?.perfData?.cls || 0).toFixed(4)),
        longTasks: afterItem?.cold?.perfData?.longTasksCount || 0,
        htmlKb: Number(((afterItem?.cold?.breakdown?.htmlBytes || 0) / 1024).toFixed(1)),
        jsKb: Number(((afterItem?.cold?.breakdown?.jsBytes || 0) / 1024).toFixed(1)),
        cssKb: Number(((afterItem?.cold?.breakdown?.cssBytes || 0) / 1024).toFixed(1)),
        totalKb: Number(((afterItem?.cold?.breakdown?.totalBytes || 0) / 1024).toFixed(1)),
        requests: afterItem?.cold?.breakdown?.requestCount || 0,
      }
    },
    midMobile: {
      beforeLcp: beforeMidCold.lcpMs || 0,
      afterLcp: Math.round(afterMid?.cold?.perfData?.lcp || 0),
      beforeFcp: beforeMidCold.fcpMs || 0,
      afterFcp: Math.round(afterMid?.cold?.fcp || 0),
    },
    lowEndMobile: {
      beforeLcp: beforeLowCold.lcpMs || 0,
      afterLcp: Math.round(afterLow?.cold?.perfData?.lcp || 0),
      beforeFcp: beforeLowCold.fcpMs || 0,
      afterFcp: Math.round(afterLow?.cold?.fcp || 0),
      beforeLongTasks: beforeLowCold.longTasksCount || 0,
      afterLongTasks: afterLow?.cold?.perfData?.longTasksCount || 0,
    }
  });
}

// Summary metrics
const homeComp = comparisons.find(c => c.urlPath === '/');
const navBefore = homeComp.desktop.before.navNodes;
const navAfter = homeComp.desktop.after.navNodes;
const navDomReductionPct = Math.round(((navBefore - navAfter) / navBefore) * 100);

const totalDomBefore = comparisons.reduce((sum, c) => sum + c.desktop.before.domNodes, 0);
const totalDomAfter = comparisons.reduce((sum, c) => sum + c.desktop.after.domNodes, 0);
const totalDomReductionPct = Math.round(((totalDomBefore - totalDomAfter) / totalDomBefore) * 100);

const homeDesktopBeforeLcp = homeComp.desktop.before.lcp;
const homeDesktopAfterLcp = homeComp.desktop.after.lcp;
const homeMobileBeforeLcp = homeComp.midMobile.beforeLcp;
const homeMobileAfterLcp = homeComp.midMobile.afterLcp;
const homeLowEndBeforeLcp = homeComp.lowEndMobile.beforeLcp;
const homeLowEndAfterLcp = homeComp.lowEndMobile.afterLcp;

console.log('====================================================');
console.log('             PIXON PERFORMANCE SUMMARY');
console.log('====================================================');
console.log(`NAV DOM NODES: ${navBefore} -> ${navAfter} (-${navDomReductionPct}%)`);
console.log(`TOTAL SITE DOM (18 pages): ${totalDomBefore} -> ${totalDomAfter} (-${totalDomReductionPct}%)`);
console.log(`HOME DESKTOP LCP: ${homeDesktopBeforeLcp}ms -> ${homeDesktopAfterLcp}ms`);
console.log(`HOME MID-MOBILE LCP: ${homeMobileBeforeLcp}ms -> ${homeMobileAfterLcp}ms`);
console.log(`HOME LOW-END LCP: ${homeLowEndBeforeLcp}ms -> ${homeLowEndAfterLcp}ms`);
console.log('====================================================');

fs.writeFileSync(path.resolve('tools/final-comparison.json'), JSON.stringify({
  comparisons,
  summary: {
    navBefore,
    navAfter,
    navDomReductionPct,
    totalDomBefore,
    totalDomAfter,
    totalDomReductionPct,
    homeDesktopBeforeLcp,
    homeDesktopAfterLcp,
    homeMobileBeforeLcp,
    homeMobileAfterLcp,
    homeLowEndBeforeLcp,
    homeLowEndAfterLcp,
  }
}, null, 2), 'utf8');

console.log('Final comparison written to tools/final-comparison.json');
