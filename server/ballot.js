// Assemble the four ballot sections (City / County / State / Federal) from the parsed sources.
const bp = require('./ballotpedia');
const countyData = require('./county');
const { STATES } = require('./states');
const PARTY = { D: 'Democratic', R: 'Republican', L: 'Libertarian', G: 'Green', I: 'Independent', C: 'Constitution', N: 'Nonpartisan', NP: 'Nonpartisan', U: 'Unaffiliated', W: 'Write-in' };
const party = (p) => PARTY[p] || p || '';
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function groupRaces(rows, level, extra = {}) {
  const map = new Map();
  for (const r of rows) {
    const k = r.office;
    if (!map.has(k)) map.set(k, { office: r.office, officeUrl: r.officeUrl || null, level, ...extra, candidates: [] });
    map.get(k).candidates.push({ name: r.name, slug: r.slug, url: r.url, party: r.party, incumbent: !!r.incumbent, writeIn: !!r.writeIn });
  }
  const races = [...map.values()];
  for (const r of races) if (/Court/.test(r.office) && !/Retention/i.test(r.office) && r.candidates.length >= 3) r.note = 'Ballotpedia may list more than one seat under this heading, so these candidates may be running for different seats. Open the office page on Ballotpedia to see who runs for which seat.';
  for (const r of races) r.candidates.sort((a, b) => (a.writeIn ? 1 : 0) - (b.writeIn ? 1 : 0));
  return races;
}
const officialLinks = (stateName, abbr) => {
  const slug = stateName.toLowerCase().replace(/ /g, '-');
  return [
    { label: `Find your ${stateName} election office (USA.gov)`, url: 'https://www.usa.gov/state-election-office' },
    { label: `${stateName} voting rules, dates and registration (Vote.org)`, url: `https://vote.org/state/${slug}/` },
    { label: 'Register, check or update registration (Vote.gov)', url: 'https://vote.gov/' },
    { label: 'See your exact sample ballot (Ballotpedia)', url: 'https://ballotpedia.org/Sample_Ballot_Lookup' },
  ];
};

async function buildBallot(loc) {
  const stateName = loc.stateName, abbr = loc.state.abbr;
  const warnings = [];
  let st = null;
  try { st = await bp.stateElections(stateName); } catch (e) { warnings.push(`Ballotpedia's ${stateName} page could not be reached right now (${e.message}).`); }
  const out = { federal: { races: [], notes: [], status: 'ok' }, state: { races: [], measures: [], notes: [], status: 'ok' }, county: { races: [], notes: [], otherLocal: [], status: 'ok' }, city: { races: [], notes: [], status: 'ok' } };
  const src = [];
  if (st) {
    if (st.fromSnapshot) warnings.push(`Ballotpedia could not be reached from our server just now, so the state, federal and local lists below come from a saved copy of its ${stateName} page taken ${new Date(st.fetchedAt).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} (Mountain Time). Candidates may have changed since.`);
    src.push({ label: `Ballotpedia: ${stateName} elections, 2026`, url: st.url });
    const onB = (r) => r.onBallot;
    // ----- Federal
    const fed = st.federal.filter(onB);
    const senate = fed.filter((r) => /^U\.S\. Senate/.test(r.office));
    let house;
    if (loc.cd && loc.cd.atLarge) house = fed.filter((r) => /^U\.S\. House/.test(r.office) && /at.large/i.test(r.office));
    else if (loc.cd) house = fed.filter((r) => new RegExp(`^U\\.S\\. House .*District ${loc.cd.number}$`).test(r.office));
    else house = [];
    out.federal.races.push(...groupRaces(senate, 'federal', { chamber: 'sen' }), ...groupRaces(house, 'federal', { chamber: 'rep' }));
    if (!senate.length) out.federal.notes.push(`There is no U.S. Senate race in ${stateName} this year. Each state votes for its senators in different years.`);
    if (!house.length) out.federal.notes.push('We could not find your U.S. House race. Please use the official links at the bottom of this page.');
    if (loc.cd && !loc.cd.atLarge) out.federal.notes.push(`Your U.S. House district is ${loc.cd.label}. This comes from the U.S. Census Bureau map.`);
    // ----- State
    const stateRows = st.state.filter(onB);
    const isLeg = (o) => /District \d+/.test(o) && /(Senate|House|Assembly|Delegates)/.test(o) && !/Court|Board|Commission/.test(o);
    const upper = (o) => /Senate/.test(o);
    const statewide = stateRows.filter((r) => !isLeg(r.office) && !/District|Special District|Circuit|County|Municipal/i.test(r.office.replace(/Supreme Court/, '')) && !/Court of Appeals/.test(r.office) || /Supreme Court/.test(r.office));
    const swSet = new Set(statewide);
    out.state.races.push(...groupRaces(statewide, 'state'));
    const upperRows = stateRows.filter((r) => isLeg(r.office) && upper(r.office) && loc.sldu && new RegExp(`District ${esc(loc.sldu.base)}( |$)`).test(r.office));
    const lowerRows = stateRows.filter((r) => isLeg(r.office) && !upper(r.office) && loc.sldl && new RegExp(`District ${esc(loc.sldl.base)}( |$)`).test(r.office));
    out.state.races.push(...groupRaces(upperRows, 'state'), ...groupRaces(lowerRows, 'state'));
    const hasLegRaces = stateRows.some((r) => isLeg(r.office));
    if (hasLegRaces && !upperRows.length && !lowerRows.length) out.state.notes.push(loc.sldu || loc.sldl ? 'We did not find a race for your state legislature district. That seat may not be up this year, or we could not match your district.' : 'We could not tell which state legislature districts you live in.');
    else if (hasLegRaces && !upperRows.length && loc.sldu) out.state.notes.push(`Your ${loc.sldu.label} seat is not up this year, or we found no race for it.`);
    const other = stateRows.filter((r) => !swSet.has(r) && !upperRows.includes(r) && !lowerRows.includes(r) && !isLeg(r.office));
    const otherOffices = [...new Set(other.map((r) => r.office))];
    if (otherOffices.length) out.state.notes.push(`${otherOffices.length} other state races (like some courts and education boards) are for areas we cannot match to an address yet. See the full list on Ballotpedia.`);
    out.state.measures = st.measures.map((m) => ({ ...m }));
    if (!out.state.measures.length) out.state.notes.push('Ballotpedia lists no statewide ballot questions for this year.');
    // ----- County / City
    const countyFull = loc.county && loc.county.name; // e.g. "Salt Lake County"
    const placeName = loc.place && loc.place.name;
    if (countyFull) {
      let cp = null;
      try { cp = await bp.countyPage(countyFull, stateName); } catch (e) { warnings.push(`Ballotpedia’s ${countyFull} page could not be reached just now, so some county details may be missing.`); }
      const localKey = Object.keys(st.local).find((k) => norm(k) === norm(`${countyFull}, ${stateName}`));
      const rowsFromTable = localKey ? st.local[localKey].filter(onB) : [];
      if (cp && cp.exists) {
        src.push({ label: `Ballotpedia: ${countyFull}, ${stateName}, elections 2026`, url: cp.url });
        for (const s of cp.sections) {
          const isCity = /municipal|city|town|village/i.test(s.section) || (placeName && norm(s.place).includes(norm(placeName)));
          const target = isCity ? out.city : out.county;
          for (const r of s.races) target.races.push({ office: r.office, officeUrl: null, level: isCity ? 'city' : 'county', placeNote: s.place && !/^County$/i.test(s.section) ? s.place : null, candidates: r.candidates.map((c) => ({ ...c, party: party(c.party), incumbent: false })) });
        }
      }
      if (rowsFromTable.length) {
        src.push({ label: `Ballotpedia: ${stateName} elections, 2026 — ${localKey} local races`, url: st.url });
        const mine = [], rest = [];
        const sch = loc.school && norm(loc.school.name).replace(/ school district| unified| independent| public schools/g, '');
        for (const r of rowsFromTable) {
          const o = norm(r.office);
          if (placeName && o.includes(norm(placeName)) && !/school/.test(o)) mine.push({ r, level: 'city' });
          else if (sch && /school/.test(o) && o.includes(sch)) mine.push({ r, level: 'county', school: true });
          else if (cp && cp.exists && rowsFromTable.length && (/county|auditor|commission|sheriff|coroner|clerk|treasurer|recorder|engineer|prosecutor|assessor/.test(o) && o.includes(norm(countyFull).replace(' county', '')))) mine.push({ r, level: 'county' });
          else rest.push(r);
        }
        const mineC = mine.filter((m) => m.level === 'county'), mineT = mine.filter((m) => m.level === 'city');
        // Prefer the state-page table (it flags incumbents) over the county page's duplicate court listings.
        const strip = (o) => norm(o.replace(/Ter[mn] starts.*$/i, ''));
        const addRows = (rows, target, lvl) => {
          for (const g of groupRaces(rows, lvl)) {
            const k = strip(g.office);
            for (const t of [out.county, out.city]) t.races = t.races.filter((r) => strip(r.office) !== k);
            target.races.push(g);
          }
        };
        addRows(mineC.map((m) => m.r), out.county, 'county'); addRows(mineT.map((m) => m.r), out.city, 'city');
        const have = new Set([...out.county.races, ...out.city.races].map((r) => strip(r.office)));
        out.county.otherLocal = groupRaces(rest, 'county').filter((g) => !have.has(strip(g.office)));
        if (out.county.otherLocal.length) out.county.notes.push(`Ballotpedia also lists ${out.county.otherLocal.length} other local ${out.county.otherLocal.length === 1 ? 'race' : 'races'} in ${countyFull}, such as school boards in other areas. A ZIP code cannot tell us if they are on your ballot, so they are in the box below.`);
      }
      if (!out.county.races.length) { out.county.status = 'limited'; out.county.notes.unshift(`Limited data available for ${countyFull}. Ballotpedia has no page that lists the 2026 county races${rowsFromTable.length ? ' (only school board races for other areas)' : ''}. Your county election office has the full official list.`); }
    } else { out.county.status = 'limited'; out.county.notes.push('We could not tell which county you live in.'); }
    if (!out.city.races.length) { out.city.status = 'limited'; out.city.notes.push(`Limited data available${placeName ? ' for ' + placeName : ''}. We found no city or town races. Many cities vote in other years. Small-town races are often not posted in one place. Your city clerk or county election office has the official list.`); }
  } else {
    for (const k of Object.keys(out)) { out[k].status = 'unavailable'; }
  }
  try { countyData.apply(loc, out, src); } catch (e) { warnings.push('Official county data could not be applied (' + e.message + ').'); }
  out.county.races.sort((a, b) => (a.addressDependent ? 1 : 0) - (b.addressDependent ? 1 : 0) || (/Court/.test(a.office) ? 1 : 0) - (/Court/.test(b.office) ? 1 : 0));
  out.links = officialLinks(stateName, abbr);
  return { out, sources: src, warnings };
}
module.exports = { buildBallot, officialLinks, party };
