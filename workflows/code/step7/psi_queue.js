const s = $('Run Settings').first().json; const run = String(s.run || 'pilot'); const max = Number(s.max_pages) || 300;
// done = a PageSpeed result or a Lighthouse runtime error; API or network errors are tried again on the next run
const done = new Set($('Get Done PSI').all().filter(i => i.json.psi_status === 'ok' || i.json.psi_status === 'runtime_error').map(i => i.json.url_norm).filter(Boolean));
const seen = new Set(); const out = [];
for (const i of $('Get Pages').all()) {
  const p = i.json;
  if (!p.url_norm || p.run !== run || p.status !== 'measured' || done.has(p.url_norm) || seen.has(p.url_norm)) continue;
  seen.add(p.url_norm); out.push({ json: { run, url_norm: p.url_norm, url: p.final_url || p.url } });
  if (out.length >= max) break;
}
return out;
