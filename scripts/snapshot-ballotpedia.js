// Saves a parsed copy of every state's Ballotpedia 2026 elections page into data/snapshots/.
// The app uses these ONLY if the live Ballotpedia page cannot be reached (and labels them as a snapshot).
// Usage: node scripts/snapshot-ballotpedia.js [StateName ...]
const fs = require('fs'); const path = require('path');
const bp = require('../server/ballotpedia'); const { STATES } = require('../server/states');
(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.values(STATES);
  for (const n of names) {
    const f = path.join(__dirname, '..', 'data', 'snapshots', n.replace(/ /g, '_') + '.json');
    for (let i = 0; i < 3; i++) {
      try { const s = await bp.stateElections(n, { noSnapshot: true }); delete s.fromSnapshot; fs.writeFileSync(f, JSON.stringify(s)); console.log('ok', n, s.federal.length, s.state.length, Object.keys(s.local).length); break; }
      catch (e) { console.log('retry', n, e.message); await new Promise((r) => setTimeout(r, 8000)); }
    }
  }
})();
