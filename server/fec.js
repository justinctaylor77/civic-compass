// OpenFEC (api.open.fec.gov). Uses FEC_API_KEY if set, else api.data.gov's public DEMO_KEY (tightly rate-limited).
const { cached, fetchJSON, scrub } = require('./util');
const KEY = () => process.env.FEC_API_KEY || 'DEMO_KEY';
const usingDemo = () => !process.env.FEC_API_KEY;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\b(jr|sr|ii|iii|iv|dr|hon|mr|mrs|ms)\b/g, ' ').replace(/\s+/g, ' ').trim();

async function api(path, params) {
  const qs = new URLSearchParams({ ...params, api_key: KEY() }).toString();
  try { return await fetchJSON(`https://api.open.fec.gov/v1${path}?${qs}`, { timeoutMs: 20000, retries: 1 }); }
  catch (e) { const err = new Error(scrub(e.message)); err.status = e.status; throw err; }
}
// nicknames that commonly differ between ballots and FEC filings
const NICK = { ben: 'benjamin', bill: 'william', bob: 'robert', jim: 'james', mike: 'michael', tom: 'thomas', dave: 'david', dan: 'daniel', chris: 'christopher', steve: 'steven', joe: 'joseph', tony: 'anthony', pat: 'patrick', rick: 'richard', dick: 'richard', ted: 'edward', ed: 'edward', matt: 'matthew', andy: 'andrew', jen: 'jennifer', liz: 'elizabeth', beth: 'elizabeth', kate: 'katherine', sue: 'susan', jeff: 'jeffrey', greg: 'gregory', tim: 'timothy', nick: 'nicholas', sam: 'samuel', alex: 'alexander', josh: 'joshua', zach: 'zachary', charlie: 'charles', chuck: 'charles' };

function nameMatches(ballotName, fecName) {
  // fecName: "LAST, FIRST MIDDLE"
  const [fl, ff = ''] = String(fecName).split(',');
  const bTok = norm(ballotName).split(' ').filter(Boolean);
  const bLast = bTok[bTok.length - 1], bFirst = bTok[0];
  const fLastToks = norm(fl).split(' ').filter(Boolean);
  if (!fLastToks.includes(bLast)) return false;
  const fFirst = norm(ff).split(' ')[0] || '';
  const variants = new Set([bFirst, NICK[bFirst]].filter(Boolean));
  return [...variants].some((v) => fFirst === v || (v.length >= 3 && (fFirst.startsWith(v) || v.startsWith(fFirst) && fFirst.length >= 3)));
}

// fedOffice: { office:'H'|'S', state:'UT', district:'01' }
async function findCandidate(name, { office, state, district }) {
  const key = `fec:find:${norm(name)}:${office}:${state}:${district || ''}`;
  return cached(key, 6 * 3600e3, async () => {
    const last = norm(name).split(' ').pop();
    const params = { q: last, election_year: 2026, state, office, per_page: 40 };
    if (district) params.district = district;
    const j = await api('/candidates/search/', params);
    const hits = (j.results || []).filter((c) => nameMatches(name, c.name));
    // prefer candidates with money raised / active, "C" = statutory candidate
    const pick = hits.length === 1 ? hits[0] : hits.find((c) => c.candidate_status === 'C') || null;
    return { match: pick, ambiguous: hits.length > 1 && !pick, count: hits.length };
  });
}
async function totals(candidateId) {
  return cached('fec:totals:' + candidateId, 3 * 3600e3, async () => {
    const j = await api(`/candidate/${candidateId}/totals/`, { cycle: 2026, election_full: 'false', per_page: 5 });
    const r = (j.results || [])[0];
    if (!r) return null;
    return {
      receipts: r.receipts, disbursements: r.disbursements, cashOnHand: r.last_cash_on_hand_end_period,
      debts: r.last_debts_owed_by_committee, individualItemized: r.individual_itemized_contributions, individualUnitemized: r.individual_unitemized_contributions,
      pacContributions: r.other_political_committee_contributions, partyContributions: r.political_party_committee_contributions,
      candidateContributions: r.candidate_contribution, loansFromCandidate: r.loans_made_by_candidate,
      coverageEnd: r.coverage_end_date, cycle: 2026,
    };
  });
}
module.exports = { findCandidate, totals, usingDemo, nameMatches };
