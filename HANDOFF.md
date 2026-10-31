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

## v8: Live Results (branch design/v8, NOT deployed; waiting for Justin's approval)
- The Results tab now has a live 2026 panel in place of the "posted after polls close" box. `GET /api/live?q=<zip|city|address>` (or `?state=UT`) returns the user's contests grouped Federal / State / County / City, plus "Other contests in the official feed (may not be on your ballot)". It also exposes `GET /api/live/status`, which shows which election ID each feed is pointed at and what the official index lists.
- The home page shows an election-night banner from Nov 3 to Nov 17 that links to Results. The tab is renamed "Results". Cache version is cc-v8 and assets use ?v=8.
- Rules in the code (server/live.js):
  - It never fetches upstream before that state's `pollsCloseUTC`.
  - There is one shared cache per feed (TTL `LIVE_POLL_SECONDS`, default 180, minimum 120). If an upstream fetch fails, the last good copy is served.
  - The top candidate is labelled "Leading" only when strictly ahead with more than 0 votes. "Official" appears only when the source marks results official: Utah `isOfficialResults`, or Hart's header saying "Official" and not "Unofficial".
  - If a Hart election title or status says TEST or "Not for Public Use", its numbers are hidden from real users.
  - Every contest shows "Unofficial results, last updated HH:MM TZ from <official link>".
  - The browser refreshes every 60 s while the page is visible. There is a "Refresh now" button and an "Updating…" indicator.
- Feeds (data/live-feeds.json, checked 2026-10-31). All are free and official, with no AP and no Decision Desk:
  - **UT, whole state plus the user's county.** Source: Lt. Governor results site (electionresults.utah.gov, Enhanced Voting). It uses the same public JSON the official page loads: `.../results/public/api/jurisdictions/Utah` (election list) and `.../api/elections/{Utah|<county-shortName>}/{electionId}/data`. The robots.txt returns 404; vote.utah.gov robots allows crawling. Election ID `General11032026` already exists with 0 votes.
  - **OH, Franklin County only.** Source: Franklin County BOE Hart "Live Results" (liveresults.franklincountyohio.gov/enr/franklinohenr). It reads `/{N}/en/index_{N}.html` for the title and Official/Unofficial status, and `/{N}/summary_{N}.xml` for totals. The robots.txt returns 404. Election #4 is currently titled "TEST - November 3rd 2026 General Election". The county may publish election-night results under #4 or a new number. The rest of Ohio is link-only because liveresults.ohiosos.gov and ohiosos.gov return 403 to our server.
  - **WY: no feed.** The SOS posts PDFs only. The app shows an honest message plus official links.
  - **All other states:** the app shows the no-feed message plus official links from data/live-results.json.

### Election-night runbook (Nov 3, 2026; all times MST)
1. **Before the election (Nov 1–2), after Justin approves:** merge design/v8, then deploy manually (Render `srv-dbe18tbrjlhs738moih0`, auto-deploy is off). Open `/api/live/status`.
   - For each feed, `configuredId` should equal `discovered.id`, and `ok` should be true. Franklin will show `ok:false` while #4 is still titled TEST. That is expected, and the numbers stay hidden while it says TEST.
2. **Check the IDs by hand on Nov 3 around 4 p.m.:**
   - Utah: open https://electionresults.utah.gov/results/public/api/jurisdictions/Utah and find the entry with `electionDate` 2026-11-03. Its `publicElectionId` should be `General11032026`.
   - Franklin: open https://liveresults.franklincountyohio.gov/enr/franklinohenr/4/en/index_4.html, then 5 and 6. Use the number whose title is the Nov 3 2026 general and does not say TEST. Also check https://vote.franklincountyohio.gov/elections, which links the live page.
3. **Overriding an ID needs no code change.** In the Render dashboard, go to Environment and set either of these, then Save (that restarts the service):
   - `LIVE_UT_ELECTION_ID=<publicElectionId>`
   - `LIVE_OH_FRANKLIN_ELECTION_ID=<N>`
   Other env vars:
   - `LIVE_POLL_SECONDS` (120–300; default 180) sets how often upstream is polled.
   - `LIVE_RESULTS_OFF=1` is a kill switch: every state shows links only.
   - Never set `LIVE_TEST_MODE` on Render.
   - For a new county or state feed, add an entry to data/live-feeds.json with the same adapter.
4. **Polls close at:**
   - Ohio 5:30 p.m. MST (7:30 p.m. EST)
   - Wyoming 7:00 p.m. MST
   - Utah 8:00 p.m. MST
   After each close, open `/#/results?q=43215` (Columbus) and `/#/results?q=84101` (Salt Lake City). Expect "Polls are closed. No votes have been posted yet." until the first upload, and then numbers.
5. **If a source misbehaves** (wrong numbers, errors, blocks us), set `LIVE_RESULTS_OFF=1`. The official links stay visible.
6. **Cold starts (free plan).** Render free web services go to sleep after about 15 minutes with no traffic, and the first visitor waits about 30–60 s.
   - Free fix (document only, nothing is set up): from about 4 p.m. Nov 3 to about 2 a.m. Nov 4, have an external uptime pinger (for example UptimeRobot's free plan or a cron-job.org job) GET `https://civic-compass.onrender.com/api/health` every 5–10 minutes. Free instance hours (750/month) cover one always-on service.
   - Alternative: keep a browser tab on /#/results open; it refreshes every 60 s and keeps the service awake.
   - Upgrading the plan costs money and needs Justin's approval.
   - Sleeping also clears the in-memory cache. That is harmless: the next request refetches.

### Testing against past data (dev only)
- Run `LIVE_TEST_MODE=1 PORT=3111 node server/index.js`, then open `/#/results?q=84101&test=past` (Utah 2024 general, statewide plus Salt Lake County) or `/#/results?q=43215&test=past` (Franklin, June 23 2026 Whitehall special).
- The page shows a striped "TEST — PAST ELECTION DATA. NOT 2026 RESULTS." banner.
- Without `LIVE_TEST_MODE=1` the `test` parameter is ignored. Production never sets it, so real users can't see test data.
- Screenshots: `BASE=http://localhost:3111 node scripts/screenshots-v8.js` writes to screenshots/v8/. The mobile shots are 390 px wide at 2x; the desktop shots are 1280 px wide.
- **Unverified until Nov 3:**
  - Whether Utah posts live counts under `General11032026`, and how fast.
  - Which number Franklin uses, and whether its election-night XML has the same columns.
  - How long the Utah API keeps the same JSON shape.
  - Matching of Utah county-level contest names to districts (we match U.S. House, State Senate and State House numbers; other district contests go under "Other").
  - The Utah API sometimes returned an HTML page instead of JSON once during testing. The stale cache and retry cover this, but watch for it.
