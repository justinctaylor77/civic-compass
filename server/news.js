// News via Google News RSS (public, no key), grouped by the outlet's AllSides rating.
const Parser = require('rss-parser');
const path = require('path');
const { cached } = require('./util');
const AS = require(path.join(__dirname, '..', 'data', 'allsides.json'));
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 CivicCompass/0.1' } });
const norm = (s) => String(s || '').toLowerCase().replace(/\.(com|org|net)\b/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const idx = new Map(AS.outlets.map((o) => [norm(o.name), o]));
// Only maps the *name Google News uses* to the *name AllSides uses*. Ratings always come from the dataset.
const ALIAS = { 'fox news': 'Fox Online News', 'cnn': 'CNN (Web News)', 'new york times': 'New York Times - News', 'npr': 'NPR Online News', 'wall street journal': 'Wall Street Journal - News', 'wsj': 'Wall Street Journal - News', 'nbc news': 'NBCNews.com', 'ap news': 'Associated Press', 'ap': 'Associated Press', 'ksl com': 'KSL', 'ksl newsradio': 'KSL', 'washington post': 'Washington Post', 'usa today': 'USA TODAY', 'abc news': 'ABC News', 'cbs news': 'CBS News', 'bbc': 'BBC News', 'fox news digital': 'Fox Online News', 'new york post': 'New York Post', 'yahoo news': 'Yahoo! News', 'yahoo': 'Yahoo! News' };
function rate(source) {
  const n = norm(source);
  const a = ALIAS[n];
  const o = a ? AS.outlets.find((x) => x.name === a) : idx.get(n);
  return o || null;
}
const GROUP = { Left: 'left', 'Lean Left': 'left', Center: 'center', 'Lean Right': 'right', Right: 'right' };

async function newsFor({ name, state, office }) {
  const key = `news:${name}:${state}:${office}`;
  return cached(key, 45 * 60e3, async () => {
    const q = `"${name}" ${office && /state|county|city|school|council|mayor|judge|court|commission/i.test(office) ? state + ' ' : ''}${state || ''} when:365d`.replace(/\s+/g, ' ');
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(url);
    const lastName = norm(name).split(' ').pop();
    const seen = new Set();
    const items = [];
    for (const it of feed.items || []) {
      const t = it.title || '';
      const i = t.lastIndexOf(' - ');
      const headline = i > 0 ? t.slice(0, i) : t;
      const source = (it.creator || (i > 0 ? t.slice(i + 3) : '')).trim();
      if (!norm(headline).includes(lastName)) continue; // relevance filter: headline must mention the candidate
      const k = norm(headline);
      if (seen.has(k)) continue; seen.add(k);
      const r = rate(source);
      items.push({ headline, source, link: it.link, date: it.isoDate || it.pubDate || null, lean: r ? r.rating : null, group: r ? GROUP[r.rating] : 'unrated', asUrl: r ? r.url : null });
    }
    const groups = { left: [], center: [], right: [], unrated: [] };
    for (const it of items) groups[it.group].push(it);
    for (const g of Object.values(groups)) g.sort((a, b) => new Date(b.date) - new Date(a.date));
    return { query: q, searchUrl: `https://news.google.com/search?q=${encodeURIComponent(q)}`, total: items.length, groups: { left: groups.left.slice(0, 5), center: groups.center.slice(0, 5), right: groups.right.slice(0, 5), unrated: groups.unrated.slice(0, 6) }, counts: { left: groups.left.length, center: groups.center.length, right: groups.right.length, unrated: groups.unrated.length }, fetchedAt: new Date().toISOString() };
  });
}
module.exports = { newsFor, rate, SOURCE: { name: AS.source, url: AS.sourceUrl, dataset: AS.datasetUrl, note: AS.note } };
