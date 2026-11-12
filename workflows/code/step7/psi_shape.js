const src = $('Build PSI Queue').all();
const num = v => (v === null || v === undefined || Number.isNaN(Number(v))) ? null : Number(v);
return $input.all().map((it, i) => {
  const q = src[i].json; const r = it.json || {};
  const le = r.loadingExperience || {}; const ole = r.originLoadingExperience || {};
  const pageLevel = le.metrics && Object.keys(le.metrics).length && !le.origin_fallback;
  const fld = pageLevel ? le : (ole.metrics && Object.keys(ole.metrics).length ? ole : (le.origin_fallback && le.metrics ? le : null));
  const pm = k => fld && fld.metrics && fld.metrics[k] ? num(fld.metrics[k].percentile) : null;
  const div = (v, d) => v === null ? null : v / d;
  const lh = r.lighthouseResult || {}; const au = lh.audits || {};
  const av = k => au[k] ? num(au[k].numericValue) : null;
  const perf = lh.categories && lh.categories.performance ? num(lh.categories.performance.score) : null;
  const err = r.error ? (typeof r.error === 'string' ? r.error : String(r.error.message || r.error.status || 'error')) : (lh.runtimeError ? String(lh.runtimeError.message || lh.runtimeError.code) : '');
  return { json: { run: q.run, url_norm: q.url_norm, url: q.url, psi_status: r.error ? 'error' : (lh.runtimeError ? 'runtime_error' : (lh.categories || lh.audits ? 'ok' : 'no_result')),
    field_level: pageLevel ? 'page' : (fld ? 'origin' : 'none'),
    lcp_s: div(pm('LARGEST_CONTENTFUL_PAINT_MS'), 1000), inp_ms: pm('INTERACTION_TO_NEXT_PAINT'), cls: div(pm('CUMULATIVE_LAYOUT_SHIFT_SCORE'), 100),
    fcp_s: div(pm('FIRST_CONTENTFUL_PAINT_MS'), 1000), ttfb_s: div(pm('EXPERIMENTAL_TIME_TO_FIRST_BYTE'), 1000),
    lab_score: perf === null ? null : Math.round(perf * 100), lab_lcp_s: div(av('largest-contentful-paint'), 1000), lab_cls: av('cumulative-layout-shift'),
    lab_tbt_ms: av('total-blocking-time'), lab_fcp_s: div(av('first-contentful-paint'), 1000), lab_si_s: div(av('speed-index'), 1000),
    lab_server_response_ms: av('server-response-time'), error: err.slice(0, 300), fetched_at: new Date().toISOString() } };
});
