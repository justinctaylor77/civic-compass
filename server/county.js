// Official county / local data (parsed at build time from each county clerk's own published
// candidate certification; see scripts/build-county.py) layered onto the Ballotpedia-based ballot.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'data');
const cache = new Map();
function load(rel) {
  if (cache.has(rel)) return cache.get(rel);
  let v = null;
  try { v = JSON.parse(fs.readFileSync(path.join(DIR, rel), 'utf8')); } catch (e) { v = null; }
  cache.set(rel, v);
  return v;
}
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const schoolKey = (s) => norm(s).replace(/\b(county|city|school|schools|district|unified|independent|public|board|of|the)\b/g, '').replace(/\s+/g, ' ').trim();
const OFFICE_KINDS = [['commission|council|executive', 'governing board'], ['sheriff', 'sheriff'], ['attorney|prosecut', 'attorney'], ['auditor', 'auditor'], ['clerk', 'clerk'], ['assessor', 'assessor'], ['treasurer', 'treasurer'], ['coroner', 'coroner'], ['recorder', 'recorder'], ['surveyor|engineer', 'surveyor']];
const kindOf = (o) => { const n = norm(o); for (const [re, k] of OFFICE_KINDS) if (new RegExp(re).test(n)) return k; return null; };

// Cities that hold municipal elections only in odd-numbered years (so none in 2026) — statute-based, verified.
const ODD_YEAR = {
  UT: { label: 'Utah', url: 'https://le.utah.gov/xcode/Title20A/Chapter1/20A-1-S202.html', cite: 'Utah Code § 20A-1-202' },
  OH: { label: 'Ohio', url: 'https://codes.ohio.gov/ohio-revised-code/section-3501.01', cite: 'Ohio Revised Code § 3501.01' },
};

function forCounty(fips) { return /^\d{5}$/.test(fips || '') ? load(`county/${fips}.json`) : null; }

// Mutates `out` (county / city sections) and `src`; returns { used: bool }.
function apply(loc, out, src) {
  const abbr = loc.state && loc.state.abbr;
  const fips = loc.county && loc.county.fips;
  const placeName = loc.place && loc.place.name;
  const doc = forCounty(fips);
  const stateDoc = load(`state/${abbr}.json`);
  const res = { used: !!doc, odd: null };
  if (doc) {
    out.county.official = { county: doc.county, asOf: doc.asOf, sources: doc.sources };
    for (const s of doc.sources) src.push({ label: s.label, url: s.url });
    const sch = loc.school && schoolKey(loc.school.name);
    const mine = [], other = [];
    for (const o of doc.offices) {
      const race = { office: o.office, officeUrl: null, level: o.level === 'school' ? 'county' : 'county', official: true, term: o.term || null, note: o.note || null, out: o.out || null, candidates: o.candidates.map((c) => ({ name: c.name, party: c.party || '', incumbent: false, writeIn: false, web: c.web || null })) };
      if (o.level === 'county') {
        // Seats for a numbered council district can't be pinned to an address from a ZIP.
        if (/district\s+\d+|seat\s+[a-z]\b.*district/i.test(o.office) && /council/i.test(o.office)) race.addressDependent = true;
        mine.push(race);
      } else if (o.level === 'school') {
        const k = schoolKey(o.area || o.office);
        if (sch && k && k === sch) { race.addressDependent = true; race.school = o.area; mine.push(race); } else other.push(race);
      } else if (o.level === 'special') { race.addressDependent = true; race.special = o.area; other.push(race); }
      else if (o.level === 'judicial') mine.push(race);
    }
    // Official lists replace Ballotpedia rows for the same kind of office; keep Ballotpedia rows for kinds the clerk list lacks.
    const covered = new Set(mine.filter((r) => !r.school).map((r) => kindOf(r.office)).filter(Boolean));
    const keepBp = out.county.races.filter((r) => { const k = kindOf(r.office); return !(k && covered.has(k)) && !(/school/i.test(r.office) && mine.some((m) => m.school)); });
    const bpDropped = out.county.races.length - keepBp.length;
    out.county.races = [...mine, ...keepBp];
    out.county.otherLocal = [...(other.length ? other : []), ...(out.county.otherLocal || []).filter((g) => !other.some((o) => norm(o.office) === norm(g.office)) && !mine.some((m) => norm(m.office) === norm(g.office)))];
    out.county.notes = out.county.notes.filter((n) => !/^Limited data available/.test(n) && !/^Ballotpedia also lists/.test(n));
    if (other.length) out.county.notes.push(`Also certified in ${doc.county}: ${other.length} school-board and special-district races for other districts. We can't tell from a ZIP code which are on your ballot, so they are in the box below.`);
    if (mine.some((r) => r.addressDependent)) out.county.notes.push('Seats marked "depends on your address" belong to a numbered district inside your county or school district. Your exact district comes from your street address; your county clerk\'s sample ballot shows it.');
    out.county.status = 'ok';
    out.county.measures = (doc.measures || []).filter((m) => !m.area).map((m) => ({ ...m }));
    out.county.retention = [...(doc.retention || []).filter((r) => !r.area), ...((stateDoc && stateDoc.retention) || []).map((r) => ({ ...r, statewide: true }))];
    const cityM = (doc.measures || []).filter((m) => m.area && placeName && norm(m.area) === norm(placeName));
    const cityR = (doc.retention || []).filter((r) => r.area && placeName && norm(r.area) === norm(placeName));
    const otherCity = (doc.measures || []).filter((m) => m.area && !(placeName && norm(m.area) === norm(placeName))).map((m) => m.area);
    out.city.measures = cityM.map((m) => ({ ...m }));
    out.city.retention = cityR.map((r) => ({ ...r }));
    if (cityM.length || cityR.length) { out.city.status = 'ok'; out.city.notes = out.city.notes.filter((n) => !/^Limited data/.test(n)); }
    if (otherCity.length) out.city.notes.push(`${doc.county}'s certification also lists local ballot questions for ${[...new Set(otherCity)].join(', ')} — not your city, so not shown.`);
    out.county.coverage = { official: true, bpDropped };
    if (doc.state === 'UT' && doc.fips === '49035') out.county.notes.push('Salt Lake County\'s candidate list comes from the County Clerk\'s public candidate feed. It lists candidates only; for ballot questions and judges on your ballot see vote.utah.gov or your sample ballot.');
    if (doc.fips === '49057') out.county.notes.push('Weber County\'s published list does not show party and includes candidates the county marks as out in a primary or convention; those are shown separately as "not on the general-election ballot". Please confirm names with the Weber County Elections Office.');
  } else if (stateDoc && stateDoc.retention && out.county.status !== 'unavailable') {
    out.county.retention = stateDoc.retention.map((r) => ({ ...r, statewide: true }));
  }
  if (stateDoc && stateDoc.retention && out.county.retention && out.county.retention.length) for (const s of stateDoc.sources) if (!src.find((x) => x.url === s.url)) src.push({ label: s.label, url: s.url });
  // Honest "no city election in 2026" note for states whose cities vote only in odd years.
  const odd = ODD_YEAR[abbr];
  if (odd) {
    res.odd = odd;
    const had = out.city.races.length;
    if (!had && !(out.city.measures && out.city.measures.length)) {
      out.city.status = 'none';
      out.city.notes = [`No city election in 2026${placeName ? ' for ' + placeName : ''}. ${odd.label} cities elect their mayors and councils only in odd-numbered years (${odd.cite}), so there is no mayor or council race on this year's ballot. The next city elections are in 2027.`];
      out.city.noteSource = { label: odd.cite, url: odd.url };
    } else if (!had) {
      out.city.notes.unshift(`${odd.label} cities elect their mayors and councils only in odd-numbered years (${odd.cite}), so there is no mayor or council race this year. Local ballot questions are shown below.`);
      out.city.noteSource = { label: odd.cite, url: odd.url };
    }
  }
  return res;
}

module.exports = { apply, forCounty, load };
