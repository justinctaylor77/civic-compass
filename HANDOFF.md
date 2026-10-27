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

## v6 (merged to main; deployed/live; superseded by v7)
- **Results tab** (`#/results`, `server/results.js`, `GET /api/results`): 2024 + 2022 general-election results for the user's state / county / U.S. House district from MEDSL (CC0), bundled in `data/results/<ST>.json` (50 states + DC). Margins, "most votes" winner, turnout only where the dataset has it, name-matched history for candidates on the user's 2026 ballot, and a live-results panel (`data/live-results.json`: official state result sites, links checked 2026-10-24; honest "will appear after polls close Nov 3" state). No predictions or opinions. Rebuild: `python3 scripts/build-results.py` (downloads MEDSL files; see script header).
- **County/city** (`server/county.js`, `data/county/<FIPS>.json`, `data/state/<ST>.json`, `scripts/build-county.py`): official county candidate lists for Salt Lake, Cache, Washington, Utah, Weber (UT), Franklin (OH), Laramie (WY); statewide Utah judicial retention (links to Know Your Judges); Utah and Ohio "no city election in 2026" notes (statute-cited); address-dependent seats (council/school districts) flagged, not guessed. Counties without a file fall back to Ballotpedia, then "Limited data available". Ballotpedia snapshots for UT/OH/WY were not refreshed in v6.
- UI: new `.tabs` nav (Find my ballot / Results / About & Sources), home feature card, ballot "Past results for this area" button. Cache bumped to `cc-v6`, `?v=6`.
- Screenshots: `node scripts/screenshots-v6.js` -> screenshots/v6/.
- Gaps: no address -> council/school-district resolver; no roll-call vote history (needs a congress.gov key or Vote Smart); results county drill-down only via ZIP/city/address lookup; Wyoming city offices not claimed; MEDSL UT 2022 statewide is thin; Slco feed is undocumented.
- Deployed: merged to main and live via Render trigger_deploy (`/sw.js` showed cc-v6).

## v7 (approved by Justin 2026-10-27; fast-forward merged to main as 580a16e; deployed via manual Render trigger_deploy, dep-dbgasmd9fdbs73d9fs30; live)
Goal: make the app easy for an older first-time phone user (Justin's mother-in-law) researching every candidate on her ballot. v7 is live at civic-compass.onrender.com (`/sw.js` shows cc-v7).
- **Text size + contrast**: header bar on every page with Text size A / A+ / A++ and a High contrast toggle. Stored on this device only (`localStorage`: `cc-size` '1'|'2'|'3', `cc-contrast` '1'|'0'). Default is already large (112.5% root); A+ = x1.2, A++ = x1.45 via `--fs`. `html[data-size]` / `html[data-contrast="high"]` in styles.css (v7 block at the end).
- **Plain language** (about grade 4-7 by `scripts/readability-v7.js`; Ballotpedia bio text is quoted, not rewritten). Glossary tooltips (`.term` + `.tip` button, tap or Enter, Esc closes) for retention, at-large, special election, etc. Server notes in ballot.js / county.js / results.js / geo.js reworded. Still nonpartisan and sourced.
- **Usability**: all buttons/links/tabs min 48px (the glossary "?" looks smaller but has a 48px+ hit area); "Back" buttons on inner pages; **Start here** 3-step guide on home; tables stack into cards at <=640px.
- **My choices** (`#/choices`): "Mark as my choice" on every candidate (ballot rows and candidate page), respects "vote for N" limits. Checklist + notes, Print / Save as text file / Erase. 100% on-device (`cc-choices`), no accounts, nothing sent; the page says so. Print stylesheet included. Ballot questions and judges are not selectable yet.
- **Election Day box** (`#/election-day`, home card, `server/electionday.js`, `GET /api/election-day?state=XX`): Nov 3, 2026 countdown, poll hours / polling place / ID / early + mail deadline sections. Links only to verified official/nonprofit sites (state election office via USA.gov, vote.org, vote.gov). It deliberately states NO hours, ID rules or deadlines (they differ by state and state sites block our checks); it tells the person to read them on the official site.
- **A11y**: skip link, focus moves to the page h1 on route change, strong focus ring (hidden only for programmatic focus), `aria-live` announcer, `aria-pressed` pick buttons, `aria-expanded/controls` tooltips, link purpose text. axe-core (serious/critical and best-practice) = 0 in normal, A++ and high contrast.
- **Cache**: `cc-v7` in sw.js, `?v=7` on styles/app.
- **Tests**: `node scripts/test-v7.js` (server on PORT=3111; env BASE, ZIPS, ONLY, STRICT) walks home -> ballot -> candidate -> results -> election day -> my choices at 390px for zips 84101, 84601, 43215, 82001 in normal / largest / high contrast; checks sideways overflow, clipped text, 48px tap targets, axe-core. `node scripts/readability-v7.js` gives rough Flesch-Kincaid grades. `node scripts/screenshots-v7.js` -> screenshots/v7/ (mobile 390px @2x and desktop 1280).
- **Gaps**: no verified state-specific deep links for hours / ID / deadlines; Ballotpedia bios cannot be simplified; ballot questions and judges can't be marked; no address-level council/school-board lookup (as v6); election-day countdown/date renders in the viewer's browser time zone; screen reader pass was automated (axe + ARIA checks), not a real VoiceOver/TalkBack session; one transient slow first load of the 84601 ballot seen once in testing (API latency).
- **Deploy**: done 2026-10-27 (Justin approved): design/v7 fast-forwarded into main, pushed, manual Render trigger_deploy (auto-deploy stays OFF), verified `/sw.js` shows cc-v7.
