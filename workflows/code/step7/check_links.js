// Broken-link check for the links in each page's main content.
// broken = final answer 404, 410 or 5xx, or no answer because the domain does not resolve or refuses the connection;
// not checked = 401, 403, 429, other 4xx, timeouts (sites that refuse automated requests). Redirects are followed.
const helpers = this.helpers;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const t0 = Date.now(); const BUDGET_MS = 150000;
function resolve(base, loc) {
  if (/^https?:/i.test(loc)) return loc;
  const m = String(base).match(/^(https?:)\/\/([^\/?#]+)([^?#]*)/i); if (!m) return loc;
  if (loc.startsWith('//')) return m[1] + loc;
  if (loc.startsWith('/')) return m[1] + '//' + m[2] + loc;
  return m[1] + '//' + m[2] + m[3].replace(/[^\/]*$/, '') + loc;
}
async function status(url, method) {
  let cur = url;
  for (let i = 0; i < 6; i++) {
    const r = await helpers.httpRequest({ method, url: cur, headers: { 'User-Agent': UA, 'Accept': '*/*' }, returnFullResponse: true, ignoreHttpStatusErrors: true, disableFollowRedirect: true, timeout: 8000, encoding: 'text' });
    const loc = r.headers && (r.headers.location || r.headers.Location);
    if (r.statusCode >= 300 && r.statusCode < 400 && loc) { cur = resolve(cur, loc); continue; }
    return r.statusCode;
  }
  return 310;
}
async function check(url) {
  if (Date.now() - t0 > BUDGET_MS) return 'unchecked';
  try {
    let s = await status(url, 'HEAD');
    if ([400, 403, 404, 405, 406, 429, 500, 501, 503].includes(s)) s = await status(url, 'GET');
    if (s >= 200 && s < 400) return 'ok';
    if (s === 404 || s === 410 || s >= 500) return 'broken';
    return 'unchecked';
  } catch (e) {
    const msg = String((e && (e.code || e.message)) || e);
    return /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|getaddrinfo|CERT|certificate/i.test(msg) ? 'broken' : 'unchecked';
  }
}
const items = $input.all().map(i => i.json);
const urls = [...new Set(items.flatMap(it => (it.links || []).map(l => l.u)))];
const result = {}; let k = 0;
async function worker() { while (k < urls.length) { const u = urls[k++]; result[u] = await check(u); } }
await Promise.all(Array.from({ length: 24 }, worker));
return items.map(it => {
  const ls = it.links || []; const c = { ok: 0, broken: 0, unchecked: 0, bi: 0, be: 0 };
  for (const l of ls) { const r = result[l.u] || 'unchecked'; c[r]++; if (r === 'broken') { if (l.internal) c.bi++; else c.be++; } }
  const checked = c.ok + c.broken;
  const page = Object.assign({}, it.page || {}, { links_checked: checked, links_broken: c.broken, links_broken_internal: c.bi, links_broken_external: c.be, links_unchecked: c.unchecked, broken_share: checked ? c.broken / checked : null });
  const out = Object.assign({}, it, { page }); delete out.links;
  return { json: out };
});
