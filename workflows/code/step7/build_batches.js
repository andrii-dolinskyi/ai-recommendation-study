const s = $('Run Settings').first().json;
const run = String(s.run || 'pilot'); const brandRun = String(s.brand_run || run);
const asOf = String(s.as_of || '') || new Date().toISOString().slice(0, 10);
const max = Number(s.max_pages) || 200; const size = Number(s.batch_size) || 20;
// a page counts as done when its latest row is measured, or failed for a reason a retry will not fix
const retry = s.retry_failed === true || s.retry_failed === 'true';
const TRANSIENT = /too many requests|timeout|timed out|ECONN|socket hang up|status_5\d\d|status_0|no content/i;
const latest = {};
for (const i of $('Get Done Pages').all()) { const r = i.json; if (!r.url_norm) continue; const p = latest[r.url_norm]; if (!p || String(r.measured_at) > String(p.measured_at)) latest[r.url_norm] = r; }
// pages that failed through the scraper before all three tries existed get the missing tries now
const OLD_FALLBACK = r => { const f = String(r.fail_reason || ''); return /^fallback_failed/.test(f) && !/not supported/i.test(f) && (f.match(/;/g) || []).length < 2; };
const done = new Set(Object.values(latest).filter(r => !(retry && r.status === 'failed' && (TRANSIENT.test(String(r.fail_reason || '')) || OLD_FALLBACK(r)))).map(r => r.url_norm));
// left out of page measures: video pages, social media pages (the study measures websites; decided after batch full2),
// and Google search or shopping result pages (not a page of a site)
const SKIP = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|dailymotion\.com|linkedin\.com|reddit\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|quora\.com|medium\.com|pinterest\.com)(?:[\/?#]|$)|^https?:\/\/(?:www\.)?google\.[a-z.]+\/(?:search|shopping|aclk)/i;
function clean(u) {
  let x = String(u || '').trim().replace(/#.*$/, '');
  const q = x.indexOf('?');
  if (q >= 0) { const kept = x.slice(q + 1).split('&').filter(p => p && !/^(utm_[a-z_]+|gclid|fbclid|msclkid|srsltid|ref_src|mc_[a-z]+)=/i.test(p)); x = x.slice(0, q) + (kept.length ? '?' + kept.join('&') : ''); }
  return x;
}
const pages = {};
for (const i of $('Get Links').all()) {
  const l = i.json;
  if (!l.url_norm || l.run !== run || !(l.recommended === true || l.recommended === 'true')) continue;
  if (!/^https?:\/\//i.test(l.url) || SKIP.test(l.url)) continue;
  const p = pages[l.url_norm] || (pages[l.url_norm] = { url_norm: l.url_norm, url: clean(l.url), inds: new Set(), reach: 0 });
  p.inds.add(Number(l.industry_id)); p.reach++;
}
// shard 'k/n' splits the queue so n runs can work side by side (each takes the pages whose address hash falls in its share)
const [sk, sn] = String(s.shard || '0/1').split('/').map(Number);
const hash = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const todo = Object.values(pages).filter(p => !done.has(p.url_norm) && (!(sn > 1) || hash(p.url_norm) % sn === sk)).sort((a, b) => a.url_norm < b.url_norm ? -1 : 1).slice(0, max);
const out = [];
for (let k = 0; k < todo.length; k += size) out.push({ json: { run, brand_run: brandRun, as_of: asOf, pages: todo.slice(k, k + size).map(p => ({ url_norm: p.url_norm, url: p.url, industry_ids: [...p.inds].sort((a, b) => a - b).join('|'), reach: p.reach })) } });
return out;
