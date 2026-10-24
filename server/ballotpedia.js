// Ballotpedia (public web pages; no API key). Parses state election pages, county pages and candidate pages.
// Ballotpedia text is CC BY-NC-SA 3.0; we always attribute and link back.
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { cached, fetchText } = require('./util');
const BP = 'https://ballotpedia.org';
const slugState = (n) => n.replace(/ /g, '_');
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const abs = (h) => (!h ? null : h.startsWith('http') ? h : BP + h);
const slugFromUrl = (u) => { try { const x = new URL(u); return x.hostname.endsWith('ballotpedia.org') ? decodeURIComponent(x.pathname.slice(1)) : null; } catch { return null; } };

function parseCandidateTable($, table) {
  const rows = [];
  $(table).find('tbody tr').each((i, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 4) return;
    const info = $(tds[0]).find('.widget-candidate-info').first();
    const a = info.find('a').first();
    const nameEl = a.length ? a : info;
    const nm = clean(nameEl.clone().children('span,img').remove().end().text()) || clean(info.text()).replace(/\s*Incumbent\s*$/, '');
    const name = nm.replace(/\s*Incumbent\s*$/, '');
    const href = a.attr('href');
    const statusTd = $(tds[3]);
    const statusText = clean(statusTd.text());
    rows.push({
      name,
      url: href ? abs(href) : null,
      slug: href ? slugFromUrl(abs(href)) : null,
      incumbent: /Incumbent/.test(clean(info.text())),
      office: clean($(tds[1]).text()),
      officeUrl: abs($(tds[1]).find('a').first().attr('href')),
      party: clean($(tds[2]).text()),
      status: statusText,
      onBallot: /^On the Ballot/i.test(statusText),
      writeIn: /write-in/i.test(statusText),
      unofficialWithdrawn: /withdrew|withdrawn/i.test(statusText),
    });
  });
  return rows;
}

function parseMeasures($) {
  const out = [];
  $('table').each((i, t) => {
    const h = $(t).find('th').map((j, e) => clean($(e).text())).get().join('|');
    if (!/Type\|Title\|Subject\|Description/.test(h)) return;
    $(t).find('tr').each((j, tr) => {
      const td = $(tr).find('td');
      if (td.length < 4) return;
      const a = $(td[1]).find('a').first();
      out.push({ type: clean($(td[0]).text()), title: clean($(td[1]).text()), url: abs(a.attr('href')), subject: clean($(td[2]).text()), description: clean($(td[3]).text()) });
    });
  });
  return out;
}

function trimText(t, n) { if (t.length <= n) return t; const cut = t.slice(0, n); const i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; ')); return (i > n * 0.5 ? cut.slice(0, i + 1) : cut.replace(/\s+\S*$/, '') + '…'); }

function parseStateHtml(html, url, fetchedAt) {
    const $ = cheerio.load(html);
    const out = { url, fetchedAt: fetchedAt || new Date().toISOString(), federal: [], state: [], local: {}, measures: parseMeasures($) };
    $('table').each((i, t) => {
      const cap = clean($(t).find('caption').first().clone().find('.searchbox').remove().end().text());
      if (/^Federal Candidates/.test(cap)) out.federal = parseCandidateTable($, t);
      else if (/^State Candidates/.test(cap)) out.state = parseCandidateTable($, t);
      else if (/ - Local$/.test(cap)) out.local[cap.replace(/ - Local$/, '')] = parseCandidateTable($, t);
    });
    return out;
}

// Whole-state page: federal + state candidate tables, statewide measures, and the "<County> - Local" table(s).
async function stateElections(stateName, opts = {}) {
  return cached('bp:state:' + stateName, 45 * 60e3, async () => {
    const url = `${BP}/${slugState(stateName)}_elections,_2026`;
    let html;
    try { html = await fetchText(url, { timeoutMs: 25000 }); }
    catch (e) {
      // Live page blocked/unreachable: fall back to the snapshot bundled with the app (clearly labeled).
      const snapFile = path.join(__dirname, '..', 'data', 'snapshots', slugState(stateName) + '.json');
      if (!opts.noSnapshot && fs.existsSync(snapFile)) { const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8')); snap.fromSnapshot = true; return snap; }
      throw e;
    }
    return parseStateHtml(html, url);
  });
}

// County page ("Franklin County, Ohio, elections, 2026") — only exists for some counties.
async function countyPage(countyName, stateName) {
  return cached(`bp:county:${countyName}:${stateName}`, 60 * 60e3, async () => {
    const url = `${BP}/${slugState(countyName)},_${slugState(stateName)},_elections,_2026`;
    let html;
    try { html = await fetchText(url, { timeoutMs: 25000, retries: 0 }); }
    catch (e) { if (e.status === 404) return { exists: false, url }; throw e; }
    const $ = cheerio.load(html);
    const sections = [];
    $('h2').each((i, h2) => {
      const title = clean($(h2).find('.mw-headline').text());
      if (!/elections and candidates/i.test(title)) return;
      let n = $(h2).next(); let guard = 0;
      while (n.length && !n.is('h2') && guard++ < 60) {
        if (n.is('h3')) {
          const when = clean(n.find('.mw-headline').text());
          if (/November 3, 2026/.test(when)) {
            // next element holds the panels
            let m = n.next(); let g2 = 0;
            while (m.length && !m.is('h3') && !m.is('h2') && g2++ < 10) {
              m.find('li.panel').each((j, li) => {
                const place = clean($(li).children('a').first().text());
                const races = [];
                $(li).find('.widget-data-list > p').each((k, p) => {
                  const b = $(p).children('b').first();
                  if (!b.length) return;
                  const office = clean(b.text());
                  const ul = $(p).nextAll('ul').first();
                  const cands = [];
                  ul.children('li').each((q, cli) => {
                    const a = $(cli).find('a').first();
                    const txt = clean($(cli).text());
                    const m2 = txt.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
                    cands.push({ name: m2 ? m2[1] : txt, party: m2 ? m2[2] : '', url: a.length ? abs(a.attr('href')) : null, slug: a.length ? slugFromUrl(abs(a.attr('href'))) : null });
                  });
                  if (cands.length) races.push({ office, candidates: cands });
                });
                sections.push({ section: title.replace(/ elections and candidates/i, ''), when, place, races });
              });
              m = m.next();
            }
          }
        }
        n = n.next();
      }
    });
    return { exists: true, url, sections };
  });
}

const sectionText = ($, el) => clean($(el).text());
function pTextUntilH2($, h2, { maxChars = 1800 } = {}) {
  const parts = []; let n = $(h2).next(); let guard = 0;
  while (n.length && !n.is('h2') && guard++ < 25) {
    if (n.is('p') && !n.hasClass('mw-empty-elt')) { const t = clean(n.text()); if (t && !/^\.?[a-z-]*\s*\{/.test(t) && t.length > 20) parts.push(t.replace(/\[\d+\]/g, '')); }
    if (n.is('ul') && !n.attr('class')) { const li = n.find('li').map((i, e) => clean($(e).text())).get(); if (li.length) parts.push('• ' + li.join('\n• ')); }
    n = n.next();
  }
  return parts.join('\n\n').slice(0, maxChars);
}

async function candidatePage(slug) {
  return cached('bp:cand:' + slug, 3 * 3600e3, async () => {
    const url = `${BP}/${slug.split('/').map(encodeURIComponent).join('/')}`;
    const html = await fetchText(url, { timeoutMs: 25000 });
    const $ = cheerio.load(html);
    const root = $('.mw-parser-output').first();
    const lead = root.children('p').not('.mw-empty-elt').slice(0, 3).map((i, e) => clean($(e).text()).replace(/\[(source|\d+)\]/g, '')).get().filter((t) => t.length > 30);
    const infobox = {}; const links = [];
    let curHead = '';
    $('.infobox').first().find('.widget-row').each((i, r) => {
      const cls = $(r).attr('class') || '';
      const t = clean($(r).text());
      if (/value-only/.test(cls) && !$(r).find('a').length) { curHead = t; return; }
      const a = $(r).find('a').first();
      if (/^(Campaign|Official|Personal|Government) (website|Facebook|Twitter|Instagram|YouTube|LinkedIn|TikTok|X)/i.test(t) && a.attr('href') && /^https?:/.test(a.attr('href')) && !/ballotpedia\.org/.test(a.attr('href'))) { links.push({ label: t, url: a.attr('href') }); return; }
      if (curHead === 'Education' || curHead === 'Personal') { const m = t.match(/^(Profession|Bachelor's|Graduate|Associate|High school|Master's|Doctorate|Law|Other|Military service|Branch|Service years|Rank|Birth date|Place of birth|Religion|Contact)(.*)$/i); if (m) infobox[m[1]] = clean(m[2]); else if (curHead === 'Education') (infobox.Education = infobox.Education || []).push(t); }
    });
    const sections = {};
    root.find('h2').each((i, h2) => {
      const name = clean($(h2).find('.mw-headline').text());
      if (name === 'Biography') sections.biography = pTextUntilH2($, h2, { maxChars: 1600 });
      if (name === 'Committee assignments') sections.committees = pTextUntilH2($, h2, { maxChars: 900 }).replace(/\[Source\]/g, '');
      if (name === 'Campaign themes') {
        const qa = [];
        let n = $(h2).next(); let guard = 0; let year = '';
        while (n.length && !n.is('h2') && guard++ < 60) {
          if (n.is('h3')) year = clean(n.find('.mw-headline').text());
          if (year && year !== '2026') break;
          n.find('.bp-collapsible-panel').each((j, panel) => {
            const q = clean($(panel).find('.bp-collapsible-trigger').first().text());
            const a = clean($(panel).find('.answers-container').first().text());
            if (q && a) qa.push({ q, a: a.length > 1500 ? a.slice(0, 1500) + '…' : a });
          });
          n = n.next();
        }
        sections.themes = qa;
        const t = root.find('h2 #Campaign_themes').closest('h2');
        const txt = clean($(t).nextUntil('h2').text());
        sections.hasSurvey = qa.length > 0;
        sections.themesNote = /has not yet completed/i.test(txt) ? 'This candidate has not completed Ballotpedia\'s 2026 Candidate Connection survey.' : null;
      }
      if (name === 'Campaign finance summary') {
        const table = $(h2).nextUntil('h2').find('table').filter((j, t) => /contribution history/i.test($(t).text())).first();
        if (table.length) sections.finance = table.find('tr').map((j, r) => [$(r).find('th,td').map((k, c) => clean($(c).text())).get()]).get().filter((r) => r.length >= 3 && r.length <= 5 && !/^Sources?:/i.test(r[0]) && !/^\*/.test(r[0]));
      }
      if (name === 'Key votes') {
        const rows = [];
        $(h2).nextUntil('h2').find('table tr').each((j, r) => { const c = $(r).find('td').map((k, e) => clean($(e).text())).get(); if (c.length >= 2 && /^(Yea|Nay|Not Voting|Absent|Present)/i.test(c[0])) rows.push({ vote: c[0], text: trimText((c[2] || c[1]).replace(/\[\d+\]/g, ''), 600) }); });
        const hdr = clean($(h2).nextUntil('h2').filter('h3').first().text()).replace(/\[edit\]/,'');
        sections.keyVotes = { header: hdr, rows: rows.slice(0, 6) };
      }
    });
    const title = clean($('title').text()).replace(/ - Ballotpedia$/, '');
    return { url, title, lead, infobox, links, sections };
  });
}
module.exports = { parseStateHtml, stateElections, countyPage, candidatePage };
