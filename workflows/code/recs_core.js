// Core logic for AIRS 6 (recommendations). Pasted into n8n Code nodes; tested locally with node.
const NL = String.fromCharCode(10);
const SOCIAL = ['youtube.com','youtu.be','linkedin.com','reddit.com','x.com','twitter.com','facebook.com','instagram.com','tiktok.com','quora.com','medium.com','pinterest.com'];
const TWO_LEVEL = new Set(['co','com','org','net','gov','edu','ac','or','ne','go']);
function domainOf(u) {
  const m = String(u || '').match(/^https?:\/\/([^\/?#:]+)/i);
  if (!m) return '';
  const parts = m[1].toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && TWO_LEVEL.has(parts[parts.length - 2])) return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}
function normUrl(u) {
  let s = String(u || '').trim().replace(/&quot;?$/,'').replace(/#.*$/, '');
  const q = s.indexOf('?');
  if (q >= 0) {
    const kept = s.slice(q + 1).split('&').filter(p => p && !/^(utm_[a-z_]+|gclid|fbclid|msclkid|srsltid|ref|ref_src|mc_[a-z]+)=/i.test(p));
    s = s.slice(0, q) + (kept.length ? '?' + kept.join('&') : '');
  }
  s = s.replace(/^http:\/\//i, 'https://').replace(/^https:\/\/www\./i, 'https://');
  return s.replace(/\/+$/, '');
}
function stripAds(t) {
  const sponsors = [];
  for (let guard = 0; guard < 5; guard++) {
    const ad = t.search(/\]\(https?:[^)]*(oppref=|utm_medium=cpc)/);
    if (ad < 0) break;
    let start = t.lastIndexOf('###', ad);
    if (start < 0 || ad - start > 600) start = t.lastIndexOf(NL, ad);
    let end = t.indexOf('Report this ad', ad);
    end = end < 0 ? t.length : end + 14;
    const block = t.slice(start, end);
    const sp = block.match(/Sponsored by\s*\*?\s*(?:!\[[^\]]*\]\([^)]*\))?\s*([^\n]+)/);
    if (sp) sponsors.push(sp[1].trim());
    t = t.slice(0, Math.max(0, start)) + ' '.repeat(Math.max(0, end - start)) + t.slice(end);
  }
  return { text: t, sponsors };
}
function maskUrls(t) {
  // same length: blank out image tags and link targets so brand matching never hits a URL
  return t.replace(/!\[[^\]]*\]\([^)]*\)/g, m => ' '.repeat(m.length))
          .replace(/\]\((https?:[^)]*)\)/g, m => ']' + ' '.repeat(m.length - 1))
          .replace(/https?:\/\/\S+/g, m => ' '.repeat(m.length));
}
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function anyCase(s) { return esc(s).replace(/[A-Za-z]/g, c => '[' + c.toLowerCase() + c.toUpperCase() + ']'); }
// one regex per brand; aliases listed in cs_aliases (or all, if the brand is case-sensitive) match only as written
function brandRegexes(brands) {
  return brands.map(b => {
    const al = [...new Set(String(b.aliases || b.brand).split('|').concat([b.brand]).map(x => x.trim()).filter(x => x.length >= 2))].sort((a, c) => c.length - a.length);
    const allCs = b.case_sensitive === true || b.case_sensitive === 'true';
    const cs = new Set(String(b.cs_aliases || '').split('|').filter(Boolean));
    return { brand: b.brand, domains: String(b.domains || '').split('|').filter(Boolean), re: new RegExp('(?<![A-Za-z0-9_-])(' + al.map(a => allCs || cs.has(a) ? esc(a) : anyCase(a)).join('|') + ')(?![A-Za-z0-9_]|\\.[A-Za-z0-9])', 'g') };
  });
}
function findMentions(masked, bre) {
  // every match of every brand, then drop a match that sits inside a longer match of another brand ("Binance" inside "Binance US")
  const hits = [];
  for (const b of bre) {
    b.re.lastIndex = 0; let m; let n = 0;
    while ((m = b.re.exec(masked)) !== null) { hits.push({ brand: b.brand, s: m.index, e: m.index + m[0].length }); if (++n > 200) break; }
  }
  const kept = hits.filter(h => !hits.some(o => o.brand !== h.brand && o.s <= h.s && o.e >= h.e && (o.e - o.s) > (h.e - h.s)));
  const byBrand = {};
  for (const h of kept) (byBrand[h.brand] || (byBrand[h.brand] = [])).push(h.s);
  const out = [];
  for (const b of bre) {
    const pos = (byBrand[b.brand] || []).sort((x, y) => x - y);
    if (pos.length) out.push({ brand: b.brand, first: pos[0], positions: pos, count: pos.length });
  }
  out.sort((a, c) => a.first - c.first);
  out.forEach((m, i) => { m.order = i + 1; });
  return out;
}
function lineAt(t, pos) {
  const s = t.lastIndexOf(NL, pos - 1) + 1; let e = t.indexOf(NL, pos); if (e < 0) e = t.length; return [s, e];
}
function anchorsFor(engine, text, cites, links) {
  const A = [];
  const byN = {}; for (const c of cites) if (!byN[c.n]) byN[c.n] = c;
  // inline markdown links (not images, not ads, not OpenAI help)
  const re = /(?<!!)\[([^\]]*)\]\((https?:[^)\s]+)\)/g; let m;
  while ((m = re.exec(text)) !== null) {
    const u = m[2];
    if (/oppref=|utm_medium=cpc|help\.openai\.com|images\.openai\.com|google\.com\/s2\/favicons/.test(u)) continue;
    const [s, e] = lineAt(text, m.index);
    A.push({ pos: m.index, seg: [s, e], urls: [u], method: 'inline' });
  }
  if (engine === 'chatgpt') {
    const pr = /!\[\]\(https:\/\/www\.google\.com\/s2\/favicons\?domain=([^&)]+)[^)]*\)/g; const used = new Set();
    while ((m = pr.exec(text)) !== null) {
      const d = domainOf(decodeURIComponent(m[1]));
      const c = cites.find(x => domainOf(x.url) === d && !used.has(x.url)) || cites.find(x => domainOf(x.url) === d);
      if (!c) continue; used.add(c.url);
      // segment: the paragraph(s) before the pill, back to the previous blank line that follows text
      let e = m.index; let s = text.lastIndexOf(NL + NL, e - 2); s = s < 0 ? 0 : s;
      let back = text.slice(s, e).trim(); if (back.length < 40) { const s2 = text.lastIndexOf(NL + NL, s - 2); s = s2 < 0 ? 0 : s2; }
      A.push({ pos: m.index, seg: [s, e], urls: [c.url], method: 'pill' });
    }
  } else if (engine === 'perplexity') {
    const mr = /\[(\d{1,3})\]/g;
    while ((m = mr.exec(text)) !== null) {
      const c = byN[Number(m[1])]; if (!c) continue;
      let [s, e] = lineAt(text, m.index);
      if (e - s > 400) { const ps = Math.max(text.lastIndexOf('. ', m.index - 1), text.lastIndexOf(NL, m.index - 1)); s = ps < 0 ? 0 : ps; e = m.index; }
      A.push({ pos: m.index, seg: [s, e], urls: [c.url], method: 'marker' });
    }
  } else {
    // gemini and google_ai_mode: cited passage text
    const groups = {};
    for (const c of cites) if (c.text) (groups[c.text] || (groups[c.text] = [])).push(c.url);
    const low = text.toLowerCase();
    for (const [passage, urls] of Object.entries(groups)) {
      const key = passage.trim().slice(0, 80).toLowerCase();
      if (key.length < 15) continue;
      const p = low.indexOf(key); if (p < 0) continue;
      A.push({ pos: p, seg: [p, p + passage.length], urls: [...new Set(urls)], method: 'passage' });
    }
  }
  return A;
}
function analyse(ans, brands) {
  const engine = ans.engine;
  let text = String(ans.answer || '');
  let sponsors = [];
  if (engine === 'chatgpt') { const r = stripAds(text); text = r.text; sponsors = r.sponsors; }
  const cites = JSON.parse(ans.citations || '[]');
  const links = JSON.parse(ans.links || '[]');
  const masked = maskUrls(text);
  const bre = brandRegexes(brands);
  const mentions = findMentions(masked, bre);
  const anchors = anchorsFor(engine, text, cites, links);
  // line-start brand positions (section heads)
  const heads = [];
  for (const mm of mentions) for (const p of mm.positions) {
    const ls = masked.lastIndexOf(NL, p - 1) + 1; const pre = masked.slice(ls, p);
    if (/^[\s#>*\-|]*(\d+[.)])?[\s*#|]*$/.test(pre)) heads.push({ pos: p, brand: mm.brand });
  }
  heads.sort((a, c) => a.pos - c.pos);
  for (const a of anchors) {
    const named = mentions.filter(mm => mm.positions.some(p => p >= a.seg[0] && p < a.seg[1])).map(mm => mm.brand);
    if (named.length) { a.brands = named; a.how = a.method; }
    else { const h = heads.filter(x => x.pos < a.pos).pop(); a.brands = h && a.pos - h.pos < 3000 ? [h.brand] : []; a.how = a.method + '_section'; }
  }
  const allUrls = cites.map(c => c.url).concat(links.map(l => l.url)).concat(anchors.flatMap(a => a.urls));
  return { engine, text, masked, sponsors, mentions, anchors, allUrls };
}
module.exports = { analyse, domainOf, normUrl, stripAds, maskUrls, brandRegexes, findMentions, anchorsFor, SOCIAL };
