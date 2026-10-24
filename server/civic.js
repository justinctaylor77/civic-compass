// OPTIONAL: Google Civic Information API voterInfoQuery (needs GOOGLE_CIVIC_API_KEY and a street address).
// NOTE: written to Google's published response shape but NOT exercised live (no key available when built).
const { cached, fetchJSON, scrub } = require('./util');
const enabled = () => !!process.env.GOOGLE_CIVIC_API_KEY;
async function voterInfo(address) {
  if (!enabled()) return { enabled: false };
  return cached('civic:' + address.toLowerCase(), 3600e3, async () => {
    try {
      const u = `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodeURIComponent(address)}&electionId=2000&returnAllAvailableData=true&key=${process.env.GOOGLE_CIVIC_API_KEY}`;
      const j = await fetchJSON(u, { timeoutMs: 20000, retries: 0 });
      return {
        enabled: true, ok: true, election: j.election && j.election.name,
        contests: (j.contests || []).map((c) => ({ type: c.type, office: c.office || c.referendumTitle, level: c.level, district: c.district && c.district.name, candidates: (c.candidates || []).map((x) => ({ name: x.name, party: x.party, url: x.candidateUrl })), referendumText: c.referendumText, referendumUrl: c.referendumUrl })),
        pollingLocations: (j.pollingLocations || []).slice(0, 3).map((p) => ({ name: p.address && p.address.locationName, line: p.address && [p.address.line1, p.address.city, p.address.state, p.address.zip].filter(Boolean).join(', '), hours: p.pollingHours })),
        earlyVote: (j.earlyVoteSites || []).slice(0, 3).map((p) => ({ name: p.address && p.address.locationName, line: p.address && [p.address.line1, p.address.city, p.address.state].filter(Boolean).join(', '), hours: p.pollingHours })),
        stateElectionUrl: j.state && j.state[0] && j.state[0].electionAdministrationBody && j.state[0].electionAdministrationBody.electionInfoUrl,
      };
    } catch (e) { return { enabled: true, ok: false, error: scrub(e.message).slice(0, 120) }; }
  });
}
module.exports = { voterInfo, enabled };
