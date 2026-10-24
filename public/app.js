(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const ELECTION_DATE = new Date('2026-11-03T00:00:00');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
const link = (u, t, extra = '') => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer"${extra}>${esc(t)}</a>`;
const money = (n) => (n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'));
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return ''; } };
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));
const fmtDateTime = (d) => { try { return new Date(d).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };

/* ---------- motifs (logo-derived) ---------- */
const STAR = (size = 40, id = 'a') => `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="M50 3 58 41 97 50 58 59 50 97 42 59 3 50 42 41Z" fill="#fff"/><path d="M50 3 42 41 3 50 50 50Z" fill="#B1001D"/><path d="M97 50 58 41 50 50 58 59Z" fill="#B1001D" opacity=".0"/><path d="M50 50 58 41 97 50Z" fill="#EE1F2E"/><path d="M50 97 58 59 50 50Z" fill="#dfe3ee"/><path d="M50 50 42 59 50 97Z" fill="#fff"/><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="0"/></svg>`;
const COMPASS = (size = 96) => `<svg class="spin" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#011A42" stroke="#fff" stroke-width="3"/><path d="${(() => { let d = ''; for (let i = 0; i < 36; i++) { const a = (i / 36) * 2 * Math.PI, l = i % 9 === 0 ? 9 : 4; d += `M${(50 + (44 - l) * Math.sin(a)).toFixed(1)} ${(50 - (44 - l) * Math.cos(a)).toFixed(1)}L${(50 + 44 * Math.sin(a)).toFixed(1)} ${(50 - 44 * Math.cos(a)).toFixed(1)}`; } return d; })()}" stroke="#fff" stroke-width="1.6" opacity=".8"/><g class="needle"><path d="M50 14 58 50 50 50Z" fill="#EE1F2E"/><path d="M50 14 42 50 50 50Z" fill="#B1001D"/><path d="M50 86 58 50 50 50Z" fill="#dfe5f3"/><path d="M50 86 42 50 50 50Z" fill="#fff"/></g><circle cx="50" cy="50" r="3.5" fill="#011A42" stroke="#fff" stroke-width="1.5"/></svg>`;
const DIVIDER = `<div class="divider" role="presentation"><span class="dv-star">${STAR(30)}</span></div>`;
const spark = (cx, cy, r, fill = '#fff') => `<path d="M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z" fill="${fill}"/>`;
function ticks(cx, cy, r, n, len, major, majLen, stroke, w) {
  let d = ''; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI, l = i % major === 0 ? majLen : len; d += `M${(cx + (r - l) * Math.sin(a)).toFixed(1)} ${(cy - (r - l) * Math.cos(a)).toFixed(1)}L${(cx + r * Math.sin(a)).toFixed(1)} ${(cy - r * Math.cos(a)).toFixed(1)}`; }
  return `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
}
/* v5 hero: real photo (U.S. Capitol dome and flag, Architect of the Capitol, public domain; credited on About & Sources and in CREDITS.md).
   Two art-directed crops (square card on desktop, 3:2 banner on phones) x 480/960/1600 widths x AVIF/WebP/JPEG fallback (see scripts/gen-hero.py).
   The photo is above the fold on every screen size, so it is loaded eagerly with high priority (lazy-loading the main image would delay it);
   dimensions are reserved with CSS aspect-ratio so nothing jumps. */
const HERO_ALT = 'The U.S. Capitol dome and white columns against a clear blue sky, with an American flag flying from a flagpole in front.';
const heroSet = (crop, ext) => [480, 960, 1600].map((w) => `/img/hero/capitol-${crop}-${w}.${ext}?v=5 ${w}w`).join(', ');
const HERO_ACCENT = `<svg class="hero-compass" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="46" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/><circle cx="50" cy="50" r="33" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-dasharray="1.5 3.5"/>${ticks(50, 50, 46, 72, 2.5, 18, 7, '#fff', 1.2)}<path d="M50 14 55.5 44.5 86 50 55.5 55.5 50 86 44.5 55.5 14 50 44.5 44.5Z" fill="#fff" fill-opacity=".92"/><path d="M50 14 55.5 44.5 50 50 44.5 44.5Z" fill="#EE1F2E"/></svg>`;
const heroPhoto = () => `<figure class="hero-art">
      <picture>
        <source media="(min-width:861px)" type="image/avif" srcset="${heroSet('sq', 'avif')}" sizes="(min-width:1100px) 455px, 42vw">
        <source media="(min-width:861px)" type="image/webp" srcset="${heroSet('sq', 'webp')}" sizes="(min-width:1100px) 455px, 42vw">
        <source media="(min-width:861px)" type="image/jpeg" srcset="${heroSet('sq', 'jpg')}" sizes="(min-width:1100px) 455px, 42vw">
        <source type="image/avif" srcset="${heroSet('wide', 'avif')}" sizes="100vw">
        <source type="image/webp" srcset="${heroSet('wide', 'webp')}" sizes="100vw">
        <img src="/img/hero/capitol-wide-960.jpg?v=5" srcset="${heroSet('wide', 'jpg')}" sizes="100vw" width="1600" height="1067" alt="${HERO_ALT}" fetchpriority="high" decoding="async">
      </picture>
      <span class="hero-shade" aria-hidden="true"></span>${HERO_ACCENT}
      <figcaption><b>U.S. Capitol, Washington, D.C.</b><span>Photo: Architect of the Capitol · public domain</span></figcaption>
    </figure>`;
const WAVE = `<svg class="wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 52C260 4 470 98 760 48 1040 2 1200 52 1440 18V90H0Z" fill="#B1001D"/><path d="M0 62C270 16 480 100 770 62 1050 24 1210 70 1440 38V90H0Z" fill="#FBFBFB"/><path d="M0 74C280 38 500 102 790 78 1060 56 1220 86 1440 62V90H0Z" fill="#F4F6FB"/></svg>`;
const ICON = {
  shield: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 4 7v8c0 8 5 13 12 15 7-2 12-7 12-15V7Z" fill="#011A42"/><path d="m10 16 4 4 8-9" fill="none" stroke="#fff" stroke-width="3"/></svg>',
  link: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#B1001D"/><path d="M12 20 20 12M14 12h6v6" fill="none" stroke="#fff" stroke-width="3"/></svg>',
  scale: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v22M7 26h18M6 9h20" stroke="#011A42" stroke-width="3" fill="none"/><path d="M3 18 6 9l3 9ZM23 18l3-9 3 9Z" fill="#B1001D"/></svg>',
  bars: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="17" width="6" height="12" rx="1" fill="#fff"/><rect x="13" y="8" width="6" height="21" rx="1" fill="#EE1F2E"/><rect x="23" y="13" width="6" height="16" rx="1" fill="#fff"/><path d="M2 30h28" stroke="#fff" stroke-width="2"/></svg>',
  eye: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16Z" fill="#011A42"/><circle cx="16" cy="16" r="5" fill="#fff"/><circle cx="16" cy="16" r="2.4" fill="#B1001D"/></svg>',
};

/* ---------- text size ---------- */
function applySize(n) { document.documentElement.dataset.size = String(n); localStorage.setItem('cc-size', n); document.querySelectorAll('.size button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === String(n)))); }
applySize(localStorage.getItem('cc-size') || '1');
document.querySelectorAll('.size button').forEach((b) => b.addEventListener('click', () => applySize(b.dataset.size)));
window.addEventListener('beforeprint', () => document.querySelectorAll('details').forEach((d) => { d.dataset.was = d.open ? '1' : ''; d.open = true; }));
window.addEventListener('afterprint', () => document.querySelectorAll('details').forEach((d) => { d.open = !!d.dataset.was; }));

/* ---------- data ---------- */
let status = null;
const api = async (path) => { const r = await fetch(path); let j = null; try { j = await r.json(); } catch {} if (!r.ok) throw new Error((j && j.error) || 'Something went wrong. Please try again.'); return j; };
const ballotCache = new Map();
async function getBallot(q) { if (ballotCache.has(q)) return ballotCache.get(q); const j = await api('/api/ballot?q=' + encodeURIComponent(q)); ballotCache.set(q, j); return j; }

/* ---------- views ---------- */
function setTitle(t) { document.title = t ? `${t} — Civic Compass` : 'Civic Compass — Know your ballot'; }
function loading(msg, sub) { main.innerHTML = `<div class="loading" role="status" aria-live="polite">${COMPASS(96)}<h2>${esc(msg)}</h2><p>${esc(sub || 'This can take a few seconds.')}</p><div class="bar"></div></div>`; }
function daysLeft() { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((ELECTION_DATE - t) / 86400000); }
function footer(extra = '') {
  $('#foot').innerHTML = `<p class="pledge">Nonpartisan. No ads. No tracking. No endorsements.</p>
  <p>Civic Compass collects facts from public sources and shows where each one came from. It is <b>not</b> an official ballot. Always confirm details with your
  ${link('https://www.usa.gov/state-election-office', 'state or county election office')}. Register or check your registration at ${link('https://vote.gov/', 'Vote.gov')} or ${link('https://vote.org/', 'Vote.org')}.</p>
  <p class="lu"><b>Last updated:</b> ${esc(extra || 'Ballot data is looked up live from its sources every time you search.')} <a href="#/about">About &amp; Sources</a></p>`;
}

function homeView() {
  setTitle('');
  const saved = localStorage.getItem('cc-last') || '';
  const d = daysLeft();
  main.innerHTML = `
  <section class="hero"><div class="hero-inner">
    <div>
      <span class="eyebrow">${STAR(18)} Election Day · Tuesday, November 3, 2026</span>
      <h1>See <em>every race</em> on your ballot.</h1>
      <p class="lead">Free, simple, and nonpartisan. Type where you live and we will show you who is running, and where each fact comes from.</p>
      <form class="search" id="f" role="search" autocomplete="on">
        <label for="q">Your ZIP code, city and state, or street address</label>
        <div class="row"><input id="q" name="q" inputmode="text" autocomplete="postal-code street-address" placeholder="Example: 84101" value="${esc(saved)}" aria-describedby="hint" required><button class="btn" type="submit">Show my ballot</button></div>
        <p class="hint" id="hint">A ZIP code is quick. A full street address (with city and state) gives the most exact districts. We do not store what you type.</p>
      </form>
      ${d >= 0 ? `<div class="countdown"><b>${d}</b> <span>${d === 0 ? 'It is Election Day!' : d === 1 ? 'day until Election Day' : 'days until Election Day'}</span></div>` : ''}
    </div>
    ${heroPhoto()}
  </div>${WAVE}</section>
  <section class="promises" aria-label="Our promises">
    <div class="promise">${ICON.scale}<h3>No opinions</h3><p>We never tell you how to vote or who is best.</p></div>
    <div class="promise">${ICON.link}<h3>Every fact has a source</h3><p>Tap any source link to see the original.</p></div>
    <div class="promise">${ICON.eye}<h3>Honest about gaps</h3><p>If data is thin, we say so and point you to official sites.</p></div>
    <div class="promise">${ICON.shield}<h3>News from all sides</h3><p>Stories grouped Left, Center and Right, each labeled by its source.</p></div>
  </section>
  <section class="wrap feature-wrap" aria-labelledby="feat-h"><a class="feature" href="#/results">
    <span class="feat-ico" aria-hidden="true">${ICON.bars}</span>
    <span class="feat-txt"><span class="chip inc">New</span><h2 id="feat-h">Election results &amp; performance</h2>
    <span class="feat-p">See how the 2024 and 2022 elections turned out where you live, with vote totals and sources, and where the 2026 results will be posted after polls close on November 3.</span></span>
    <span class="btn feat-go">Open Results ›</span></a></section>
  <div class="wrap"><div class="divider" role="presentation"><span class="dv-star">${STAR(30)}</span></div>
  <div class="prose"><h2>How it works</h2><ol><li>Type your ZIP code, city, or address above.</li><li>See your races in four parts: <b>City, County, State and Federal</b>.</li><li>Tap any candidate to read their background, positions, campaign money and news.</li><li>Want to see how past elections turned out? Open the <a href="#/results">Results</a> tab.</li></ol>
  <p class="src">Not sure where to vote? Visit ${link('https://vote.org/polling-place-locator/', 'Vote.org’s polling place locator')}.</p></div></div>`;
  footer();
  $('#f').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#q').value.trim(); if (q) location.hash = '#/ballot?q=' + encodeURIComponent(q); });
  main.focus({ preventScroll: true });
}

const partyChip = (p) => (p ? `<span class="chip lt">${esc(p)}</span>` : '');
function candHref(c, race, loc, q) {
  const p = new URLSearchParams({ name: c.name, office: race.office, level: race.level, state: loc.state.abbr, q });
  if (c.slug) p.set('slug', c.slug); if (c.party) p.set('party', c.party); if (c.incumbent) p.set('inc', '1');
  return '#/candidate?' + p.toString();
}
function raceHTML(race, loc, q) {
  const cs = [...race.candidates];
  const last = (n) => n.trim().split(/\s+/).slice(-1)[0].toLowerCase();
  cs.sort((a, b) => (a.writeIn ? 1 : 0) - (b.writeIn ? 1 : 0) || last(a.name).localeCompare(last(b.name)));
  return `<article class="race"><h3>${esc(race.office.replace(/\s*Term starts.*$/i, ''))}</h3>
  <p class="sub">${cs.length} on the ballot · listed A–Z by last name, not ranked${race.officeUrl ? ' · ' + link(race.officeUrl, 'About this race (Ballotpedia)') : ''}${race.placeNote ? ' · ' + esc(race.placeNote) : ''}</p>
  ${race.note ? `<p class="note">${esc(race.note)}</p>` : ''}
  <ul class="cands">${cs.map((c) => `<li><a class="cand" href="${esc(candHref(c, race, loc, q))}"><span><span class="nm">${esc(c.name)}</span><span class="meta">${c.incumbent ? '<span class="chip inc">Incumbent</span>' : ''}${c.party ? esc(c.party) : ''}${c.writeIn ? ' · write-in' : ''}</span></span><span class="go"><span>Read more</span> ›</span></a></li>`).join('')}</ul></article>`;
}
function limitedBox(sec, links, label) {
  return `<div class="limited"><h3>${STAR(26)} Limited data available</h3>${(sec.notes || []).map((n) => `<p>${esc(n)}</p>`).join('')}
  <p><b>Where to find the official ${esc(label)} list:</b></p><ul>${links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul></div>`;
}
const SECT = {
  city: { title: 'City', blurb: 'Mayor, city council and other local offices', short: 'City' },
  county: { title: 'County', blurb: 'County offices, local courts and school boards', short: 'County' },
  state: { title: 'State', blurb: 'Governor, state offices, state legislature and ballot measures', short: 'State' },
  federal: { title: 'Federal', blurb: 'U.S. Senate and U.S. House of Representatives', short: 'Federal' },
};
const measureHTML = (m, srcLinks) => `<div class="measure"><h3>${esc(m.title)}</h3>${m.area ? `<p class="sub">Applies to: ${esc(m.area)}</p>` : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}${m.options && m.options.length ? `<p class="sub">You vote: ${m.options.map(esc).join(' or ')}.${m.binding === false ? ' Advisory only.' : ''}</p>` : ''}${srcLinks ? `<p class="src">Source: ${srcLinks}</p>` : ''}</div>`;
const srcList = (arr) => (arr || []).map((s) => link(s.url, s.label)).join(' · ');
function retentionHTML(list, b) {
  if (!list || !list.length) return '';
  const by = {}; list.forEach((r) => { (by[r.court] = by[r.court] || []).push(r.judge); });
  const jl = (b.sources || []).filter((s) => /Judicial Performance|Know Your Judges/i.test(s.label));
  return `<h3 style="margin-top:1.2rem">Judges on your ballot (retention vote: Yes or No)</h3>
  <p class="note">These judges are already on the bench. You vote Yes to keep a judge or No to remove one. ${jl.length ? 'Official evaluations: ' + srcList(jl) + '.' : ''}</p>
  <ul class="retention">${Object.entries(by).map(([court, js]) => `<li><b>${esc(court)}</b><br>${js.map(esc).join(' · ')}</li>`).join('')}</ul>`;
}
function sectionHTML(key, data, b, q) {
  const S = SECT[key], loc = b.location, links = b.ballot.links;
  const allRaces = data.races || [];
  const races = allRaces.filter((r) => !r.addressDependent), addr = allRaces.filter((r) => r.addressDependent);
  const measures = key === 'state' ? [] : (data.measures || []);
  const off = data.official;
  const offSrc = off ? srcList(off.sources) : '';
  let body = '';
  if (off && off.asOf) body += `<p class="official-line"><b>Official ${esc(off.county || 'county')} candidate list</b> · as of ${esc(fmtDate(off.asOf + 'T12:00:00'))} · ${offSrc}</p>`;
  if (races.length) body += races.map((r) => raceHTML(r, loc, q)).join('');
  if (key === 'state' && data.measures && data.measures.length) body += `<h3 style="margin-top:1.2rem">Statewide ballot measures</h3>` + data.measures.map((m) => `<div class="measure"><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><p class="src">${esc(m.type)} · Topic: ${esc(m.subject)} · ${link(m.url, 'Read the full measure and arguments on Ballotpedia')}</p></div>`).join('');
  if (measures.length) body += `<h3 style="margin-top:1.2rem">Local ballot questions</h3>` + measures.map((m) => measureHTML(m, offSrc)).join('');
  if (addr.length) body += `<details class="more addr"${addr.length <= 8 ? ' open' : ''}><summary>Seats that depend on your street address (${addr.length})</summary><p class="note">These are numbered districts inside your county or school district. A ZIP code can’t tell us which one you live in, so we list all of them. Type your full street address on the home page, or check your county clerk’s sample ballot, to see yours.</p>${addr.map((r) => raceHTML(r, loc, q)).join('')}</details>`;
  const hasAny = races.length || addr.length || measures.length || (data.retention && data.retention.length);
  if (data.status === 'none' && !races.length) body += `<div class="none-box"><h3>${STAR(26)} No ${esc(S.title.toLowerCase())} election this year</h3>${(data.notes || []).map((n) => `<p>${esc(n)}</p>`).join('')}${data.noteSource ? `<p class="src">Source: ${link(data.noteSource.url, data.noteSource.label)}</p>` : ''}<p>For this year’s local ballot questions and judges, see below and your ${link('https://www.usa.gov/state-election-office', 'state election office')}.</p></div>`;
  else if (!hasAny) body += data.status === 'unavailable' ? `<div class="limited"><h3>${STAR(26)} Temporarily unavailable</h3><p>Our main source for this section could not be reached just now. Please try again in a minute, or use the official links below.</p><ul>${links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul></div>` : limitedBox(data, links, S.title.toLowerCase() + ' races');
  else if (data.notes && data.notes.length) body += data.notes.map((n) => `<p class="note">ℹ ${esc(n)}</p>`).join('');
  body += retentionHTML(data.retention, b);
  if (data.otherLocal && data.otherLocal.length) body += `<details class="more"><summary>Other local races in ${esc(loc.county ? loc.county.name : 'your county')} (may not be on your ballot)</summary>${data.otherLocal.map((r) => raceHTML(r, loc, q)).join('')}</details>`;
  const srcs = key === 'federal' ? b.sources.filter((s) => /elections, 2026$/.test(s.label)) : b.sources.filter((s) => !(key === 'city' && /County Clerk|Cache|Weber|Franklin|Laramie|Washington County|Utah County|Salt Lake County/i.test(s.label)));
  body += `<p class="src">Source: ${srcs.length ? srcs.slice(0, 4).map((s) => link(s.url, s.label)).join(' · ') : 'none available'} · Text from Ballotpedia is shared under ${link('https://creativecommons.org/licenses/by-nc-sa/3.0/', 'CC BY-NC-SA 3.0')}.</p>`;
  return `<section class="sect" id="s-${key}" aria-labelledby="h-${key}"><div class="sect-head">${STAR(44)}<div><h2 id="h-${key}">${S.title}</h2><p>${S.blurb}</p></div></div><div class="sect-body">${body}</div></section>`;
}
async function ballotView(q) {
  setTitle('Your ballot');
  loading('Looking up your ballot…', 'Finding your districts, then gathering the races from public sources.');
  let b;
  try { b = await getBallot(q); } catch (e) {
    main.innerHTML = `<div class="wrap"><div class="notice"><h2>We could not find that</h2><p>${esc(e.message)}</p><a class="btn" href="#/">Try again</a></div></div>`; footer(); return;
  }
  localStorage.setItem('cc-last', q);
  const loc = b.location, c = b.ballot;
  const where = loc.type === 'address' ? (loc.matched || q) : (loc.type === 'zip' ? `${loc.cityName || ''}, ${loc.state.abbr} ${loc.zip}` : `${loc.cityName}, ${loc.state.abbr}`);
  const facts = [loc.county && loc.county.name, loc.place && loc.place.name && 'City of ' + loc.place.name, loc.cd && loc.cd.label, loc.sldu && loc.sldu.label, loc.sldl && loc.sldl.label, loc.school && loc.school.name].filter(Boolean);
  const count = (k) => c[k].races.length + (k === 'county' || k === 'city' ? (c[k].measures || []).length + (c[k].retention || []).length : 0);
  const jumpLabel = (k) => (count(k) ? count(k) + (k === 'county' || k === 'city' ? ' item' : ' race') + (count(k) > 1 ? 's' : '') : c[k].status === 'none' ? 'no election in 2026' : 'limited data');
  main.innerHTML = `<div class="wrap">
  <div class="where"><span class="eyebrow">★ Your ballot · ${esc(b.election.label)}</span><h1>${esc(where)}</h1>
    <div class="facts">${facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>
    <div class="actions no-print"><a class="btn ghost small" href="#/">Change location</a><a class="btn ghost small" href="#/results?q=${encodeURIComponent(q)}">Past results for this area</a><button class="btn ghost small" type="button" id="print">Print this page</button></div></div>
  ${(loc.notes || []).map((n) => `<div class="notice">${esc(n)}</div>`).join('')}
  ${b.warnings && b.warnings.length ? b.warnings.map((w) => `<div class="notice">${esc(w)}</div>`).join('') : ''}
  ${c.federal.races.length || c.state.races.length ? '' : `<div class="notice">Some of our sources are not responding right now, so parts of this page may be empty. Please try again in a minute.</div>`}
  <nav class="jump" aria-label="Jump to a section">${['city', 'county', 'state', 'federal'].map((k) => `<a href="#s-${k}" data-jump="${k}">${SECT[k].title}<small>${jumpLabel(k)}</small></a>`).join('')}</nav>
  ${b.civic && b.civic.ok ? civicBlock(b.civic) : ''}
  ${['city', 'county', 'state', 'federal'].map((k) => sectionHTML(k, c[k], b, q)).join('')}
  <div class="official"><h2>Official places to check and to vote</h2><ul>${c.links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul></div>
  <p class="src">Fetched ${esc(fmtDateTime(b.generatedAt))} from the sources above. Districts come from the U.S. Census Bureau geocoder. Races can change; confirm with your election office.</p></div>`;
  footer('Fetched live ' + fmtDateTime(b.generatedAt) + '.');
  $('#print').addEventListener('click', () => window.print());
  document.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById('s-' + a.dataset.jump); t.scrollIntoView({ behavior: 'smooth' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }));
  window.scrollTo(0, 0);
}
function civicBlock(cv) {
  const pl = (cv.pollingLocations || [])[0];
  return pl ? `<div class="notice info"><b>Your polling place (Google Civic Information API):</b> ${esc(pl.name || '')} ${esc(pl.line || '')}${pl.hours ? ' · ' + esc(pl.hours) : ''}. Confirm with your election office.</div>` : '';
}

/* ---------- candidate ---------- */
const para = (t) => String(t || '').split(/\n\n+/).map((p) => `<p>${esc(p).replace(/\n• /g, '<br>• ').replace(/^• /, '• ')}</p>`).join('');
function dedupeBullets(t) { const seen = new Set(); return String(t || '').split('\n').filter((l) => { const k = l.trim(); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; }).join('\n'); }
async function candidateView(params) {
  const name = params.get('name'), q = params.get('q') || '';
  setTitle(name);
  loading('Gathering information on ' + name + '…', 'Checking background, record, campaign money and news.');
  const qs = new URLSearchParams({ name, office: params.get('office') || '', level: params.get('level') || '', state: params.get('state') || '' });
  if (params.get('slug')) qs.set('slug', params.get('slug'));
  let d;
  try { d = await api('/api/candidate?' + qs.toString()); } catch (e) { main.innerHTML = `<div class="wrap"><div class="notice"><p>${esc(e.message)}</p><a class="btn" href="#/ballot?q=${encodeURIComponent(q)}">Back to my ballot</a></div></div>`; footer(); return; }
  const party = params.get('party') || '', inc = params.get('inc') === '1';
  const bio = d.bio, S = (bio && bio.sections) || {};
  let h = `<div class="wrap"><div class="cand-head"><a class="btn ghost small no-print" href="#/ballot?q=${encodeURIComponent(q)}">‹ Back to my ballot</a>
    <h1>${esc(name)}</h1><p class="office">${esc(d.office)}</p><p>${inc ? '<span class="chip inc">Incumbent</span>' : ''}${party ? `<span class="chip">${esc(party)}</span>` : ''}</p>
    <button class="btn ghost small no-print" type="button" id="print">Print this page</button></div>
  <nav class="cnav" aria-label="On this page"><a href="#p-bg">Background</a><a href="#p-pos">Positions</a><a href="#p-money">Campaign money</a><a href="#p-news">In the news</a></nav>`;
  // Background
  h += `<section class="panel" id="p-bg"><h2>${STAR(30)} Background</h2>`;
  if (bio && (bio.lead.length || S.biography)) {
    h += bio.lead.slice(0, 3).map((t) => `<p>${esc(t)}</p>`).join('');
    const ib = bio.infobox || {}; const rows = Object.entries(ib).filter(([k, v]) => v && !Array.isArray(v)).map(([k, v]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`);
    if (ib.Education && ib.Education.length) rows.push(...ib.Education.map((e) => `<div class="stat"><b>${esc(e)}</b><span>Education</span></div>`));
    if (rows.length) h += `<div class="facts-grid">${rows.join('')}</div>`;
    if (S.biography && !bio.lead.join(' ').includes(S.biography.slice(0, 40))) h += `<h3>Biography</h3>${para(S.biography)}`;
    if (d.member && d.member.committees.length) h += `<h3>Current committees (U.S. Congress)</h3><ul>${d.member.committees.map((c) => `<li>${esc(c.name)}${c.title ? ' — ' + esc(c.title) : ''}</li>`).join('')}</ul><p class="src">Source: ${link(d.member.congressUrl, 'Congress.gov')} and ${link('https://github.com/unitedstates/congress-legislators', 'unitedstates/congress-legislators')} (public data). In office since ${esc(fmtDate(d.member.firstTermStart))}.</p>`;
    else if (S.committees) h += `<h3>Past committee assignments</h3><p>${para(dedupeBullets(S.committees).split(/\n\n.*was assigned/)[0].replace(/\[Source\]/g, ''))}</p>`;
    if (bio.links && bio.links.length) h += `<h3>The candidate’s own pages</h3><p class="note">Links the candidate or office provided. We do not review their content.</p><ul>${bio.links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul>`;
  } else {
    h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>${esc(d.bioError || (d.notes && d.notes[0]) || 'We could not find a background page for this candidate.')} The ballot lists ${esc(name)} as a candidate for ${esc(d.office)}. For more, check ${link('https://vote.org/', 'Vote.org')}, your ${link('https://www.usa.gov/state-election-office', 'state election office')}, or ${link('https://ballotpedia.org/Special:Search?search=' + encodeURIComponent(name), 'search Ballotpedia')}.</p></div>`;
  }
  h += `<p class="src">Source: ${bio ? link(bio.url, 'Ballotpedia — ' + bio.title) : 'none found'} · shared under ${link('https://creativecommons.org/licenses/by-nc-sa/3.0/', 'CC BY-NC-SA 3.0')}.</p></section>`;
  // Positions
  h += `<section class="panel" id="p-pos"><h2>${STAR(30)} Positions &amp; record</h2>`;
  let any = false;
  if (S.themes && S.themes.length) { any = true; h += `<h3>In the candidate’s own words</h3><p class="note">Answers below were <b>written by the candidate</b> for Ballotpedia’s Candidate Connection survey. We have not checked or edited them.</p>${S.themes.map((t) => `<details class="qa"><summary>${esc(t.q)}</summary><div>${esc(t.a)}</div></details>`).join('')}`; }
  else if (S.themesNote) h += `<p class="note">${esc(S.themesNote)}</p>`;
  if (S.keyVotes && S.keyVotes.rows && S.keyVotes.rows.length) { any = true; h += `<h3>Voting record: ${esc(S.keyVotes.header.replace(/^Key votes:\s*/i, 'key votes, '))}</h3><p class="note">Selected votes chosen by Ballotpedia editors. These may be from an earlier term.</p><ul class="votes">${S.keyVotes.rows.map((v) => `<li><span class="vote">${esc(v.vote)}</span>${esc(v.text)}</li>`).join('')}</ul>`; }
  if (d.sponsored && d.sponsored.bills && d.sponsored.bills.length) { any = true; h += `<h3>Recent bills sponsored (U.S. Congress)</h3><p class="note">${esc(d.sponsored.total != null ? d.sponsored.total + ' bills and resolutions sponsored in total. ' : '')}Most recent shown. Source: Congress.gov.</p><ul class="votes">${d.sponsored.bills.map((b) => `<li><b>${esc(b.number)}</b> (introduced ${esc(fmtDate(b.introduced))}) — ${b.url ? link(b.url, b.title) : esc(b.title)}${b.latest ? `<br><span class="note">Latest action ${esc(fmtDate(b.latest.date))}: ${esc(b.latest.text)}</span>` : ''}</li>`).join('')}</ul>`; }
  if (!any) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We did not find published positions or a voting record for ${esc(name)} in our sources. Visit the candidate’s own pages listed under Background, or ${link('https://ballotpedia.org/Special:Search?search=' + encodeURIComponent(name), 'search Ballotpedia')}.</p></div>`;
  h += `</section>`;
  // Money
  h += `<section class="panel" id="p-money"><h2>${STAR(30)} Campaign money</h2>`;
  if (d.fec && d.fec.totals) { const t = d.fec.totals; h += `<p>Federal campaign finance, 2025–2026 election cycle. Reports through <b>${esc(fmtDate(t.coverageEnd))}</b>.</p><div class="facts-grid"><div class="stat"><b>${money(t.receipts)}</b><span>Total raised</span></div><div class="stat"><b>${money(t.disbursements)}</b><span>Total spent</span></div><div class="stat"><b>${money(t.cashOnHand)}</b><span>Cash on hand</span></div><div class="stat"><b>${money(t.debts)}</b><span>Debts owed</span></div></div>
    <table class="fin"><caption class="sr" style="position:absolute;left:-999px">Where the money came from</caption><thead><tr><th>Where it came from</th><th>Amount</th></tr></thead><tbody><tr><td>Individuals (itemized, over $200)</td><td>${money(t.individualItemized)}</td></tr><tr><td>Individuals (small, unitemized)</td><td>${money(t.individualUnitemized)}</td></tr><tr><td>Political action committees (PACs) &amp; other committees</td><td>${money(t.pacContributions)}</td></tr><tr><td>Political parties</td><td>${money(t.partyContributions)}</td></tr><tr><td>The candidate’s own money (contributions)</td><td>${money(t.candidateContributions)}</td></tr><tr><td>Loans from the candidate</td><td>${money(t.loansFromCandidate)}</td></tr></tbody></table>
    <p class="src">Source: ${link(d.fec.url, 'Federal Election Commission — ' + d.fec.name)}. This product uses the FEC’s public API but is not endorsed or certified by the FEC.</p>`; }
  else if (d.fec && (d.fec.notFound || d.fec.error)) h += `<div class="limited"><h3>${STAR(26)} ${d.fec.error ? 'Temporarily unavailable' : 'Limited data available'}</h3><p>${esc(d.fec.error ? d.fec.message : d.fec.ambiguous ? 'We found more than one possible FEC match for this name, so we are not showing numbers to avoid mixing up people.' : 'We could not find this candidate in the FEC database yet (new candidates may not have filed).')} ${link(d.fec.searchUrl, 'Search the FEC yourself')}</p></div>`;
  const fin = S.finance;
  if (fin && fin.length > 1) { h += `<h3>Career fundraising summary (Ballotpedia)</h3><table class="fin"><thead><tr>${fin[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${fin.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="src">Source: ${link(bio.url, 'Ballotpedia')}, from OpenSecrets and the FEC or state filings. * Data for the current year may be incomplete.</p>`; }
  if (!d.fec && !(fin && fin.length > 1)) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>State and local campaign money is reported to ${esc(d.state || 'your state')}’s own election office, and most do not offer a data feed. Find your state’s office here: ${link('https://www.usa.gov/state-election-office', 'USA.gov — State election offices')}. You can also try ${link('https://www.opensecrets.org/states', 'OpenSecrets state pages')}.</p></div>`;
  h += `</section>`;
  // News
  h += `<section class="panel" id="p-news"><h2>${STAR(30)} In the news</h2><div id="news" role="status" aria-live="polite"><p>${COMPASS(48)} Loading news…</p></div></section></div>`;
  main.innerHTML = h;
  footer('Fetched live ' + fmtDateTime(d.generatedAt) + '.');
  $('#print').addEventListener('click', () => window.print());
  window.scrollTo(0, 0);
  loadNews(name, params);
}
async function loadNews(name, params) {
  const box = $('#news'); if (!box) return;
  const qs = new URLSearchParams({ name, state: params.get('state') || '', office: params.get('office') || '' });
  let n;
  try { n = await api('/api/news?' + qs.toString()); } catch (e) { box.innerHTML = `<div class="limited"><p>${esc(e.message)}</p></div>`; return; }
  if (!$('#news')) return;
  const col = (cls, title, items, empty) => `<div class="ncol ${cls}"><h3>${title}</h3>${items.length ? `<ul>${items.map((i) => `<li>${link(i.link, i.headline)}<div class="by"><span class="chip lt">${esc(i.lean || '')}</span> ${esc(i.source)}${i.date ? ' · ' + esc(fmtDate(i.date)) : ''}${i.asUrl ? ' · ' + link(i.asUrl, 'rating') : ''}</div></li>`).join('')}</ul>` : `<p class="empty">${esc(empty)}</p>`}</div>`;
  if (n.error) { box.innerHTML = `<div class="limited"><h3>${STAR(26)} Temporarily unavailable</h3><p>${esc(n.message)} ${link(n.searchUrl, 'Search Google News')}</p></div>`; return; }
  const g = n.groups, S = n.source;
  box.innerHTML = `<p class="note">Stories found in the last year whose headline names ${esc(name)}. Each outlet is placed in a column by its published <b>${link(S.url, 'AllSides media bias rating')}</b> — not by what the story says. “Lean Left” outlets appear under Left, “Lean Right” under Right. Showing up to 5 per column.</p>
  <div class="news3">${col('l', 'Left &amp; Lean Left', g.left, 'No rated Left-leaning stories found.')}${col('c', 'Center', g.center, 'No rated Center stories found.')}${col('r', 'Right &amp; Lean Right', g.right, 'No rated Right-leaning stories found.')}</div>
  ${g.unrated.length ? `<h3>More coverage (outlet not in our rating list)</h3><p class="note">These outlets have no rating in our AllSides snapshot, so we do not place them in a column.</p><ul class="unrated">${g.unrated.map((i) => `<li>${link(i.link, i.headline)} <span class="note">— ${esc(i.source)}${i.date ? ', ' + esc(fmtDate(i.date)) : ''}</span></li>`).join('')}</ul>` : ''}
  ${n.total === 0 ? `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We found no recent stories naming this candidate. ${link(n.searchUrl, 'Search Google News yourself')}</p></div>` : ''}
  <p class="src">Source: ${link(n.searchUrl, 'Google News search')} (fetched ${esc(fmtDateTime(n.fetchedAt))}). Ratings: ${link(S.dataset, S.name)}. ${esc(S.note)}</p>`;
}

/* ---------- results ---------- */
const STATE_NAMES = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming' };
const resultsCache = new Map();
async function getResults(key, qs) { if (resultsCache.has(key)) return resultsCache.get(key); const j = await api('/api/results?' + qs); resultsCache.set(key, j); return j; }
const TOP = /^(President|U\.S\. Senate|Governor)/;
const distLabel = (d) => (d ? (/^\d+$/.test(d) ? ` — District ${parseInt(d, 10)}` : ` — ${String(d).toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}`) : '');
const lookupForms = (saved, cur) => `<div class="lookup">
  <form class="search" id="rf" role="search"><label for="rq">Your ZIP code, city and state, or street address</label>
    <div class="row"><input id="rq" name="q" placeholder="Example: 84101" value="${esc(saved)}" required><button class="btn" type="submit">Show results</button></div>
    <p class="hint">Shows your state, county and U.S. House district. We do not store what you type.</p></form>
  <form class="search alt" id="rs"><label for="rstate">Or pick a state</label>
    <div class="row"><select id="rstate" name="state" aria-label="State">${Object.entries(STATE_NAMES).map(([a, n]) => `<option value="${a}"${a === cur ? ' selected' : ''}>${n}</option>`).join('')}</select><button class="btn ghost" type="submit">Show state</button></div></form></div>`;
function contestCard(c, yv) {
  const src = `<a href="${esc(safeUrl(yv.source.repo))}" target="_blank" rel="noopener noreferrer">MEDSL official returns</a>, ${esc(yv.date)} election · retrieved ${esc(fmtDate(yv.snapshot + 'T12:00:00'))}`;
  const title = c.office + distLabel(c.district) + (c.special ? ' (special election)' : '');
  const rows = c.candidates.map((r) => `<tr class="${r.won ? 'won' : ''}"><th scope="row">${esc(r.name)}${r.party ? `<small class="pty">${esc(r.party)}</small>` : ''}${r.won ? (c.measure ? ' <span class="chip">More votes</span>' : ' <span class="chip win">✔ Most votes</span>') : ''}</th><td class="n">${num(r.votes)}</td><td class="n pct">${r.pct == null ? '—' : r.pct.toFixed(1) + '%'}<span class="bar" aria-hidden="true"><i style="width:${Math.min(100, r.pct || 0)}%"></i></span></td></tr>`).join('');
  return `<article class="rcard"><h4>${esc(title)}</h4>
  <table class="rt"><caption class="sr">${esc(title)}, ${esc(yv.date)}</caption><thead><tr><th scope="col">${c.measure ? 'Choice' : 'Candidate and party'}</th><th scope="col" class="n">Votes</th><th scope="col" class="n">Share</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="rmeta">Total votes in this contest: <b>${num(c.total)}</b>${c.other ? ` · ${num(c.other.count)} other candidates: ${num(c.other.votes)} votes (not listed)` : ''}${c.margin ? ` · Margin between the top two: <b>${c.margin.points.toFixed(1)} points</b> (${num(c.margin.votes)} votes)` : ''}${c.seats > 1 ? ` · Voters could choose up to ${c.seats}, so shares add to more than one candidate’s support` : ''}</p>
  <p class="src">Source: ${src}</p></article>`;
}
function turnoutLine(v, label) {
  if (v.ballots) return `<p class="turnout"><b>Turnout${label}:</b> ${num(v.ballots)} ballots cast${v.registered ? ` of ${num(v.registered)} registered voters (${(100 * v.ballots / v.registered).toFixed(1)}%)` : ''}.</p>`;
  return '';
}
function yearPanel(yv, r, hasLookup) {
  const id = 'y' + yv.year;
  const head = `<section class="panel" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${STAR(30)} ${yv.year} general election</h2><p class="asof">Held ${esc(yv.date)} · final results from state election officials, compiled by MEDSL · snapshot retrieved ${yv.snapshot ? esc(fmtDate(yv.snapshot + 'T12:00:00')) : '—'}</p>`;
  const offLink = r.live.office ? ` Check them against the official results at ${link(r.live.office, r.state.name + '’s election office')}.` : '';
  if (!yv.available || (!yv.statewide.length && !yv.house.length)) return head + `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We could not load ${yv.year} results for ${esc(r.state.name)} from our public source.${offLink} You can also search ${link('https://electionlab.mit.edu/data', 'MIT Election Lab data')}.</p></div></section>`;
  const top = yv.statewide.filter((c) => TOP.test(c.office)), rest = yv.statewide.filter((c) => !TOP.test(c.office));
  let h = head + turnoutLine(yv, ' (statewide)');
  if (!yv.ballots && yv.topVotes) h += `<p class="turnout"><b>Votes cast:</b> ${num(yv.topVotes.votes)} in the ${esc(yv.topVotes.office)} contest. This source does not report turnout for ${esc(r.state.name)} in ${yv.year}, so the top contest is shown as a guide.</p>`;
  if (top.length) h += `<h3>Top of the ticket (statewide)</h3>${top.map((c) => contestCard(c, yv)).join('')}`;
  if (yv.house.length) {
    const mine = hasLookup && r.location && r.location.cd && !r.location.cd.atLarge;
    h += `<h3>U.S. House${mine ? ` — ${esc(r.location.cd.label)} as numbered in ${yv.year}` : yv.house.length > 1 ? ' — all districts' : ''}</h3>`;
    if (mine) h += `<p class="note">District numbers and boundaries can change between elections. This is the district with the same number in ${yv.year}, which may cover different areas than your district does today.</p>`;
    h += mine || yv.house.length <= 2 ? yv.house.map((c) => contestCard(c, yv)).join('') : `<details class="more"><summary>Show all ${yv.house.length} U.S. House contests</summary>${yv.house.map((c) => contestCard(c, yv)).join('')}</details>`;
  }
  if (rest.length) h += `<details class="more"><summary>Other statewide offices and ballot measures (${rest.length})</summary>${rest.map((c) => contestCard(c, yv)).join('')}</details>`;
  if (yv.statewide.length < 3) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>Our source lists only ${yv.statewide.length} statewide contest${yv.statewide.length === 1 ? '' : 's'} for ${yv.year} in ${esc(r.state.name)}. Other statewide offices may have been on the ballot.${offLink}</p></div>`;
  if (yv.county) {
    const c = yv.county;
    h += `<h3>${esc(c.name)}</h3>${turnoutLine(c, ' (county)')}${c.contests.length ? `<details class="more" open><summary>${c.contests.length} contest${c.contests.length === 1 ? '' : 's'} in ${esc(c.name)}</summary>${c.contests.map((x) => contestCard(x, yv)).join('')}</details>` : `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>No county-level contests for ${esc(c.name)} in our ${yv.year} data.${offLink}</p></div>`}`;
  } else if (hasLookup) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We have no county breakdown for your county in the ${yv.year} data.${offLink}</p></div>`;
  h += `<p class="src">Source: ${link(yv.source.repo, 'MEDSL ' + yv.year + ' official election returns')} (${link(yv.source.about, 'MIT Election Data + Science Lab')}; public domain, CC0) · file ${link(yv.source.file, 'downloaded ' + (yv.snapshot || ''))}.</p></section>`;
  return h;
}
function glancePanel(r, hasLookup) {
  const rows = [];
  for (const y of ['2024', '2022']) {
    const yv = r.years[y]; if (!yv.available) continue;
    const pick = [...yv.statewide.filter((c) => TOP.test(c.office)), ...(hasLookup ? yv.house : [])];
    for (const c of pick) if (c.margin) rows.push([y, c.office + distLabel(c.district), c.candidates[0], c.candidates[1], c.margin, yv]);
  }
  if (!rows.length) return '';
  return `<section class="panel" id="glance" aria-labelledby="glance-h"><h2 id="glance-h">${STAR(30)} Margins at a glance</h2>
  <p class="note">How close each top contest was. These are facts about past elections, not predictions about 2026.</p>
  <ul class="glance">${rows.map(([y, o, a, b2, m]) => `<li><b>${y} · ${esc(o)}</b><span>Most votes: ${esc(a.name)} (${esc(a.party || 'no party listed')}) — ${a.pct.toFixed(1)}%</span><span>Second: ${esc(b2.name)} (${esc(b2.party || 'no party listed')}) — ${b2.pct.toFixed(1)}%</span><span class="gm">Margin: ${m.points.toFixed(1)} points (${num(m.votes)} votes)</span></li>`).join('')}</ul>
  <p class="src">Source: ${link(r.years['2024'].source ? r.years['2024'].source.repo : 'https://electionlab.mit.edu/data', 'MEDSL official returns')} · snapshot retrieved ${esc(fmtDate((r.snapshot || '') + 'T12:00:00'))}. Margin = top vote-getter’s share minus second place’s share.</p></section>`;
}
function historyPanel(r, q) {
  const hist = r.history || [];
  let h = `<section class="panel" id="past" aria-labelledby="past-h"><h2 id="past-h">${STAR(30)} Past results of candidates on your ballot</h2>`;
  if (!hist.length) return h + `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We did not find any of this year’s federal or statewide candidates on your ballot among the 2024 or 2022 results we have for ${esc(r.state.name)} (matching is by name and state). That is common for first-time candidates and for people who were not on those ballots.</p></div></section>`;
  const by = {}; hist.forEach((x) => { (by[x.forName] = by[x.forName] || []).push(x); });
  h += `<p class="note">Candidates named on your 2026 ballot who also appeared in the 2024 or 2022 general election results for ${esc(r.state.name)}. Matched by last name, first name and state only, so please confirm it is the same person. This is a record of what happened, not a prediction.</p>`;
  h += Object.entries(by).map(([name, xs]) => `<div class="hist"><h3>${esc(name)}</h3><ul>${xs.map((x) => `<li><b>${x.year}</b> · ${esc(x.office)} · ${esc(x.party || 'no party listed')} · ${num(x.votes)} votes (${x.pct == null ? '—' : x.pct.toFixed(1) + '%'}) · <b>${x.won ? 'Won' : 'Did not win'}</b>${x.margin ? ` · contest margin ${x.margin.points.toFixed(1)} points` : ''}</li>`).join('')}</ul></div>`).join('');
  h += `<p class="note">For an incumbent’s bills and committee work in Congress, open the candidate from ${q ? `<a href="#/ballot?q=${encodeURIComponent(q)}">your ballot</a>` : 'your ballot'}; those pages link to Congress.gov.</p>`;
  h += `<p class="src">Source: ${link(r.years['2024'].source ? r.years['2024'].source.repo : 'https://electionlab.mit.edu/data', 'MEDSL official returns')} (2024 and 2022) · snapshot retrieved ${esc(fmtDate((r.snapshot || '') + 'T12:00:00'))}; the 2026 candidate list comes from the ballot page sources.</p></section>`;
  return h;
}
function livePanel(r) {
  const L = r.live, d = daysLeft();
  return `<section class="panel live" id="live" aria-labelledby="live-h"><h2 id="live-h">${STAR(30)} 2026 live results — ${esc(r.state.name)}</h2>
  <div class="live-box"><b>Live results will appear here after polls close Nov 3, 2026.</b>
  <p>${esc(L.pollsClose)} ${d > 0 ? `That is ${d} day${d === 1 ? '' : 's'} from today.` : d === 0 ? 'That is today.' : ''}</p></div>
  <p>${esc(L.explain)}</p>
  <ul class="officials">${L.results ? `<li>${link(L.results, r.state.name + '’s official election-results website')}<br><span class="note">The state’s own results site. It was reachable on ${esc(fmtDate(L.checkedOn + 'T12:00:00'))}; it normally shows results only on and after Election Night.</span></li>` : `<li><span class="note">We could not confirm a ${esc(r.state.name)} results website yet. Results will be posted by the state election office:</span></li>`}
  ${L.office ? `<li>${link(L.office, r.state.name + ' election office')}${L.note ? `<br><span class="note">${esc(L.note)}</span>` : ''}</li>` : ''}
  <li>${link('https://www.usa.gov/state-election-office', 'USA.gov — find any state’s election office')}</li></ul>
  <p class="src">Source: official state election websites, links checked ${esc(fmtDate(L.checkedOn + 'T12:00:00'))}. Civic Compass does not use news-organization (AP) projections.</p></section>`;
}
async function resultsView(params) {
  setTitle('Election results');
  const q = (params.get('q') || '').trim(), st = (params.get('state') || '').toUpperCase();
  const saved = q || localStorage.getItem('cc-last') || '';
  const intro = `<div class="where results-hero"><span class="eyebrow">${STAR(18)} Results &amp; performance</span><h1>How elections turned out</h1><p class="lead">Past results for your area (2024 and 2022), and where the 2026 results will be posted. Every number shows its source and date. We never predict or recommend.</p></div>`;
  if (!q && !st) {
    main.innerHTML = `<div class="wrap">${intro}${lookupForms(saved, 'UT')}
    <section class="panel live"><h2>${STAR(30)} 2026 live results</h2><div class="live-box"><b>Live results will appear here after polls close Nov 3, 2026.</b><p>Pick your state or type your ZIP above to see the official results website for your state.</p></div></section>
    <div class="prose"><h2>What you will find here</h2><ul><li><b>Past results</b> for the 2024 and 2022 November general elections: candidates, party, vote totals, percentages, who got the most votes, and turnout where it is reported.</li><li><b>Your county and U.S. House district</b> when you type a ZIP code, city or address.</li><li><b>Margins</b> showing how close past contests were, and how candidates on your 2026 ballot did when they ran before.</li><li><b>Official links</b> to your state’s results website for November 3, 2026.</li></ul><p class="src">Source: ${link('https://electionlab.mit.edu/data', 'MIT Election Data + Science Lab')} official election returns (public domain). Some results are limited for some states; where that is true, we say so.</p></div></div>`;
    footer('Past results are bundled snapshots of official returns; each card shows its snapshot date.'); bindLookup(); window.scrollTo(0, 0); return;
  }
  loading('Loading results…', 'Gathering past results and official links.');
  let r;
  try { r = await getResults(q ? 'q:' + q : 's:' + st, q ? 'q=' + encodeURIComponent(q) : 'state=' + encodeURIComponent(st)); } catch (e) {
    main.innerHTML = `<div class="wrap">${intro}<div class="notice"><p>${esc(e.message)}</p></div>${lookupForms(saved, st || 'UT')}</div>`; footer(); bindLookup(); return;
  }
  if (q) localStorage.setItem('cc-last', q);
  const hasLookup = !!r.location;
  const facts = hasLookup ? [r.location.county && r.location.county.name, r.location.cd && r.location.cd.label].filter(Boolean) : [];
  main.innerHTML = `<div class="wrap">
  <div class="where results-hero"><span class="eyebrow">${STAR(18)} Results &amp; performance</span><h1>${esc(hasLookup ? r.location.label : r.state.name)}${hasLookup ? '' : ''}</h1>
    <div class="facts"><span class="fact">${esc(r.state.name)}</span>${facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>
    <div class="actions no-print"><a class="btn ghost small" href="#/results">Change location</a>${q ? `<a class="btn ghost small" href="#/ballot?q=${encodeURIComponent(q)}">See my 2026 ballot</a>` : ''}<button class="btn ghost small" type="button" id="print">Print this page</button></div></div>
  <nav class="jump jump5" aria-label="Jump to a section"><a href="#s-live" data-jump="live">2026<small>live results</small></a><a href="#s-y2024" data-jump="y2024">2024<small>past results</small></a><a href="#s-y2022" data-jump="y2022">2022<small>past results</small></a><a href="#s-past" data-jump="past">Candidates<small>past results</small></a></nav>
  ${livePanel(r)}
  ${glancePanel(r, hasLookup)}
  ${yearPanel(r.years['2024'], r, hasLookup)}
  ${yearPanel(r.years['2022'], r, hasLookup)}
  ${hasLookup ? historyPanel(r, q) : ''}
  <section class="panel" id="about-data"><h2>${STAR(30)} How to read these results</h2><ul>${r.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <p class="src">Data: ${link('https://electionlab.mit.edu/data', 'MIT Election Data + Science Lab')} (public domain, CC0). Full source list on ${'<a href="#/about">About &amp; Sources</a>'}. Snapshot built ${esc(fmtDate((r.snapshot || '') + 'T12:00:00'))}.</p></section>
  ${lookupForms(q || saved, r.state.abbr)}</div>`;
  footer('Past results are bundled snapshots of official returns (retrieved ' + fmtDate((r.snapshot || '') + 'T12:00:00') + '); live-result links checked ' + fmtDate(r.live.checkedOn + 'T12:00:00') + '.');
  $('#print').addEventListener('click', () => window.print());
  document.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (!t) return; t.scrollIntoView({ behavior: 'smooth' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }));
  bindLookup(); window.scrollTo(0, 0);
}
function bindLookup() {
  const f = $('#rf'), g = $('#rs');
  if (f) f.addEventListener('submit', (e) => { e.preventDefault(); const q = $('#rq').value.trim(); if (q) location.hash = '#/results?q=' + encodeURIComponent(q); });
  if (g) g.addEventListener('submit', (e) => { e.preventDefault(); location.hash = '#/results?state=' + $('#rstate').value; });
}

/* ---------- about ---------- */
function aboutView() {
  setTitle('About & Sources');
  const row = (a, b, c) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`;
  main.innerHTML = `<div class="wrap"><h1 style="color:var(--navy)">About &amp; Sources</h1>
  <div class="prose"><h2>Our promises</h2><ul><li><b>No opinions and no endorsements.</b> We never recommend a candidate, a party or a vote.</li><li><b>No made-up facts.</b> Every fact on a candidate page shows the source it came from, with a link.</li><li><b>Honest gaps.</b> When there is little data (especially for city and county races), we say “Limited data available” and link to official election offices.</li><li><b>Free and private.</b> No ads, no sign-ups. We do not store what you type.</li></ul></div>
  <div class="prose"><h2>Where the information comes from</h2><div style="overflow-x:auto"><table class="srcs"><thead><tr><th>Source</th><th>Used for</th><th>Notes</th></tr></thead><tbody>
  ${row(link('https://ballotpedia.org/', 'Ballotpedia'), 'Which races and candidates are on the ballot; candidate biographies, committees, key votes, and Candidate Connection survey answers; ballot measures', 'Text is shared under CC BY-NC-SA 3.0. Survey answers are written by the candidates themselves.')}
  ${row(link('https://geocoding.geo.census.gov/', 'U.S. Census Bureau Geocoder'), 'Turning your ZIP, city or address into your county, city, congressional and state legislative districts', 'ZIP codes and cities are approximate (we use the center). A street address is most exact.')}
  ${row(link('https://api.open.fec.gov/', 'Federal Election Commission (OpenFEC)'), 'Money raised and spent by federal candidates', 'Not endorsed or certified by the FEC. Numbers reflect the latest reports filed.')}
  ${row(link('https://www.congress.gov/', 'Congress.gov'), 'Bills sponsored by current members of Congress', 'Library of Congress public API.')}
  ${row(link('https://github.com/unitedstates/congress-legislators', 'unitedstates/congress-legislators'), 'Current members, terms and committee assignments', 'Open public-domain dataset.')}
  ${row(link('https://news.google.com/', 'Google News (RSS search)'), 'Recent news stories that name the candidate', 'We only show stories whose headline includes the candidate’s last name.')}
  ${row(link('https://www.allsides.com/media-bias/ratings', 'AllSides Media Bias Ratings'), 'The Left / Center / Right label on each news outlet', 'We use a published snapshot from the open ' + link('https://github.com/favstats/AllSideR', 'AllSideR dataset') + ', which is older than AllSides’ live site. Outlets missing from it are shown as “not rated.” The label describes the outlet, not any one story.')}
  ${row(link('https://electionlab.mit.edu/data', 'MIT Election Data + Science Lab (MEDSL)'), 'Past results: 2024 and 2022 general-election candidates, parties, vote totals, percentages and margins, by state, county and U.S. House district', 'Compiled from official state returns and released as CC0 (public domain). Bundled as a dated snapshot; some states omit turnout or have partial statewide data, and we say so on each page. District lines changed in some states since then. Files: ' + link('https://github.com/MEDSL/2024-elections-official', '2024') + ' · ' + link('https://github.com/MEDSL/2022-elections-official', '2022') + '.')}
  ${row('Official county election offices: ' + link('https://www.saltlakecounty.gov/clerk/elections/current-candidate-list/', 'Salt Lake') + ', ' + link('https://www.cachecounty.gov/assets/department/clerk/elections/ElectionNotices/2026/General/Cache_County_2026_General_Election_Certification_Final2.pdf', 'Cache') + ', ' + link('https://www.washco.utah.gov/wp-content/uploads/2026/09/2026-General-Election-Certification-of-County-Candidates-Notice.pdf', 'Washington') + ', ' + link('https://www.utahcounty.gov/cms/uploads/Utah_County_2026_General_Election_Candidate_Certification_4e705c1719.pdf', 'Utah') + ', ' + link('https://www.weberelections.gov/listofcandidates', 'Weber') + ', ' + link('https://www.vote.franklincountyohio.gov/election-info/2026', 'Franklin, OH') + ', ' + link('https://maps.laramiecounty.com/ClerkDocs/SampleBallots/2026/General/5-1.pdf', 'Laramie, WY'), 'County races and local ballot questions in the counties we have checked', 'Public records, read by us and saved with the date they were published or retrieved (each county list shows its “as of” date). The Salt Lake County list comes from the Clerk’s public candidate data feed, which has no published documentation, so we keep a saved copy and fall back to it if the feed changes. Counties not listed here use Ballotpedia where it has data, otherwise “Limited data available.”')}
  ${row(link('https://le.utah.gov/xcode/Title20A/Chapter1/20A-1-S202.html', 'Utah Code § 20A-1-202') + ', ' + link('https://codes.ohio.gov/ohio-revised-code/section-3501.01', 'Ohio Revised Code § 3501.01'), 'Why Utah and Ohio cities have no mayor or council race this year', 'State law sets city elections in odd-numbered years. We only say “no city election” where we have checked the law.')}
  ${row(link('https://knowyourjudges.utah.gov/s/', 'Utah Judicial Performance Evaluation Commission'), 'Evaluations of the Utah judges who appear for retention', 'Official evaluations; we link to them and show no opinion.')}
  ${row('Official state results websites', 'Where 2026 results will be posted after polls close on Nov 3, 2026', 'Links only, checked October 24, 2026. A few state sites block automated checks; those are marked on the Results page. We do not use news-organization projections.')}
  ${row(link('https://vote.gov/', 'Vote.gov') + ', ' + link('https://vote.org/', 'Vote.org') + ', ' + link('https://www.usa.gov/state-election-office', 'USA.gov'), 'Registration, polling places, dates, and your official election office', 'Official links only; we copy no content.')}
  </tbody></table></div></div>
  <div class="prose" id="photo-credit"><h2>Photo credit</h2><p>The photo at the top of the home page, <b>“Capitol Dome,”</b> shows the U.S. Capitol dome with an American flag. It was taken on July 9, 2012 by the <b>Architect of the Capitol</b> (Flickr account “USCapitol”).</p>
  <ul><li><b>License:</b> Public domain. It is a work of the U.S. federal government (17 U.S.C. § 105), so no permission is needed. The Architect of the Capitol asks that its images be credited “Architect of the Capitol,” be used for educational or non-commercial purposes, and not be used to suggest that the Architect of the Capitol or Congress endorses anything.</li>
  <li><b>Sources:</b> ${link('https://commons.wikimedia.org/wiki/File:Flickr_-_USCapitol_-_Capitol_Dome_(1).jpg', 'Wikimedia Commons file page')} · ${link('https://www.flickr.com/photos/uscapitol/7537241496/', 'original on Flickr')}.</li>
  <li><b>Changes:</b> We cropped and resized the image and added a dark-blue shading at the edges so the words stay easy to read.</li>
  <li>Civic Compass is an independent, nonpartisan tool. It is <b>not affiliated with or endorsed by</b> the Architect of the Capitol, Congress, or any government agency.</li></ul></div>
  <div class="prose"><h2>Good to know</h2><ul><li>This is a research tool, <b>not an official ballot</b>. Your real ballot may differ, especially for local races and when you only typed a ZIP code.</li><li>School boards, judges and small-town races are the hardest to find. Where our sources have nothing, we say so.</li><li>Ballot data changes as officials certify candidates. Each page shows when it was fetched.</li><li>Found a mistake? Please tell the person who shared this app with you so it can be fixed.</li></ul></div>
  <div class="prose" id="keys"><h2>Optional data sources that can be added</h2><p>The site works without any account keys. Adding keys (done privately by the site owner) improves reliability:</p><ul><li><b>Google Civic Information API</b> — official ballot contests and polling places for a street address.</li><li><b>FEC &amp; Congress.gov API keys</b> — higher request limits for campaign finance and bills.</li></ul><p class="src" id="keystat"></p></div>
  <a class="btn" href="#/">‹ Back to the search</a></div>`;
  footer();
  api('/api/status').then((s) => { const k = s.keys; $('#keystat').textContent = `Right now: Google Civic ${k.GOOGLE_CIVIC_API_KEY ? 'connected' : 'not connected'} · FEC key ${k.FEC_API_KEY ? 'set' : 'using shared public limit'} · Congress.gov key ${k.CONGRESS_API_KEY ? 'set' : 'using shared public limit'}.`; }).catch(() => {});
  window.scrollTo(0, 0);
}

/* ---------- router ---------- */
function setTab(path) {
  const t = /^\/results/.test(path) ? 'results' : path === '/about' ? 'about' : 'ballot';
  document.querySelectorAll('.tabs a').forEach((a) => { if (a.dataset.tab === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
function route() {
  const h = location.hash || '#/';
  const [path, qs] = h.slice(1).split('?');
  const params = new URLSearchParams(qs || '');
  setTab(path);
  if (path === '/ballot' && params.get('q')) return ballotView(params.get('q'));
  if (path === '/candidate' && params.get('name')) return candidateView(params);
  if (path === '/results') return resultsView(params);
  if (path === '/about') return aboutView();
  if (/^\/s-/.test(path)) return;
  return homeView();
}
window.addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
