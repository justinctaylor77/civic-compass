// Past election results (MEDSL, CC0) + official live-results links. Everything is read from bundled JSON
// built by scripts/build-results.py, so the app never depends on an outside dataset host at request time.
const fs = require('fs');
const path = require('path');
const { STATES } = require('./states');

const DIR = path.join(__dirname, '..', 'data', 'results');
const LIVE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'live-results.json'), 'utf8'));
const DATES = { 2024: { iso: '2024-11-05', label: 'November 5, 2024' }, 2022: { iso: '2022-11-08', label: 'November 8, 2022' } };
const MEDSL = 'https://electionlab.mit.edu/data';
const cache = new Map();
const load = (st) => {
  if (cache.has(st)) return cache.get(st);
  let d = null;
  try { d = JSON.parse(fs.readFileSync(path.join(DIR, `${st}.json`), 'utf8')); } catch (e) { /* no file */ }
  cache.set(st, d); return d;
};

const DROP = /^(anc\b|advisory neighborhood)/i;
const round1 = (x) => Math.round(x * 10) / 10;

// Merge duplicate candidate rows (same person listed under two party labels) and add percentages.
function decorate(c, kind) {
  const by = new Map();
  for (const [name, party, votes] of c.c) {
    const k = name.toLowerCase();
    if (by.has(k)) by.get(k).votes += votes; else by.set(k, { name, party, votes });
  }
  const rows = [...by.values()].sort((a, b) => b.votes - a.votes);
  const seats = c.n || 1;
  const t = c.t || rows.reduce((s, r) => s + r.votes, 0);
  rows.forEach((r, i) => { r.pct = t ? round1((r.votes / t) * 100) : null; r.won = i < seats; });
  const o = { office: c.o, district: c.d || null, special: !!c.sp, measure: !!c.m, seats, total: t, candidates: rows };
  if (c.more) o.other = { count: c.more[0], votes: c.more[1] };
  if (rows.length > 1 && seats === 1) o.margin = { votes: rows[0].votes - rows[1].votes, points: round1(((rows[0].votes - rows[1].votes) / t) * 100) };
  return o;
}

const district = (d) => String(parseInt(d, 10));
function yearView(doc, y, { countyFips, cd, countyName }) {
  const v = doc && doc.years && doc.years[y];
  const base = { year: Number(y), date: DATES[y].label, dateISO: DATES[y].iso, available: !!v };
  if (!v) return base;
  const keep = (c) => !DROP.test(c.o);
  const house = v.house.filter(keep).map((c) => decorate(c));
  const out = {
    ...base,
    snapshot: doc.built,
    statewide: v.statewide.filter(keep).map((c) => decorate(c)),
    house: cd == null ? house : house.filter((c) => !c.district || district(c.district) === String(cd) || /at.large/i.test(c.district)),
    allHouseCount: house.length,
    ballots: v.ballots || null, registered: v.registered || null,
    topVotes: v.topVotes ? { office: v.topVotes[0], votes: v.topVotes[1] } : null,
    source: { name: 'MIT Election Data + Science Lab (MEDSL) — official precinct-level returns, public domain (CC0)', file: v.source.file, repo: v.source.repo, dataverse: v.source.dataverse, about: MEDSL },
  };
  if (countyFips && v.counties && v.counties[countyFips]) {
    const c = v.counties[countyFips];
    out.county = { fips: countyFips, name: countyName || c.name, ballots: c.ballots || null, registered: c.registered || null, contests: c.contests.filter(keep).map((x) => decorate(x)) };
  }
  return out;
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, ' ').replace(/\b(jr|sr|ii|iii|iv)\b/g, '').split(/\s+/).filter(Boolean);
const sameCandidate = (a, b) => {
  const x = norm(a), y = norm(b);
  if (!x.length || !y.length) return false;
  return x[x.length - 1] === y[y.length - 1] && x[0].slice(0, 3) === y[0].slice(0, 3);
};

// Past results for the names on this year's ballot (matched on last name + first 3 letters, same state).
function history(doc, names) {
  const hits = [];
  if (!doc) return hits;
  for (const y of ['2024', '2022']) {
    const v = doc.years[y]; if (!v) continue;
    const pools = [...v.statewide, ...v.house].filter((c) => !c.m && !DROP.test(c.o));
    for (const name of names) for (const c of pools) {
      const row = decorate(c);
      const r = row.candidates.find((r2) => sameCandidate(r2.name, name));
      if (r) hits.push({ forName: name, year: Number(y), office: c.o + (c.d ? ` District ${district(c.d)}` : ''), resultName: r.name, party: r.party, votes: r.votes, pct: r.pct, won: r.won, total: row.total, margin: row.margin || null });
    }
  }
  return hits;
}

const CAVEAT = {
  AK: 'Alaska counts ranked-choice ballots; the numbers shown are first-choice votes as reported in the dataset, which may not decide the winner.',
  ME: 'Maine uses ranked-choice voting for some contests; the numbers shown are first-choice votes as reported in the dataset.',
  LA: 'Louisiana has used different election formats (open primaries and runoffs) in different years, so a single November table may not tell the whole story.',
  GA: 'Georgia holds runoffs for some contests when no one wins a majority; runoff results are not included here.',
};

function view({ state, countyFips, cd, names, countyName }) {
  const abbr = String(state || '').toUpperCase();
  if (!STATES[abbr]) { const e = new Error('Choose a state to see its past results.'); e.status = 400; throw e; }
  const doc = load(abbr);
  const live = LIVE.states[abbr] || {};
  const caveats = [
    'Only November general elections are shown (not primaries, runoffs or special elections). “Winner” means the candidate with the most votes in the data; the result was certified by the state.',
    'District lines can change between elections (for example after redistricting). U.S. House results are for the district numbers used in that year, which may cover different areas than the district you vote in today.',
    'In some contests the source lists a governor and running mate (or other ticket) as one line. Names appear exactly as the source reports them.',
    'Percentages are each candidate’s share of all votes cast in that contest, rounded to one decimal. Some contests list only the top candidates; the rest appear as “other candidates”.',
  ];
  if (CAVEAT[abbr]) caveats.push(CAVEAT[abbr]);
  if (abbr === 'UT') caveats.push('Utah’s U.S. House districts were redrawn for the 2026 elections, so district numbers in the 2024 and 2022 results below may cover different areas than they do today.');
  const out = {
    state: { abbr, name: STATES[abbr] },
    years: { 2024: yearView(doc, '2024', { countyFips, cd, countyName }), 2022: yearView(doc, '2022', { countyFips, cd, countyName }) },
    live: {
      pollsClose: 'Polls close Tuesday, November 3, 2026 (times vary by state and time zone).',
      results: live.results || null, office: live.office || null, note: live.officeNote || null, checkedOn: LIVE.checkedOn,
      explain: 'Until then, the official state links below are where results will be posted first. Early numbers are unofficial and change as ballots are counted; official results are certified days or weeks later.',
    },
    caveats, snapshot: doc && doc.built || null,
    generatedAt: new Date().toISOString(),
  };
  if (names && names.length) out.history = history(doc, names);
  return out;
}

const states = () => Object.entries(STATES).map(([abbr, name]) => ({ abbr, name, hasData: fs.existsSync(path.join(DIR, `${abbr}.json`)) }));
module.exports = { view, states, load, history, DATES };
