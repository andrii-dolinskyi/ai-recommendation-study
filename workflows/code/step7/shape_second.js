const helpers = this.helpers;
const src = $('Filter Second Try').all();
// second try: the same request with a mobile browser identity (some sites answer mobile visitors only)
const res = await Promise.all($input.all().map(async (it, i) => {
  const p = Object.assign({}, src[i].json);
  const mode = (p.fallback_reason === 'thin' ? 'render' : 'plain') + '_mobile';
  const r = (it.json && it.json.results && it.json.results[0]) || {};
  const html = typeof r.content === 'string' ? r.content : '';
  if (Number(r.status_code) === 200 && html.length > 500 && roughWords(html) >= 50) {
    const finalUrl = r.url || p.final_url || p.url;
    const md = await mdChecks(helpers, finalUrl);
    return Object.assign(p, md, { kind: 'ok', html_source: 'oxylabs_' + mode, final_url: finalUrl, http_status: 200, response_time_s: null, fail_reason: '', html });
  }
  const why = r.status_code ? 'status_' + r.status_code : String((it.json && (it.json.message || it.json.error)) || 'no content').slice(0, 120);
  // a third try follows unless the scraper refuses the site outright
  const kind = /not supported/i.test(why) ? 'failed' : 'retry2';
  return Object.assign(p, { kind, html_source: 'oxylabs_' + mode, second_try: mode + ' ' + why, fail_reason: 'fallback_failed (' + p.fallback_reason + '): ' + p.first_try + '; ' + mode + ' ' + why });
}));
return res.map(j => ({ json: j }));
