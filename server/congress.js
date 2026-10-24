// Records for sitting members of Congress.
//  - unitedstates/congress-legislators (public JSON, no key): bio, terms, committees.
//  - api.congress.gov (CONGRESS_API_KEY, else DEMO_KEY): sponsored legislation count + recent bills.
const { cached, fetchJSON, scrub } = require('./util');
const BASE = 'https://unitedstates.github.io/congress-legislators';
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\b(jr|sr|ii|iii|iv)\b/g, ' ').replace(/\s+/g, ' ').trim();
const KEY = () => process.env.CONGRESS_API_KEY || 'DEMO_KEY';
const usingDemo = () => !process.env.CONGRESS_API_KEY;
const NICK = { ben: 'benjamin', bill: 'william', bob: 'robert', jim: 'james', mike: 'michael', tom: 'thomas', dave: 'david', dan: 'daniel', chris: 'christopher', steve: 'steven', joe: 'joseph', tony: 'anthony', pat: 'patrick', rick: 'richard', ted: 'edward', ed: 'edward', matt: 'matthew', andy: 'andrew', jeff: 'jeffrey', greg: 'gregory', tim: 'timothy', nick: 'nicholas', sam: 'samuel', alex: 'alexander', josh: 'joshua' };

async function load() {
  return cached('cong:legislators', 12 * 3600e3, async () => {
    const [leg, cm, cc] = await Promise.all([fetchJSON(`${BASE}/legislators-current.json`, { timeoutMs: 25000 }), fetchJSON(`${BASE}/committee-membership-current.json`, { timeoutMs: 25000 }), fetchJSON(`${BASE}/committees-current.json`, { timeoutMs: 25000 })]);
    return { leg, cm, cc };
  });
}
async function findMember(name, state, chamber) {
  const { leg, cm, cc } = await load();
  const toks = norm(name).split(' ');
  const last = toks[toks.length - 1], first = toks[0];
  const cand = leg.filter((m) => m.terms[m.terms.length - 1].state === state && (!chamber || m.terms[m.terms.length - 1].type === chamber));
  const m = cand.find((x) => {
    const fl = norm(x.name.last).split(' '); const f = norm(x.name.first), nick = norm(x.name.nickname || ''), off = norm(x.name.official_full || '');
    if (!fl.includes(last) && !off.endsWith(last)) return false;
    return [first, NICK[first]].filter(Boolean).some((v) => v === f || v === nick || off.split(' ').includes(v));
  });
  if (!m) return null;
  const id = m.id.bioguide;
  const names = Object.fromEntries(cc.map((c) => [c.thomas_id, c]));
  const committees = [];
  for (const [tid, members] of Object.entries(cm)) {
    const row = members.find((x) => x.bioguide === id);
    if (!row) continue;
    const base = names[tid.replace(/\d{2}$/, '')] || names[tid];
    if (tid.length > 4) { const parent = names[tid.slice(0, 4)]; const sub = parent && (parent.subcommittees || []).find((s) => s.thomas_id === tid.slice(4)); if (sub) { committees.push({ name: `${parent.name} — ${sub.name}`, title: row.title || null, sub: true }); } }
    else if (base) committees.push({ name: base.name, title: row.title || null });
  }
  const t = m.terms;
  const firstTerm = t[0];
  return {
    bioguide: id, name: m.name.official_full || `${m.name.first} ${m.name.last}`, party: t[t.length - 1].party, chamber: t[t.length - 1].type === 'sen' ? 'Senate' : 'House', state: t[t.length - 1].state,
    district: t[t.length - 1].district, firstTermStart: firstTerm.start, termsCount: t.length, currentTermEnd: t[t.length - 1].end,
    website: t[t.length - 1].url || null, birthday: m.bio && m.bio.birthday, gender: m.bio && m.bio.gender,
    committees: committees.filter((c) => !c.sub).slice(0, 8), subcommitteeCount: committees.filter((c) => c.sub).length,
    congressUrl: `https://www.congress.gov/member/${encodeURIComponent((m.name.first + '-' + m.name.last).toLowerCase())}/${id}`,
    sources: { legislators: 'https://github.com/unitedstates/congress-legislators' },
  };
}
const TYPE = { HR: 'house-bill', S: 'senate-bill', HRES: 'house-resolution', SRES: 'senate-resolution', HJRES: 'house-joint-resolution', SJRES: 'senate-joint-resolution', HCONRES: 'house-concurrent-resolution', SCONRES: 'senate-concurrent-resolution' };
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
async function sponsored(bioguide) {
  return cached('cong:spons:' + bioguide, 6 * 3600e3, async () => {
    try {
      const j = await fetchJSON(`https://api.congress.gov/v3/member/${bioguide}/sponsored-legislation?limit=6&format=json&api_key=${KEY()}`, { timeoutMs: 20000 });
      const bills = (j.sponsoredLegislation || []).map((b) => ({
        title: b.title, number: `${b.type} ${b.number}`, congress: b.congress, introduced: b.introducedDate,
        latest: b.latestAction && { date: b.latestAction.actionDate, text: b.latestAction.text },
        url: TYPE[b.type] ? `https://www.congress.gov/bill/${ord(b.congress)}-congress/${TYPE[b.type]}/${b.number}` : null,
      }));
      return { total: j.pagination && j.pagination.count, bills };
    } catch (e) { return { error: scrub(e.message) }; }
  });
}
module.exports = { findMember, sponsored, usingDemo };
