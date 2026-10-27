// Election Day help: official links only. We do not copy poll hours, ID rules or deadlines (they differ by state
// and can change); we link to the state's own election office and to Vote.org / Vote.gov so the voter reads the official answer.
const fs = require('fs');
const path = require('path');
const { STATES } = require('./states');
const LIVE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'live-results.json'), 'utf8'));
function info(abbr) {
  const a = String(abbr || '').toUpperCase();
  const name = STATES[a];
  if (!name) return null;
  const live = LIVE.states[a] || {};
  const slug = name.toLowerCase().replace(/ /g, '-');
  return {
    abbr: a, name,
    office: live.office || 'https://www.usa.gov/state-election-office',
    officeIsState: !!live.office,
    voteOrg: `https://www.vote.org/state/${slug}/`,
    checkedOn: LIVE.checkedOn,
  };
}
module.exports = { info };
