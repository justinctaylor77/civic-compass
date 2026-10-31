// v8 Live Results: official, free, machine-readable election-night feeds only (no AP / Decision Desk, no scraping of
// sites that forbid it). One shared server cache per feed: upstream is polled at most once every LIVE_POLL_SECONDS
// (default 180) no matter how many people are looking, and only after that state's polls close.
//
// Adapters
//   utah-ev          Utah Lt. Governor results site (Enhanced Voting). Public JSON used by the official site itself:
//                    GET {api}/jurisdictions/Utah                    -> list of elections (publicElectionId, electionDate)
//                    GET {api}/elections/{jurisdiction}/{id}/data    -> election + ballotItems (contests, votes, reporting)
//                    County feeds use the county shortName (e.g. salt-lake-county-ut) from jurisdiction.childLocalities.
//   hart-liveresults Hart InterCivic "Live Results" (Franklin County, OH). Static files the official page offers as downloads:
//                    {base}/{id}/en/index_{id}.html (title, Unofficial/Official label), {base}/{id}/summary_{id}.xml (totals)
//
// Feed IDs come from data/live-feeds.json and can be overridden with env vars (no code change). See HANDOFF.md.
const fs = require('fs');
const path = require('path');
const { cached, fetchText, fetchJSON } = require('./util');
const { STATES } = require('./states');

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'live-feeds.json'), 'utf8'));
const LINKS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'live-results.json'), 'utf8'));
const POLL_MS = Math.max(120, Number(process.env.LIVE_POLL_SECONDS) || 180) * 1000;
const TEST_ENABLED = process.env.LIVE_TEST_MODE === '1';
const OFF = process.env.LIVE_RESULTS_OFF === '1'; // emergency switch: show only official links
const ELECTION_DAY = '2026-11-03';
const UT_TZ_LABEL = { 'America/Denver': 'MST', 'America/New_York': 'EST' };

const feedId = (f) => (f.env && process.env[f.env] ? String(process.env[f.env]).trim() : f.electionId);
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const norm = (s) => String(s || '').toLowerCase().replace(/\(multi-county\)/g, '').replace(/\s+/g, ' ').trim();
const en = (arr) => { const x = (arr || []).find((t) => t.languageId === 'en') || (arr || [])[0]; return x ? String(x.text || '').trim() : ''; };
const numIn = (s, re) => { const m = String(s).match(re); return m ? String(parseInt(m[1], 10)) : null; };

/* ---------- classification: which section a contest belongs to, and is it on this person's ballot? ---------- */
function classify(name, loc) {
  const n = String(name);
  const cd = loc.cd && loc.cd.number != null ? String(Number(loc.cd.number)) : null;
  const up = loc.sldu && loc.sldu.base ? String(parseInt(loc.sldu.base, 10)) : null;
  const lo = loc.sldl && loc.sldl.base ? String(parseInt(loc.sldl.base, 10)) : null;
  const city = (loc.cityName || '').toLowerCase();
  let m;
  if (/u\.?s\.? (president|senate)|united states senator|president of the united states/i.test(n)) return { level: 'federal', mine: true };
  if ((m = numIn(n, /u\.?s\.? house(?: district)? (\d+)/i) || numIn(n, /representative to congress \((\d+)/i))) return { level: 'federal', mine: cd ? m === cd : null, district: m };
  if ((m = numIn(n, /state senat(?:e|or)(?: district)? \(?(\d+)/i))) return { level: 'state', mine: up ? m === up : null, district: m };
  if ((m = numIn(n, /state (?:house|representative)(?: district)? \(?(\d+)/i))) return { level: 'state', mine: lo ? m === lo : null, district: m };
  if (/school board|board of education/i.test(n)) return { level: 'other' };
  if (/^(for )?(governor|attorney general|auditor of state|state auditor|secretary of state|state treasurer|treasurer of state)\b/i.test(n)) return { level: 'state', mine: true };
  if (/constitutional amendment|^proposition|state issue|supreme court|court of appeals of utah/i.test(n)) return { level: 'state', mine: true };
  if (/county (council|commission)[^,]*district \d+/i.test(n)) return { level: 'county', mine: null };
  if (/^(for )?county |county (commissioner|auditor|council|mayor|clerk|attorney|sheriff|assessor|recorder|surveyor|treasurer)|court of common pleas|court of appeals-\d+/i.test(n)) return { level: 'county', mine: true };
  if (city && new RegExp(`\\b(city of|village of) ${city.replace(/[^a-z ]/g, '')}\\b`, 'i').test(n)) return { level: 'city', mine: true };
  return { level: 'other' };
}

/* ---------- shape one contest ---------- */
function contest({ name, voteFor = 1, options, reported, total, unitWord, official, source }) {
  const sum = options.reduce((s, o) => s + o.votes, 0);
  const rows = options.map((o) => ({ ...o, pct: pct(o.votes, sum) })).sort((a, b) => b.votes - a.votes);
  const seats = Math.max(1, Number(voteFor) || 1);
  if (sum > 0) rows.forEach((r, i) => {
    const next = rows[seats];
    const ahead = i < seats && r.votes > 0 && (!next || r.votes > next.votes);
    if (ahead) { if (official) r.final = true; else r.leading = true; }
  });
  return { name, seats, totalVotes: sum, candidates: rows, reporting: total ? { reported, total, pct: pct(reported, total), unit: unitWord } : null, official: !!official, source };
}

/* ---------- Utah (Enhanced Voting JSON) ---------- */
async function utahElections(f) {
  return cached('live:ut-index:' + f.api, 30 * 60e3, () => fetchJSON(`${f.api}/jurisdictions/${encodeURIComponent(f.jurisdiction)}`, { timeoutMs: 20000 }));
}
async function utahDiscover(f) {
  const j = await utahElections(f);
  const list = (j.elections || []).map((e) => ({ id: e.publicElectionId, date: e.electionDate, name: en(e.name) }));
  return { list, match: list.find((e) => e.date === f.electionDate) || null, counties: (j.childLocalities || []).map((c) => ({ name: en(c.name), shortName: c.shortName })) };
}
async function utahData(f, juris, id) {
  return cached(`live:ut:${juris}:${id}`, POLL_MS, () => fetchJSON(`${f.api}/elections/${encodeURIComponent(juris)}/${encodeURIComponent(id)}/data`, { timeoutMs: 25000 }));
}
function utahContests(d, f, publicUrl) {
  const official = !!(d.election && d.election.isOfficialResults);
  return (d.ballotItems || []).filter((b) => b.summaryResults && b.summaryResults.ballotOptions).map((b) => {
    const rs = b.reportingStatus || {};
    return contest({
      name: en(b.name), voteFor: (b.voteFor && b.voteFor[0] && b.voteFor[0].text) || 1,
      options: b.summaryResults.ballotOptions.map((o) => ({ name: en(o.name), party: o.party ? (o.party.abbreviation || en(o.party.name)) : null, votes: Number(o.voteCount) || 0, writeIn: !!o.isWriteIn })),
      reported: rs.reportingUnits, total: rs.totalUnits, unitWord: 'reporting areas', official,
      source: { label: f.label, url: publicUrl, asOf: rs.asOf || (d.election && d.election.asOf) },
    });
  });
}
async function utahFeed(f, loc, { test }) {
  const disc = await utahDiscover(f).catch(() => null);
  const configured = feedId(f);
  const id = test ? f.testElectionId : configured;
  const st = await utahData(f, f.jurisdiction, id);
  const el = st.election || {};
  const publicUrl = `${f.publicUrl.replace(/\/Utah$/, '')}/Utah/elections/${id}`;
  let items = utahContests(st, f, publicUrl);
  let county = null;
  const cn = loc.county && loc.county.name;
  const c = cn && disc && disc.counties.find((x) => x.name.toLowerCase() === cn.toLowerCase());
  if (c) {
    try {
      const cd = await utahData(f, c.shortName, id);
      const curl = `${f.publicUrl.replace(/\/Utah$/, '')}/${c.shortName}/elections/${id}`;
      const have = new Set(items.map((x) => norm(x.name)));
      const extra = utahContests(cd, { ...f, label: `${c.name} results on Utah's official election-results site` }, curl).filter((x) => !have.has(norm(x.name)));
      items = items.concat(extra);
      county = { name: c.name, url: curl, asOf: cd.election && cd.election.asOf };
    } catch (e) { county = { name: c.name, error: true }; }
  }
  return {
    feed: f.id, electionId: id, configuredId: configured, discoveredId: disc && disc.match ? disc.match.id : null,
    electionName: en(el.name), electionDate: el.electionDate, official: !!el.isOfficialResults,
    asOf: el.asOf || el.lastUpdated, sourceLabel: f.label, sourceUrl: publicUrl, county, items, testData: false,
  };
}

/* ---------- Hart InterCivic Live Results (Franklin County, OH) ---------- */
const tag = (blk, t) => { const m = blk.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim() : null; };
async function hartIndex(f, id) {
  return cached(`live:hart-idx:${f.base}:${id}`, POLL_MS, async () => {
    const html = await fetchText(`${f.base}/${id}/en/index_${id}.html`, { timeoutMs: 20000 });
    const title = (html.match(/class="election-title"[^>]*>([^<]+)/) || [])[1] || '';
    const status = (html.match(/id="lblOfficialResults"[^>]*>([^<]+)/) || [])[1] || '';
    return { title: title.trim(), status: status.trim() };
  });
}
async function hartDiscover(f) {
  // Probe a few election numbers at and after the configured one; pick the newest whose title matches this election.
  return cached('live:hart-disc:' + f.base, 30 * 60e3, async () => {
    const start = Math.max(1, Number(f.electionId) - 1), found = [];
    for (let i = start; i < start + 5; i++) {
      try { const x = await hartIndex(f, i); found.push({ id: String(i), ...x }); } catch (e) { if (i > Number(f.electionId)) break; }
    }
    const matches = found.filter((x) => x.title.toLowerCase().includes(f.electionMatch.toLowerCase()));
    const real = matches.filter((x) => !/test/i.test(x.title + ' ' + x.status));
    return { found, match: (real[real.length - 1] || matches[matches.length - 1] || null) };
  });
}
async function hartFeed(f, loc, { test }) {
  const configured = feedId(f);
  const disc = test ? null : await hartDiscover(f).catch(() => null);
  const id = test ? f.testElectionId : configured;
  const [idx, xml] = await Promise.all([hartIndex(f, id), cached(`live:hart:${f.base}:${id}`, POLL_MS, () => fetchText(`${f.base}/${id}/summary_${id}.xml`, { timeoutMs: 25000 }))]);
  const official = /official/i.test(idx.status) && !/unofficial/i.test(idx.status);
  const testData = /test|not for public/i.test(idx.title + ' ' + idx.status);
  const gen = (xml.match(/<GeneratedDate>([^<]+)</) || [])[1] || null;
  const publicUrl = `${f.base}/${id}/en/index_${id}.html`;
  const by = new Map();
  for (const blk of xml.split('<Table>').slice(1)) {
    const race = tag(blk, 'RaceName'); if (!race) continue;
    if (!by.has(race)) by.set(race, { voteFor: Number(tag(blk, 'VoteFor')) || 1, rep: Number(tag(blk, 'PrecReported')) || 0, tot: Number(tag(blk, 'NumberOfPrec')) || 0, options: [] });
    const party = tag(blk, 'Party');
    let name = tag(blk, 'ContestantName') || '';
    if (party && name.toLowerCase().startsWith(party.toLowerCase() + ' ')) name = name.slice(party.length + 1);
    if (/^(yes|no) (yes|no)$/i.test(name)) name = name.split(' ')[0];
    by.get(race).options.push({ name, party: party && !/^non$/i.test(party) ? party : null, votes: Number(tag(blk, 'TotalVotes')) || 0, writeIn: tag(blk, 'ContestantWriteIn') === 'Y' });
  }
  const items = [...by.entries()].map(([name, r]) => contest({ name: name.replace(/^#\s*\w+\s+/, ''), voteFor: r.voteFor, options: r.options, reported: r.rep, total: r.tot, unitWord: 'precincts', official, source: { label: f.label, url: publicUrl, asOf: gen } }));
  return {
    feed: f.id, electionId: id, configuredId: configured, discoveredId: disc && disc.match ? disc.match.id : null,
    electionName: idx.title, official, asOf: gen, sourceLabel: f.label, sourceUrl: publicUrl, items, testData,
    county: { name: f.countyName, url: publicUrl },
  };
}
const ADAPTERS = { 'utah-ev': utahFeed, 'hart-liveresults': hartFeed };

/* ---------- public view ---------- */
function fmtLocal(iso, tz) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}
function stateBasics(abbr) {
  const s = CFG.states[abbr] || null, links = LINKS.states[abbr] || {};
  return { s, links: { results: links.results || null, office: links.office || null, officeNote: links.officeNote || null, usa: 'https://www.usa.gov/state-election-office' } };
}
async function view({ state, loc, test = false, now = Date.now() }) {
  const abbr = String(state || '').toUpperCase();
  if (!STATES[abbr]) throw Object.assign(new Error('Please pick a state.'), { status: 400 });
  const testMode = !!test && TEST_ENABLED;
  const { s, links } = stateBasics(abbr);
  const out = { state: { abbr, name: STATES[abbr] }, links, electionDay: ELECTION_DAY, pollSeconds: POLL_MS / 1000, testMode, generatedAt: new Date(now).toISOString() };
  if (s) {
    out.pollsCloseUTC = s.pollsCloseUTC; out.pollsCloseText = `${s.pollsCloseLocal} ${UT_TZ_LABEL[s.timeZone] || ''}`.trim(); out.timeZone = s.timeZone;
    out.countNote = s.countNote; if (s.noFeedNote) out.noFeedNote = s.noFeedNote; if (s.stateFeedNote) out.stateFeedNote = s.stateFeedNote;
  }
  const feeds = (s && s.feeds || []).filter((f) => f.scope === 'state' || (loc && loc.county && loc.county.fips === f.countyFips) || (!loc && f.scope === 'county'));
  out.hasFeed = !!(s && s.feeds && s.feeds.length) && !OFF;
  out.feedsForPlace = feeds.map((f) => ({ id: f.id, label: f.label, url: f.publicUrl, scope: f.scope, county: f.countyName || null }));
  if (s && s.feeds && s.feeds.length && !feeds.length) out.countyNotCovered = s.feeds.filter((f) => f.scope === 'county').map((f) => f.countyName);
  if (!out.hasFeed) { out.status = 'no-feed'; return out; }
  if (!feeds.length) { out.status = 'no-feed-here'; return out; }
  const closed = s.pollsCloseUTC && now >= Date.parse(s.pollsCloseUTC);
  if (!closed && !testMode) { out.status = 'before'; return out; }
  if (testMode) out.testLabel = feeds.map((f) => f.testLabel).join(' · ');
  const res = [];
  for (const f of feeds) {
    try { res.push(await ADAPTERS[f.adapter](f, loc || {}, { test: testMode })); }
    catch (e) { res.push({ feed: f.id, error: true, sourceLabel: f.label, sourceUrl: f.publicUrl, message: 'We could not reach this official results site just now. We will try again in a few minutes. You can open the official site with the link.' }); }
  }
  const sections = { federal: [], state: [], county: [], city: [], other: [] };
  for (const r of res) {
    if (r.error) continue;
    if (r.testData && !testMode) { r.hidden = 'The official site is still showing test numbers, so we are not showing them. Please check the official link.'; continue; }
    for (const it of r.items) {
      const c = classify(it.name, loc || {});
      it.asOfText = it.source.asOf ? fmtLocal(it.source.asOf, s.timeZone) : null;
      it.asOfDate = it.source.asOf ? new Date(it.source.asOf).toLocaleDateString('en-US', { timeZone: s.timeZone, month: 'short', day: 'numeric', year: 'numeric' }) : null;
      if (c.level === 'other' || c.mine === false) { if (c.mine !== false || !loc) sections.other.push(it); continue; }
      if (c.mine === null) { sections.other.push(it); continue; }
      sections[c.level].push(it);
    }
    delete r.items;
  }
  out.feeds = res;
  out.sections = sections;
  out.anyVotes = Object.values(sections).some((l) => l.some((x) => x.totalVotes > 0));
  out.status = res.every((r) => r.error) ? 'error' : out.anyVotes ? 'live' : 'waiting';
  out.official = res.some((r) => r.official);
  return out;
}
// For the runbook: what each feed is pointed at and what the state's index says (cheap, cached 30 min).
async function status() {
  const out = { pollSeconds: POLL_MS / 1000, testModeEnabled: TEST_ENABLED, off: OFF, states: {} };
  for (const [abbr, s] of Object.entries(CFG.states)) {
    out.states[abbr] = { pollsCloseUTC: s.pollsCloseUTC, feeds: [] };
    for (const f of s.feeds) {
      const row = { id: f.id, adapter: f.adapter, env: f.env, configuredId: feedId(f), envOverride: !!(f.env && process.env[f.env]) };
      try {
        if (f.adapter === 'utah-ev') { const d = await utahDiscover(f); row.discovered = d.match; row.elections = d.list.slice(0, 4); }
        else { const d = await hartDiscover(f); row.discovered = d.match; row.elections = d.found; }
        row.ok = !!(row.discovered && row.discovered.id && String(row.discovered.id).toLowerCase() === String(row.configuredId).toLowerCase());
      } catch (e) { row.error = e.message; }
      out.states[abbr].feeds.push(row);
    }
  }
  return out;
}
module.exports = { view, status, classify, TEST_ENABLED };
