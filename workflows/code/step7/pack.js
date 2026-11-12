const PAGE_COLS = ['url_norm', 'url', 'final_url', 'domain', 'industry_ids', 'reach', 'status', 'fail_reason', 'html_source', 'http_status', 'redirects', 'response_time_s', 'html_bytes', 'lang', 'english', 'title', 'title_chars', 'meta_desc_chars', 'h1_count', 'heading_skips', 'canonical', 'schema_types', 'n_schema_types', 'schema_Article', 'schema_Product', 'schema_Review', 'schema_FAQPage', 'schema_ItemList', 'schema_HowTo', 'schema_Organization', 'schema_Person', 'schema_BreadcrumbList', 'schema_other', 'md_alternate_link', 'md_url', 'md_accept', 'markdown_version', 'word_count', 'h2_count', 'h3_count', 'lists', 'list_items', 'tables', 'external_links', 'internal_links', 'links_checked', 'links_broken', 'links_broken_internal', 'links_broken_external', 'links_unchecked', 'broken_share', 'statistics', 'statistics_per_100', 'author_named', 'reviewer_named', 'last_updated', 'last_updated_source', 'age_days', 'fp_singular', 'fp_plural', 'fp_singular_per_100', 'fp_plural_per_100', 'title_has_best', 'title_has_year', 'title_has_number', 'h1_text', 'h1_has_best', 'h1_has_year', 'h1_has_number', 'h1_has_i', 'h1_has_we', 'n_brands', 'page_type', 'page_type_p', 'jev_model'];
const BRAND_COLS = ['brand', 'industry_id', 'position', 'n_brands', 'position_share', 'h2_index', 'own_heading', 'section_words', 'share_words', 'ratio_to_others', 'price_shown'];
const num = v => (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) ? null : Number(v);
function pageRow(meta, page, extra) {
  const src = Object.assign({}, page || {}, meta, extra);
  if (page) { src.domain = page.domain; }
  const row = { run: meta.run };
  for (const c of PAGE_COLS) { let v = src[c]; if (v === undefined) v = null; if (typeof v === 'string') v = v.slice(0, c === 'title' || c === 'h1_text' ? 300 : 2000); row[c] = v; }
  row.as_of = meta.as_of; row.measured_at = new Date().toISOString();
  return row;
}
function packMeasured(m, jevResp) {
  const meta = m.meta; const ans = (jevResp && jevResp.answers) || {};
  if (!m.measured) return [{ json: { kind: 'page', row: pageRow(meta, null, { status: 'failed', fail_reason: m.error }) } }];
  const pt = ans.page_type && ans.page_type.choice ? ans.page_type : null;
  const md = !!(m.page.md_alternate_link || meta.md_url === 'yes' || meta.md_accept === 'yes');
  const out = [{ json: { kind: 'page', row: pageRow(meta, m.page, { status: 'measured', fail_reason: '', markdown_version: md, n_brands: m.brandRows.length, page_type: pt ? pt.choice : null, page_type_p: pt && pt.probabilities ? num(pt.probabilities[pt.choice]) : null, jev_model: String((jevResp && jevResp.model) || '') }) } }];
  m.brandRows.forEach((b, k) => {
    const c = ans['c' + k] && typeof ans['c' + k].noul === 'number' ? ans['c' + k].noul : null;
    const row = { run: meta.run, url_norm: meta.url_norm };
    for (const col of BRAND_COLS) row[col] = b[col] === undefined ? null : b[col];
    row.criticism_p = c; row.criticism = c === null ? null : c >= 0.5;
    out.push({ json: { kind: 'brand', row } });
  });
  return out;
}
