const langOf = h => ((String(h).slice(0, 5000).match(/<html[^>]*\slang=["']?([A-Za-z-]+)/i) || [])[1] || '');
const helpers = this.helpers;
const job = $input.first().json; const pages = job.pages || [];
async function one(p) {
  const base = { run: job.run, brand_run: job.brand_run, as_of: job.as_of, url_norm: p.url_norm, url: p.url, industry_ids: p.industry_ids, reach: p.reach };
  const r = await fetchPage(helpers, p.url);
  const out = Object.assign({}, base, { final_url: r.final_url, redirects: r.redirects, http_status: r.status, direct_error: r.error || '' });
  if (r.status === 200 && r.ctype && !/html|xml/i.test(r.ctype)) return Object.assign(out, { kind: 'failed', html_source: 'direct', fail_reason: 'not_html: ' + r.ctype.slice(0, 60) });
  if (r.status === 404 || r.status === 410) return Object.assign(out, { kind: 'failed', html_source: 'direct', fail_reason: 'http_' + r.status });
  let why = '';
  if (r.status !== 200) why = r.status ? 'http_' + r.status : 'error';
  else if (CHALLENGE.test(r.body.slice(0, 5000))) why = 'challenge';
  else if (roughWords(r.body) < 150) why = 'thin';
  // a site that sent this server to another language version (by its location) is fetched again from the United States
  else if (r.redirects > 0 && /^(?!en\b)[a-z]{2}\b/i.test(langOf(r.body))) why = 'geo';
  if (why) return Object.assign(out, { kind: 'fallback', fallback_reason: why });
  const md = await mdChecks(helpers, r.final_url);
  return Object.assign(out, md, { kind: 'ok', html_source: 'direct', response_time_s: r.ms / 1000, html: r.body });
}
const out = []; const conc = 6;
for (let i = 0; i < pages.length; i += conc) out.push(...await Promise.all(pages.slice(i, i + conc).map(one)));
return out.map(j => ({ json: j }));
