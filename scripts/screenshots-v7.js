// v7 screenshots. Usage: BASE=http://localhost:3111 node scripts/screenshots-v7.js  (writes screenshots/v7/)
const { chromium } = require('playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3111';
const OUT = path.join(__dirname, '..', 'screenshots', 'v7');
const VIEWS = { mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 900 } };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [vn, vp] of Object.entries(VIEWS)) {
    const mk = async (size, hc) => {
      const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, serviceWorkers: 'block' });
      await ctx.addInitScript(([s, h]) => { if (!sessionStorage.getItem('cc-init')) { sessionStorage.setItem('cc-init', '1'); localStorage.setItem('cc-size', s); localStorage.setItem('cc-contrast', h); } }, [size, hc]);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); return { ctx, p, errs };
    };
    const go = async (p, hash, wait) => { await p.goto(BASE + '/' + hash, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector(wait, { timeout: 90000 }); await p.waitForTimeout(500); };
    const shot = async (p, name, sel, opts = {}) => {
      const file = path.join(OUT, `${vn}-${name}.png`);
      if (!sel) return p.screenshot({ path: file, fullPage: !!opts.full });
      await p.locator(sel).first().scrollIntoViewIfNeeded();
      const bb = await p.locator(sel).first().boundingBox();
      await p.screenshot({ path: file, fullPage: true, clip: { x: 0, y: Math.max(0, bb.y + (await p.evaluate(() => scrollY)) - (opts.pad || 8)), width: vp.width, height: Math.min(bb.height + 16, opts.cap || 2400) } });
    };
    // normal text (the app's default is already large)
    let { ctx, p, errs } = await mk('1', '0');
    await go(p, '#/', '.start');
    await shot(p, '01-home-start-here', '.start', { cap: 2200 });
    await shot(p, '01b-home-top', null);
    await go(p, '#/ballot?q=84601', '.sect');
    await shot(p, '03-ballot-84601', '#s-county', { cap: 2000 });
    // mark two choices on the ballot, then open the candidate page + My choices
    const picks = p.locator('button.pick'); const n = await picks.count();
    for (let i = 0; i < Math.min(n, 3); i++) await picks.nth(i).click();
    await shot(p, '03b-ballot-marked-choices', '#s-county', { cap: 2400 });
    const href = await p.getAttribute('a.cand', 'href');
    await go(p, href, '.cand-head');
    await shot(p, '04-candidate', null, { full: false });
    await shot(p, '04b-candidate-full', null, { full: true });
    await go(p, '#/choices', '.privacy');
    await shot(p, '05-my-choices', null, { full: true });
    await p.emulateMedia({ media: 'print' }); await shot(p, '06-print-view', null, { full: true }); await p.emulateMedia({ media: 'screen' });
    await go(p, '#/ballot?q=84601', '#edbox');
    await shot(p, '07-election-day-box', '#edbox', { cap: 2400 });
    await go(p, '#/election-day', '.statepick');
    await shot(p, '07b-election-day-page', null, { full: false });
    if (errs.length) console.log(vn, 'normal errors:', errs);
    await ctx.close();
    // largest text
    ({ ctx, p, errs } = await mk('3', '0'));
    await go(p, '#/', '.start');
    await shot(p, '02-text-size-largest-home', null, { full: false });
    await shot(p, '02b-text-size-largest-start-here', '.start', { cap: 2600 });
    await go(p, '#/ballot?q=84601', '.sect');
    await shot(p, '02c-text-size-largest-ballot', '#s-county', { cap: 2600 });
    await shot(p, '02d-text-size-largest-header', '.top');
    await go(p, '#/ballot?q=84601', '#edbox');
    await shot(p, '07c-election-day-box-largest', '#edbox', { cap: 3000 });
    if (errs.length) console.log(vn, 'largest errors:', errs);
    await ctx.close();
    // high contrast
    ({ ctx, p, errs } = await mk('2', '1'));
    await go(p, '#/', '.start');
    await shot(p, '08-high-contrast-home', null, { full: false });
    await go(p, '#/ballot?q=84601', '.sect');
    await shot(p, '08b-high-contrast-ballot', '#s-county', { cap: 2200 });
    if (errs.length) console.log(vn, 'hc errors:', errs);
    await ctx.close();
  }
  await b.close(); console.log('done');
})();
