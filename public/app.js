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
/* ---------- v7: safe storage (all of it stays on this device; nothing is sent anywhere) ---------- */
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};
/* announce text to screen readers (polite) */
function announce(msg) { const a = $('#announce'); if (!a) return; a.textContent = ''; setTimeout(() => { a.textContent = msg; }, 30); }

/* ---------- text size + high contrast (remembered on this device) ---------- */
function applySize(n) {
  n = ['1', '2', '3'].includes(String(n)) ? String(n) : '1';
  document.documentElement.dataset.size = n; store.set('cc-size', n);
  document.querySelectorAll('.size button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === n)));
}
function applyContrast(on) {
  document.documentElement.dataset.contrast = on ? 'high' : 'normal'; store.set('cc-contrast', on ? '1' : '0');
  const b = $('#hc'); if (b) { b.setAttribute('aria-pressed', String(!!on)); const s = b.querySelector('.hc-state'); if (s) s.textContent = on ? 'On' : 'Off'; }
}
applySize(store.get('cc-size', '1'));
applyContrast(store.get('cc-contrast') != null ? store.get('cc-contrast') === '1' : !!(window.matchMedia && matchMedia('(prefers-contrast: more)').matches));
document.querySelectorAll('.size button').forEach((b) => b.addEventListener('click', () => { applySize(b.dataset.size); announce('Text size changed.'); }));
$('#hc').addEventListener('click', () => { const on = document.documentElement.dataset.contrast !== 'high'; applyContrast(on); announce(on ? 'High contrast is on.' : 'High contrast is off.'); });
window.addEventListener('beforeprint', () => document.querySelectorAll('details').forEach((d) => { d.dataset.was = d.open ? '1' : ''; d.open = true; }));
window.addEventListener('afterprint', () => document.querySelectorAll('details').forEach((d) => { d.open = !!d.dataset.was; }));

/* ---------- plain-language words ---------- */
const GLOSS = {
  retention: ['retention', 'A retention vote asks one question: should this judge keep the job? Vote Yes to keep the judge. Vote No to remove the judge.', /retention/i],
  'at-large': ['at-large', '“At-large” means the whole state shares one U.S. House seat. Everyone in the state votes for it.', /at[- ]large/i],
  'special election': ['special election', 'A special election fills a seat that opened up between regular elections, for example when someone leaves office early.', /special election/i],
  incumbent: ['incumbent', 'An incumbent is the person who has the job now and is running again.', /incumbent/i],
  'write-in': ['write-in', 'A write-in candidate is not printed on the ballot. You write in the name yourself.', /write-in/i],
  nonpartisan: ['nonpartisan', 'Nonpartisan means the person does not run as a member of a political party.', /nonpartisan/i],
  'ballot question': ['ballot question', 'A ballot question (also called a ballot measure) asks voters to decide something, like a new law or a tax. You vote Yes or No.', /ballot (question|measure)/i],
  advisory: ['advisory', 'Advisory means the vote is like a poll. It does not change the law by itself.', /advisory/i],
  PAC: ['PAC', 'A PAC (political action committee) is a group that raises money to help candidates.', /\bPACs?\b/],
};
let tipId = 0;
function term(key, label) {
  const g = GLOSS[key]; const id = 'tip' + (++tipId);
  return `<span class="term">${esc(label || g[0])}<button type="button" class="tip" aria-expanded="false" aria-controls="${id}" aria-label="What does ${esc(label || g[0])} mean?"><span aria-hidden="true">?</span></button><span class="tip-pop" id="${id}" role="note" hidden>${esc(g[1])}</span></span>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('button.tip'); if (!b) return;
  const pop = document.getElementById(b.getAttribute('aria-controls')); if (!pop) return;
  const open = pop.hidden; pop.hidden = !open; b.setAttribute('aria-expanded', String(open));
});
/* a "Words to know" box listing only the hard words that actually appear on the page */
function wordsBox(root) {
  const text = root.textContent || '';
  const hits = Object.values(GLOSS).filter((g) => g[2].test(text));
  if (!hits.length) return '';
  return `<details class="more words no-print"><summary>Words on this page that may be new (${hits.length})</summary><dl>${hits.map((g) => `<dt>${esc(g[0])}</dt><dd>${esc(g[1])}</dd>`).join('')}</dl></details>`;
}

/* ---------- my choices (stored only in this browser on this device) ---------- */
const CH_KEY = 'cc-choices';
function loadChoices() { try { const j = JSON.parse(store.get(CH_KEY, '') || 'null'); if (j && j.items) return j; } catch {} return { items: {}, notes: '' }; }
function saveChoices(c) { return store.set(CH_KEY, JSON.stringify(c)); }
const cleanOffice = (o) => String(o || '').replace(/\s*Term starts.*$/i, '').trim();
const raceKey = (office, level, st) => [st || '', level || '', cleanOffice(office)].join('|');
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function maxPicks(note) { const m = String(note || '').match(/up to (\w+)/i); if (!m) return 1; return NUMW[m[1].toLowerCase()] || parseInt(m[1], 10) || 1; }
const choiceCount = () => Object.keys(loadChoices().items).length;
const RACES = new Map();
function pickButton(rid, c) {
  const r = RACES.get(rid); const chosen = (loadChoices().items[r.key] || { names: [] }).names.some((n) => n.name === c.name);
  return `<button type="button" class="pick no-print" data-race="${rid}" data-name="${esc(c.name)}" data-party="${esc(c.party || '')}" aria-pressed="${chosen}" aria-label="Mark ${esc(c.name)} as my choice for ${esc(cleanOffice(r.office))}"><span class="pk-box" aria-hidden="true">${chosen ? '✔' : ''}</span><span class="pk-txt">${chosen ? 'My choice (tap to undo)' : 'Mark as my choice'}</span></button>`;
}
function setPickUI(btn, on) { btn.setAttribute('aria-pressed', String(on)); btn.querySelector('.pk-box').textContent = on ? '✔' : ''; btn.querySelector('.pk-txt').textContent = on ? 'My choice (tap to undo)' : 'Mark as my choice'; }
function togglePick(info, name, party) {
  // info: {key, office, level, state, section, max}
  const c = loadChoices();
  const it = c.items[info.key] || { office: cleanOffice(info.office), level: info.level, state: info.state, section: info.section, max: info.max || 1, names: [] };
  const i = it.names.findIndex((n) => n.name === name);
  let msg;
  if (i >= 0) { it.names.splice(i, 1); msg = `${name} removed from your choices.`; }
  else {
    if (it.names.length >= (info.max || 1)) { if ((info.max || 1) === 1) it.names = []; else return { blocked: `You can pick up to ${info.max} here. Tap one of your picks to undo it first.` }; }
    it.names.push({ name, party: party || '' }); msg = `${name} marked as your choice for ${cleanOffice(info.office)}.`;
  }
  if (it.names.length) { it.updated = Date.now(); c.items[info.key] = it; } else delete c.items[info.key];
  const ok = saveChoices(c);
  return { ok, msg: ok ? msg : 'Your browser would not save this. Your choices will only last while this page stays open.', names: it.names.map((n) => n.name) };
}
function updatePickCount() { const el = $('#pickcount'); if (el) { const n = choiceCount(); el.textContent = n ? `${n} marked so far` : 'None marked yet'; } }
main.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('button.pick'); if (!b) return;
  if (b.dataset.race != null && b.dataset.race !== '') {
    const r = RACES.get(b.dataset.race); const res = togglePick(r, b.dataset.name, b.dataset.party);
    if (res.blocked) { announce(res.blocked); const m = b.closest('.race'); const w = m && m.querySelector('.pickwarn'); if (w) { w.textContent = res.blocked; w.hidden = false; } return; }
    document.querySelectorAll(`button.pick[data-race="${b.dataset.race}"]`).forEach((x) => setPickUI(x, res.names.includes(x.dataset.name)));
    const w = b.closest('.race') && b.closest('.race').querySelector('.pickwarn'); if (w) w.hidden = true;
    announce(res.msg); updatePickCount();
  } else if (b.dataset.cinfo) {
    const info = JSON.parse(b.dataset.cinfo); const res = togglePick(info, info.name, info.party);
    if (res.blocked) { announce(res.blocked); return; }
    setPickUI(b, res.names.includes(info.name)); announce(res.msg);
  }
});
/* send keyboard / screen-reader focus to the top of each new page */
function focusTop() { const h = main.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } else main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
const backBtn = (href, label) => `<a class="btn ghost small back no-print" href="${esc(href)}"><span aria-hidden="true">‹</span> ${esc(label)}</a>`;

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
  <p>Civic Compass gathers facts from public sources and shows where each one came from. It is <b>not</b> an official ballot. Please check details with your
  ${link('https://www.usa.gov/state-election-office', 'state or county election office')}. To register or check your registration, go to ${link('https://vote.gov/', 'Vote.gov')} or ${link('https://vote.org/', 'Vote.org')}.</p>
  <p class="footnav no-print"><a href="#/choices">My choices</a> · <a href="#/election-day">Election Day help</a> · <a href="#/about">About &amp; Sources</a></p>
  <p class="lu"><b>Last updated:</b> ${esc(extra || 'We look up ballot facts live from their sources every time you search.')}</p>`;
}
/* ---------- election day box ---------- */
const ED_LOCATOR = 'https://www.vote.org/polling-place-locator/';
function electionDayBox(info, opts = {}) {
  const d = daysLeft();
  const nm = info ? info.name : 'your state';
  const off = info ? info.office : 'https://www.usa.gov/state-election-office';
  const offLabel = info && info.officeIsState ? `${info.name} election office` : 'Find your state election office (USA.gov)';
  const vo = info && info.voteOrg;
  const row = (id, q, a, links) => `<li class="edrow"><h3 id="${id}">${q}</h3><p>${a}</p><p class="edlinks">${links.map((l) => `<a class="btn small ghost" href="${esc(l[0])}" target="_blank" rel="noopener noreferrer">${esc(l[1])}<span class="sr">${esc(l[2] || '')} (opens a new tab)</span> <span aria-hidden="true">↗</span></a>`).join('')}</p></li>`;
  return `<section class="edbox" id="edbox" aria-labelledby="ed-h">
  <div class="ed-head"><span class="eyebrow">${STAR(18)} Election Day</span><h2 id="ed-h">Tuesday, November 3, 2026</h2>
  ${d >= 0 ? `<p class="ed-count"><b>${d}</b> ${d === 0 ? 'It is Election Day!' : d === 1 ? 'day to go' : 'days to go'}</p>` : ''}</div>
  <p class="ed-lead">Every state runs its own elections. For the exact rules for ${esc(nm)}, use these official links. We do not guess at hours or deadlines.</p>
  <ul class="edlist">
    ${row('ed-hours', 'When are the polls open?', `Poll hours are set by each state. Check the hours for ${esc(nm)} on the official election site.`, [[off, offLabel, ' — poll hours']])}
    ${row('ed-where', 'Where do I vote?', 'Your polling place depends on your home address. Look it up with your state election office or with this finder.', [[off, offLabel, ' — polling place'], [ED_LOCATOR, 'Vote.org polling place finder']])}
    ${row('ed-id', 'What ID do I need?', `ID rules are different in every state. Read the rules for ${esc(nm)} <b>before</b> you go.`, [[off, offLabel, ' — ID rules']].concat(vo ? [[vo, `Vote.org: ${nm} voting rules`]] : []))}
    ${row('ed-early', 'Vote early or by mail?', `Early voting and mail ballot deadlines are different in every state. Some may be close or already past, so check soon. Your state election office has the dates.`, [[off, offLabel, ' — early voting and mail ballot deadlines']].concat(vo ? [[vo, `Vote.org: ${nm} deadlines and options`]] : []))}
    ${row('ed-reg', 'Not sure you are registered?', 'Check your registration, or find out how to register, at Vote.gov.', [['https://vote.gov/', 'Vote.gov']])}
  </ul>
  <p class="src">Links go to official or nonprofit nonpartisan sites. Our links to state election offices were last checked on ${esc(fmtDate((info && info.checkedOn ? info.checkedOn : '2026-10-24') + 'T12:00:00'))}. Pages on other sites can change, so look for the date on each page.</p>
  ${opts.print ? '' : `<p class="no-print"><a class="btn small ghost" href="#/choices">Open my choices list</a></p>`}</section>`;
}
async function loadStateInfo(abbr) { try { return await api('/api/election-day?state=' + encodeURIComponent(abbr)); } catch { return null; } }
const STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };
async function electionDayView(st) {
  setTitle('Election Day help');
  st = (st || store.get('cc-state', '') || '').toUpperCase(); if (!STATES[st]) st = '';
  const info = st ? await loadStateInfo(st) : null;
  main.innerHTML = `<div class="wrap">${backBtn('#/', 'Back to home')}
  <h1 class="page-h">Election Day help</h1>
  <form class="statepick no-print" id="sp"><label for="st">Pick your state to see its official links</label><div class="row"><select id="st" name="st"><option value="">Choose a state…</option>${Object.entries(STATES).map(([k, v]) => `<option value="${k}"${k === st ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select><button class="btn" type="submit">Show links</button></div></form>
  ${electionDayBox(info)}</div>`;
  footer();
  $('#sp').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#st').value; if (v) { store.set('cc-state', v); location.hash = '#/election-day?state=' + v; } });
  focusTop();
}

/* ---------- home ---------- */
function homeView() {
  setTitle('');
  const saved = store.get('cc-last') || '';
  const d = daysLeft(), n = choiceCount();
  main.innerHTML = `
  <section class="hero"><div class="hero-inner">
    <div>
      <span class="eyebrow">${STAR(18)} Election Day · Tuesday, November 3, 2026</span>
      <h1>See <em>every race</em> on your ballot.</h1>
      <p class="lead">Free and easy to use. Type where you live. We show you who is running and where each fact came from.</p>
      ${d >= 0 ? `<div class="countdown"><b>${d}</b> <span>${d === 0 ? 'It is Election Day!' : d === 1 ? 'day until Election Day' : 'days until Election Day'}</span></div>` : ''}
    </div>
    ${heroPhoto()}
  </div>${WAVE}</section>
  <section class="wrap start" aria-labelledby="start-h" id="start">
    <h2 id="start-h">Start here</h2>
    <p class="start-lead">Three easy steps:</p>
    <ol class="steps">
      <li class="step"><span class="num" aria-hidden="true">1</span><div class="step-body"><h3>Enter your ZIP code</h3>
        <form class="search" id="f" role="search" autocomplete="on">
          <label for="q">Your ZIP code (or city and state)</label>
          <div class="row"><input id="q" name="q" inputmode="text" autocomplete="postal-code" placeholder="Example: 84101" value="${esc(saved)}" aria-describedby="hint" required><button class="btn" type="submit">Show my ballot</button></div>
          <p class="hint" id="hint">A ZIP code is the fastest way. You can also type your street address, city, and state for the most exact results. We do not keep what you type. Your last search is saved only on this device, so you do not have to type it again.</p>
        </form></div></li>
      <li class="step"><span class="num" aria-hidden="true">2</span><div class="step-body"><h3>Pick a race</h3><p>Your ballot has four parts: City, County, State, and Federal. Tap a part, then tap a race.</p></div></li>
      <li class="step"><span class="num" aria-hidden="true">3</span><div class="step-body"><h3>Read about each candidate</h3><p>Tap a name to read about that person. Tap “Mark as my choice” to make a list you can print.</p></div></li>
    </ol>
  </section>
  <section class="wrap duo" aria-label="More help">
    <div class="duo-card"><h2>Election Day is Nov. 3</h2><p>Find poll hours, your polling place, ID rules, and early voting and mail ballot dates.</p><a class="btn" href="#/election-day">Get voting help <span aria-hidden="true">›</span></a></div>
    <div class="duo-card"><h2>My choices</h2><p>Mark your picks as you read. Print your list or save it. It stays <b>private</b> on this device.</p><a class="btn" href="#/choices">Open my choices${n ? ` (${n} marked)` : ''} <span aria-hidden="true">›</span></a></div>
  </section>
  <section class="promises" aria-label="Our promises">
    <div class="promise">${ICON.scale}<h2>No opinions</h2><p>We never tell you how to vote or who is best.</p></div>
    <div class="promise">${ICON.link}<h2>Every fact has a source</h2><p>Tap a source link to see the original.</p></div>
    <div class="promise">${ICON.eye}<h2>Honest about gaps</h2><p>If we have little data, we say so and show you official sites.</p></div>
    <div class="promise">${ICON.shield}<h2>News from all sides</h2><p>Stories are grouped Left, Center, and Right. Each one shows who wrote it.</p></div>
  </section>
  <section class="wrap feature-wrap" aria-labelledby="feat-h"><a class="feature" href="#/results">
    <span class="feat-ico" aria-hidden="true">${ICON.bars}</span>
    <span class="feat-txt"><h2 id="feat-h">Past election results</h2>
    <span class="feat-p">See how the 2024 and 2022 elections turned out where you live. After the polls close on November 3, we show where to find the 2026 results.</span></span>
    <span class="btn feat-go">Open past results <span aria-hidden="true">›</span></span></a></section>`;
  footer();
  $('#f').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#q').value.trim(); if (q) location.hash = '#/ballot?q=' + encodeURIComponent(q); });
  focusTop();
}

const partyChip = (p) => (p ? `<span class="chip lt">${esc(p)}</span>` : '');
function candHref(c, race, loc, q) {
  const p = new URLSearchParams({ name: c.name, office: race.office, level: race.level, state: loc.state.abbr, q, max: String(maxPicks(race.note)) });
  if (c.slug) p.set('slug', c.slug); if (c.party) p.set('party', c.party); if (c.incumbent) p.set('inc', '1');
  return '#/candidate?' + p.toString();
}
let curSection = '';
function raceHTML(race, loc, q) {
  const cs = [...race.candidates];
  const last = (n) => n.trim().split(/\s+/).slice(-1)[0].toLowerCase();
  cs.sort((a, b) => (a.writeIn ? 1 : 0) - (b.writeIn ? 1 : 0) || last(a.name).localeCompare(last(b.name)));
  const rid = String(RACES.size);
  const max = maxPicks(race.note);
  RACES.set(rid, { key: raceKey(race.office, race.level, loc.state.abbr), office: race.office, level: race.level, state: loc.state.abbr, section: curSection, max, n: cs.length });
  const office = cleanOffice(race.office);
  const hasInc = cs.some((c) => c.incumbent);
  return `<article class="race" aria-labelledby="r${rid}"><h3 id="r${rid}">${esc(office)}</h3>
  <p class="sub">${cs.length} on the ballot · Listed A–Z by last name. This is not a ranking.${race.officeUrl ? ' ' + link(race.officeUrl, 'About this race (Ballotpedia)') : ''}${race.placeNote ? ' · ' + esc(race.placeNote) : ''}</p>
  ${race.note ? `<p class="note">${esc(race.note)}</p>` : ''}
  ${hasInc ? `<p class="note">${term('incumbent', 'Incumbent')} means the person has this job now.</p>` : ''}
  <p class="pickwarn" role="alert" hidden></p>
  <ul class="cands">${cs.map((c) => `<li class="cand-row"><a class="cand" href="${esc(candHref(c, race, loc, q))}"><span class="cand-main"><span class="nm">${esc(c.name)}</span><span class="meta">${c.incumbent ? '<span class="chip inc">Incumbent</span>' : ''}${c.party ? esc(c.party) : ''}${c.writeIn ? ' · write-in' : ''}</span></span><span class="go">Read about this person <span aria-hidden="true">›</span></span></a>${pickButton(rid, c)}</li>`).join('')}</ul></article>`;
}
function limitedBox(sec, links, label) {
  return `<div class="limited"><h3>${STAR(26)} Limited data available</h3>${(sec.notes || []).map((n) => `<p>${esc(n)}</p>`).join('')}
  <p><b>Where to find the official ${esc(label)} list:</b></p><ul class="linklist">${links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul></div>`;
}
const SECT = {
  city: { title: 'City', blurb: 'Mayor, city council, and other local jobs', short: 'City' },
  county: { title: 'County', blurb: 'County jobs, local courts, and school boards', short: 'County' },
  state: { title: 'State', blurb: 'Governor, state offices, state lawmakers, and ballot questions', short: 'State' },
  federal: { title: 'Federal', blurb: 'U.S. Senate and U.S. House of Representatives', short: 'Federal' },
};
const measureHTML = (m, srcLinks) => `<div class="measure"><h3>${esc(m.title)}</h3>${m.area ? `<p class="sub">Applies to: ${esc(m.area)}</p>` : ''}${m.text ? `<p>${esc(m.text)}</p>` : ''}${m.options && m.options.length ? `<p class="sub">You vote: ${m.options.map(esc).join(' or ')}.${m.binding === false ? ' This vote is ' + term('advisory') + ' only.' : ''}</p>` : ''}${srcLinks ? `<p class="src">Source: ${srcLinks}</p>` : ''}</div>`;
const srcList = (arr) => (arr || []).map((s) => link(s.url, s.label)).join(' · ');
function retentionHTML(list, b) {
  if (!list || !list.length) return '';
  const by = {}; list.forEach((r) => { (by[r.court] = by[r.court] || []).push(r.judge); });
  const jl = (b.sources || []).filter((s) => /Judicial Performance|Know Your Judges/i.test(s.label));
  return `<h3 class="subhead">Judges on your ballot</h3>
  <p class="note">This is a ${term('retention', 'retention vote')}. These judges already have the job. You vote Yes to keep a judge or No to remove a judge. ${jl.length ? 'Official reviews of the judges: ' + srcList(jl) + '.' : ''}</p>
  <ul class="retention">${Object.entries(by).map(([court, js]) => `<li><b>${esc(court)}</b><br>${js.map(esc).join(' · ')}</li>`).join('')}</ul>`;
}
function sectionHTML(key, data, b, q) {
  curSection = key;
  const S = SECT[key], loc = b.location, links = b.ballot.links;
  const allRaces = data.races || [];
  const races = allRaces.filter((r) => !r.addressDependent), addr = allRaces.filter((r) => r.addressDependent);
  const measures = key === 'state' ? [] : (data.measures || []);
  const off = data.official;
  const offSrc = off ? srcList(off.sources) : '';
  let body = '';
  if (off && off.asOf) body += `<p class="official-line"><b>Official ${esc(off.county || 'county')} list of candidates</b> · as of ${esc(fmtDate(off.asOf + 'T12:00:00'))} · ${offSrc}</p>`;
  if (races.length) body += races.map((r) => raceHTML(r, loc, q)).join('');
  if (key === 'state' && data.measures && data.measures.length) body += `<h3 class="subhead">Statewide ballot questions</h3><p class="note">A ${term('ballot question')} asks voters to decide something. You vote Yes or No. We do not say how to vote.</p>` + data.measures.map((m) => `<div class="measure"><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p><p class="src">${esc(m.type)} · Topic: ${esc(m.subject)} · ${link(m.url, 'Read the full question and the arguments on Ballotpedia')}</p></div>`).join('');
  if (measures.length) body += `<h3 class="subhead">Local ballot questions</h3>` + measures.map((m) => measureHTML(m, offSrc)).join('');
  if (addr.length) body += `<details class="more addr"${addr.length <= 8 ? ' open' : ''}><summary>Seats that depend on your street address (${addr.length})</summary><p class="note">These are numbered areas inside your county or school district. A ZIP code cannot tell us which one is yours, so we list them all. Go back to the home page and type your full street address. Or check the sample ballot from your county clerk.</p>${addr.map((r) => raceHTML(r, loc, q)).join('')}</details>`;
  const hasAny = races.length || addr.length || measures.length || (data.retention && data.retention.length);
  if (data.status === 'none' && !races.length) body += `<div class="none-box"><h3>${STAR(26)} No ${esc(S.title.toLowerCase())} election this year</h3>${(data.notes || []).map((n) => `<p>${esc(n)}</p>`).join('')}${data.noteSource ? `<p class="src">Source: ${link(data.noteSource.url, data.noteSource.label)}</p>` : ''}<p>For local ballot questions and judges, look below. You can also check your ${link('https://www.usa.gov/state-election-office', 'state election office')}.</p></div>`;
  else if (!hasAny) body += data.status === 'unavailable' ? `<div class="limited"><h3>${STAR(26)} Not available right now</h3><p>We could not reach our main source for this part. Please try again in a minute, or use the official links below.</p><ul class="linklist">${links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul></div>` : limitedBox(data, links, S.title.toLowerCase() + ' races');
  else if (data.notes && data.notes.length) body += data.notes.map((n) => `<p class="note"><span aria-hidden="true">ℹ</span> ${esc(n)}</p>`).join('');
  body += retentionHTML(data.retention, b);
  if (data.otherLocal && data.otherLocal.length) body += `<details class="more"><summary>Other local races in ${esc(loc.county ? loc.county.name : 'your county')} (may not be on your ballot)</summary>${data.otherLocal.map((r) => raceHTML(r, loc, q)).join('')}</details>`;
  const srcs = key === 'federal' ? b.sources.filter((s) => /elections, 2026$/.test(s.label)) : b.sources.filter((s) => !(key === 'city' && /County Clerk|Cache|Weber|Franklin|Laramie|Washington County|Utah County|Salt Lake County/i.test(s.label)));
  body += `<p class="src">Source: ${srcs.length ? srcs.slice(0, 4).map((s) => link(s.url, s.label)).join(' · ') : 'none available'} · Text from Ballotpedia is shared under ${link('https://creativecommons.org/licenses/by-nc-sa/3.0/', 'CC BY-NC-SA 3.0')}.</p>`;
  return `<section class="sect" id="s-${key}" aria-labelledby="h-${key}"><div class="sect-head">${STAR(44)}<div><h2 id="h-${key}">${S.title}</h2><p>${S.blurb}</p></div></div><div class="sect-body">${body}</div></section>`;
}
async function ballotView(q) {
  setTitle('Your ballot');
  loading('Looking up your ballot…', 'We are finding your areas and gathering the races. This can take a few seconds.');
  let b;
  try { b = await getBallot(q); } catch (e) {
    main.innerHTML = `<div class="wrap">${backBtn('#/', 'Back to home')}<div class="notice"><h1 class="h2like">We could not find that place</h1><p>${esc(e.message)}</p><p>Try a 5-digit ZIP code, like 84101.</p><a class="btn" href="#/">Try again</a></div></div>`; footer(); focusTop(); return;
  }
  store.set('cc-last', q);
  const loc = b.location, c = b.ballot;
  store.set('cc-state', loc.state.abbr);
  RACES.clear();
  const where = loc.type === 'address' ? (loc.matched || q) : (loc.type === 'zip' ? `${loc.cityName || ''}, ${loc.state.abbr} ${loc.zip}` : `${loc.cityName}, ${loc.state.abbr}`);
  const facts = [loc.county && loc.county.name, loc.place && loc.place.name && 'City of ' + loc.place.name, loc.cd && loc.cd.label, loc.sldu && loc.sldu.label, loc.sldl && loc.sldl.label, loc.school && loc.school.name].filter(Boolean);
  const count = (k) => c[k].races.length + (k === 'county' || k === 'city' ? (c[k].measures || []).length + (c[k].retention || []).length : 0);
  const jumpLabel = (k) => (count(k) ? count(k) + (k === 'county' || k === 'city' ? ' item' : ' race') + (count(k) > 1 ? 's' : '') : c[k].status === 'none' ? 'none in 2026' : 'limited data');
  const secs = ['city', 'county', 'state', 'federal'].map((k) => sectionHTML(k, c[k], b, q)).join('');
  const total = [...RACES.values()].length;
  main.innerHTML = `<div class="wrap">
  ${backBtn('#/', 'Back: new ZIP code')}
  <div class="where"><span class="eyebrow">${STAR(18)} Your ballot · ${esc(b.election.label)}</span><h1>${esc(where)}</h1>
    <div class="facts">${facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>
    <div class="actions no-print"><a class="btn ghost small" href="#/choices">My choices (<span id="pickcount">${choiceCount() ? choiceCount() + ' marked so far' : 'None marked yet'}</span>)</a><a class="btn ghost small" href="#/election-day?state=${esc(loc.state.abbr)}">Election Day help</a><a class="btn ghost small" href="#/results?q=${encodeURIComponent(q)}">Past results here</a><button class="btn ghost small" type="button" id="print">Print this page</button></div></div>
  ${(loc.notes || []).map((n) => `<div class="notice">${esc(n)}</div>`).join('')}
  ${b.warnings && b.warnings.length ? b.warnings.map((w) => `<div class="notice">${esc(w)}</div>`).join('') : ''}
  ${c.federal.races.length || c.state.races.length ? '' : `<div class="notice">Some of our sources are not answering right now, so parts of this page may be empty. Please try again in a minute.</div>`}
  <p class="howto no-print"><b>How to use this page:</b> Tap City, County, State, or Federal to jump to that part. Tap a name to read about that person. Tap “Mark as my choice” to keep a list for yourself.</p>
  <nav class="jump" aria-label="Jump to a part of your ballot">${['city', 'county', 'state', 'federal'].map((k) => `<a href="#s-${k}" data-jump="${k}">${SECT[k].title}<small>${jumpLabel(k)}</small></a>`).join('')}</nav>
  <div id="wordsslot"></div>
  ${b.civic && b.civic.ok ? civicBlock(b.civic) : ''}
  ${secs}
  <div class="official"><h2>Official places to check and to vote</h2><ul class="linklist">${c.links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul></div>
  <div id="edslot">${electionDayBox(b.stateInfo)}</div>
  <p class="src">We fetched this ${esc(fmtDateTime(b.generatedAt))} from the sources above. Areas come from the U.S. Census Bureau. Races can change. Please check with your election office.</p></div>`;
  $('#wordsslot').innerHTML = wordsBox(main);
  footer('Fetched live ' + fmtDateTime(b.generatedAt) + '.');
  $('#print').addEventListener('click', () => window.print());
  document.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById('s-' + a.dataset.jump); t.scrollIntoView({ behavior: 'smooth' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }));
  focusTop();
}
function civicBlock(cv) {
  const pl = (cv.pollingLocations || [])[0];
  return pl ? `<div class="notice info"><b>Your polling place (from the Google Civic Information API):</b> ${esc(pl.name || '')} ${esc(pl.line || '')}${pl.hours ? ' · ' + esc(pl.hours) : ''}. Please check with your election office.</div>` : '';
}

/* ---------- candidate ---------- */
function candPick(d, name, party, params) {
  const st = params.get('state') || '', level = params.get('level') || '', office = params.get('office') || d.office || '';
  if (!office) return '';
  const info = { key: raceKey(office, level, st), office, level, state: st, section: level, max: parseInt(params.get('max') || '1', 10) || 1, name, party };
  const it = loadChoices().items[info.key]; const on = !!(it && it.names.some((n) => n.name === name));
  return `<button type="button" class="pick no-print" data-cinfo="${esc(JSON.stringify(info))}" aria-pressed="${on}" aria-label="Mark ${esc(name)} as my choice for ${esc(cleanOffice(office))}"><span class="pk-box" aria-hidden="true">${on ? '✔' : ''}</span><span class="pk-txt">${on ? 'My choice (tap to undo)' : 'Mark as my choice'}</span></button><p class="note no-print pickhelp">Your picks stay private on this device. <a href="#/choices">See my choices</a></p>`;
}
const para = (t) => String(t || '').split(/\n\n+/).map((p) => `<p>${esc(p).replace(/\n• /g, '<br>• ').replace(/^• /, '• ')}</p>`).join('');
function dedupeBullets(t) { const seen = new Set(); return String(t || '').split('\n').filter((l) => { const k = l.trim(); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; }).join('\n'); }
async function candidateView(params) {
  const name = params.get('name'), q = params.get('q') || '';
  setTitle(name);
  loading('Gathering information on ' + name + '…', 'Looking up background, record, campaign money, and news.');
  const qs = new URLSearchParams({ name, office: params.get('office') || '', level: params.get('level') || '', state: params.get('state') || '' });
  if (params.get('slug')) qs.set('slug', params.get('slug'));
  let d;
  try { d = await api('/api/candidate?' + qs.toString()); } catch (e) { main.innerHTML = `<div class="wrap">${backBtn(q ? '#/ballot?q=' + encodeURIComponent(q) : '#/', 'Back to my ballot')}<div class="notice"><h1 class="h2like">We could not load this page</h1><p>${esc(e.message)}</p></div></div>`; footer(); focusTop(); return; }
  const party = params.get('party') || '', inc = params.get('inc') === '1';
  const bio = d.bio, S = (bio && bio.sections) || {};
  let h = `<div class="wrap"><div class="cand-head">${backBtn(q ? '#/ballot?q=' + encodeURIComponent(q) : '#/', 'Back to my ballot')}
    <h1>${esc(name)}</h1><p class="office">${esc(d.office)}</p><p>${inc ? '<span class="chip inc">Incumbent</span>' : ''}${party ? `<span class="chip">${esc(party)}</span>` : ''}</p>
    ${candPick(d, name, party, params)}<button class="btn ghost small no-print" type="button" id="print">Print this page</button></div>
  <nav class="cnav" aria-label="On this page"><a href="#p-bg">Background</a><a href="#p-pos">Positions</a><a href="#p-money">Campaign money</a><a href="#p-news">In the news</a></nav>`;
  // Background
  h += `<section class="panel" id="p-bg"><h2>${STAR(30)} Background</h2>`;
  if (bio && (bio.lead.length || S.biography)) {
    h += bio.lead.slice(0, 3).map((t) => `<p>${esc(t)}</p>`).join('');
    const ib = bio.infobox || {}; const rows = Object.entries(ib).filter(([k, v]) => v && !Array.isArray(v)).map(([k, v]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`);
    if (ib.Education && ib.Education.length) rows.push(...ib.Education.map((e) => `<div class="stat"><b>${esc(e)}</b><span>Education</span></div>`));
    if (rows.length) h += `<div class="facts-grid">${rows.join('')}</div>`;
    if (S.biography && !bio.lead.join(' ').includes(S.biography.slice(0, 40))) h += `<h3>Biography</h3>${para(S.biography)}`;
    if (d.member && d.member.committees.length) h += `<h3>Committees now (U.S. Congress)</h3><ul>${d.member.committees.map((c) => `<li>${esc(c.name)}${c.title ? ' — ' + esc(c.title) : ''}</li>`).join('')}</ul><p class="src">Source: ${link(d.member.congressUrl, 'Congress.gov')} and ${link('https://github.com/unitedstates/congress-legislators', 'unitedstates/congress-legislators')} (public data). In office since ${esc(fmtDate(d.member.firstTermStart))}.</p>`;
    else if (S.committees) h += `<h3>Past committee assignments</h3><p>${para(dedupeBullets(S.committees).split(/\n\n.*was assigned/)[0].replace(/\[Source\]/g, ''))}</p>`;
    if (bio.links && bio.links.length) h += `<h3>The candidate’s own pages</h3><p class="note">These links came from the candidate or the office. We have not reviewed what is on them.</p><ul>${bio.links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul>`;
  } else {
    h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>${esc(d.bioError || (d.notes && d.notes[0]) || 'We could not find a background page for this candidate.')} The ballot lists ${esc(name)} as a candidate for ${esc(d.office)}. For more, check ${link('https://vote.org/', 'Vote.org')}, your ${link('https://www.usa.gov/state-election-office', 'state election office')}, or ${link('https://ballotpedia.org/Special:Search?search=' + encodeURIComponent(name), 'search Ballotpedia')}.</p></div>`;
  }
  h += bio ? `<p class="src">Source: ${link(bio.url, 'Ballotpedia — ' + bio.title)} · shared under ${link('https://creativecommons.org/licenses/by-nc-sa/3.0/', 'CC BY-NC-SA 3.0')}.</p></section>` : `<p class="src">Source: the ballot list from ${link('https://ballotpedia.org/', 'Ballotpedia')}. We did not find a page about this person.</p></section>`;
  // Positions
  h += `<section class="panel" id="p-pos"><h2>${STAR(30)} Positions and record</h2>`;
  let any = false;
  if (S.themes && S.themes.length) { any = true; h += `<h3>In the candidate’s own words</h3><p class="note">The candidate <b>wrote these answers</b> for Ballotpedia’s Candidate Connection survey. We have not checked or changed them.</p>${S.themes.map((t) => `<details class="qa"><summary>${esc(t.q)}</summary><div>${esc(t.a)}</div></details>`).join('')}`; }
  else if (S.themesNote) h += `<p class="note">${esc(S.themesNote)}</p>`;
  if (S.keyVotes && S.keyVotes.rows && S.keyVotes.rows.length) { any = true; h += `<h3>Voting record: ${esc(S.keyVotes.header.replace(/^Key votes:\s*/i, 'key votes, '))}</h3><p class="note">These votes were picked by Ballotpedia editors. They may be from an earlier term.</p><ul class="votes">${S.keyVotes.rows.map((v) => `<li><span class="vote">${esc(v.vote)}</span>${esc(v.text)}</li>`).join('')}</ul>`; }
  if (d.sponsored && d.sponsored.bills && d.sponsored.bills.length) { any = true; h += `<h3>Recent bills sponsored (U.S. Congress)</h3><p class="note">${esc(d.sponsored.total != null ? d.sponsored.total + ' bills and resolutions sponsored in total. ' : '')}Most recent shown. Source: Congress.gov.</p><ul class="votes">${d.sponsored.bills.map((b) => `<li><b>${esc(b.number)}</b> (introduced ${esc(fmtDate(b.introduced))}) — ${b.url ? link(b.url, b.title) : esc(b.title)}${b.latest ? `<br><span class="note">Latest action ${esc(fmtDate(b.latest.date))}: ${esc(b.latest.text)}</span>` : ''}</li>`).join('')}</ul>`; }
  if (!any) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We did not find published positions or a voting record for ${esc(name)} in our sources. Visit the candidate’s own pages listed under Background, or ${link('https://ballotpedia.org/Special:Search?search=' + encodeURIComponent(name), 'search Ballotpedia')}.</p></div>`;
  h += `</section>`;
  // Money
  h += `<section class="panel" id="p-money"><h2>${STAR(30)} Campaign money</h2>`;
  if (d.fec && d.fec.totals) { const t = d.fec.totals; h += `<p>Money in this federal race, 2025–2026. Reports go through <b>${esc(fmtDate(t.coverageEnd))}</b>.</p><div class="facts-grid"><div class="stat"><b>${money(t.receipts)}</b><span>Total raised</span></div><div class="stat"><b>${money(t.disbursements)}</b><span>Total spent</span></div><div class="stat"><b>${money(t.cashOnHand)}</b><span>Cash left</span></div><div class="stat"><b>${money(t.debts)}</b><span>Money owed</span></div></div>
    <table class="fin"><caption class="sr" style="position:absolute;left:-999px">Where the money came from</caption><thead><tr><th scope="col">Where it came from</th><th scope="col">Amount</th></tr></thead><tbody><tr><td data-label="Where it came from">People who gave over $200 (listed by name)</td><td data-label="Amount">${money(t.individualItemized)}</td></tr><tr><td data-label="Where it came from">People who gave $200 or less</td><td data-label="Amount">${money(t.individualUnitemized)}</td></tr><tr><td data-label="Where it came from">Groups that raise money for candidates (${term('PAC', 'PACs')}) and other committees</td><td data-label="Amount">${money(t.pacContributions)}</td></tr><tr><td data-label="Where it came from">Political parties</td><td data-label="Amount">${money(t.partyContributions)}</td></tr><tr><td data-label="Where it came from">Money the candidate gave</td><td data-label="Amount">${money(t.candidateContributions)}</td></tr><tr><td data-label="Where it came from">Loans from the candidate</td><td data-label="Amount">${money(t.loansFromCandidate)}</td></tr></tbody></table>
    <p class="src">Source: ${link(d.fec.url, 'Federal Election Commission — ' + d.fec.name)}. This product uses the FEC’s public API but is not endorsed or certified by the FEC.</p>`; }
  else if (d.fec && (d.fec.notFound || d.fec.error)) h += `<div class="limited"><h3>${STAR(26)} ${d.fec.error ? 'Temporarily unavailable' : 'Limited data available'}</h3><p>${esc(d.fec.error ? d.fec.message : d.fec.ambiguous ? 'We found more than one possible FEC match for this name. We are not showing numbers so we do not mix up two people.' : 'We could not find this person in the FEC database yet. New candidates may not have filed yet.')} ${link(d.fec.searchUrl, 'Search the FEC yourself')}</p></div>`;
  const fin = S.finance;
  if (fin && fin.length > 1) { h += `<h3>Money raised over the years (Ballotpedia)</h3><table class="fin"><thead><tr>${fin[0].map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${fin.slice(1).map((r) => `<tr>${r.map((c, i) => `<td data-label="${esc(fin[0][i] || '')}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="src">Source: ${link(bio.url, 'Ballotpedia')}, from OpenSecrets and the FEC or state filings. * Data for the current year may be incomplete.</p>`; }
  if (!d.fec && !(fin && fin.length > 1)) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>Money for state and local races is reported to ${esc(d.state || 'your state')}’s own election office. Most offices do not share it in a form we can use. Find your state’s office here: ${link('https://www.usa.gov/state-election-office', 'USA.gov — State election offices')}. You can also try ${link('https://www.opensecrets.org/states', 'OpenSecrets state pages')}.</p></div>`;
  h += `</section>`;
  // News
  h += `<section class="panel" id="p-news"><h2>${STAR(30)} In the news</h2><div id="news" role="status" aria-live="polite"><p>${COMPASS(48)} Loading news…</p></div></section>
  <div class="bottom-nav no-print">${backBtn(q ? '#/ballot?q=' + encodeURIComponent(q) : '#/', 'Back to my ballot')}<a class="btn ghost small" href="#/choices">My choices</a></div></div>`;
  main.innerHTML = h;
  footer('Fetched live ' + fmtDateTime(d.generatedAt) + '.');
  $('#print').addEventListener('click', () => window.print());
  focusTop();
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
  box.innerHTML = `<p class="note">Stories from the last year with ${esc(name)} in the headline. Each news outlet is put in a column using its published <b>${link(S.url, 'AllSides media bias rating')}</b>, not by what the story says. “Lean Left” outlets are under Left. “Lean Right” outlets are under Right. We show up to 5 in each column.</p>
  <div class="news3">${col('l', 'Left &amp; Lean Left', g.left, 'No rated Left-leaning stories found.')}${col('c', 'Center', g.center, 'No rated Center stories found.')}${col('r', 'Right &amp; Lean Right', g.right, 'No rated Right-leaning stories found.')}</div>
  ${g.unrated.length ? `<h3>More stories (no rating for the outlet)</h3><p class="note">We have no rating for these news outlets, so we do not put them in a column.</p><ul class="unrated">${g.unrated.map((i) => `<li>${link(i.link, i.headline)} <span class="note">— ${esc(i.source)}${i.date ? ', ' + esc(fmtDate(i.date)) : ''}</span></li>`).join('')}</ul>` : ''}
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
  <form class="search" id="rf" role="search"><label for="rq">Your ZIP code (or city and state)</label>
    <div class="row"><input id="rq" name="q" placeholder="Example: 84101" value="${esc(saved)}" required><button class="btn" type="submit">Show results</button></div>
    <p class="hint">Shows your state, county, and U.S. House district. We do not keep what you type.</p></form>
  <form class="search alt" id="rs"><label for="rstate">Or pick a state</label>
    <div class="row"><select id="rstate" name="state" aria-label="State">${Object.entries(STATE_NAMES).map(([a, n]) => `<option value="${a}"${a === cur ? ' selected' : ''}>${n}</option>`).join('')}</select><button class="btn ghost" type="submit">Show state</button></div></form></div>`;
function contestCard(c, yv) {
  const src = `<a href="${esc(safeUrl(yv.source.repo))}" target="_blank" rel="noopener noreferrer">MEDSL official returns</a>, ${esc(yv.date)} election · retrieved ${esc(fmtDate(yv.snapshot + 'T12:00:00'))}`;
  const title = c.office + distLabel(c.district) + (c.special ? ' (special election)' : '');
  const spTip = c.special ? `<p class="note">${term('special election')} fills a seat that opened between regular elections.</p>` : '';
  const rows = c.candidates.map((r) => `<tr class="${r.won ? 'won' : ''}"><th scope="row" data-label="${c.measure ? 'Choice' : 'Candidate'}">${esc(r.name)}${r.party ? `<small class="pty">${esc(r.party)}</small>` : ''}${r.won ? (c.measure ? ' <span class="chip">More votes</span>' : ' <span class="chip win">✔ Most votes</span>') : ''}</th><td class="n" data-label="Votes">${num(r.votes)}</td><td class="n pct" data-label="Share">${r.pct == null ? '—' : r.pct.toFixed(1) + '%'}<span class="bar" aria-hidden="true"><i style="width:${Math.min(100, r.pct || 0)}%"></i></span></td></tr>`).join('');
  return `<article class="rcard"><h4>${esc(title)}</h4>${spTip}
  <table class="rt"><caption class="sr">${esc(title)}, ${esc(yv.date)}</caption><thead><tr><th scope="col">${c.measure ? 'Choice' : 'Candidate and party'}</th><th scope="col" class="n">Votes</th><th scope="col" class="n">Share</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="rmeta">All votes in this race: <b>${num(c.total)}</b>${c.other ? ` · ${num(c.other.count)} other candidates got ${num(c.other.votes)} votes (not listed)` : ''}${c.margin ? ` · Gap between the top two: <b>${c.margin.points.toFixed(1)} points</b> (${num(c.margin.votes)} votes)` : ''}${c.seats > 1 ? ` · Voters could pick up to ${c.seats}, so the shares add up to more than 100%` : ''}</p>
  <p class="src">Source: ${src}</p></article>`;
}
function turnoutLine(v, label) {
  if (v.ballots) return `<p class="turnout"><b>Turnout${label}:</b> ${num(v.ballots)} ballots were cast${v.registered ? `. ${num(v.registered)} people were registered to vote (${(100 * v.ballots / v.registered).toFixed(1)}% voted)` : ''}.</p>`;
  return '';
}
function yearPanel(yv, r, hasLookup) {
  const id = 'y' + yv.year;
  const head = `<section class="panel" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${STAR(30)} ${yv.year} general election</h2><p class="asof">Held ${esc(yv.date)} · Final results from state election officials, gathered by MEDSL · Saved copy from ${yv.snapshot ? esc(fmtDate(yv.snapshot + 'T12:00:00')) : '—'}</p>`;
  const offLink = r.live.office ? ` Check them against the official results at ${link(r.live.office, r.state.name + '’s election office')}.` : '';
  if (!yv.available || (!yv.statewide.length && !yv.house.length)) return head + `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We could not load the ${yv.year} results for ${esc(r.state.name)} from our public source.${offLink} You can also search ${link('https://electionlab.mit.edu/data', 'MIT Election Lab data')}.</p></div></section>`;
  const top = yv.statewide.filter((c) => TOP.test(c.office)), rest = yv.statewide.filter((c) => !TOP.test(c.office));
  let h = head + turnoutLine(yv, ' (statewide)');
  if (!yv.ballots && yv.topVotes) h += `<p class="turnout"><b>Votes cast:</b> ${num(yv.topVotes.votes)} in the ${esc(yv.topVotes.office)} contest. This source does not report turnout for ${esc(r.state.name)} in ${yv.year}, so the top contest is shown as a guide.</p>`;
  if (top.length) h += `<h3>Biggest races (whole state)</h3>${top.map((c) => contestCard(c, yv)).join('')}`;
  if (yv.house.length) {
    const mine = hasLookup && r.location && r.location.cd && !r.location.cd.atLarge;
    h += `<h3>U.S. House${mine ? ` — ${esc(r.location.cd.label)} as numbered in ${yv.year}` : yv.house.length > 1 ? ' — all districts' : ''}</h3>${r.location && r.location.cd && r.location.cd.atLarge ? `<p class="note">Your state has one U.S. House seat that is ${term('at-large')}.</p>` : ''}`;
    if (mine) h += `<p class="note">District borders can change between elections. This is the district with the same number in ${yv.year}. It may cover different places than your district does today.</p>`;
    h += mine || yv.house.length <= 2 ? yv.house.map((c) => contestCard(c, yv)).join('') : `<details class="more"><summary>Show all ${yv.house.length} U.S. House contests</summary>${yv.house.map((c) => contestCard(c, yv)).join('')}</details>`;
  }
  if (rest.length) h += `<details class="more"><summary>Other statewide jobs and ballot questions (${rest.length})</summary>${rest.map((c) => contestCard(c, yv)).join('')}</details>`;
  if (yv.statewide.length < 3) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>Our source lists only ${yv.statewide.length} statewide race${yv.statewide.length === 1 ? '' : 's'} for ${yv.year} in ${esc(r.state.name)}. Other statewide races may have been on the ballot.${offLink}</p></div>`;
  if (yv.county) {
    const c = yv.county;
    h += `<h3>${esc(c.name)}</h3>${turnoutLine(c, ' (county)')}${c.contests.length ? `<details class="more" open><summary>${c.contests.length} race${c.contests.length === 1 ? '' : 's'} in ${esc(c.name)}</summary>${c.contests.map((x) => contestCard(x, yv)).join('')}</details>` : `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We have no county races for ${esc(c.name)} in our ${yv.year} data.${offLink}</p></div>`}`;
  } else if (hasLookup) h += `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We have no county numbers for your county in the ${yv.year} data.${offLink}</p></div>`;
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
  return `<section class="panel" id="glance" aria-labelledby="glance-h"><h2 id="glance-h">${STAR(30)} How close were the races?</h2>
  <p class="note">This shows how close each big race was. These are facts about past elections. They do not predict 2026.</p>
  <ul class="glance">${rows.map(([y, o, a, b2, m]) => `<li><b>${y} · ${esc(o)}</b><span>Most votes: ${esc(a.name)} (${esc(a.party || 'no party listed')}) — ${a.pct.toFixed(1)}%</span><span>Next: ${esc(b2.name)} (${esc(b2.party || 'no party listed')}) — ${b2.pct.toFixed(1)}%</span><span class="gm">Gap: ${m.points.toFixed(1)} points (${num(m.votes)} votes)</span></li>`).join('')}</ul>
  <p class="src">Source: ${link(r.years['2024'].source ? r.years['2024'].source.repo : 'https://electionlab.mit.edu/data', 'MEDSL official returns')} · snapshot retrieved ${esc(fmtDate((r.snapshot || '') + 'T12:00:00'))}. Gap = the winner’s share minus second place’s share.</p></section>`;
}
function historyPanel(r, q) {
  const hist = r.history || [];
  let h = `<section class="panel" id="past" aria-labelledby="past-h"><h2 id="past-h">${STAR(30)} Past results for people on your 2026 ballot</h2>`;
  if (!hist.length) return h + `<div class="limited"><h3>${STAR(26)} Limited data available</h3><p>We did not find any of this year’s federal or statewide candidates in the 2024 or 2022 results we have for ${esc(r.state.name)}. We match by name and state. This is common for first-time candidates.</p></div></section>`;
  const by = {}; hist.forEach((x) => { (by[x.forName] = by[x.forName] || []).push(x); });
  h += `<p class="note">These people are on your 2026 ballot and were also in the 2024 or 2022 results for ${esc(r.state.name)}. We match only by first name, last name, and state, so please check that it is the same person. This is a record of what happened. It is not a prediction.</p>`;
  h += Object.entries(by).map(([name, xs]) => `<div class="hist"><h3>${esc(name)}</h3><ul>${xs.map((x) => `<li><b>${x.year}</b> · ${esc(x.office)} · ${esc(x.party || 'no party listed')} · ${num(x.votes)} votes (${x.pct == null ? '—' : x.pct.toFixed(1) + '%'}) · <b>${x.won ? 'Won' : 'Did not win'}</b>${x.margin ? ` · contest margin ${x.margin.points.toFixed(1)} points` : ''}</li>`).join('')}</ul></div>`).join('');
  h += `<p class="note">For an incumbent’s bills and committee work in Congress, open the candidate from ${q ? `<a href="#/ballot?q=${encodeURIComponent(q)}">your ballot</a>` : 'your ballot'}; those pages link to Congress.gov.</p>`;
  h += `<p class="src">Source: ${link(r.years['2024'].source ? r.years['2024'].source.repo : 'https://electionlab.mit.edu/data', 'MEDSL official returns')} (2024 and 2022) · snapshot retrieved ${esc(fmtDate((r.snapshot || '') + 'T12:00:00'))}; the 2026 candidate list comes from the ballot page sources.</p></section>`;
  return h;
}
function livePanel(r) {
  const L = r.live, d = daysLeft();
  return `<section class="panel live" id="live" aria-labelledby="live-h"><h2 id="live-h">${STAR(30)} 2026 results — ${esc(r.state.name)}</h2>
  <div class="live-box"><b>The 2026 results will be posted after the polls close on Nov. 3, 2026.</b>
  <p>${esc(L.pollsClose)} ${d > 0 ? `That is ${d} day${d === 1 ? '' : 's'} from today.` : d === 0 ? 'That is today.' : ''}</p></div>
  <p>${esc(L.explain)}</p>
  <ul class="officials">${L.results ? `<li>${link(L.results, r.state.name + '’s official election-results website')}<br><span class="note">This is the state’s own results site. It opened when we checked on ${esc(fmtDate(L.checkedOn + 'T12:00:00'))}. It usually shows results only on and after Election Night.</span></li>` : `<li><span class="note">We could not confirm a ${esc(r.state.name)} results website yet. The state election office will post results here:</span></li>`}
  ${L.office ? `<li>${link(L.office, r.state.name + ' election office')}${L.note ? `<br><span class="note">${esc(L.note)}</span>` : ''}</li>` : ''}
  <li>${link('https://www.usa.gov/state-election-office', 'USA.gov: find any state’s election office')}</li></ul>
  <p class="src">Source: official state election websites, links checked ${esc(fmtDate(L.checkedOn + 'T12:00:00'))}. Civic Compass does not use guesses from news groups.</p></section>`;
}
async function resultsView(params) {
  setTitle('Past results');
  const q = (params.get('q') || '').trim(), st = (params.get('state') || '').toUpperCase();
  const saved = q || store.get('cc-last') || '';
  const intro = `${backBtn('#/', 'Back to home')}<div class="where results-hero"><span class="eyebrow">${STAR(18)} Past results</span><h1>How past elections turned out</h1><p class="lead">See results for your area from 2024 and 2022. See where the 2026 results will be posted. Every number shows its source and date. We never guess who will win or tell you who to pick.</p></div>`;
  if (!q && !st) {
    main.innerHTML = `<div class="wrap">${intro}${lookupForms(saved, 'UT')}
    <section class="panel live"><h2>${STAR(30)} 2026 results</h2><div class="live-box"><b>The 2026 results will be posted after the polls close on Nov. 3, 2026.</b><p>Pick your state or type your ZIP code above to see your state’s official results website.</p></div></section>
    <div class="prose"><h2>What you will find here</h2><ul><li><b>Past results</b> from the November 2024 and 2022 elections: names, party, number of votes, who got the most votes, and how many people voted (when the state reports it).</li><li><b>Your county and U.S. House district</b>, when you type a ZIP code or city.</li><li><b>How close</b> past races were, and how people on your 2026 ballot did when they ran before.</li><li><b>Official links</b> to your state’s results website for November 3, 2026.</li></ul><p class="src">Source: ${link('https://electionlab.mit.edu/data', 'MIT Election Data + Science Lab')} official election results (public domain). Some states have less data. When that is true, we say so.</p></div></div>`;
    footer('Past results are saved copies of official results. Each card shows its date.'); bindLookup(); focusTop(); return;
  }
  loading('Loading results…', 'Gathering past results and official links.');
  let r;
  try { r = await getResults(q ? 'q:' + q : 's:' + st, q ? 'q=' + encodeURIComponent(q) : 'state=' + encodeURIComponent(st)); } catch (e) {
    main.innerHTML = `<div class="wrap">${intro}<div class="notice"><p>${esc(e.message)}</p></div>${lookupForms(saved, st || 'UT')}</div>`; footer(); bindLookup(); focusTop(); return;
  }
  if (q) store.set('cc-last', q);
  const hasLookup = !!r.location;
  const facts = hasLookup ? [r.location.county && r.location.county.name, r.location.cd && r.location.cd.label].filter(Boolean) : [];
  main.innerHTML = `<div class="wrap">
  ${backBtn(q ? '#/ballot?q=' + encodeURIComponent(q) : '#/', q ? 'Back to my ballot' : 'Back to home')}
  <div class="where results-hero"><span class="eyebrow">${STAR(18)} Past results</span><h1>${esc(hasLookup ? r.location.label : r.state.name)}${hasLookup ? '' : ''}</h1>
    <div class="facts"><span class="fact">${esc(r.state.name)}</span>${facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>
    <div class="actions no-print"><a class="btn ghost small" href="#/results">Change place</a>${q ? `<a class="btn ghost small" href="#/ballot?q=${encodeURIComponent(q)}">See my 2026 ballot</a>` : ''}<button class="btn ghost small" type="button" id="print">Print this page</button></div></div>
  <nav class="jump jump5" aria-label="Jump to a section"><a href="#s-live" data-jump="live">2026<small>results</small></a><a href="#s-y2024" data-jump="y2024">2024<small>past results</small></a><a href="#s-y2022" data-jump="y2022">2022<small>past results</small></a><a href="#s-past" data-jump="past">People<small>on my ballot</small></a></nav>
  ${livePanel(r)}
  ${glancePanel(r, hasLookup)}
  ${yearPanel(r.years['2024'], r, hasLookup)}
  ${yearPanel(r.years['2022'], r, hasLookup)}
  ${hasLookup ? historyPanel(r, q) : ''}
  <section class="panel" id="about-data"><h2>${STAR(30)} How to read these results</h2><ul>${r.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <p class="src">Data: ${link('https://electionlab.mit.edu/data', 'MIT Election Data + Science Lab')} (public domain, CC0). Full source list on ${'<a href="#/about">About &amp; Sources</a>'}. Saved copy made ${esc(fmtDate((r.snapshot || '') + 'T12:00:00'))}.</p></section>
  ${lookupForms(q || saved, r.state.abbr)}</div>`;
  footer('Past results are saved copies of official results (from ' + fmtDate((r.snapshot || '') + 'T12:00:00') + '). Result links checked ' + fmtDate(r.live.checkedOn + 'T12:00:00') + '.');
  $('#print').addEventListener('click', () => window.print());
  document.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (!t) return; t.scrollIntoView({ behavior: 'smooth' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }));
  bindLookup(); focusTop();
}
function bindLookup() {
  const f = $('#rf'), g = $('#rs');
  if (f) f.addEventListener('submit', (e) => { e.preventDefault(); const q = $('#rq').value.trim(); if (q) location.hash = '#/results?q=' + encodeURIComponent(q); });
  if (g) g.addEventListener('submit', (e) => { e.preventDefault(); location.hash = '#/results?state=' + $('#rstate').value; });
}

/* ---------- my choices (private, on this device only) ---------- */
const PRIVACY = `<div class="privacy" role="note"><h2><span aria-hidden="true">🔒</span> Private. Only on this device.</h2><p>Your picks and notes are saved <b>only in this web browser on this device</b>. They are <b>not sent anywhere</b>. There are no accounts, and nobody else can see them, not even us. If you clear your browser’s data, your list will be erased.</p></div>`;
const LEVEL_ORDER = ['city', 'county', 'state', 'federal'];
function choiceLines(rows) { return rows.map((r) => (r.names.length ? `[X] ${r.office}: ${r.names.map((n) => n.name + (n.party ? ' (' + n.party + ')' : '')).join('; ')}` : `[ ] ${r.office}: not picked yet`)); }
async function choicesView() {
  setTitle('My choices');
  const last = store.get('cc-last') || '';
  let b = null;
  if (last) { loading('Opening your list…', 'Getting your ballot so the list is complete.'); try { b = await getBallot(last); } catch { b = null; } }
  const ch = loadChoices(); const used = new Set();
  const groups = [];
  let where = '';
  if (b) {
    const loc = b.location; where = loc.type === 'address' ? (loc.matched || last) : (loc.type === 'zip' ? `${loc.cityName || ''}, ${loc.state.abbr} ${loc.zip}` : `${loc.cityName}, ${loc.state.abbr}`);
    for (const k of LEVEL_ORDER) {
      const sec = b.ballot[k]; const list = [...(sec.races || []), ...(sec.otherLocal || [])].filter((r) => r.candidates && r.candidates.length);
      const seen = new Set(); const rows = [];
      for (const r of list) { const key = raceKey(r.office, r.level, loc.state.abbr); if (seen.has(key)) continue; seen.add(key); used.add(key); const it = ch.items[key]; rows.push({ key, office: cleanOffice(r.office), names: it ? it.names : [], max: maxPicks(r.note) }); }
      if (rows.length) groups.push({ title: SECT[k].title, rows });
    }
  }
  const others = Object.entries(ch.items).filter(([k]) => !used.has(k)).map(([k, it]) => ({ key: k, office: it.office, names: it.names, state: it.state }));
  const all = groups.flatMap((g) => g.rows).concat(others);
  const marked = all.filter((r) => r.names.length).length;
  const row = (r) => `<li class="chk ${r.names.length ? 'done' : ''}"><span class="chk-box" aria-hidden="true">${r.names.length ? '☑' : '☐'}</span><div><h3>${esc(r.office)}</h3>${r.names.length ? `<p class="mine"><span class="sr">My choice: </span>${r.names.map((n) => `<b>${esc(n.name)}</b>${n.party ? ' (' + esc(n.party) + ')' : ''}`).join('<br>')}</p>` : `<p class="none">Not picked yet</p>`}${r.max > 1 ? `<p class="note">You may pick up to ${r.max} here.</p>` : ''}</div></li>`;
  main.innerHTML = `<div class="wrap">${backBtn(last ? '#/ballot?q=' + encodeURIComponent(last) : '#/', last ? 'Back to my ballot' : 'Back to home')}
  <h1 class="page-h">My choices</h1>
  <div class="print-only ph"><p><b>My ballot notes</b> · Civic Compass · Election Day: Tuesday, November 3, 2026</p>${where ? `<p>Place: ${esc(where)}</p>` : ''}<p>These are my own notes. This is not an official ballot. Printed on ${esc(fmtDate(new Date()))}.</p></div>
  <p class="lead-dark no-print">Pick “Mark as my choice” on a ballot page as you read about each person. Your list shows up here. You can print it or save it to take with you.</p>
  ${PRIVACY}
  <div class="actions no-print" id="chact"><button class="btn" type="button" id="cp">Print my list</button><button class="btn ghost" type="button" id="cs">Save as a text file</button><button class="btn ghost" type="button" id="cc">Clear my list</button></div>
  <div id="confirm" class="confirm no-print" role="alert" hidden><p><b>Erase all your picks and notes from this device?</b> This cannot be undone.</p><button class="btn" type="button" id="cyes">Yes, erase my list</button> <button class="btn ghost" type="button" id="cno">No, keep it</button></div>
  <p class="summary" id="sumline"><b>${marked}</b> of <b>${all.length}</b> ${all.length === 1 ? 'race' : 'races'} marked${last ? '' : '.'}</p>
  ${!last ? `<div class="notice">You have not looked up a ballot yet.<br><a class="btn small" href="#/">Start with your ZIP code</a></div>` : (!b ? `<div class="notice">We could not load your ballot right now (are you offline?). Your saved picks are below.</div>` : '')}
  ${groups.map((g) => `<section class="chgroup" aria-label="${esc(g.title)}"><h2>${esc(g.title)}</h2><ul class="chlist">${g.rows.map(row).join('')}</ul></section>`).join('')}
  ${others.length ? `<section class="chgroup" aria-label="Other saved picks"><h2>Other saved picks</h2><p class="note">These are from a ballot you looked up before.</p><ul class="chlist">${others.map(row).join('')}</ul></section>` : ''}
  <section class="chgroup"><h2>Judges and ballot questions</h2><p class="note">We do not track Yes or No votes. Use the notes box below for your plans on judges and ballot questions.</p></section>
  <div class="notebox"><label for="notes"><h2>My notes (optional)</h2></label><textarea id="notes" rows="5" maxlength="4000" placeholder="Write anything you want to remember.">${esc(ch.notes || '')}</textarea><p class="note no-print" id="saved-note">Saved on this device as you type.</p></div>
  <p class="src">Not an official ballot or sample ballot. Always check the choices on your real ballot. Need voting help? <a href="#/election-day">Election Day help</a>.</p></div>`;
  footer();
  const flat = groups.map((g) => ({ title: g.title, rows: g.rows })).concat(others.length ? [{ title: 'Other saved picks', rows: others }] : []);
  $('#cp').addEventListener('click', () => window.print());
  $('#cs').addEventListener('click', () => {
    const n = ($('#notes').value || '').trim();
    const txt = ['MY BALLOT NOTES — Civic Compass', 'Election Day: Tuesday, November 3, 2026', where ? 'Place: ' + where : '', 'Private: saved only on my device. This is not an official ballot.', ''].filter((x, i) => x || i === 4)
      .concat(flat.flatMap((g) => [g.title.toUpperCase(), ...choiceLines(g.rows), ''])).concat(['NOTES', n || '(none)', '']).join('\r\n');
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = 'my-ballot-notes.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce('Your list was saved as a text file.');
  });
  $('#cc').addEventListener('click', () => { $('#confirm').hidden = false; $('#cyes').focus(); });
  $('#cno').addEventListener('click', () => { $('#confirm').hidden = true; $('#cc').focus(); });
  $('#cyes').addEventListener('click', () => { saveChoices({ items: {}, notes: '' }); announce('Your list was erased.'); choicesView(); });
  let t; $('#notes').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const c = loadChoices(); c.notes = $('#notes').value; saveChoices(c); const s = $('#saved-note'); if (s) s.textContent = 'Saved on this device.'; }, 300); });
  focusTop();
}

/* ---------- about ---------- */
function aboutView() {
  setTitle('About & Sources');
  const row = (a, b, c) => `<tr><td data-label="Source">${a}</td><td data-label="Used for">${b}</td><td data-label="Notes">${c}</td></tr>`;
  main.innerHTML = `<div class="wrap">${backBtn('#/', 'Back to home')}<h1 class="page-h">About &amp; Sources</h1>
  <div class="prose"><h2>Our promises</h2><ul><li><b>No opinions and no endorsements.</b> We never tell you which candidate, party, or vote is best.</li><li><b>No made-up facts.</b> Every fact on a candidate page has a source link.</li><li><b>Honest about gaps.</b> When we have little data, especially for city and county races, we say “Limited data available.” Then we link to official election offices.</li><li><b>Free and private.</b> No ads. No sign-ups. We do not keep what you type.</li></ul></div>
  <div class="prose" id="privacy"><h2>Your privacy</h2><p>Your text size, high contrast setting, last search, and “my choices” list are saved <b>only in your web browser on your device</b>. They are never sent to us or to anyone else. You can erase your list any time on the <a href="#/choices">My choices</a> page.</p></div>
  <div class="prose" id="words"><h2>Words to know</h2><dl class="words-list">${Object.values(GLOSS).map((g) => `<dt>${esc(g[0])}</dt><dd>${esc(g[1])}</dd>`).join('')}</dl></div>
  <div class="prose"><h2>Where the information comes from</h2><div><table class="srcs"><thead><tr><th scope="col">Source</th><th scope="col">Used for</th><th scope="col">Notes</th></tr></thead><tbody>
  ${row(link('https://ballotpedia.org/', 'Ballotpedia'), 'Which races and candidates are on the ballot; candidate biographies, committees, key votes, and Candidate Connection survey answers; ballot measures', 'Text is shared under CC BY-NC-SA 3.0. Survey answers are written by the candidates themselves.')}
  ${row(link('https://geocoding.geo.census.gov/', 'U.S. Census Bureau Geocoder'), 'Turning your ZIP code, city, or address into your county, city, and districts', 'A ZIP code or city is a guess, because we use the center of the area. A street address is the most exact.')}
  ${row(link('https://api.open.fec.gov/', 'Federal Election Commission (OpenFEC)'), 'Money raised and spent by federal candidates', 'The FEC does not endorse or approve this site. Numbers come from the latest reports filed.')}
  ${row(link('https://www.congress.gov/', 'Congress.gov'), 'Bills sponsored by current members of Congress', 'Library of Congress public API.')}
  ${row(link('https://github.com/unitedstates/congress-legislators', 'unitedstates/congress-legislators'), 'Who is in Congress now, their terms, and their committees', 'Open public data.')}
  ${row(link('https://news.google.com/', 'Google News (RSS search)'), 'Recent news stories that name the candidate', 'We only show stories with the candidate’s last name in the headline.')}
  ${row(link('https://www.allsides.com/media-bias/ratings', 'AllSides Media Bias Ratings'), 'The Left, Center, or Right label on each news outlet', 'We use a saved copy from the open ' + link('https://github.com/favstats/AllSideR', 'AllSideR dataset') + '. It is older than the AllSides website. Outlets missing from it are shown as “not rated.” The label is about the outlet, not about any one story.')}
  ${row(link('https://electionlab.mit.edu/data', 'MIT Election Data + Science Lab (MEDSL)'), 'Past results: 2024 and 2022 candidates, parties, votes, and percentages, by state, county, and U.S. House district', 'Gathered from official state results and shared as public domain (CC0). We keep a dated saved copy. Some states leave out turnout or have only some statewide data, and we say so on each page. District borders have changed in some states since then. Files: ' + link('https://github.com/MEDSL/2024-elections-official', '2024') + ' · ' + link('https://github.com/MEDSL/2022-elections-official', '2022') + '.')}
  ${row('Official county election offices: ' + link('https://www.saltlakecounty.gov/clerk/elections/current-candidate-list/', 'Salt Lake') + ', ' + link('https://www.cachecounty.gov/assets/department/clerk/elections/ElectionNotices/2026/General/Cache_County_2026_General_Election_Certification_Final2.pdf', 'Cache') + ', ' + link('https://www.washco.utah.gov/wp-content/uploads/2026/09/2026-General-Election-Certification-of-County-Candidates-Notice.pdf', 'Washington') + ', ' + link('https://www.utahcounty.gov/cms/uploads/Utah_County_2026_General_Election_Candidate_Certification_4e705c1719.pdf', 'Utah') + ', ' + link('https://www.weberelections.gov/listofcandidates', 'Weber') + ', ' + link('https://www.vote.franklincountyohio.gov/election-info/2026', 'Franklin, OH') + ', ' + link('https://maps.laramiecounty.com/ClerkDocs/SampleBallots/2026/General/5-1.pdf', 'Laramie, WY'), 'County races and local ballot questions in the counties we have checked', 'Public records that we read and saved with their date (each county list shows an “as of” date). The Salt Lake County list comes from the Clerk’s public candidate data. That data has no written guide, so we keep a saved copy to use if it changes. For other counties we use Ballotpedia when it has data. If not, we say “Limited data available.”')}
  ${row(link('https://le.utah.gov/xcode/Title20A/Chapter1/20A-1-S202.html', 'Utah Code § 20A-1-202') + ', ' + link('https://codes.ohio.gov/ohio-revised-code/section-3501.01', 'Ohio Revised Code § 3501.01'), 'Why Utah and Ohio cities have no mayor or city council race this year', 'State law puts city elections in odd-numbered years. We only say “no city election” where we have checked the law.')}
  ${row(link('https://knowyourjudges.utah.gov/s/', 'Utah Judicial Performance Evaluation Commission'), 'Official reviews of the Utah judges on the ballot', 'We link to the official reviews. We do not give an opinion.')}
  ${row('Official state results websites', 'Where 2026 results will be posted after the polls close on Nov. 3, 2026', 'Links only, checked October 24, 2026. A few state sites block automatic checks. Those are marked on the Past results page. We do not use guesses from news groups.')}
  ${row(link('https://vote.gov/', 'Vote.gov') + ', ' + link('https://vote.org/', 'Vote.org') + ', ' + link('https://www.usa.gov/state-election-office', 'USA.gov'), 'Registration, polling places, dates, ID rules, and your official election office. These are the links in the Election Day help box.', 'Links only. We do not copy their content. Rules and dates are different in every state, so we send you to the official source.')}
  </tbody></table></div></div>
  <div class="prose" id="photo-credit"><h2>Photo credit</h2><p>The photo at the top of the home page, <b>“Capitol Dome,”</b> shows the U.S. Capitol dome with an American flag. It was taken on July 9, 2012 by the <b>Architect of the Capitol</b> (Flickr account “USCapitol”).</p>
  <ul><li><b>License:</b> Public domain. It is a work of the U.S. federal government (17 U.S.C. § 105), so no permission is needed. The Architect of the Capitol asks that its images be credited “Architect of the Capitol,” be used for educational or non-commercial purposes, and not be used to suggest that the Architect of the Capitol or Congress endorses anything.</li>
  <li><b>Sources:</b> ${link('https://commons.wikimedia.org/wiki/File:Flickr_-_USCapitol_-_Capitol_Dome_(1).jpg', 'Wikimedia Commons file page')} · ${link('https://www.flickr.com/photos/uscapitol/7537241496/', 'original on Flickr')}.</li>
  <li><b>Changes:</b> We cropped and resized the image. We added dark-blue shading at the edges so the words are easy to read.</li>
  <li>Civic Compass is an independent, nonpartisan tool. It is <b>not affiliated with or endorsed by</b> the Architect of the Capitol, Congress, or any government agency.</li></ul></div>
  <div class="prose"><h2>Good to know</h2><ul><li>This is a research tool. It is <b>not an official ballot</b>. Your real ballot may be different, most of all for local races and when you only typed a ZIP code.</li><li>School boards, judges, and small-town races are the hardest to find. When our sources have nothing, we say so.</li><li>Ballot facts change as officials approve candidates. Each page shows when we fetched it.</li><li>Found a mistake? Please tell the person who shared this app with you.</li></ul></div>
  <div class="prose" id="keys"><h2>For the site owner: optional data keys</h2><p>The site works without them. The site owner can add keys to make it more reliable:</p><ul><li><b>Google Civic Information API</b>: official ballot races and polling places for a street address.</li><li><b>FEC and Congress.gov API keys</b>: higher limits for campaign money and bills.</li></ul><p class="src" id="keystat"></p></div>
  ${backBtn('#/', 'Back to home')}</div>`;
  footer();
  api('/api/status').then((s) => { const k = s.keys; $('#keystat').textContent = `Right now: Google Civic ${k.GOOGLE_CIVIC_API_KEY ? 'connected' : 'not connected'} · FEC key ${k.FEC_API_KEY ? 'set' : 'using shared public limit'} · Congress.gov key ${k.CONGRESS_API_KEY ? 'set' : 'using shared public limit'}.`; }).catch(() => {});
  focusTop();
}

/* ---------- router ---------- */
function setTab(path) {
  const t = /^\/results/.test(path) ? 'results' : path === '/about' ? 'about' : path === '/choices' ? 'choices' : path === '/election-day' ? 'election-day' : 'ballot';
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
  if (path === '/choices') return choicesView();
  if (path === '/election-day') return electionDayView(params.get('state'));
  if (path === '/about') return aboutView();
  if (/^\/s-/.test(path)) return;
  return homeView();
}
window.addEventListener('hashchange', route);
route();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();

