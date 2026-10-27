// Rough Flesch-Kincaid grade of the app's own copy (not Ballotpedia bio text). Usage: node scripts/readability-v7.js
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:3111';
const syl = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const m = w.match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1); };
const fk = (t) => { const sents = t.split(/(?<=[.!?])\s+/).filter((s) => s.split(/\s+/).length > 2); const words = t.split(/\s+/).filter((w) => /[a-z]/i.test(w)); if (!sents.length) return null; const sy = words.reduce((a, w) => a + syl(w), 0); return { grade: +(0.39 * words.length / sents.length + 11.8 * sy / words.length - 15.59).toFixed(1), words: words.length }; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  const pages = [['home', '#/', '.start'], ['election-day', '#/election-day?state=UT', '.edbox'], ['my-choices', '#/choices', '.privacy'], ['about', '#/about', '.prose'], ['results', '#/results?q=84601', '#y2024'], ['ballot 84601 (our notes + labels)', '#/ballot?q=84601', '#s-county']];
  for (const [n, h, w] of pages) {
    await p.goto(BASE + '/' + h, { waitUntil: 'networkidle' }); await p.waitForSelector(w, { timeout: 90000 }); await p.waitForTimeout(500);
    const t = await p.evaluate(() => { const m = document.querySelector('main').cloneNode(true); m.querySelectorAll('select,script,style,svg,.sr,table,.cand,.nm,.meta,.src,a[href^="http"]').forEach((e) => e.remove()); return m.innerText.replace(/\s+/g, ' ').replace(/([a-z0-9"')])\s+(?=[A-Z][a-z])/g, '$1. ').replace(/\.\.+/g, '.'); });
    if (process.env.SHOW) console.log(t); const r = fk(t); console.log(n.padEnd(34), r ? `grade ${r.grade}  (${r.words} words)` : 'n/a');
  }
  await b.close();
})();
