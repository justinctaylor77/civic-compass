#!/usr/bin/env python3
"""
Build data/results/<ST>.json from the MIT Election Data + Science Lab (MEDSL)
precinct-level general-election returns for 2022 and 2024.

  Source repos (CC0 per the MEDSL Harvard Dataverse deposits):
    https://github.com/MEDSL/2022-elections-official
    https://github.com/MEDSL/2024-elections-official

Usage:  python3 scripts/build-results.py [ST ...]   (default: all states)
Downloads one state zip at a time into a temp dir, aggregates to
state / US-House-district / county level, writes compact JSON, deletes the zip.
Run offline-safe: the app only reads the JSON, never these upstream files.
"""
import sys, os, re, io, json, zipfile, urllib.request, datetime, tempfile, shutil, collections
import pandas as pd

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'results')
STATES = "AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY".split()
REPO = {2022: ('MEDSL/2022-elections-official', lambda s: f'2022-{s.lower()}-local-precinct-general.zip'),
        2024: ('MEDSL/2024-elections-official', lambda s: f'{s.lower()}24.zip')}
DATAVERSE = {2022: 'https://dataverse.harvard.edu/dataverse/medsl_election_returns',
             2024: 'https://dataverse.harvard.edu/dataverse/2024_precincts'}
REPO_URL = {y: f'https://github.com/{REPO[y][0]}' for y in REPO}

EXCLUDE = re.compile(r'STATE HOUSE|STATE SENATE|HOUSE OF REP|LEGISLAT|ASSEMBLY|DELEGATE|JUDGE|JUSTICE|COURT|RETENTION|RETAIN|SCHOOL|BOARD OF ED|EDUCATION|CITY|TOWN|VILLAGE|BOROUGH|MAYOR|MUNICIPAL|TOWNSHIP|PRECINCT|COMMITTEE|ELECTOR|WATER|FIRE|PARK|LIBRARY|CEMETERY|DRAINAGE|SANITARY|IRRIGATION|SPECIAL DISTRICT|HOSPITAL|CONSERVATION|SOIL|COLLEGE|UNIVERSITY|TRUSTEE|ALDER|WARD|SELECTMAN|BALLOTS|REGISTERED|VOTERS|OVERVOTE|UNDERVOTE|BLANK|SCATTER|STRAIGHT|PARTY|TURNOUT', re.I)
COUNTY_OFFICE = re.compile(r'^(?:COUNTY |SHERIFF|CORONER|CLERK|PROSECUTING|COMMISSIONER|ASSESSOR|AUDITOR|RECORDER|TREASURER|SURVEYOR|ENGINEER|DISTRICT ATTORNEY|REGISTER OF|PROBATE|SUPERVISOR|[A-Z .]+ COUNTY (?:COMMISSION|COUNCIL|SHERIFF|CLERK|AUDITOR))', re.I)
COUNTY_EXCL = re.compile(r'COURT|JUDGE|JUSTICE|SCHOOL|ENGINEER|DRAIN|WATER|SOIL|PARK|LIBRARY|HOSPITAL|FIRE|COMMITTEE', re.I)
MEASURE_WORDS = {'YES', 'NO', 'FOR', 'AGAINST', 'APPROVE', 'REJECT', 'APPROVED', 'REJECTED'}
TURNOUT_BALLOTS = re.compile(r'^(BALLOTS CAST|BALLOTS COUNTED|TOTAL BALLOTS CAST|BALLOTS CAST TOTAL|TURNOUT)$', re.I)
TURNOUT_REG = re.compile(r'^(REGISTERED VOTERS|TOTAL REGISTERED VOTERS)$', re.I)
STATEWIDE_RULE = 0.6   # appears in >=60% of the state's counties => statewide contest

def title(name):
    n = str(name).strip()
    if n.upper() in MEASURE_WORDS: return n.title()
    if n != n.upper(): return n
    out = []
    for w in n.split(' '):
        lw = w.lower()
        if re.match(r"^(mc|mac)[a-z]{2,}", lw) and lw not in ('mack', 'macon'):
            w2 = lw[:2].title() + lw[2:].title() if lw.startswith('mc') else lw.title()
        elif "'" in lw: w2 = "'".join(p.title() for p in lw.split("'"))
        elif '-' in lw: w2 = '-'.join(p.title() for p in lw.split('-'))
        elif re.match(r'^(ii|iii|iv|jr\.?|sr\.?)$', lw): w2 = lw.upper() if lw.startswith('i') else lw.title()
        elif len(lw) == 1 or (len(lw) == 2 and lw.endswith('.')): w2 = lw.upper()
        else: w2 = lw.title()
        out.append(w2)
    return ' '.join(out)

def party_of(row):
    d = str(row.get('party_detailed') or row.get('party_simplified') or '').strip().upper()
    s = str(row.get('party_simplified') or '').strip().upper()
    if d in ('', 'NAN'): d = s
    if d in ('DEMOCRAT', 'DEMOCRATIC'): return 'Democratic'
    if d == 'REPUBLICAN': return 'Republican'
    if d in ('NAN', '', 'NONPARTISAN') : return 'Nonpartisan' if d == 'NONPARTISAN' else ''
    return d.title()[:32]

def office_label(o):
    o = re.sub(r'\s+', ' ', str(o)).strip()
    m = {'US PRESIDENT': 'President of the United States', 'US SENATE': 'U.S. Senate', 'US HOUSE': 'U.S. House'}
    if o.upper() in m: return m[o.upper()]
    return title(o) if o == o.upper() else o

def fetch_zip(year, st, tmp):
    repo, fn = REPO[year]
    name = fn(st)
    url = f'https://raw.githubusercontent.com/{repo}/main/individual_states/{name}'
    path = os.path.join(tmp, name)
    req = urllib.request.Request(url, headers={'User-Agent': 'civic-compass-build/6'})
    with urllib.request.urlopen(req, timeout=300) as r, open(path, 'wb') as f: shutil.copyfileobj(r, f)
    return url, path

USECOLS = ['precinct', 'district', 'office', 'writein', 'party_detailed', 'party_simplified', 'candidate', 'dataverse', 'mode', 'votes',
           'county_name', 'county_fips', 'jurisdiction_name', 'special', 'magnitude', 'stage', 'date']

def load_rows(zpath):
    z = zipfile.ZipFile(zpath)
    names = [n for n in z.namelist() if n.lower().endswith('.csv') and not n.startswith('__')]
    keep = []
    for n in names:
        with z.open(n) as f:
            for ch in pd.read_csv(f, dtype=str, usecols=lambda c: c in USECOLS, chunksize=400000, low_memory=False, on_bad_lines='skip'):
                for c in USECOLS:
                    if c not in ch: ch[c] = None
                if 'stage' in ch and ch['stage'].notna().any():
                    ch = ch[ch['stage'].fillna('GEN').str.upper().eq('GEN')]
                o = ch['office'].fillna('')
                dv = ch['dataverse'].fillna('')
                fed = dv.isin(['PRESIDENT', 'SENATE', 'HOUSE']) | o.str.upper().isin(['US PRESIDENT', 'US SENATE', 'US HOUSE'])
                turn = o.str.match(TURNOUT_BALLOTS) | o.str.match(TURNOUT_REG)
                cand = ~o.str.contains(EXCLUDE) | fed | turn
                keep.append(ch[cand | fed | turn])
    d = pd.concat(keep, ignore_index=True)
    d['votes'] = pd.to_numeric(d['votes'].replace('*', None), errors='coerce')
    d = d[d['votes'].notna()]
    d['votes'] = d['votes'].astype('int64')
    d['office'] = d['office'].fillna('').str.strip()
    d['mode'] = d['mode'].fillna('TOTAL').str.upper()
    d['is_total'] = d['mode'].isin(['TOTAL', 'ALL', 'ALL VOTES'])
    d['special'] = d['special'].fillna('FALSE').str.upper().eq('TRUE')
    d['writein'] = d['writein'].fillna('FALSE').str.upper().eq('TRUE')
    d['county_fips'] = d['county_fips'].fillna('').str.replace(r'\.0$', '', regex=True).str.zfill(5).where(d['county_fips'].notna(), '')
    d['county_name'] = d['county_name'].fillna(d['jurisdiction_name']).fillna('').str.strip()
    d['district'] = d['district'].fillna('').str.strip()
    return d

def norm_district(x):
    x = str(x).strip().upper()
    if x in ('', 'STATEWIDE', 'NAN', 'NONE'): return ''
    m = re.search(r'(\d+)', x)
    if m: return str(int(m.group(1)))
    if x in ('AT LARGE', 'AT-LARGE', 'AL'): return '0'
    return x

def agg_contests(d, by_county=False):
    """Return {key: contest} aggregated. key=(office,district,special[,county_fips])"""
    keys = ['office', 'district', 'special', 'candidate', 'party', 'writein'] + (['county_fips'] if by_county else [])
    g = d.groupby(keys + ['is_total'], dropna=False)['votes'].sum().reset_index()
    tot = g[g.is_total].drop(columns='is_total'); oth = g[~g.is_total].drop(columns='is_total')
    # use TOTAL rows when the contest has any; otherwise sum the split modes
    ck = ['office', 'district', 'special'] + (['county_fips'] if by_county else [])
    has_total = set(map(tuple, tot[ck].drop_duplicates().values.tolist()))
    oth = oth[~oth[ck].apply(tuple, axis=1).isin(has_total)]
    allg = pd.concat([tot, oth], ignore_index=True)
    allg = allg.groupby(keys, dropna=False)['votes'].sum().reset_index()
    return allg, ck

def build_contests(allg, ck, magn):
    res = {}
    for key, grp in allg.groupby(ck, dropna=False):
        key = key if isinstance(key, tuple) else (key,)
        grp = grp[grp.votes > 0] if (grp.votes > 0).any() else grp
        # merge write-ins & duplicates of same candidate
        rows = {}
        for _, r in grp.iterrows():
            cu = str(r['candidate']).upper().strip()
            if re.match(r'^(OVER ?VOTES?|UNDER ?VOTES?|BLANK|NOT ASSIGNED|NO VOTE|TOTAL)', cu): continue
            nm = 'Write-in candidates' if (r['writein'] or re.match(r'^(WRITE.?IN|SCATTERING)', cu)) else title(r['candidate'])
            pk = (nm, r['party'] if nm != 'Write-in candidates' else '')
            rows[pk] = rows.get(pk, 0) + int(r['votes'])
        if any(n.upper() in MEASURE_WORDS for (n, p) in rows): rows = {k: v for k, v in rows.items() if k[0] != 'Write-in candidates'}
        cands = sorted(([n, p, v] for (n, p), v in rows.items()), key=lambda x: -x[2])
        total = sum(c[2] for c in cands)
        if total <= 0 or len(cands) < 1: continue
        res[key] = (cands, total)
    return res

def shrink(cands, total, measure):
    """keep every candidate >=1% or top 6; fold the rest in 'Other candidates'."""
    if measure or len(cands) <= 6: return cands, 0, 0
    keep, rest = [], []
    for i, c in enumerate(cands):
        (keep if (i < 6 and (c[2] / total >= 0.01 or i < 2)) else rest).append(c)
    if rest:
        return keep, len(rest), sum(c[2] for c in rest)
    return keep, 0, 0

def is_measure(cands):
    names = {c[0].upper() for c in cands}
    return len(names) <= 3 and bool(names & MEASURE_WORDS)

def contest_obj(office, district, special, cands, total, magnitude=1, county=False):
    measure = is_measure(cands)
    cands2, nmore, vmore = shrink(cands, total, measure)
    o = {'o': office_label(office)}
    if district: o['d'] = district
    if special: o['sp'] = 1
    if measure: o['m'] = 1
    o['c'] = cands2
    o['t'] = total
    if nmore: o['more'] = [nmore, vmore]
    if magnitude and magnitude > 1 and not measure: o['n'] = magnitude
    return o

def process_state(st, year, tmp):
    url, zp = fetch_zip(year, st, tmp)
    try:
        d = load_rows(zp)
    finally:
        try: os.remove(zp)
        except Exception: pass
    d['party'] = d.apply(party_of, axis=1)
    mag = {}
    if 'magnitude' in d:
        mm = pd.to_numeric(d['magnitude'], errors='coerce').fillna(1)
        d['mag'] = mm
    else: d['mag'] = 1
    U = d['office'].str.upper()
    turn_b = d[U.str.match(TURNOUT_BALLOTS)]
    turn_r = d[U.str.match(TURNOUT_REG)]
    d = d[~(U.str.match(TURNOUT_BALLOTS) | U.str.match(TURNOUT_REG))].copy()
    U = d['office'].str.upper()
    d['district'] = d['district'].map(norm_district)
    fed = d['dataverse'].fillna('').isin(['PRESIDENT', 'SENATE', 'HOUSE']) | U.isin(['US PRESIDENT', 'US SENATE', 'US HOUSE'])
    house = U.eq('US HOUSE')
    president = U.eq('US PRESIDENT') | d['dataverse'].fillna('').eq('PRESIDENT')
    senate = U.eq('US SENATE')
    counties = d[d.county_fips != '']['county_fips'].nunique()
    # statewide-ness: contest present in >= 60% of counties
    pres = d[~(house)]
    cc = pres.groupby(['office', 'district', 'special'])['county_fips'].nunique()
    state_keys = set(cc[cc >= max(1, STATEWIDE_RULE * counties)].index) if counties else set()
    mk = list(zip(d['office'], d['district'], d['special']))
    d['is_state'] = pd.Series(mk, index=d.index).isin(state_keys) & ~house & ~d['office'].str.upper().str.match(COUNTY_OFFICE)
    # keep federal + statewide + county-scope
    cty_mask = (~d['is_state']) & (~house) & (~fed) & U.str.contains(COUNTY_OFFICE) & ~U.str.contains(COUNTY_EXCL)
    # local measures labelled with COUNTY / BOND / TAX
    cty_mask = cty_mask | ((~d['is_state']) & (~house) & (~fed) & U.str.contains(r'COUNTY|BOND|LEVY|TAX|PROPOSITION|MEASURE|QUESTION|ISSUE|JAIL') & ~U.str.contains(r'SCHOOL|CITY|TOWN|VILLAGE|DISTRICT COURT'))
    out = {'asOf': None, 'statewide': [], 'house': [], 'counties': {}}
    # --- statewide + senate + president
    S = d[d['is_state'] | senate | president]
    S = S[~house[S.index]]
    allg, ck = agg_contests(S)
    cons = build_contests(allg, ck, None)
    magof = d.groupby(['office', 'district', 'special'])['mag'].max()
    for (office, district, special), (cands, total) in cons.items():
        out['statewide'].append(contest_obj(office, district, special, cands, total, int(magof.get((office, district, special), 1))))
    # --- house
    H = d[house]
    if len(H):
        allg, ck = agg_contests(H)
        for (office, district, special), (cands, total) in build_contests(allg, ck, None).items():
            out['house'].append(contest_obj(office, district, special, cands, total))
    # --- counties
    names = d[d.county_fips != ''].groupby('county_fips')['county_name'].agg(lambda s: s.mode().iat[0] if len(s.mode()) else '')
    big3 = (president | senate | U.eq('GOVERNOR')) | (d['is_state'] & d.apply(lambda r: False, axis=1) if False else False)
    meas = d['is_state'] & d.groupby(['office', 'district', 'special'])['candidate'].transform(lambda s: s.str.upper().isin(MEASURE_WORDS).mean() > 0.5)
    cm = d[(big3 | meas | cty_mask) & (d.county_fips != '')]
    if len(cm):
        allg, ck = agg_contests(cm, by_county=True)
        for (office, district, special, fips), (cands, total) in build_contests(allg, ck, None).items():
            if len(cands) < 2: continue
            c = out['counties'].setdefault(fips, {'name': title(names.get(fips, '')), 'contests': []})
            c['contests'].append(contest_obj(office, district, special, cands, total))
    # --- turnout
    def tsum(df, by):
        if not len(df): return {}
        g = df.groupby(by + ['is_total'])['votes'].sum().reset_index()
        t = g[g.is_total].groupby(by)['votes'].sum()
        o = g[~g.is_total].groupby(by)['votes'].sum()
        return t.combine_first(o).to_dict()
    tb = tsum(turn_b[turn_b.county_fips != ''], ['county_fips']); tr = tsum(turn_r[turn_r.county_fips != ''], ['county_fips'])
    for fips, c in out['counties'].items():
        if fips in tb: c['ballots'] = int(tb[fips])
        if fips in tr: c['registered'] = int(tr[fips])
    if tb: out['ballots'] = int(sum(tb.values()))
    if tr: out['registered'] = int(sum(tr.values()))
    # fallback "votes in the top-of-ticket contest" for turnout context
    top = None
    for c in out['statewide']:
        if c['o'].startswith('President') and not c.get('sp'): top = c; break
    if top is None:
        for c in out['statewide']:
            if c['o'] == 'Governor': top = c; break
    if top: out['topVotes'] = [top['o'], top['t']]
    out['source'] = {'file': url, 'repo': REPO_URL[year], 'dataverse': DATAVERSE[year]}
    for k in ('statewide', 'house'):
        out[k].sort(key=lambda c: (c['o'], int(c['d']) if str(c.get('d', '')).isdigit() else 0))
    for c in out['counties'].values(): c['contests'].sort(key=lambda x: (x['o'], x.get('d', '')))
    return out

def main():
    sts = [s.upper() for s in sys.argv[1:]] or STATES
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='medsl-')
    meta = {}
    try:
        for st in sts:
            doc = {'st': st, 'built': datetime.date.today().isoformat(), 'years': {}}
            for y in (2024, 2022):
                try:
                    doc['years'][str(y)] = process_state(st, y, tmp)
                    print(st, y, 'statewide', len(doc['years'][str(y)]['statewide']), 'house', len(doc['years'][str(y)]['house']), 'counties', len(doc['years'][str(y)]['counties']), flush=True)
                except Exception as e:
                    print(st, y, 'FAILED', repr(e)[:200], flush=True)
            with open(os.path.join(OUT, f'{st}.json'), 'w') as f: json.dump(doc, f, separators=(',', ':'))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__': main()
