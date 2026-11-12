const helpers = this.helpers;
const src = $('Filter Needs Fallback').all();
// first try through the scraper: rendered (JavaScript run) for pages that came back thin, plain for pages that blocked the direct request
const res = await Promise.all($input.all().map(async (it, i) => {
  const p = Object.assign({}, src[i].json);
  const mode = p.fallback_reason === 'thin' ? 'render' : 'plain';
  const r = (it.json && it.json.results && it.json.results[0]) || {};
  const html = typeof r.content === 'string' ? r.content : '';
  if (Number(r.status_code) === 200 && html.length > 500 && roughWords(html) >= 50) {
    const finalUrl = r.url || p.final_url || p.url;
    const md = await mdChecks(helpers, finalUrl);
    return Object.assign(p, md, { kind: 'ok', html_source: 'oxylabs_' + mode, final_url: finalUrl, http_status: 200, response_time_s: null, html });
  }
  const why = r.status_code ? 'status_' + r.status_code : String((it.json && (it.json.message || it.json.error)) || 'no content').slice(0, 120);
  // the scraper refuses some sites outright; a second try cannot help there
  const kind = /not supported/i.test(why) ? 'failed' : 'retry';
  return Object.assign(p, { kind, html_source: 'oxylabs_' + mode, first_try: mode + ' ' + why, fail_reason: 'fallback_failed (' + p.fallback_reason + '): ' + mode + ' ' + why });
}));
return res.map(j => ({ json: j }));
