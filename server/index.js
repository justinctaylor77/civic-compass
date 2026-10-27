const express = require('express');
const compression = require('compression');
const path = require('path');
const { resolve, parseQuery } = require('./geo');
const { buildBallot } = require('./ballot');
const bp = require('./ballotpedia');
const fec = require('./fec');
const congress = require('./congress');
const civic = require('./civic');
const news = require('./news');
const { scrub } = require('./util');
const { STATES } = require('./states');
const results = require('./results');
const electionday = require('./electionday');

const PORT = process.env.PORT || 3000;
const ELECTION = { date: '2026-11-03', label: 'Tuesday, November 3, 2026' };
const app = express();
app.disable('x-powered-by');
app.use(compression());
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { const s = e.status && e.status < 600 ? e.status : 500; if (s >= 500) console.error('ERR', req.path, scrub(e.message)); res.status(s).json({ error: s >= 500 ? 'Something went wrong while looking that up. Please try again in a moment.' : e.message }); });
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/api/status', (req, res) => res.json({
  election: ELECTION,
  keys: { GOOGLE_CIVIC_API_KEY: civic.enabled(), FEC_API_KEY: !fec.usingDemo(), CONGRESS_API_KEY: !congress.usingDemo() },
  note: 'true = key configured. Without keys the app falls back to free public sources.',
}));

app.get('/api/ballot', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const loc = await resolve(q);
  const [{ out, sources, warnings }, cv] = await Promise.all([buildBallot(loc), loc.type === 'address' ? civic.voterInfo(q) : Promise.resolve({ enabled: civic.enabled(), skipped: true })]);
  res.json({
    election: ELECTION, location: loc, ballot: out, sources, warnings,
    civic: cv, stateInfo: electionday.info(loc.state.abbr), generatedAt: new Date().toISOString(),
  });
}));

// Election Day help links for one state (?state=UT)
app.get('/api/election-day', (req, res) => { const i = electionday.info(req.query.state); if (!i) return res.status(404).json({ error: 'Please pick a state.' }); res.json(i); });

// Past results (bundled MEDSL data) + official live-results links. ?state=UT[&county=49049&cd=3] or ?q=<zip/city/address>
app.get('/api/results', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q && !req.query.state) return res.json({ states: results.states() });
  let state = req.query.state, countyFips = req.query.county, cd = req.query.cd, names = [], location = null, countyName = null;
  if (q) {
    const loc = await resolve(q);
    state = loc.state.abbr; countyFips = loc.county && loc.county.fips; cd = loc.cd && !loc.cd.atLarge ? loc.cd.number : null; location = loc; countyName = loc.county && loc.county.name;
    try {
      const { out } = await buildBallot(loc);
      names = [...out.federal.races, ...out.state.races].flatMap((r) => r.candidates.map((c) => c.name));
    } catch (e) { /* history is optional */ }
  }
  const v = results.view({ state, countyFips, cd: cd == null || cd === '' ? null : Number(cd), names, countyName });
  if (location) v.location = { label: [location.cityName, location.state.abbr].filter(Boolean).join(', '), county: location.county, cd: location.cd, input: location.input };
  res.json(v);
}));

const parseDistrict = (office) => { const m = String(office).match(/District (\d+)$/); return m ? m[1].padStart(2, '0') : null; };
app.get('/api/candidate', wrap(async (req, res) => {
  const { slug, name, office = '', level = '', state = '' } = req.query;
  if (!name) return res.status(400).json({ error: 'Missing candidate name.' });
  const abbr = String(state).toUpperCase();
  const stateName = STATES[abbr] || null;
  const out = { name, office, level, state: abbr, sources: [], notes: [], generatedAt: new Date().toISOString() };
  const tasks = [];
  if (slug) tasks.push(bp.candidatePage(String(slug)).then((p) => { out.bio = p; out.sources.push({ label: `Ballotpedia: ${p.title}`, url: p.url }); }).catch((e) => { out.bioError = 'Ballotpedia page unavailable right now.'; }));
  else out.notes.push('Ballotpedia has no page for this candidate, so only the information on the ballot is shown.');
  const isH = /^U\.S\. House/.test(office), isS = /^U\.S\. Senate/.test(office);
  if (level === 'federal' && (isH || isS)) {
    out.federal = true;
    tasks.push((async () => {
      const f = await fec.findCandidate(name, { office: isH ? 'H' : 'S', state: abbr, district: isH ? (/at.large/i.test(office) ? '00' : parseDistrict(office)) : undefined });
      if (f.match) {
        out.fec = { id: f.match.candidate_id, name: f.match.name, party: f.match.party_full, incumbentChallenge: f.match.incumbent_challenge_full, url: `https://www.fec.gov/data/candidate/${f.match.candidate_id}/`, demoKey: fec.usingDemo() };
        out.sources.push({ label: 'FEC candidate page', url: out.fec.url });
        out.fec.totals = await fec.totals(f.match.candidate_id);
      } else out.fec = { notFound: true, ambiguous: !!f.ambiguous, searchUrl: `https://www.fec.gov/data/candidates/?search=${encodeURIComponent(name)}&election_year=2026` };
    })().catch((e) => { out.fec = { error: true, message: /429/.test(e.message) ? 'The FEC data service is busy right now (shared public rate limit). Please try again in a minute.' : 'The FEC data service could not be reached.', searchUrl: `https://www.fec.gov/data/candidates/?search=${encodeURIComponent(name)}&election_year=2026` }; }));
    tasks.push((async () => {
      const m = await congress.findMember(name, abbr, isH ? 'rep' : 'sen');
      if (!m) return;
      out.member = m; out.sources.push({ label: 'Congress.gov member page', url: m.congressUrl });
      const sp = await congress.sponsored(m.bioguide);
      if (sp.bills) sp.bills.sort((a, b) => String(b.introduced).localeCompare(String(a.introduced)));
      out.sponsored = sp;
    })().catch(() => {}));
  }
  await Promise.all(tasks);
  res.json(out);
}));

app.get('/api/news', wrap(async (req, res) => {
  const { name, state = '', office = '' } = req.query;
  if (!name) return res.status(400).json({ error: 'Missing name.' });
  try { res.json({ ...(await news.newsFor({ name: String(name), state: STATES[String(state).toUpperCase()] || '', office: String(office) })), source: news.SOURCE }); }
  catch (e) { res.json({ error: true, message: 'The news search could not be reached right now.', searchUrl: `https://news.google.com/search?q=${encodeURIComponent('"' + name + '"')}`, source: news.SOURCE }); }
}));

const pub = path.join(__dirname, '..', 'public');
app.use(express.static(pub, { setHeaders: (res, p) => { if (p.endsWith('sw.js') || p.endsWith('.html') || p.endsWith('.webmanifest')) res.set('Cache-Control', 'no-cache'); else if (p.includes('/img/hero/')) res.set('Cache-Control', 'public, max-age=31536000, immutable'); } }));
app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(pub, 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`Civic Compass listening on 0.0.0.0:${PORT}`));
