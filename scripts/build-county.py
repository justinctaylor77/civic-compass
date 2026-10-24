#!/usr/bin/env python3
"""
Build data/county/<FIPS>.json — official county/local 2026 general-election
candidate lists and ballot questions, parsed from each county clerk / board of
elections' own published certification (PDF / HTML / the Salt Lake County
Clerk's public candidate feed that powers its own Candidate List page).

  python3 scripts/build-county.py [fips ...]

Needs `pdftotext` (poppler-utils). Each parser is tied to that county's current
document layout; if a layout changes, the parser fails loudly and the previously
committed JSON stays in place. Sources & as-of dates are written into each file.
Facts only: names, parties as certified, office, area. No endorsements.
"""
import sys, os, re, json, html, subprocess, tempfile, urllib.request, datetime

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'county')
UA = 'Mozilla/5.0 (X11; Linux x86_64) CivicCompass/6 (+nonpartisan voter guide)'
TODAY = datetime.date.today().isoformat()

def get(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        b = r.read()
    return b if binary else b.decode('utf-8', 'ignore')

def pdf_text(url, layout=True):
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(get(url, True)); p = f.name
    try:
        return subprocess.check_output(['pdftotext'] + (['-layout'] if layout else []) + [p, '-'], text=True)
    finally: os.unlink(p)

SMALL = {'of', 'the', 'and', 'for', 'to'}
def nice(name):
    n = re.sub(r'\s+', ' ', name.replace('’', "'")).strip(' -–')
    if n != n.upper(): return n
    out = []
    for w in n.split(' '):
        lw = w.lower()
        if lw.startswith('mc') and len(lw) > 3: w2 = 'Mc' + lw[2:].title()
        elif "'" in lw: w2 = "'".join(p.title() for p in lw.split("'"))
        elif '-' in lw: w2 = '-'.join(p.title() for p in lw.split('-'))
        elif re.fullmatch(r'(ii|iii|iv)', lw): w2 = lw.upper()
        elif re.fullmatch(r'[a-z]\.?', lw): w2 = lw.upper()
        else: w2 = lw.title()
        out.append(w2)
    return ' '.join(out)

PARTY = {'DEM': 'Democratic', 'DEMOCRATIC': 'Democratic', 'REP': 'Republican', 'REPUBLICAN': 'Republican', 'LIB': 'Libertarian', 'LIBERTARIAN': 'Libertarian',
         'CON': 'Constitution', 'CONSTITUTION': 'Constitution', 'FWD': 'Forward', 'FORWARD': 'Forward', 'IAP': 'Independent American', 'INDEPENDENT AMERICAN': 'Independent American',
         'UNA': 'Unaffiliated', 'UNAFFILIATED': 'Unaffiliated', 'GRN': 'Green', 'GREEN': 'Green', 'NONPARTISAN': '', 'NON PARTISAN': '', 'NON-PARTISAN': '', 'N/A': '', 'PFP': "Peoples' Freedom"}
def party(p):
    p = (p or '').strip().upper().strip('"')
    return PARTY.get(p, p.title())

def cand(name, p='', **kw):
    d = {'name': nice(name), 'party': party(p)}
    d.update({k: v for k, v in kw.items() if v})
    return d

def office(name, level, cands, area=None, seats=1, term=None, note=None):
    o = {'office': name, 'level': level, 'candidates': cands}
    if area: o['area'] = area
    if seats and seats != 1: o['seats'] = seats
    if term: o['term'] = term
    if note: o['note'] = note
    return o

def write(fips, doc):
    os.makedirs(OUT, exist_ok=True)
    doc.update({'fips': fips, 'built': TODAY})
    with open(os.path.join(OUT, f'{fips}.json'), 'w') as f: json.dump(doc, f, indent=1, ensure_ascii=False)
    print(fips, doc['county'], 'offices', len(doc['offices']), 'measures', len(doc.get('measures', [])), 'retention', len(doc.get('retention', [])), flush=True)

# ---------------------------------------------------------------- Salt Lake County, UT
def salt_lake():
    url = 'https://apps.saltlakecounty.gov/services/cl/cl-candidate-reporting-service/api/v1/CandidateReporting/GetCandidateJson'
    j = json.loads(get(url))
    assert j.get('success') and j['candidates'], 'SLCo feed empty'
    races = {}
    for c in j['candidates']:
        races.setdefault(c['race'], []).append(c)
    offices = []
    for race, cs in races.items():
        live = [c for c in cs if c['status'] in ('Election Candidate', 'Write-In')]
        if not live: continue
        r = race
        lvl, area = 'county', None
        m = re.match(r'^(County Council (?:At-Large [A-Z]|District \d+)|County Auditor|County Clerk|County District Attorney|County Sheriff)$', r)
        if m: lvl = 'county'
        elif re.match(r'^(U\.S\. House|State Senate|State House|State School Board)', r): lvl = 'state-district'
        elif 'School Board' in r:
            lvl = 'school'; area = re.sub(r' School Board District.*$', '', r) + ' School District'
        else: continue
        if lvl == 'state-district': continue  # state certification covers these
        certified = [c for c in live if c['status'] == 'Election Candidate']
        wi = [c for c in live if c['status'] == 'Write-In']
        cl = [cand(c['candidate'], c['party'], web=('https://' + c['url']) if c['url'] and not c['url'].startswith('http') else c['url']) for c in certified]
        note = None
        if wi: note = 'Declared write-in: ' + ', '.join(nice(c['candidate']) for c in wi)
        if not cl and not wi: continue
        offices.append(office(r if lvl == 'county' else re.sub(r' School Board District', ' School District board, District', r), lvl, cl, area=area, note=note))
    offices.sort(key=lambda o: (o['level'], o.get('area') or '', o['office']))
    return 'Salt Lake County', 'UT', offices, [], [], [
        {'label': 'Salt Lake County Clerk — 2026 Candidates for Office', 'url': 'https://www.saltlakecounty.gov/clerk/elections/current-candidate-list/'},
        {'label': 'Salt Lake County Clerk candidate data feed (public JSON behind that page)', 'url': url}], TODAY

# ---------------------------------------------------------------- Cache County, UT
def parse_numbered(txt):
    """headings followed by '1.   NAME        PARTY' lines."""
    blocks, cur = [], None
    for line in txt.splitlines():
        s = line.rstrip()
        m = re.match(r'^\s*\d+\.\s+(.+?)\s{2,}([A-Z][A-Z \-]+)\s*$', s)
        if m and cur is not None:
            cur[1].append((m.group(1), m.group(2))); continue
        t = s.strip()
        if t and re.fullmatch(r"[A-Z0-9 .,&()/\-–']+", t) and not t.startswith('CACHE COUNTY -') and 'CERTIFICATION' not in t and not re.fullmatch(r'NOVEMBER.*', t) and not t.startswith('[ ]') and not t.startswith('SHALL'):
            cur = [t, []]; blocks.append(cur)
    return [b for b in blocks if b[1]]

def cache():
    url = 'https://www.cachecounty.gov/assets/department/clerk/elections/ElectionNotices/2026/General/Cache_County_2026_General_Election_Certification_Final2.pdf'
    txt = pdf_text(url)
    blocks = parse_numbered(txt)
    offices = []
    for head, cs in blocks:
        h = head.title().replace('Of ', 'of ').replace('Ii', 'II')
        if head.startswith(('U.S. HOUSE', 'STATE SENATE', 'STATE HOUSE', 'STATE BOARD')): continue
        if head.startswith('COUNTY '):
            offices.append(office(re.sub(r'\s*\(two yr term\)', ' (two-year term)', nice(head), flags=re.I), 'county', [cand(n, p) for n, p in cs]))
        elif 'SCHOOL DISTRICT' in head:
            m = re.match(r'^(.*?SCHOOL DISTRICT) - (DISTRICT \d+)$', head)
            offices.append(office(nice(head) if not m else nice(m.group(1)) + ' board, ' + nice(m.group(2)), 'school', [cand(n, p) for n, p in cs], area=nice(m.group(1)) if m else None))
        elif 'WATER DISTRICT' in head:
            offices.append(office(nice(head), 'special', [cand(n, p) for n, p in cs], area='Cache Water District'))
    meas = [{'title': 'Providence City — non-binding ballot question #1', 'area': 'Providence', 'options': ['Yes', 'No'],
             'text': 'As the County Library is closing, should Providence City consider imposing a new property tax levy to fund a city public library and all related library services, which is estimated to cost the owner of a primary residence with a fair market value of $500,000 approximately $55.30 per year?',
             'binding': False}]
    ret = [{'court': 'First Judicial District — Juvenile Court', 'judge': 'Kirk Max Morgan', 'area': None},
           {'court': 'Wellsville Justice Court', 'judge': 'Matthew David Lorz', 'area': 'Wellsville'}]
    return 'Cache County', 'UT', offices, meas, ret, [{'label': 'Cache County Clerk — 2026 Regular General Election Certification (Aug 31, 2026)', 'url': url}], '2026-08-31'

# ---------------------------------------------------------------- Washington County, UT
def washington():
    url = 'https://www.washco.utah.gov/wp-content/uploads/2026/09/2026-General-Election-Certification-of-County-Candidates-Notice.pdf'
    txt = pdf_text(url)
    sec = txt[txt.index('\nCOUNTY\n'):txt.index('NON-PARTISAN LOCAL SCHOOL BOARD')]
    offices = []
    for m in re.finditer(r'^(Commission Seat [AB]|County Attorney|County Clerk/Auditor|County Sheriff)\n\s*\1 serves.*?\n\s*Candidate\s+Party\n(.*?)(?=\n(?:Commission Seat|County |\s*111 East)|\Z)', sec, re.S | re.M):
        cs = []
        for line in m.group(2).splitlines():
            mm = re.match(r'^\s+(.+?)\s{2,}(\w[\w ]*)\s*$', line)
            if mm: cs.append(cand(mm.group(1), mm.group(2)))
        name = m.group(1).replace('Commission Seat', 'County Commission Seat')
        offices.append(office(name, 'county', cs))
    sb = txt[txt.index('NON-PARTISAN LOCAL SCHOOL BOARD'):txt.index('NON-PARTISAN JUDICIAL')]
    cur = None; groups = {}
    for line in sb.splitlines():
        mm = re.match(r'^\s+District (\d+)\s{2,}(.+?)\s*$', line)
        if mm: cur = mm.group(1); groups.setdefault(cur, []).append(mm.group(2)); continue
        mm = re.match(r'^\s{20,}([A-Z][A-Z .\'\-]+?)\s*$', line)
        if mm and cur and 'District' not in line and 'NON-PARTISAN' not in line and 'St. George' not in line and 'P 435' not in line: groups[cur].append(mm.group(1))
    for d, names in sorted(groups.items()):
        offices.append(office(f'Washington County School District board, District {d}', 'school', [cand(n) for n in names], area='Washington County School District'))
    meas = []
    ms = txt[txt.index('LOCAL BALLOT PROPOSITIONS'):txt.index('REGISTERED POLITICAL PARTIES')]
    for m in re.finditer(r'^(Santa Clara|Virgin|Washington)\n(Shall .*?)\s*\n\s*\( \) (For|Yes) \( \) (Against|No)', ms, re.S | re.M):
        meas.append({'title': f'{m.group(1)} — local ballot proposition', 'area': m.group(1), 'options': [m.group(3), m.group(4)], 'text': re.sub(r'\s+', ' ', m.group(2))})
    ret = [{'court': 'Santa Clara Justice Court', 'judge': 'K. Jake Graff', 'area': 'Santa Clara'}]
    for j in ('Jay Winward', 'Eric Russell Gentry', 'Matthew L. Bell'):
        ret.append({'court': 'Fifth Judicial District Court (Beaver, Iron, Washington counties)', 'judge': j, 'area': None})
    return 'Washington County', 'UT', offices, meas, ret, [{'label': 'Washington County Clerk — 2026 General Election Certification of County Candidates (Sept 2026)', 'url': url}], '2026-09-01'

# ---------------------------------------------------------------- Utah County, UT
def utah():
    url = 'https://www.utahcounty.gov/cms/uploads/Utah_County_2026_General_Election_Candidate_Certification_4e705c1719.pdf'
    txt = pdf_text(url)
    lines = txt.splitlines()
    def columns(start_pat, end_pat):
        out = []
        i0 = next(i for i, l in enumerate(lines) if re.search(start_pat, l))
        i1 = next(i for i, l in enumerate(lines) if i > i0 and re.search(end_pat, l))
        seg = lines[i0 + 1:i1]
        i = 0
        # a heading row = a line with >=1 heading words followed by candidate rows until next heading row
        heads = []
        res = []
        k = 0
        while k < len(seg):
            l = seg[k]
            if re.search(r'(County|School District)\s', l) and not re.search(r'\s-\s|- (DEM|REP|FWD|IAP)', l) and l.strip():
                starts = [m.start() for m in re.finditer(r'\S+(?: \S+)*?(?=\s{3,}|$)', l)]
                cols = [(m.start(), m.group(0).strip()) for m in re.finditer(r'\S(?:.*?\S)?(?=\s{3,}|$)', l)]
                k += 1; rows = []
                while k < len(seg) and not (re.search(r'(County|School District)\s', seg[k]) and not re.search(r'- (DEM|REP|FWD|IAP)', seg[k]) and seg[k].strip()):
                    rows.append(seg[k]); k += 1
                for ci, (cs, ch) in enumerate(cols):
                    ce = cols[ci + 1][0] if ci + 1 < len(cols) else 999
                    names = []
                    for r in rows:
                        piece = r[cs:ce].strip() if len(r) > cs else ''
                        if piece: names.append(piece)
                    res.append((ch, names))
            else: k += 1
        return res
    offices = []
    county = columns(r'^County Offices', r'^Local School Board')
    for head, names in county:
        cs = []
        for n in names:
            m = re.match(r'^(.*?)\s*-\s*(DEM|REP|FWD|IAP|LIB|CON|UNA)$', n)
            cs.append(cand(m.group(1), m.group(2)) if m else cand(n))
        offices.append(office(head, 'county', cs))
    school = columns(r'^Local School Board', r'^Ballot Questions')
    for head, names in school:
        area = re.sub(r' \d+$', '', head)
        offices.append(office(head.replace(' School District ', ' School District board, District '), 'school', [cand(n) for n in names], area=area))
    meas = [{'title': 'Salem City — Proposition #8 (RAP tax)', 'area': 'Salem', 'options': ['For', 'Against'],
             'text': 'Shall Salem, Utah be authorized to impose a sales and use tax of one-tenth of one percent (0.1%) to provide revenues for Recreational (including Parks), and Cultural Facilities and Organizations (commonly known as the "RAP TAX") within the City for a period of ten (10) years?'}]
    return 'Utah County', 'UT', offices, meas, [], [
        {'label': 'Utah County Clerk — 2026 General Election Candidate Certification (Sept 2, 2026)', 'url': url},
        {'label': 'Utah County Elections — Public Notices', 'url': 'https://vote.utahcounty.gov/public-notices'}], '2026-09-02'

# ---------------------------------------------------------------- Weber County, UT
def weber():
    url = 'https://www.weberelections.gov/listofcandidates'
    h = get(url)
    i = h.find('2026 List of Candidates')
    b = re.sub(r'<(script|style).*?</\1>', '', h[i:], flags=re.S)
    b = re.sub(r'</(p|div|h\d|li)>|<br\s*/?>', '\n', b)
    t = html.unescape(re.sub(r'<[^>]+>', '', b)).replace('\u200b', '').replace('\xa0', ' ')
    t = t.split('CONTACT INFO')[0]
    lines = [l.strip() for l in t.splitlines() if l.strip()]
    sect = None; cur = None; offices = []; notes = {}
    def finish(): pass
    def add(name, level, area=None):
        o = {'office': name, 'level': level, 'candidates': [], 'out': []}
        if area: o['area'] = area
        offices.append(o); return o
    for l in lines:
        if l.endswith(':'):
            head = l[:-1].strip()
            if head in ('State House', 'State Senate', 'State School Board'): sect = head; cur = None; continue
            if head in ('County Commissioner', 'Local School Board'): sect = head; cur = None; continue
            if head == 'County Attorney': cur = add('County Attorney', 'county'); sect = 'county1'; continue
            if head == 'County Clerk/Auditor': cur = add('County Clerk/Auditor', 'county'); sect = 'county1'; continue
            if head == 'County Sheriff': cur = add('County Sheriff', 'county'); sect = 'county1'; continue
            if head == 'County Assessor': cur = add('County Assessor', 'county'); sect = 'county1'; continue
            if sect == 'County Commissioner' and re.match(r'^Seat [AB]$', head): cur = add('County Commission ' + head, 'county'); continue
            if sect == 'Local School Board': 
                area = re.sub(r' School Board District \d+$', '', head)
                cur = add(head.replace('School Board District', 'School District board, District'), 'school', area=area + ' School District'); continue
            cur = None; continue
        if cur is None or sect in ('State House', 'State Senate', 'State School Board'): continue
        if l.startswith(('Write-In', 'Candidates', 'For federal', 'State, County', '*', 'Kerry')) and not re.search(r'\w', l.replace('Write-In', '')): continue
        if l.startswith('Write-In'): cur['note'] = 'Write-in: ' + l; continue
        m = re.match(r'^(.*?)\s*-\s*(withdrew|out in convention|out in primary|disqualified)\s*$', l, re.I)
        if m: cur['out'].append(nice(m.group(1)) + ' (' + m.group(2).lower() + ')'); continue
        cur['candidates'].append(cand(re.sub(r'\*+$', '', l)))
    offices = [o for o in offices if o['candidates']]
    for o in offices:
        if not o['out']: o.pop('out')
        else: o['out'] = o['out']
    return 'Weber County', 'UT', offices, [], [], [{'label': 'Weber County Elections Office — 2026 List of Candidates', 'url': url}], TODAY

# ---------------------------------------------------------------- Franklin County, OH
def franklin():
    url = 'https://www.vote.franklincountyohio.gov/getmedia/e0a4ca45-6893-45c1-8190-87696f8804b4/2026-General-Candidate-List-5'
    txt = pdf_text(url)
    rows = []
    pending = ''
    pat = re.compile(r'^\s*(.+?)\s{2,}(Democratic|Republican|Libertarian|Green|Other-party c|N/A|"nonparty"|Independent|[A-Z][a-z]+)\s+(.+?)\s{2,}((?:Full|Unexpired) Term(?: Commencing| Ending)?)\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})?')
    pat2 = re.compile(r'^\s*(.+?)\s{2,}(JUDGE OF .+?)\s{2,}((?:Full|Unexpired) Term(?: Commencing| Ending)?)\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})?')
    for l in txt.splitlines():
        if not l.strip() or l.startswith(('Name on Ballot', '2026 General Election Candidates')): continue
        m = pat.match(l)
        if not m:
            m2 = pat2.match(l)
            if m2:
                name = (pending + ' ' + m2.group(1)).strip(); pending = ''
                rows.append((name, '', m2.group(2).strip(), m2.group(3) + (' ' + m2.group(4) if m2.group(4) else ''))); continue
        if not m:
            pending = (pending + ' ' + l.strip()).strip(); continue
        name = (pending + ' ' + m.group(1)).strip(); pending = ''
        term = m.group(4) + (' ' + m.group(5) if m.group(5) else '')
        rows.append((name, m.group(2), m.group(3).strip(), term))
    by = {}
    for n, p, o, t in rows:
        by.setdefault((o, t), []).append((n, p))
    offices = []
    for (o, t), cs in by.items():
        ou = o.upper()
        if not re.match(r'^(COUNTY |JUDGE OF THE COURT OF COMMON PLEAS|JUDGE OF THE COUNTY COURT|CLERK OF|SHERIFF|CORONER|PROSECUTING|RECORDER|TREASURER OF COUNTY|ENGINEER)', ou): continue
        name = nice(o).replace('Of The', 'of the').replace('Court Of Common Pleas', 'Court of Common Pleas')
        term = re.sub(r'(?:Full|Unexpired) Term (Commencing|Ending)', lambda m: ('Term begins' if m.group(1) == 'Commencing' else 'Term ends'), t)
        offices.append(office(name, 'county' if ou.startswith(('COUNTY', 'SHERIFF', 'CORONER', 'PROSECUTING', 'RECORDER', 'CLERK')) else 'judicial', [cand(n, p) for n, p in cs], term=term))
    return 'Franklin County', 'OH', offices, [], [], [
        {'label': 'Franklin County Board of Elections — 2026 General Election Candidates (revised Oct 16, 2026)', 'url': url},
        {'label': 'Franklin County Board of Elections — 2026 election information', 'url': 'https://www.vote.franklincountyohio.gov/election-info/2026'}], '2026-10-16'

# ---------------------------------------------------------------- Laramie County, WY (hand-keyed from the Clerk's published sample ballot)
def laramie():
    url = 'https://maps.laramiecounty.com/ClerkDocs/SampleBallots/2026/General/5-1.pdf'
    txt = pdf_text(url)
    # verify every name we key below actually appears in the published ballot text
    expect = {
        'County Commissioner': ([('Troy Thompson', 'R'), ('Jess E. Ketcham', 'R'), ('Gunnar Malm', 'R'), ('Barbara Cabot', 'D'), ('Lynne K. Davis', 'D')], 3),
        'County Sheriff': ([('Brian Kozak', 'R'), ('Robin Cozad', 'D')], 1),
        'County Clerk': ([('Misty Tinney', 'R')], 1),
        'County Treasurer': ([('Trista Wood', 'R')], 1),
        'County Assessor': ([('Todd A. Ernst', 'R')], 1),
        'Clerk of District Court': ([('Diane Sanchez', 'R')], 1),
        'County Coroner': ([('Rebecca Reid', 'R')], 1),
        'District Attorney': ([('Sylvia Lee Hackl', 'R')], 1),
    }
    up = re.sub(r'\s+', ' ', txt.upper())
    offices = []
    for off, (cs, seats) in expect.items():
        for n, _ in cs: assert n.upper().replace('.', '') in up.replace('.', ''), n
        offices.append(office(off, 'county', [cand(n, {'R': 'Republican', 'D': 'Democratic'}[p]) for n, p in cs], seats=seats, term='Four-year term', note=('Vote for up to three' if seats == 3 else None)))
    meas = [{'title': 'Laramie County — 1% sales and use tax renewal', 'area': None, 'options': ['For the tax', 'Against the tax'],
             'text': 'Shall the Laramie County Commissioners be authorized to renew a one percent (1%) sales and use tax within the county as authorized by W.S. 39-15-204; the revenue to be used as general revenue?'},
            {'title': 'Laramie County — lodging tax renewal', 'area': None, 'options': ['For the tax', 'Against the tax'],
             'text': 'Shall Laramie County be authorized to renew a lodging tax at a rate of two percent (2%) upon the sales price paid for sleeping accommodations for guests in hotels, motels, tourist courts, trailer parks, campgrounds, dude ranches, short-term condominiums and similar establishments?'}]
    ret = [{'court': 'Wyoming Supreme Court', 'judge': 'Robert C. Jarosh', 'area': None}, {'court': 'Wyoming Supreme Court', 'judge': 'Bridget Hill', 'area': None},
           {'court': 'First Judicial District Court, Judge A', 'judge': 'Robin S. Cooley', 'area': None}, {'court': 'First Judicial District Court, Judge B', 'judge': 'Nathaniel S. Hibben', 'area': None},
           {'court': 'Chancery Court', 'judge': 'Ben Burningham', 'area': None}]
    for r in ret: assert r['judge'].split()[-1].upper() in up, r
    return 'Laramie County', 'WY', offices, meas, ret, [
        {'label': 'Laramie County Clerk — 2026 General Election sample ballot (precinct 5-01; county-wide offices are the same in every precinct)', 'url': url},
        {'label': 'Laramie County Clerk — Elections & candidates', 'url': 'https://www.laramiecountywy.gov/County-Government/Elected-Officials/County-Clerk/Elections/Candidates'}], '2026-10-01'

BUILDERS = {'49035': salt_lake, '49005': cache, '49053': washington, '49049': utah, '49057': weber, '39049': franklin, '56021': laramie}

def main():
    want = sys.argv[1:] or list(BUILDERS)
    for fips in want:
        try:
            county, st, offices, meas, ret, sources, asof = BUILDERS[fips]()
            for s in sources: s.setdefault('kind', 'official')
            write(fips, {'county': county, 'state': st, 'asOf': asof, 'sources': sources, 'offices': offices, 'measures': meas, 'retention': ret})
        except Exception as e:
            print(fips, 'FAILED', repr(e)[:300], flush=True)

if __name__ == '__main__': main()
