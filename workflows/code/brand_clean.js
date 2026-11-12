// Alias cleaning for the brand lists (step 5b). Plain JavaScript, no modules.
// Rules: an alias of two characters or fewer, or made only of digits, or a code of three characters with a digit, is dropped
// unless it is the brand's own name; an alias that is an everyday English word (first 8,000 words of the Google
// 10,000 most common US English words list, three letters or more), or an acronym
// of up to four capital letters, is matched only as written (case-sensitive); everything else matches in any case.
function cleanBrand(b, COMMON) {
  const raw = String(b.aliases_raw || b.aliases || b.brand);
  const all = [...new Set(raw.split('|').concat([b.brand]).map(x => x.trim()).filter(Boolean))];
  const keep = [], cs = [], dropped = [];
  for (const a of all) {
    const canonical = a === b.brand;
    const isCode = /^[A-Za-z0-9]{1,3}$/.test(a) && /\d/.test(a);
    if (!canonical && (a.length <= 2 || /^\d[\d\s.,-]*$/.test(a) || isCode)) { dropped.push(a); continue; }
    keep.push(a);
    const commonWord = /^[A-Za-z]+$/.test(a) && COMMON.has(a.toLowerCase());
    const acronym = /^[A-Z0-9&]{2,4}$/.test(a);
    if (b.case_sensitive === true || b.case_sensitive === 'true' || commonWord || acronym || a.length <= 3) cs.push(a);
  }
  return { aliases_raw: raw, aliases: keep.join('|'), cs_aliases: cs.join('|'), dropped_aliases: dropped.join('|') };
}
// One regex per brand; aliases outside cs_aliases match in any case (letters expanded to [xX]).
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function anyCase(s) { return esc(s).replace(/[A-Za-z]/g, c => '[' + c.toLowerCase() + c.toUpperCase() + ']'); }
function brandPattern(b) {
  const al = [...new Set(String(b.aliases || b.brand).split('|').concat([b.brand]).map(x => x.trim()).filter(x => x.length >= 2))].sort((a, c) => c.length - a.length);
  const allCs = b.case_sensitive === true || b.case_sensitive === 'true';
  const cs = new Set(String(b.cs_aliases || '').split('|').filter(Boolean));
  return '(?<![A-Za-z0-9_-])(' + al.map(a => allCs || cs.has(a) ? esc(a) : anyCase(a)).join('|') + ')(?![A-Za-z0-9_])';
}
module.exports = { cleanBrand, brandPattern };
