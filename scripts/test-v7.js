// v7 first-time-mobile-user test. Usage: BASE=http://localhost:3111 node scripts/test-v7.js
// Checks, per zip x (normal | largest text | high contrast): JS errors, sideways overflow, clipped elements, tap targets < 48px, axe-core (wcag2a/aa).
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3111';
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ZIPS = (process.env.ZIPS || '84101,84601,43215,82001').split(',');
const MODES = { normal: { size: '1', hc: '0' }, largest: { size: '3', hc: '0' }, 'high-contrast': { size: '3', hc: '1' } };
const PAGE_FILTER = process.env.ONLY;
const audit = () => {
  const vw = document.documentElement.clientWidth, out = { overflow: [], small: [] };
  out.scrollW = document.documentElement.scrollWidth; out.vw = vw;
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); };
  document.querySelectorAll('body *').forEach((e) => {
    if (!vis(e) || e.closest('.sr,svg,.flagband,.hero-art,.wave') || e.classList.contains('skip') || e.closest('thead')) return;
    const r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) { const cs = getComputedStyle(e); if (cs.position !== 'fixed') out.overflow.push((e.tagName + '.' + (e.className && e.className.baseVal === undefined ? e.className : '')).slice(0, 50) + ' ' + Math.round(r.left) + '→' + Math.round(r.right) + ' "' + (e.textContent || '').trim().slice(0, 25) + '"'); }
  });
  document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]').forEach((e) => {
    if (!vis(e) || e.closest('.sr') || e.classList.contains('skip')) return;
    let r = e.getBoundingClientRect();
    // the glossary "?" has a 12px invisible hit-area ring around it (::after inset:-12px)
    if (e.classList.contains('tip')) r = { width: r.width + 24, height: r.height + 24 };
    // inline text links inside a sentence are exempt (WCAG 2.5.8 "inline" exception); standalone controls must be >= 48px tall
    const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,li,dd,td,.src,.note,.sub,.hint,.foot-inner');
    if (!inline && (r.height < 47.5 || r.width < 47.5)) out.small.push(e.tagName + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  return out;
};
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const results = []; let bad = 0;
  for (const [mname, m] of Object.entries(MODES)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript((m) => { try { localStorage.setItem('cc-size', m.size); localStorage.setItem('cc-contrast', m.hc); } catch (e) {} }, m);
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (x) => x.type() === 'error' && !/favicon|Failed to load resource.*(40[34]|5\d\d)/.test(x.text()) && errs.push(x.text()));
    const run = async (label, hash, wait) => {
      if (PAGE_FILTER && !label.includes(PAGE_FILTER)) return;
      await p.goto(BASE + '/' + hash, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' });
      try { await p.waitForSelector(wait, { timeout: 60000 }); } catch (e) { results.push(`${mname} ${label}: MISSING ${wait}`); bad++; return; }
      await p.waitForTimeout(300);
      await p.addScriptTag({ content: axeSrc });
      const a = await p.evaluate(audit);
      const ax = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations'] }));
      const serious = ax.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
      const minor = ax.violations.filter((v) => !['serious', 'critical'].includes(v.impact));
      const sideways = a.scrollW > a.vw + 1;
      const line = `${mname.padEnd(13)} ${label.padEnd(26)} sideways=${sideways ? 'YES(' + a.scrollW + '>' + a.vw + ')' : 'no'} clipped=${a.overflow.length} small=${a.small.length} axe-serious=${serious.length} axe-other=${minor.length}`;
      results.push(line);
      if (sideways || a.overflow.length || a.small.length || serious.length || (process.env.STRICT && minor.length)) bad++;
      for (const s of a.overflow.slice(0, 6)) results.push('    clipped: ' + s);
      for (const s of a.small.slice(0, 8)) results.push('    small:   ' + s);
      for (const v of serious.concat(minor)) results.push(`    axe ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' | ' + (n.any[0] || n.all[0] || n.none[0] || {}).message).join(' ;; ').slice(0, 400)}`);
    };
    await run('home', '#/', '.start');
    await run('election-day', '#/election-day', '.statepick');
    await run('my-choices(empty)', '#/choices', '.privacy');
    await run('about', '#/about', '.prose');
    await run('results-empty', '#/results', '.lookup');
    for (const z of ZIPS) {
      await run(`ballot ${z}`, `#/ballot?q=${z}`, '.sect');
      await run(`results ${z}`, `#/results?q=${z}`, '#y2024');
    }
    // a candidate page: first candidate link on the ballot
    for (const z of ZIPS.slice(0, 2)) {
      await p.goto(BASE + `/#/ballot?q=${z}`, { waitUntil: 'networkidle' }); if (PAGE_FILTER && !'candidate'.includes(PAGE_FILTER)) continue; await p.waitForSelector('a.cand', { timeout: 90000 }); const href = await p.getAttribute('a.cand', 'href');
      await run(`candidate ${z}`, href, '.cand-head');
    }
    if (errs.length) { results.push(`${mname}: JS/console errors: ` + [...new Set(errs)].slice(0, 5).join(' | ')); bad++; }
    await ctx.close();
  }
  console.log(results.join('\n')); console.log(bad ? `\n${bad} problem page(s)` : '\nALL CLEAN');
  await b.close(); process.exit(bad ? 1 : 0);
})();
