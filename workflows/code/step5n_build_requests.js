const s = $('Run Settings').first().json;
const run = String(s.run || ''); const brandRun = String(s.brand_run || 'full'); const baseRun = String(s.base_brand_run || 'pilot');
if (!run || run === brandRun) throw new Error('Set run to the answers run (for example full1), brand_run to the full-run list (full) and base_brand_run to the reviewed list (pilot).');
const maxChars = Number(s.max_chars_per_request) || 150000;
const only = String(s.only_industry_ids || '').split(',').map(x => Number(x.trim())).filter(n => n > 0);
const allRows = $('Get Brand Rows').all().map(i => i.json);
const rows = allRows.filter(b => b.brand);
// an industry is done for this answers run once its rows (copies of the reviewed list, new brands or a 'none new' marker) are stored with from_run = run
const done = new Set(allRows.filter(b => b.run === brandRun && b.from_run === run).map(b => Number(b.industry_id)));
const known = {};
for (const b of rows) if (b.run === baseRun || b.run === brandRun) (known[b.industry_id] || (known[b.industry_id] = [])).push(b);
const prompts = {};
for (const i of $('Get Prompts').all()) prompts[i.json.prompt_id] = i.json;
const NL = String.fromCharCode(10);
function clean(t) {
  t = String(t || '');
  for (let guard = 0; guard < 5; guard++) {
    const ad = t.search(/\]\(https?:[^)]*(oppref=|utm_medium=cpc)/);
    if (ad < 0) break;
    let start = t.lastIndexOf('###', ad);
    if (start < 0 || ad - start > 600) start = t.lastIndexOf(NL, ad);
    let end = t.indexOf('Report this ad', ad);
    end = end < 0 ? t.length : end + 14;
    t = t.slice(0, Math.max(0, start)) + t.slice(end);
  }
  return t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' ').replace(/[ \t]+/g, ' ').replace(/(\n\s*){3,}/g, NL + NL).trim();
}
const byInd = {};
for (const i of $('Get Answers').all()) {
  const a = i.json; const p = prompts[a.prompt_id];
  if (!p || a.run !== run) continue;
  (byInd[p.industry_id] || (byInd[p.industry_id] = { industry_id: Number(p.industry_id), industry: p.industry, subs: new Set(), answers: [] })).answers.push({ id: a.answer_id, sub: p.subcategory, text: clean(a.answer).slice(0, 5000) });
  byInd[p.industry_id].subs.add(p.subcategory);
}
const out = [];
for (const k of Object.keys(byInd).map(Number).sort((a, b) => a - b)) {
  if (done.has(k) || (only.length && !only.includes(k))) continue;
  const g = byInd[k];
  // every answer is read: the answers are split into requests of at most maxChars characters
  g.answers.sort((a, b) => a.id < b.id ? -1 : 1);
  const chunks = []; let cur = []; let total = 0;
  for (const a of g.answers) { if (cur.length && total + a.text.length > maxChars) { chunks.push(cur); cur = []; total = 0; } cur.push(a); total += a.text.length; }
  if (cur.length) chunks.push(cur);
  const list = (known[k] || []).map(b => b.brand + ' (' + String(b.aliases_raw || b.aliases || b.brand).split('|').filter(x => x && x !== b.brand).slice(0, 15).join(', ') + ')').join('; ');
  chunks.forEach((picked, c) => {
    const body = picked.map((a, n) => '<answer n="' + (n + 1) + '" subcategory="' + a.sub + '">' + NL + a.text + NL + '</answer>').join(NL + NL);
    const prompt = [
      'You extend a brand dictionary for a research study on which brands AI assistants recommend.',
      'Industry: ' + g.industry + '. Subcategories: ' + [...g.subs].join('; ') + '. Market: United States.',
      'These brands are already on the list, with their product names and other spellings in brackets: ' + (list || 'none') + '.',
      'Below are ' + picked.length + ' AI answers to buyer questions in this industry.',
      '',
      'List every brand that any answer names as an option to buy or use and that is NOT already on the list, not under another spelling and not as a product line of a listed brand. Rules:',
      '- One entry per brand a buyer would choose, named the way buyers know it (the company or brand, not a single model).',
      '- Product lines and model names go in the aliases of their brand, for example Pixel 9 under Google, Galaxy S25 under Samsung, ThinkPad under Lenovo, Sales Hub under HubSpot.',
      '- aliases: every spelling and product or model name used in the answers, plus the brand name itself.',
      "- domains: the brand's own website domains, without www (for example hubspot.com).",
      '- case_sensitive: true when a name is also an ordinary English word (for example Close, Notion, Square, Monday), so it only counts when written with a capital letter.',
      '- Do not list review sites, publishers, forums or marketplaces that appear only as sources (for example Forbes, PCMag, Reddit, G2). List a retailer or marketplace only when an answer recommends it as the place or service to choose.',
      '- If every brand in the answers is already on the list, return [].',
      '',
      'Return only JSON: [{"brand": "...", "aliases": ["..."], "domains": ["..."], "case_sensitive": false}]',
      '',
      body
    ].join(NL);
    out.push({ json: { industry_id: g.industry_id, industry: g.industry, chunk: c + 1, n_chunks: chunks.length, n_answers: picked.length, body: { model: 'claude-sonnet-5-5', max_tokens: 16000, messages: [{ role: 'user', content: prompt }] } } });
  });
}
return out;
