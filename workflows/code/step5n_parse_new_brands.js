const s = $('Run Settings').first().json;
const run = String(s.run); const brandRun = String(s.brand_run || 'full'); const baseRun = String(s.base_brand_run || 'pilot');
const reqs = $('Build Requests').all();
const rows = $('Get Brand Rows').all().map(i => i.json).filter(b => b.brand);
const norm = x => String(x || '').trim().toLowerCase();
const groups = {};
$input.all().forEach((it, i) => {
  const r = reqs[i].json;
  const g = groups[r.industry_id] || (groups[r.industry_id] = { industry: r.industry, n_chunks: r.n_chunks, seen: 0, failed: '', found: [] });
  g.seen++;
  if (it.json.type === 'error' || it.json.error) { g.failed = (it.json.error && it.json.error.message) || 'request failed'; return; }
  const text = (it.json.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const m = text.match(/\[[\s\S]*\]/);
  try { const list = m ? JSON.parse(m[0]) : []; for (const b of list) g.found.push(Object.assign({ model: String(it.json.model || '') }, b)); } catch (e) { g.failed = 'reply was not valid JSON'; }
});
const out = []; const skipped = [];
for (const k of Object.keys(groups)) {
  const g = groups[k]; const id = Number(k);
  // an industry is stored only when every request for it worked, so a run that is repeated asks again for the rest
  if (g.failed || g.seen < g.n_chunks) { skipped.push(id + ': ' + (g.failed || 'missing replies')); continue; }
  const base = rows.filter(b => b.run === baseRun && Number(b.industry_id) === id);
  const inList = rows.filter(b => b.run === brandRun && Number(b.industry_id) === id);
  // the reviewed list is copied into the full-run list once
  if (!inList.some(b => b.source === 'base')) for (const b of base) out.push({ json: { run: brandRun, industry_id: id, industry: b.industry, brand: b.brand, aliases: b.aliases, aliases_raw: b.aliases_raw || '', cs_aliases: b.cs_aliases || '', dropped_aliases: b.dropped_aliases || '', domains: b.domains, case_sensitive: b.case_sensitive === true || b.case_sensitive === 'true', model: b.model || '', source: 'base', from_run: run } });
  const knownNames = new Set();
  for (const b of base.concat(inList)) { knownNames.add(norm(b.brand)); for (const a of String(b.aliases_raw || b.aliases || '').split('|')) if (a) knownNames.add(norm(a)); }
  const seen = new Set();
  for (const b of g.found) {
    const brand = String(b.brand || '').trim();
    if (!brand || knownNames.has(norm(brand)) || seen.has(norm(brand))) continue;
    seen.add(norm(brand));
    const aliases = [...new Set([brand].concat(Array.isArray(b.aliases) ? b.aliases : []).map(x => String(x).trim()).filter(x => x.length >= 2 && !knownNames.has(norm(x))))];
    const domains = [...new Set((Array.isArray(b.domains) ? b.domains : []).map(x => String(x).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')).filter(Boolean))];
    out.push({ json: { run: brandRun, industry_id: id, industry: g.industry, brand, aliases: aliases.join('|'), aliases_raw: '', cs_aliases: '', dropped_aliases: '', domains: domains.join('|'), case_sensitive: !!b.case_sensitive, model: b.model, source: 'new', from_run: run } });
  }
  // an industry with no new brand still gets its copies, which mark it done; with copies already present, a marker row is stored
  if (!out.some(o => o.json.industry_id === id)) out.push({ json: { run: brandRun, industry_id: id, industry: g.industry, brand: '', aliases: '', aliases_raw: '', cs_aliases: '', dropped_aliases: '', domains: '', case_sensitive: false, model: '', source: 'none_new', from_run: run } });
}
if (!out.length && skipped.length) throw new Error('No industry finished. First problem: ' + skipped[0]);
return out;
