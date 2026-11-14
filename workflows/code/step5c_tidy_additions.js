// AIRS 5c: fixed rules for the brands added in a full-run batch (rows of brand_run with source 'new' and from_run = run).
// Run after 5n and before 5b. The reviewed (pilot) brands are never changed.
// Rule 1 (one brand, one row): two additions of one industry are the same brand, and are merged, when
//   (a) their names differ only in case, spaces, punctuation, a web-address ending (.com, .io ...) or a trailing "AI"
//       (Hunter / Hunter.io, Goodie / Goodie AI), or
//   (b) they share a domain and one name begins or ends with the other name (Zoho / Zoho Social, Webex / Cisco Webex):
//       the longer one is a product line of the brand, and product lines are aliases of their brand, or
//   (c) they share a domain and each lists the other's name as an alias (Lucid / Lucidspark).
//   The merged row keeps the name found in the most answers (ties: the shorter name); names, aliases and domains are
//   combined; the other rows are deleted.
// Rule 2 (shared alias): an alias that is still on two or more brands of one industry stays only on the brand whose
//   name it is, or else on the one brand whose name contains it or is contained in it; it is dropped from every other
//   addition (and from all additions when no single brand fits). Reviewed brands keep their aliases.
// Rule 3 (everyday word): when the batch's answers write a name or alias of an addition in lowercase in more than
//   half of its uses (at least 3 uses; aliases of 4+ characters with a capital letter; skipped when the lowercase
//   spelling is itself one of the brand's names), the brand is matched only as written (case_sensitive = true).
const s = $('Run Settings').first().json;
const run = String(s.run || ''); const brandRun = String(s.brand_run || 'full');
if (!run || run === brandRun) throw new Error('Set run to the answers run (for example full1) and brand_run to the full-run list (full).');
const low = x => String(x || '').trim().toLowerCase();
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const splitList = x => String(x || '').split('|').map(v => v.trim()).filter(Boolean);
const rows = $('Get Brand Rows').all().map(i => i.json).filter(b => b.brand && b.run === brandRun);
const adds = rows.filter(b => b.source === 'new' && b.from_run === run);
const inds = new Set(adds.map(b => Number(b.industry_id)));
const reviewed = rows.filter(b => b.source !== 'new' && inds.has(Number(b.industry_id)));
const prompts = {}; for (const i of $('Get Prompts').all()) prompts[i.json.prompt_id] = i.json;
// answer text per industry, links and images blanked as in step 6
const text = {};
for (const i of $('Get Answers').all()) {
  const a = i.json; const p = prompts[a.prompt_id];
  if (!p || a.run !== run || !inds.has(Number(p.industry_id))) continue;
  const t = String(a.answer || '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\]\((https?:[^)]*)\)/g, ']').replace(/https?:\/\/\S+/g, ' ');
  (text[p.industry_id] || (text[p.industry_id] = [])).push(t);
}
const wordRe = (a, flags) => new RegExp('(?<![A-Za-z0-9_-])' + esc(a) + '(?![A-Za-z0-9_]|\\.[A-Za-z0-9])', flags);
const names = b => [...new Set([b.brand].concat(splitList(b.aliases)))];
const doms = b => new Set(splitList(b.domains).map(low));
function nAnswers(b) {
  const re = new RegExp(names(b).filter(a => a.length >= 2).sort((x, y) => y.length - x.length).map(a => wordRe(a, '').source).join('|'), 'i');
  return (text[b.industry_id] || []).filter(t => re.test(t)).length;
}
const out = []; const notes = {};
const st = { merged_groups: 0, rows_deleted: 0, aliases_dropped: 0, made_case_sensitive: 0 };
for (const ind of [...inds].sort((x, y) => x - y)) {
  const A = adds.filter(b => Number(b.industry_id) === ind).map(b => Object.assign({}, b, { _n: nAnswers({ industry_id: b.industry_id, brand: b.brand, aliases: '' }), _names: names(b), _doms: doms(b), _from: [] }));
  // rule 1: union-find over pairs of additions that are the same brand
  const norm = x => low(x).replace(/\.(com|io|ai|so|co|app|me|net|org|us|sh|tv)$/, '').replace(/\s+ai$/, '').replace(/[^a-z0-9]/g, '');
  const edge = (x, y) => {
    const n1 = low(x.brand), n2 = low(y.brand);
    if (norm(n1) && norm(n1) === norm(n2)) return true;
    const shareDom = [...x._doms].some(d => y._doms.has(d));
    if (!shareDom) return false;
    const [sh, lg] = n1.length <= n2.length ? [n1, n2] : [n2, n1];
    if (lg.startsWith(sh + ' ') || lg.endsWith(' ' + sh)) return true;
    return x._names.some(a => low(a) === n2) && y._names.some(a => low(a) === n1);
  };
  const par = A.map((_, k) => k); const f = k => par[k] === k ? k : (par[k] = f(par[k]));
  for (let x = 0; x < A.length; x++) for (let y = x + 1; y < A.length; y++) if (edge(A[x], A[y])) par[f(x)] = f(y);
  const groups = {}; A.forEach((b, k) => (groups[f(k)] || (groups[f(k)] = [])).push(b));
  const kept = [];
  for (const g of Object.values(groups)) {
    g.sort((p, q) => q._n - p._n || p.brand.length - q.brand.length || p.id - q.id);
    const k = g[0];
    if (g.length > 1) {
      st.merged_groups++;
      const al = []; for (const b of g) for (const a of b._names) if (!al.includes(a)) al.push(a);
      k._names = [k.brand].concat(al.filter(a => a !== k.brand));
      for (const b of g.slice(1)) { for (const d of b._doms) k._doms.add(d); k._from.push(b.brand); out.push({ json: { op: 'delete', id: b.id, brand: b.brand, into: k.brand } }); st.rows_deleted++; }
      k.case_sensitive = g.some(b => b.case_sensitive === true || b.case_sensitive === 'true');
      k._changed = true; (notes[k.id] || (notes[k.id] = [])).push('merged: ' + k._from.join(', '));
    }
    kept.push(k);
  }
  // rule 2: aliases shared with another brand of the industry (another addition, or a reviewed brand)
  const owners = new Map(); const own = (a, who) => { if (!owners.has(low(a))) owners.set(low(a), new Set()); owners.get(low(a)).add(who); };
  for (const b of kept) for (const a of b._names) own(a, 'n' + b.id);
  for (const b of reviewed.filter(r => Number(r.industry_id) === ind)) for (const a of names(b).concat(splitList(b.aliases_raw))) own(a, 'r' + b.id);
  const contains = (n, a) => wordRe(low(a), '').test(low(n)) || wordRe(low(n), '').test(low(a));
  for (const b of kept) {
    const drop = b._names.filter(a => {
      if (low(a) === low(b.brand) || owners.get(low(a)).size < 2) return false;
      const all = [...owners.get(low(a))];
      if (all.some(w => w[0] === 'r')) return true;
      const others = kept.filter(o => all.includes('n' + o.id));
      if (others.some(o => low(o.brand) === low(a))) return true;
      const fit = others.filter(o => contains(o.brand, a));
      return !(fit.length === 1 && fit[0] === b);
    });
    if (drop.length) { b._names = b._names.filter(a => !drop.includes(a)); b._changed = true; st.aliases_dropped += drop.length; (notes[b.id] || (notes[b.id] = [])).push('shared alias dropped: ' + drop.join(', ')); }
  }
  // rule 3: names the answers mostly write in lowercase are matched only as written
  for (const b of kept) {
    if (b.case_sensitive === true || b.case_sensitive === 'true') continue;
    const own2 = new Set(b._names);
    const hit = b._names.find(a => {
      if (a.length < 4 || a === a.toLowerCase() || own2.has(a.toLowerCase())) return false;
      let n = 0, l = 0; const re = wordRe(a, 'gi');
      for (const t of text[ind] || []) { let m; re.lastIndex = 0; while ((m = re.exec(t)) !== null) { n++; if (m[0] === m[0].toLowerCase()) l++; } }
      return n >= 3 && l / n > 0.5;
    });
    if (hit) { b.case_sensitive = true; b._changed = true; st.made_case_sensitive++; (notes[b.id] || (notes[b.id] = [])).push('matched only as written ("' + hit + '" is mostly lowercase in the answers)'); }
  }
  for (const b of kept) if (b._changed) out.push({ json: { op: 'update', id: b.id, brand: b.brand, aliases: b._names.join('|'), aliases_raw: '', domains: [...b._doms].join('|'), case_sensitive: b.case_sensitive === true || b.case_sensitive === 'true', merged_from: b._from.join('|'), tidy_note: (notes[b.id] || []).join('; ') } });
}
out.push({ json: Object.assign({ op: 'summary', run, additions: adds.length }, st) });
return out;
