// Resolve ZIP / "City, ST" / street address -> state, county, city and district numbers using
// free no-key services: zippopotam.us (ZIP/city centroid) and the U.S. Census Geocoder (districts).
const { cached, fetchJSON } = require('./util');
const { STATES, abbrOf } = require('./states');
const CENSUS = 'https://geocoding.geo.census.gov/geocoder/geographies';

function parseQuery(raw) {
  const q = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!q) return null;
  const zip = q.match(/^(\d{5})(?:-\d{4})?$/);
  if (zip) return { type: 'zip', zip: zip[1] };
  if (/^\d+\s+\S+/.test(q) && /[a-z]/i.test(q) && q.length > 8) return { type: 'address', address: q };
  // City, State  |  City State
  let city, st;
  if (q.includes(',')) { const parts = q.split(',').map((s) => s.trim()); city = parts[0]; st = abbrOf(parts[parts.length - 1].replace(/\s+\d{5}.*$/, '')); }
  else {
    const toks = q.split(' ');
    for (const n of [3, 2, 1]) { // try multi-word state names first
      if (toks.length > n) { const a = abbrOf(toks.slice(-n).join(' ')); if (a) { st = a; city = toks.slice(0, -n).join(' '); break; } }
    }
  }
  if (city && st) return { type: 'city', city, state: st };
  return { type: 'unknown', raw: q };
}

const first = (g, re) => { const k = Object.keys(g).find((x) => re.test(x)); return k ? g[k][0] : null; };
function fromGeographies(g) {
  const state = first(g, /^States$/);
  const county = first(g, /^Counties$/);
  const place = first(g, /^Incorporated Places$/);
  const cdo = first(g, /Congressional Districts?$/);
  const up = first(g, /State Legislative Districts - Upper/);
  const lo = first(g, /State Legislative Districts - Lower/);
  const sch = first(g, /(Unified|Elementary|Secondary) School Districts/);
  const out = { state: state && { fips: state.GEOID, name: state.NAME, abbr: abbrOf(state.NAME) } };
  if (county) out.county = { name: county.NAME, fips: county.GEOID };
  if (place) out.place = { name: place.BASENAME, full: place.NAME, geoid: place.GEOID };
  if (cdo) {
    const atLarge = /at large/i.test(cdo.NAME) || /^0+$/.test(String(cdo.BASENAME)) || /at large/i.test(String(cdo.BASENAME));
    out.cd = { label: cdo.NAME, number: atLarge ? 0 : parseInt(cdo.BASENAME, 10), atLarge, vintage: Object.keys(g).find((x) => /Congressional/.test(x)) };
  }
  if (up) out.sldu = { label: up.NAME, base: String(up.BASENAME) };
  if (lo) out.sldl = { label: lo.NAME, base: String(lo.BASENAME) };
  if (sch) out.school = { name: sch.NAME };
  return out;
}

async function censusByCoords(lat, lon) {
  const url = `${CENSUS}/coordinates?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`;
  const j = await fetchJSON(url, { timeoutMs: 15000, retries: 2 });
  return fromGeographies(j.result.geographies);
}
async function censusByAddress(address) {
  const url = `${CENSUS}/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`;
  const j = await fetchJSON(url, { timeoutMs: 20000, retries: 2 });
  const m = (j.result.addressMatches || [])[0];
  if (!m) return null;
  return { ...fromGeographies(m.geographies), matched: m.matchedAddress, lat: m.coordinates.y, lon: m.coordinates.x };
}

async function resolve(raw) {
  const p = parseQuery(raw);
  if (!p) throw Object.assign(new Error('Please type a ZIP code, a city and state, or a street address.'), { status: 400 });
  if (p.type === 'unknown') throw Object.assign(new Error('We could not understand that. Try a 5-digit ZIP code (like 84101), or a city and state (like "Columbus, OH").'), { status: 400 });
  return cached('geo:' + JSON.stringify(p), 6 * 3600e3, async () => {
    const notes = [];
    let geo, lat, lon, zip, cityName, precision;
    if (p.type === 'address') {
      geo = await censusByAddress(p.address);
      if (!geo) throw Object.assign(new Error('The Census address lookup could not find that street address. Check the spelling (include city and state), or try just your ZIP code.'), { status: 404 });
      lat = geo.lat; lon = geo.lon; precision = 'address';
      cityName = geo.place && geo.place.name;
    } else {
      let z;
      if (p.type === 'zip') {
        try { z = await fetchJSON(`https://api.zippopotam.us/us/${p.zip}`); } catch (e) { throw Object.assign(new Error(`We could not find ZIP code ${p.zip}. Please check the number.`), { status: 404 }); }
      } else {
        // City center via OpenStreetMap Nominatim (free, no key); fall back to a ZIP-code centroid.
        try {
          const n = await fetchJSON(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(p.city)}&state=${encodeURIComponent(STATES[p.state])}&country=us&format=json&limit=1`, { timeoutMs: 10000 });
          if (n[0]) z = { places: [{ latitude: n[0].lat, longitude: n[0].lon, 'place name': p.city }] };
        } catch (e) { /* fall through */ }
        if (!z) {
          try { z = await fetchJSON(`https://api.zippopotam.us/us/${p.state.toLowerCase()}/${encodeURIComponent(p.city.toLowerCase())}`); }
          catch (e) { throw Object.assign(new Error(`We could not find "${p.city}, ${p.state}". Check the spelling or try a ZIP code.`), { status: 404 }); }
        }
      }
      const pl = z.places[0];
      lat = Number(pl.latitude); lon = Number(pl.longitude);
      zip = p.zip || null;
      cityName = p.type === 'city' ? p.city : pl['place name'];
      geo = await censusByCoords(lat, lon);
      precision = p.type === 'zip' ? 'zip' : 'city';
      if (p.type === 'city') notes.push(`Races shown are for the center of ${p.city}. Large cities can contain several districts, so for the exact ballot please type your ZIP code or street address.`);
      else notes.push('A ZIP code can cross city, county, and district lines. These results use the center of the ZIP code. For the exact list for your home, type your full street address.');
    }
    if (!geo.state || !geo.state.abbr) throw Object.assign(new Error('That location did not match a U.S. state.'), { status: 404 });
    return { input: String(raw).trim(), type: p.type, precision, zip: zip || null, cityName, lat, lon, ...geo, stateName: STATES[geo.state.abbr], notes };
  });
}
module.exports = { resolve, parseQuery };
