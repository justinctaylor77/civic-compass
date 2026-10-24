# Civic Compass: handoff

Free, nonpartisan voter-research PWA for the Nov 3, 2026 US midterms. Owner: Justin Taylor. **Design must be approved by Justin before it is called final.** Do not alter brand/logo-approved.jpg without asking him.

## Run / deploy
- Local: `npm install && npm start` (PORT env, default 3000). Node 20+.
- Repo: github.com/justinctaylor77/civic-compass (main). Render web service "civic-compass", free plan, **auto-deploy OFF**. After pushing, use the Render connector (`user-Render`, trigger_deploy), wait for live, then `curl <url>/sw.js` and confirm the VERSION (bump `VERSION` in public/sw.js and the `?v=` on /app.js and /styles.css in index.html on every client-visible change).
- Screenshots: `BASE=http://localhost:3111 node scripts/screenshots.js` (needs `npm i` dev deps and google-chrome at /usr/bin/google-chrome) -> screenshots/.

## Secrets (env vars only, never commit/print; Justin pastes them in the Render dashboard)
| Env var | Purpose | Sign up |
|---|---|---|
| GOOGLE_CIVIC_API_KEY | Official contests/polling place for a street address (optional; module is written but untested) | https://console.cloud.google.com/apis/library/civicinfo.googleapis.com (enable Civic Information API, create key) |
| FEC_API_KEY | OpenFEC campaign finance (falls back to shared DEMO_KEY, rate limited) | https://api.data.gov/signup/ |
| CONGRESS_API_KEY | congress.gov bills (falls back to DEMO_KEY) | https://api.congress.gov/sign-up/ |
| OPENSTATES_API_KEY / VOTESMART_API_KEY | Not built yet | https://openstates.org/accounts/signup/ , https://votesmart.org/share/api |
/api/status shows only booleans for which keys are set.

## Data pipeline (server/)
- geo.js: ZIP/city/address -> state, county, place, congressional + state legislative districts, school district (Census Geocoder; zippopotam.us/Nominatim for centroids).
- ballotpedia.js: scrapes "<State> elections, 2026" (federal/state tables, a featured county's local table, ballot measures), county pages when they exist, and candidate pages. Falls back to data/snapshots/<State>.json (labelled to the user) if Ballotpedia is unreachable. ballotpedia.org sits behind an AWS WAF bot challenge and rate-limits heavy use; requests are throttled (400ms) and cached. Regenerate snapshots with `npm run snapshot` (slow, polite).
- fec.js, congress.js: candidate money and bills. news.js: Google News RSS + AllSides snapshot ratings (data/allsides.json, from the open AllSideR dataset; older than allsides.com).
- ballot.js assembles City/County/State/Federal sections with honest `limited` status + official links.

## Rules (from Justin)
Never opinions or endorsements; never invent facts; every fact shows its source link; thin data -> "Limited data available" + vote.org / state election office / vote.gov; show last updated; keep About/Sources page; large type + high contrast for elderly users.

## Known limitations
City and county races are thin (Ballotpedia only has a featured county per state plus some county pages); ZIP/city input is approximate; regional judicial/school-board races can't be tied to an address; AllSides snapshot is old and many outlets are unrated; Google Civic, Vote Smart, OpenStates not live.

## v6 (branch design/v6, NOT deployed; Justin must approve first)
- **Results tab** (`#/results`, `server/results.js`, `GET /api/results`): 2024 + 2022 general-election results for the user's state / county / U.S. House district from MEDSL (CC0), bundled in `data/results/<ST>.json` (50 states + DC). Margins, "most votes" winner, turnout only where the dataset has it, name-matched history for candidates on the user's 2026 ballot, and a live-results panel (`data/live-results.json`: official state result sites, links checked 2026-10-24; honest "will appear after polls close Nov 3" state). No predictions or opinions. Rebuild: `python3 scripts/build-results.py` (downloads MEDSL files; see script header).
- **County/city** (`server/county.js`, `data/county/<FIPS>.json`, `data/state/<ST>.json`, `scripts/build-county.py`): official county candidate lists for Salt Lake, Cache, Washington, Utah, Weber (UT), Franklin (OH), Laramie (WY); statewide Utah judicial retention (links to Know Your Judges); Utah and Ohio "no city election in 2026" notes (statute-cited); address-dependent seats (council/school districts) flagged, not guessed. Counties without a file fall back to Ballotpedia, then "Limited data available". Ballotpedia snapshots for UT/OH/WY were not refreshed in v6.
- UI: new `.tabs` nav (Find my ballot / Results / About & Sources), home feature card, ballot "Past results for this area" button. Cache bumped to `cc-v6`, `?v=6`.
- Screenshots: `node scripts/screenshots-v6.js` -> screenshots/v6/.
- Gaps: no address -> council/school-district resolver; no roll-call vote history (needs a congress.gov key or Vote Smart); results county drill-down only via ZIP/city/address lookup; Wyoming city offices not claimed; MEDSL UT 2022 statewide is thin; Slco feed is undocumented.
- Deploy only after Justin approves: merge to main, then Render trigger_deploy and check `/sw.js` shows cc-v6.
