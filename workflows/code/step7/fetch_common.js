const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
function resolveUrl(base, href) {
  href = String(href || '').trim();
  if (!href) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  const m = String(base).match(/^(https?:)\/\/([^\/?#]+)([^?#]*)/i);
  if (!m) return href;
  if (href.startsWith('//')) return m[1] + href;
  if (href.startsWith('/')) return m[1] + '//' + m[2] + href;
  if (href.startsWith('?') || href.startsWith('#')) return m[1] + '//' + m[2] + m[3] + href;
  const dir = m[3].replace(/[^\/]*$/, '') || '/';
  const parts = (dir + href).split('/'); const out = [];
  for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }
  return m[1] + '//' + m[2] + out.join('/').replace(/^([^\/])/, '/$1');
}
const asText = b => typeof b === 'string' ? b : (b && typeof b === 'object' && b.type === 'Buffer' ? Buffer.from(b.data).toString('utf8') : (Buffer.isBuffer(b) ? b.toString('utf8') : (b == null ? '' : JSON.stringify(b))));
async function getOnce(helpers, url, headers, timeout) {
  return helpers.httpRequest({ method: 'GET', url, headers: Object.assign({ 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, headers || {}), returnFullResponse: true, ignoreHttpStatusErrors: true, disableFollowRedirect: true, timeout: timeout || 20000, encoding: 'text' });
}
// GET with redirects followed by hand (up to 5), so the final address and the time of the final request are known
async function fetchPage(helpers, url, headers, timeout) {
  let cur = url; let redirects = 0; const t0 = Date.now();
  for (let i = 0; i < 6; i++) {
    const t = Date.now();
    try {
      const r = await getOnce(helpers, cur, Object.assign({ 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }, headers || {}), timeout);
      const ms = Date.now() - t; const h = r.headers || {}; const loc = h.location || h.Location;
      if (r.statusCode >= 300 && r.statusCode < 400 && loc) { cur = resolveUrl(cur, loc); redirects++; continue; }
      return { status: r.statusCode, final_url: cur, redirects, ms, total_ms: Date.now() - t0, ctype: String(h['content-type'] || ''), body: asText(r.body) };
    } catch (e) { return { status: 0, final_url: cur, redirects, ms: Date.now() - t, error: String(e.message || e).slice(0, 200), body: '' }; }
  }
  return { status: 0, final_url: cur, redirects, error: 'too many redirects', body: '' };
}
// markdown version: a .md copy of the address, or a markdown reply to Accept: text/markdown ('yes', 'no', or 'unknown' when the site refused the request)
async function mdChecks(helpers, finalUrl) {
  const res = { md_url: 'unknown', md_accept: 'unknown' };
  const base = String(finalUrl).replace(/[?#].*$/, '');
  if (!/\.md$/i.test(base)) {
    const mdUrl = base.replace(/\/+$/, '') + '.md';
    const r = await fetchPage(helpers, mdUrl, { 'Accept': 'text/markdown,text/plain;q=0.9,*/*;q=0.5' }, 10000);
    const head = String(r.body || '').slice(0, 600).toLowerCase();
    if (r.status === 200 && !/<html|<!doctype|<head|<body/.test(head) && String(r.body).trim().length > 100 && (/markdown|text\/plain/i.test(r.ctype) || /^#|\n#|\]\(/.test(r.body.slice(0, 3000)))) res.md_url = 'yes';
    else if (r.status === 404 || r.status === 410 || r.status === 200 || (r.status >= 300 && r.status < 500 && r.status !== 403 && r.status !== 429 && r.status !== 401)) res.md_url = 'no';
  }
  const a = await fetchPage(helpers, finalUrl, { 'Accept': 'text/markdown' }, 10000);
  if (a.status === 200 && /markdown/i.test(a.ctype)) res.md_accept = 'yes';
  else if (a.status === 200 || a.status === 404 || a.status === 406 || a.status === 415) res.md_accept = 'no';
  return res;
}
function roughWords(html) {
  const t = String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<[^>]+>/g, ' ');
  return (t.match(/[A-Za-zÀ-ɏ]{2,}/g) || []).length;
}
const CHALLENGE = /<title[^>]*>\s*(just a moment|attention required|access denied|are you a robot|security check|pardon our interruption|request rejected|403 forbidden|robot or human)/i;
