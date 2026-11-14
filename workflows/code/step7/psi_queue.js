const s = $('Run Settings').first().json; const run = String(s.run || 'pilot'); const max = Number(s.max_pages) || 300;
// done = the page's latest row is a PageSpeed result or a Lighthouse runtime error (the analysis uses the latest row);
// API or network errors are tried again on the next run
const latest = {};
for (const i of $('Get Done PSI').all()) { const r = i.json; if (!r.url_norm) continue; const q = latest[r.url_norm]; if (!q || String(r.fetched_at) >= String(q.fetched_at)) latest[r.url_norm] = r; }
const done = new Set(Object.values(latest).filter(r => r.psi_status === 'ok' || r.psi_status === 'runtime_error').map(r => r.url_norm));
// social media pages are left out of the study's page measures (websites only), so they get no PageSpeed run
const SOCIAL = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:youtube\.com|youtu\.be|tiktok\.com|linkedin\.com|reddit\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|quora\.com|medium\.com|pinterest\.com)(?:[\/?#]|$)/i;
const seen = new Set(); const out = [];
for (const i of $('Get Pages').all()) {
  const p = i.json;
  if (!p.url_norm || p.run !== run || p.status !== 'measured' || done.has(p.url_norm) || seen.has(p.url_norm) || SOCIAL.test(p.url_norm)) continue;
  seen.add(p.url_norm); out.push({ json: { run, url_norm: p.url_norm, url: p.final_url || p.url } });
  if (out.length >= max) break;
}
// nothing left: one marker item, so the run still releases its lock
return out.length ? out : [{ json: { run, none: true } }];
