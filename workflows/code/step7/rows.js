// 7s "Page Rows" (and "Brand Rows" with kind 'brand'): rows handed to the table insert.
// Postgres rejects the NUL character (0x00) in text, so it is removed from every text value before storing
const clean = v => typeof v === 'string' ? v.replace(/\u0000/g, '') : v;
return $input.all().filter(i => i.json.kind === 'page').map(i => ({ json: Object.fromEntries(Object.entries(i.json.row).map(([k, v]) => [k, clean(v)])) }));
