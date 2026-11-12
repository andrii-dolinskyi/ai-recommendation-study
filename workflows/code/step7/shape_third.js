const helpers = this.helpers;
const src = $('Filter Third Try').all();
// third try: the other mode of the first try (rendered for pages that blocked, plain for pages that came back thin)
const res = await Promise.all($input.all().map(async (it, i) => {
  const p = Object.assign({}, src[i].json);
  const mode = p.fallback_reason === 'thin' ? 'plain' : 'render';
  const r = (it.json && it.json.results && it.json.results[0]) || {};
  const html = typeof r.content === 'string' ? r.content : '';
  if (Number(r.status_code) === 200 && html.length > 500 && roughWords(html) >= 50) {
    const finalUrl = r.url || p.final_url || p.url;
    const md = await mdChecks(helpers, finalUrl);
    return Object.assign(p, md, { kind: 'ok', html_source: 'oxylabs_' + mode, final_url: finalUrl, http_status: 200, response_time_s: null, fail_reason: '', html });
  }
  const why = r.status_code ? 'status_' + r.status_code : String((it.json && (it.json.message || it.json.error)) || 'no content').slice(0, 120);
  return Object.assign(p, { kind: 'failed', html_source: 'oxylabs_' + mode, fail_reason: 'fallback_failed (' + p.fallback_reason + '): ' + p.first_try + '; ' + p.second_try + '; ' + mode + ' ' + why });
}));
return res.map(j => ({ json: j }));
