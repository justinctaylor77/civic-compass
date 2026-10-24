// Tiny TTL cache (with in-flight de-dupe + stale fallback) and fetch helpers.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 CivicCompass/0.1 (nonpartisan voter research; contact via site)';
const store = new Map();
async function cached(key, ttlMs, fn) {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.value !== undefined && now - hit.t < ttlMs) return hit.value;
  if (hit && hit.pending) return hit.pending;
  const pending = (async () => {
    try {
      const value = await fn();
      store.set(key, { t: Date.now(), value });
      return value;
    } catch (e) {
      if (hit && hit.value !== undefined) { store.set(key, { t: hit.t, value: hit.value }); return hit.value; }
      store.delete(key);
      throw e;
    }
  })();
  store.set(key, { ...(hit || {}), pending });
  return pending;
}
// Be gentle with ballotpedia.org: at most one request every ~400ms.
let bpNext = 0;
async function politeWait(url) {
  if (!/^https:\/\/ballotpedia\.org/.test(url)) return;
  const now = Date.now(); const at = Math.max(now, bpNext); bpNext = at + 400;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}
async function fetchText(url, { timeoutMs = 12000, headers = {}, retries = 1 } = {}) {
  let lastErr;
  await politeWait(url);
  for (let i = 0; i <= retries; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*', ...headers }, signal: ctl.signal, redirect: 'follow' });
      if (!r.ok) { const err = new Error(`HTTP ${r.status}`); err.status = r.status; throw err; }
      const body = await r.text();
      if (r.status === 202 && !body) { const err = new Error('HTTP 202 (bot challenge)'); err.status = 429; throw err; }
      return body;
    } catch (e) { lastErr = e; if (e.status && e.status < 500) break; }
    finally { clearTimeout(timer); }
  }
  throw lastErr;
}
const fetchJSON = async (url, opts) => JSON.parse(await fetchText(url, opts));
// Never leak API keys in logs/errors.
const scrub = (s) => String(s || '').replace(/(api_key|key)=[^&\s]+/gi, '$1=***');
module.exports = { cached, fetchText, fetchJSON, scrub, UA };
