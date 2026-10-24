// Usage: BASE=http://localhost:3111 node scripts/screenshots.js
const { chromium } = require('playwright-core');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3111';
const OUT = path.join(__dirname, '..', 'screenshots', process.env.SUB || '');
const VIEWS = { mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }, desktop: { width: 1280, height: 900 } };
const PAGES = [
  ['01-home', '#/', null],
  ['02-ballot-84101-top', '#/ballot?q=84101', '.where'],
  ['03-ballot-84101-state', '#/ballot?q=84101', '#s-state'],
  ['04-ballot-43215-county', '#/ballot?q=43215', '#s-county'],
  ['05-candidate-mcadams', '#/candidate?name=Ben%20McAdams&slug=Ben_McAdams_(Utah)&office=U.S.%20House%20Utah%20District%201&level=federal&state=UT&party=Democratic&q=84101', '#p-bg'],
  ['06-candidate-news', '#/candidate?name=Ben%20McAdams&slug=Ben_McAdams_(Utah)&office=U.S.%20House%20Utah%20District%201&level=federal&state=UT&party=Democratic&q=84101', '#p-news', true],
  ['07-about', '#/about', null],
];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [vn, vp] of Object.entries(VIEWS)) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    for (const [name, hash, sel, news] of PAGES) {
      await p.goto(BASE + '/' + hash, { waitUntil: 'networkidle' });
      await p.reload({ waitUntil: 'networkidle' });
      if (hash.includes('ballot') || hash.includes('candidate')) await p.waitForSelector('.sect, .panel', { timeout: 60000 });
      if (news) await p.waitForSelector('.news3, #news .limited', { timeout: 60000 });
      await p.waitForTimeout(500);
      const full = !sel || name.startsWith('01') || name.startsWith('07');
      if (sel && !full) await p.locator(sel).first().screenshot({ path: path.join(OUT, `${vn}-${name}.png`) });
      else await p.screenshot({ path: path.join(OUT, `${vn}-${name}.png`), fullPage: false });
      if (name === '05-candidate-mcadams' || name === '02-ballot-84101-top') await p.screenshot({ path: path.join(OUT, `${vn}-${name}-fullpage.png`), fullPage: true });
      console.log('shot', vn, name);
    }
    await ctx.close();
  }
  await b.close();
})();
