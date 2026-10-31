// v8 screenshots (live results). The server must run with LIVE_TEST_MODE=1 for the past-election shots:
//   LIVE_TEST_MODE=1 PORT=3111 node server/index.js &   BASE=http://localhost:3111 node scripts/screenshots-v8.js
// Writes screenshots/v8/. The home banner shot fakes the browser clock to election night (server is untouched).
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3111';
const OUT = path.join(__dirname, '..', 'screenshots', 'v8');
fs.mkdirSync(OUT, { recursive: true });
const VIEWS = { mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 900 } };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [vn, vp] of Object.entries(VIEWS)) {
    const mk = async (size, hc, fakeNow) => {
      const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, serviceWorkers: 'block' });
      await ctx.addInitScript(([s, h]) => { localStorage.setItem('cc-size', s); localStorage.setItem('cc-contrast', h); localStorage.setItem('cc-last', '84101'); }, [size, hc]);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      if (fakeNow) await p.clock.setFixedTime(new Date(fakeNow));
      return { ctx, p, errs };
    };
    const go = async (p, hash, wait) => { await p.goto(BASE + '/' + hash, { waitUntil: 'networkidle' }); await p.waitForSelector(wait, { timeout: 120000 }); await p.waitForTimeout(600); };
    const shot = async (p, name, sel, opts = {}) => {
      const file = path.join(OUT, `${vn}-${name}.png`);
      if (!sel) return p.screenshot({ path: file, fullPage: !!opts.full });
      await p.locator(sel).first().scrollIntoViewIfNeeded();
      const bb = await p.locator(sel).first().boundingBox();
      await p.screenshot({ path: file, fullPage: true, clip: { x: 0, y: Math.max(0, bb.y + (await p.evaluate(() => scrollY)) - 8), width: vp.width, height: Math.min(bb.height + 16, opts.cap || 2600) } });
    };
    const LIVE_READY = '#lr-body .live-box, #lr-body .lrace, #lr-body .lr-test';
    for (const [tag, size, hc] of [['normal', '1', '0'], ['largest', '3', '0'], ['largest-high-contrast', '3', '1']]) {
      const { ctx, p, errs } = await mk(size, hc);
      await go(p, '#/results?q=84101', LIVE_READY); await shot(p, `${tag}-01-before-polls-close-UT-84101`, '#live');
      await go(p, '#/results?q=82001', LIVE_READY); await shot(p, `${tag}-02-no-feed-WY-82001`, '#live');
      await go(p, '#/results?q=44113', LIVE_READY); await shot(p, `${tag}-03-ohio-outside-franklin-44113`, '#live');
      await go(p, '#/results?q=84101&test=past', '#lr-body .lrace'); await shot(p, `${tag}-04-TEST-past-utah-2024-84101`, '#live', { cap: 3200 });
      await go(p, '#/results?q=43215&test=past', '#lr-body .lr-test'); await shot(p, `${tag}-05-TEST-past-franklin-june2026-43215`, '#live', { cap: 3200 });
      if (errs.length) console.log(vn, tag, 'errors:', errs);
      await ctx.close();
    }
    for (const [tag, size, hc] of [['normal', '1', '0'], ['largest', '3', '0']]) {
      const { ctx, p, errs } = await mk(size, hc, '2026-11-03T20:15:00-07:00');
      await go(p, '#/', '.en-banner'); await shot(p, `${tag}-06-home-election-night-banner`, null);
      if (errs.length) console.log(vn, 'banner errors:', errs);
      await ctx.close();
    }
  }
  await b.close();
  console.log('done ->', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
