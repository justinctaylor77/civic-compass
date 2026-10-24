// v6 screenshots. Usage: BASE=http://localhost:3111 node scripts/screenshots-v6.js  (writes screenshots/v6/)
const { chromium } = require('playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3111';
const OUT = path.join(__dirname, '..', 'screenshots', 'v6');
const VIEWS = { mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }, desktop: { width: 1280, height: 900 } };
// [name, hash, waitSelector, shotSelector|null (viewport), clipPx|null (cap element height)]
const PAGES = [
  ['01-home-tab', '#/', '.feature', null, null],
  ['02-results-empty', '#/results', '.lookup', null, null],
  ['03-results-84601-top', '#/results?q=84601', '#y2024', '.results-hero', null],
  ['04-results-84601-live', '#/results?q=84601', '#y2024', '#live', null],
  ['05-results-84601-2024', '#/results?q=84601', '#y2024', '#y2024', 1800],
  ['06-results-84601-history', '#/results?q=84601', '#y2024', '#past', null],
  ['07-results-84101', '#/results?q=84101', '#y2024', '#y2024', 1800],
  ['08-results-43215', '#/results?q=43215', '#y2024', '#y2024', 1800],
  ['09-results-82001-cheyenne', '#/results?q=82001', '#y2024', '#y2024', 1800],
  ['10-results-state-UT', '#/results?state=UT', '#y2024', '#glance', null],
  ['11-ballot-84101-county', '#/ballot?q=84101', '#s-county', '#s-county', null],
  ['12-ballot-84101-city', '#/ballot?q=84101', '#s-city', '#s-city', null],
  ['13-ballot-84601-county', '#/ballot?q=84601', '#s-county', '#s-county', null],
  ['14-ballot-43215-county-city', '#/ballot?q=43215', '#s-county', '#s-county', null],
  ['15-ballot-82001-county', '#/ballot?q=82001', '#s-county', '#s-county', null],
  ['16-ballot-82001-city', '#/ballot?q=82001', '#s-city', '#s-city', null],
  ['17-ballot-84780-city-measure', '#/ballot?q=84780', '#s-city', '#s-city', null],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [vn, vp] of Object.entries(VIEWS)) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    for (const [name, hash, wait, sel, cap] of PAGES) {
      await p.goto(BASE + '/' + hash, { waitUntil: 'networkidle' });
      await p.reload({ waitUntil: 'networkidle' });
      try { await p.waitForSelector(wait, { timeout: 60000 }); } catch (e) { console.log('MISSING', vn, name, wait); continue; }
      await p.waitForTimeout(400);
      const file = path.join(OUT, `${vn}-${name}.png`);
      if (!sel) await p.screenshot({ path: file, fullPage: name.startsWith('01') || name.startsWith('02') });
      else if (cap) { const bb = await p.locator(sel).first().boundingBox(); await p.screenshot({ path: file, fullPage: true, clip: { x: Math.max(0, bb.x - 8), y: bb.y, width: Math.min(bb.width + 16, vp.width), height: Math.min(bb.height, cap) } }); }
      else await p.locator(sel).first().screenshot({ path: file });
      console.log('shot', vn, name);
    }
    if (errs.length) console.log('ERRORS', vn, [...new Set(errs)]);
    await ctx.close();
  }
  await b.close();
})();
