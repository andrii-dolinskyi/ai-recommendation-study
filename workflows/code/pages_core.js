// Core logic for AIRS 7 (page measures). Plain JavaScript with no modules, so it runs inside n8n Code nodes.
// Tested locally with node (test_pages.js) and compared with trafilatura on pilot pages.
const NL = String.fromCharCode(10);
const TWO_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'or', 'ne', 'go']);
function domainOf(u) {
  const m = String(u || '').match(/^https?:\/\/([^\/?#:]+)/i);
  if (!m) return '';
  const parts = m[1].toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && TWO_LEVEL.has(parts[parts.length - 2])) return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}
// URL resolution without the URL class (not available in n8n Code nodes)
function resolveUrl(base, href) {
  href = String(href || '').trim();
  if (!href) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  const m = String(base).match(/^(https?:)\/\/([^\/?#]+)([^?#]*)/i);
  if (!m) return href;
  if (href.startsWith('//')) return m[1] + href;
  if (href.startsWith('/')) return m[1] + '//' + m[2] + href;
  if (href.startsWith('?') || href.startsWith('#')) return m[1] + '//' + m[2] + m[3] + href;
  const dir = m[3].replace(/[^\/]*$/, '') || '/';
  const parts = (dir + href).split('/'); const out = [];
  for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }
  return m[1] + '//' + m[2] + out.join('/').replace(/^([^\/])/, '/$1');
}

// ---------- HTML parsing ----------
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', 'keygen', 'command', 'basefont', 'frame']);
const RAWTEXT = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'template', 'xmp', 'iframe', 'noembed', 'noframes']);
const P_CLOSERS = new Set(['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', trade: '™', reg: '®', copy: '©', eacute: 'é', egrave: 'è', aacute: 'á', agrave: 'à', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', ccedil: 'ç', uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß', bull: '•', middot: '·', times: '×', deg: '°', pound: '£', euro: '€', yen: '¥', cent: '¢', frac12: '½', frac14: '¼', frac34: '¾', laquo: '«', raquo: '»', sup2: '²', sup3: '³', thinsp: ' ', ensp: ' ', emsp: ' ', zwj: '', zwnj: '', shy: '', larr: '←', rarr: '→', uarr: '↑', darr: '↓', check: '✓', star: '☆', starf: '★', le: '≤', ge: '≥', plusmn: '±', minus: '−', divide: '÷', prime: '′', Prime: '″', sect: '§', para: '¶', iexcl: '¡', iquest: '¿' };
function decode(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, e) => {
    if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; } catch (x) { return ''; } }
    return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : (ENT[e.toLowerCase()] !== undefined ? ENT[e.toLowerCase()] : m);
  });
}
function parseAttrs(s) {
  const a = {}; const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g; let m;
  while ((m = re.exec(s)) !== null) { const k = m[1].toLowerCase(); if (!(k in a)) a[k] = decode(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : ''); }
  return a;
}
function el(tag, attrs, parent) { return { tag, attrs, children: [], parent }; }
function parseHtml(html) {
  const root = el('#root', {}, null); const stack = [root];
  const top = () => stack[stack.length - 1];
  const hasOpen = (tag, stopAt) => { for (let k = stack.length - 1; k > 0; k--) { const t = stack[k].tag; if (t === tag) return k; if (stopAt.has(t)) return -1; } return -1; };
  const closeTo = k => { if (k > 0) stack.length = k; };
  const SCOPE = new Set(['table', 'td', 'th', 'html', 'body', 'button', 'object', 'template', 'caption']);
  const LIST_SCOPE = new Set(['ul', 'ol', 'table', 'td', 'th', 'html', 'body']);
  const DL_SCOPE = new Set(['dl', 'table', 'html', 'body']);
  const TR_SCOPE = new Set(['table', 'html', 'body']);
  const addText = t => { if (t) top().children.push(decode(t)); };
  let i = 0; const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { addText(html.slice(i)); break; }
    if (lt > i) addText(html.slice(i, lt));
    const c1 = html[lt + 1];
    if (html.startsWith('<!--', lt)) { const e = html.indexOf('-->', lt + 4); i = e < 0 ? n : e + 3; continue; }
    if (c1 === '!' || c1 === '?') { const e = html.indexOf('>', lt); i = e < 0 ? n : e + 1; continue; }
    if (c1 === '/') {
      const e = html.indexOf('>', lt); if (e < 0) { i = n; break; }
      const name = html.slice(lt + 2, e).trim().split(/\s/)[0].toLowerCase();
      for (let k = stack.length - 1; k > 0; k--) { if (stack[k].tag === name) { stack.length = k; break; } if (name === 'p' && P_CLOSERS.has(stack[k].tag) && stack[k].tag !== 'p') break; }
      i = e + 1; continue;
    }
    if (!/[a-zA-Z]/.test(c1 || '')) { addText('<'); i = lt + 1; continue; }
    // start tag: find the closing '>' outside quotes
    let j = lt + 1, q = null;
    while (j < n) { const ch = html[j]; if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") { if (/[=\s]/.test(html[j - 1]) || html[j - 1] === '=') q = ch; } else if (ch === '>') break; j++; }
    const inner = html.slice(lt + 1, j); i = j + 1;
    const nm = inner.match(/^([a-zA-Z][a-zA-Z0-9:-]*)/); const tag = nm[1].toLowerCase();
    const attrs = parseAttrs(inner.slice(nm[1].length));
    const selfClose = /\/\s*$/.test(inner);
    if (P_CLOSERS.has(tag)) { const k = hasOpen('p', SCOPE); if (k > 0) closeTo(k); }
    if (tag === 'li') { const k = hasOpen('li', LIST_SCOPE); if (k > 0) closeTo(k); }
    if (tag === 'dt' || tag === 'dd') { const k = Math.max(hasOpen('dt', DL_SCOPE), hasOpen('dd', DL_SCOPE)); if (k > 0) closeTo(k); }
    if (tag === 'tr') { const k = Math.max(hasOpen('tr', TR_SCOPE), hasOpen('td', TR_SCOPE), hasOpen('th', TR_SCOPE)); if (k > 0) closeTo(k); }
    if (tag === 'td' || tag === 'th') { const k = Math.max(hasOpen('td', TR_SCOPE), hasOpen('th', TR_SCOPE)); if (k > 0) closeTo(k); }
    if (tag === 'option') { const k = hasOpen('option', SCOPE); if (k > 0) closeTo(k); }
    const node = el(tag, attrs, top()); top().children.push(node);
    if (RAWTEXT.has(tag)) {
      const close = html.toLowerCase().indexOf('</' + tag, i);
      const e = close < 0 ? n : close;
      node.raw = html.slice(i, e);
      if (tag === 'title' || tag === 'textarea') node.children.push(decode(node.raw));
      const gt = close < 0 ? n : html.indexOf('>', close); i = gt < 0 ? n : gt + 1; continue;
    }
    if (!VOID.has(tag) && !selfClose) stack.push(node);
  }
  return root;
}
function walk(node, fn) { const st = [node]; while (st.length) { const x = st.pop(); if (typeof x === 'string') continue; if (fn(x) === false) continue; for (let k = x.children.length - 1; k >= 0; k--) st.push(x.children[k]); } }
function findAll(node, pred) { const out = []; walk(node, x => { if (pred(x)) out.push(x); }); return out; }
function textOf(node) { if (typeof node === 'string') return node; if (node.tag === 'script' || node.tag === 'style' || node.tag === 'noscript' || node.tag === 'template') return ''; let s = ''; for (const c of node.children) s += (typeof c === 'string' ? c : ' ' + textOf(c) + ' '); return s; }
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const words = s => (clean(s).match(/\S+/g) || []).filter(w => /[A-Za-z0-9À-ɏ]/.test(w));
function hasAncestor(node, pred) { for (let p = node.parent; p; p = p.parent) if (pred(p)) return true; return false; }

// ---------- boilerplate and main content ----------
const DROP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'form', 'button', 'select', 'input', 'textarea', 'nav', 'footer', 'aside', 'dialog', 'canvas', 'video', 'audio', 'object', 'embed', 'map', 'head', 'menu', 'label', 'option']);
const BOILER_WORDS = 'nav|navbar|navigation|menu|menus|megamenu|mega-menu|footer|sidebar|side-bar|comment|comments|cookie|cookies|consent|gdpr|share|sharing|social|socials|related|recommended|recirc|newsletter|subscribe|subscription|signup|breadcrumb|breadcrumbs|popup|modal|overlay|advert|advertisement|ads|ad|adslot|dfp|promo|sponsor|skip-link|sr-only|visually-hidden|screen-reader-text|outbrain|taboola|disqus|toc|table-of-contents|masthead|site-header|global-header|topbar|top-bar';
// a class name or id counts when it is one of these words, with at most one extra segment before and after (site-footer, related-posts)
const BOILER_NAME = new RegExp('^(?:[a-z0-9]+[-_]{1,2})?(?:' + BOILER_WORDS + ')(?:[-_]{1,2}[a-z0-9]+)?$', 'i');
const NEVER_BOILER = new Set(['html', 'body', 'main', 'article', '#root']);
function isBoiler(x) {
  if (DROP_TAGS.has(x.tag)) return true;
  if (NEVER_BOILER.has(x.tag)) return false;
  const a = x.attrs;
  if (a.hidden !== undefined || a['aria-hidden'] === 'true') return true;
  if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(a.style || '')) return true;
  const role = (a.role || '').toLowerCase();
  if (['navigation', 'banner', 'contentinfo', 'complementary', 'search', 'dialog', 'menu', 'menubar'].includes(role)) return true;
  if (x.tag === 'header' && !hasAncestor(x, p => p.tag === 'article' || p.tag === 'main')) return true;
  const names = String(a.class || '').split(/\s+/).concat([a.id || '']).filter(Boolean);
  return names.some(c => c.length <= 40 && BOILER_NAME.test(c));
}
const BLOCK = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'dt', 'dd', 'blockquote', 'pre', 'figcaption', 'caption', 'div', 'section', 'article', 'main', 'ul', 'ol', 'dl', 'table', 'tr', 'tbody', 'thead', 'tfoot', 'header', 'footer', 'aside', 'nav', 'figure', 'address', 'details', 'summary', 'hr', 'br', 'body', 'html', 'center', 'fieldset', 'hgroup', '#root']);
// Blocks in document order: { tag, text, linkChars, h (heading level or 0), el }
function blocksOf(root, skip) {
  const out = []; let buf = ''; let linkChars = 0; let owner = root;
  const flush = () => { const t = clean(buf); if (t) out.push({ tag: owner.tag, text: t, linkChars, h: /^h[1-6]$/.test(owner.tag) ? Number(owner.tag[1]) : 0, el: owner }); buf = ''; linkChars = 0; };
  function inline(x, inLink) {
    if (typeof x === 'string') { buf += x; if (inLink) linkChars += clean(x).length; return; }
    if (skip(x)) return;
    if (x.tag === 'br') { buf += ' '; return; }
    if (x.tag === 'img') return;
    const lk = inLink || x.tag === 'a';
    for (const c of x.children) {
      if (typeof c !== 'string' && BLOCK.has(c.tag)) { flush(); visit(c); owner = x.__owner || owner; } else inline(c, lk);
    }
  }
  function visit(x) {
    if (typeof x === 'string') return;
    if (skip(x)) return;
    const prev = owner; flush(); owner = x; x.__owner = x;
    for (const c of x.children) {
      if (typeof c === 'string') { buf += c; continue; }
      if (skip(c)) continue;
      if (BLOCK.has(c.tag)) { flush(); visit(c); owner = x; } else inline(c, c.tag === 'a');
    }
    flush(); owner = prev;
  }
  visit(root); flush();
  return out;
}
function chooseRoot(body, skip) {
  // text length per element (non-boilerplate blocks only), then the semantic container or the smallest element holding most of the text
  const blocks = blocksOf(body, skip).filter(b => b.text.length >= 1);
  const total = blocks.reduce((s, b) => s + b.text.length - b.linkChars * 0.5, 0) || 1;
  const score = new Map();
  for (const b of blocks) { const v = Math.max(0, b.text.length - b.linkChars * 0.5); for (let p = b.el; p; p = p.parent) score.set(p, (score.get(p) || 0) + v); }
  const sem = findAll(body, x => !skip(x) && (x.tag === 'main' || x.tag === 'article' || (x.attrs.role || '') === 'main' || /articleBody|mainContentOfPage/.test(x.attrs.itemprop || '')));
  const sc = x => score.get(x) || 0;
  const good = sem.filter(c => sc(c) >= 0.4 * total);
  if (good.length) {
    // the semantic container with the most text, then the deepest one inside it that keeps 85% of that text
    let best = good.reduce((a, c) => sc(c) > sc(a) ? c : a);
    for (let changed = true; changed;) { changed = false; for (const c of good) if (c !== best && isInside(c, best) && sc(c) >= 0.85 * sc(best)) { best = c; changed = true; } }
    return best;
  }
  // smallest element holding at least 70% of the text
  let cand = body;
  for (;;) {
    let next = null;
    for (const c of cand.children) if (typeof c !== 'string' && !skip(c) && (score.get(c) || 0) >= 0.7 * total) { next = c; break; }
    if (!next) break; cand = next;
  }
  return cand;
}
function isInside(x, anc) { for (let p = x.parent; p; p = p.parent) if (p === anc) return true; return false; }
function mainContent(doc) {
  const body = findAll(doc, x => x.tag === 'body')[0] || doc;
  const skip = x => isBoiler(x);
  const root = chooseRoot(body, skip);
  let blocks = blocksOf(root, skip);
  // drop link lists and very short link-only blocks (menus, tag clouds, "read more")
  blocks = blocks.filter(b => !(b.linkChars / Math.max(1, b.text.length) > 0.6 && !b.h && b.text.length < 200) && !(b.linkChars / Math.max(1, b.text.length) > 0.9 && !b.h));
  return { root, blocks, skip };
}

// ---------- structured data, dates, people ----------
const FAMILIES = {
  Article: ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'ScholarlyArticle', 'Report', 'AnalysisNewsArticle', 'ReviewNewsArticle', 'OpinionNewsArticle', 'BackgroundNewsArticle', 'ReportageNewsArticle', 'AdvertiserContentArticle', 'SatiricalArticle', 'LiveBlogPosting', 'MedicalScholarlyArticle'],
  Product: ['Product', 'ProductGroup', 'IndividualProduct', 'ProductModel', 'SomeProducts', 'Vehicle', 'Car'],
  Review: ['Review', 'CriticReview', 'UserReview', 'EmployerReview', 'MediaReview', 'Recommendation'],
  FAQPage: ['FAQPage'], ItemList: ['ItemList', 'BreadcrumbList_never'], HowTo: ['HowTo', 'Recipe'],
  Organization: ['Organization', 'Corporation', 'LocalBusiness', 'OnlineStore', 'OnlineBusiness', 'NewsMediaOrganization', 'EducationalOrganization', 'NGO', 'Airline', 'InsuranceAgency', 'FinancialService', 'BankOrCreditUnion', 'Store', 'Brand'],
  Person: ['Person'], BreadcrumbList: ['BreadcrumbList']
};
// types that only describe parts of a page or of another type; they do not count as "other"
const SUPPORT_TYPES = new Set(['WebPage', 'WebSite', 'WebPageElement', 'SiteNavigationElement', 'WPHeader', 'WPFooter', 'WPSideBar', 'ImageObject', 'ListItem', 'SearchAction', 'EntryPoint', 'ReadAction', 'Thing', 'PropertyValueSpecification', 'ContactPoint', 'PostalAddress', 'Country', 'City', 'State', 'Place', 'GeoCoordinates', 'Rating', 'AggregateRating', 'Offer', 'AggregateOffer', 'PriceSpecification', 'UnitPriceSpecification', 'QuantitativeValue', 'MonetaryAmount', 'Language', 'PropertyValue', 'Question', 'Answer', 'HowToStep', 'HowToSection', 'HowToSupply', 'HowToTool', 'Duration', 'SpeakableSpecification', 'CollectionPage', 'ItemPage', 'AboutPage', 'ContactPage', 'SearchResultsPage', 'ProfilePage', 'FAQPage_never', 'ImageGallery', 'OfferShippingDetails', 'ShippingDeliveryTime', 'DefinedRegion', 'MerchantReturnPolicy', 'Audience', 'PeopleAudience', 'InteractionCounter', 'Comment', 'CreativeWork', 'MediaObject', 'Intangible']);
function jsonLdNodes(doc) {
  const out = [];
  for (const s of findAll(doc, x => x.tag === 'script' && /ld\+json/i.test(x.attrs.type || ''))) {
    let t = String(s.raw || '').trim().replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/^\s*\/\/.*$/gm, '');
    let j = null; try { j = JSON.parse(t); } catch (e) { try { j = JSON.parse(t.replace(/,\s*([}\]])/g, '$1').replace(/[\u0000-\u001f]+/g, ' ')); } catch (e2) { j = null; } }
    if (j !== null) out.push(j);
  }
  return out;
}
function schemaInfo(doc) {
  const types = new Set(); const objs = [];
  const visit = o => { if (Array.isArray(o)) { o.forEach(visit); return; } if (!o || typeof o !== 'object') return; objs.push(o); const t = o['@type']; for (const x of [].concat(t || [])) if (typeof x === 'string') types.add(x.replace(/^https?:\/\/schema\.org\//i, '').replace(/^schema:/i, '')); for (const v of Object.values(o)) if (v && typeof v === 'object') visit(v); };
  jsonLdNodes(doc).forEach(visit);
  for (const x of findAll(doc, x => x.attrs.itemtype)) for (const u of String(x.attrs.itemtype).split(/\s+/)) if (u) types.add(u.replace(/\/+$/, '').split('/').pop());
  for (const x of findAll(doc, x => x.attrs.typeof)) for (const u of String(x.attrs.typeof).split(/\s+/)) if (u) types.add(u.replace(/^schema:/i, '').split(/[\/#]/).pop());
  const list = [...types].filter(Boolean).sort();
  const flags = {}; const known = new Set();
  for (const [fam, members] of Object.entries(FAMILIES)) { flags['schema_' + fam] = list.some(t => members.includes(t)); members.forEach(m => known.add(m)); }
  flags.schema_other = list.some(t => !known.has(t) && !SUPPORT_TYPES.has(t));
  return { list, flags, objs };
}
function metaContent(doc, key) {
  const k = key.toLowerCase();
  const m = findAll(doc, x => x.tag === 'meta' && ((x.attrs.name || '').toLowerCase() === k || (x.attrs.property || '').toLowerCase() === k || (x.attrs.itemprop || '').toLowerCase() === k))[0];
  return m ? clean(m.attrs.content || '') : '';
}
const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const MONTH_N = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function toIsoDate(s) {
  s = clean(s); if (!s) return '';
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(new RegExp('\\b(' + MONTHS + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})', 'i')); if (m) return m[3] + '-' + String(MONTH_N[m[1].slice(0, 3).toLowerCase()]).padStart(2, '0') + '-' + m[2].padStart(2, '0');
  m = s.match(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(' + MONTHS + ')\\.?,?\\s+(\\d{4})', 'i')); if (m) return m[3] + '-' + String(MONTH_N[m[2].slice(0, 3).toLowerCase()]).padStart(2, '0') + '-' + m[1].padStart(2, '0');
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/); if (m) return m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
  return '';
}
function firstStr(objs, key) {
  for (const o of objs) { const v = o[key]; if (typeof v === 'string' && v.trim()) return v.trim(); if (Array.isArray(v) && typeof v[0] === 'string') return v[0]; }
  return '';
}
function personNamed(v) {
  if (!v) return false;
  if (typeof v === 'string') return clean(v).length >= 2;
  if (Array.isArray(v)) return v.some(personNamed);
  if (typeof v === 'object') return typeof v.name === 'string' && clean(v.name).length >= 2 || (typeof v['@id'] === 'string' && /person|author/i.test(v['@id']));
  return false;
}

// ---------- text measures ----------
const STAT = /(?<![\w.,\/-])(?:[$€£]\s?)?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s?%|\s?[kKmMbB]n?\b|x\b)?|(?<![\w.,\/-])(?:[$€£]\s?)?\d+(?:\.\d+)?(?:\s?%|\s?[kKmMbB]n?\b|x\b|\/\d+(?:\.\d+)?)?(?![\w])/g;
function statCount(blocks) {
  let n = 0;
  const monthNear = new RegExp('(' + MONTHS + ')\\.?\\s*$', 'i');
  for (const b of blocks) {
    const t = b.text; STAT.lastIndex = 0; let m;
    while ((m = STAT.exec(t)) !== null) {
      const tok = m[0].trim(); const pre = t.slice(Math.max(0, m.index - 12), m.index);
      const digits = tok.replace(/[^0-9.]/g, '');
      if (/^(19|20)\d{2}$/.test(digits) && !/[$€£%]/.test(tok)) continue; // years
      if (m.index <= 3 && /^\s*(?:#\s?)?\d{1,2}\s*[.):]?/.test(t.slice(0, m.index + tok.length + 2)) && /^\d{1,2}$/.test(digits) && (b.h || /^\s*#?\d{1,2}\s*[.):]\s/.test(t))) continue; // list numbers
      if (/^\d{1,2}$/.test(digits) && monthNear.test(pre)) continue; // day of a date
      n++;
    }
  }
  return n;
}
const FP1 = /(?:^|[^A-Za-z'’])(I|me|Me|my|My|mine|Mine|myself|Myself|I'm|I’m|I've|I’ve|I'd|I’d|I'll|I’ll)(?![A-Za-z])/g;
const FP2 = /(?:^|[^A-Za-z'’])(we|We|us|Us|our|Our|ours|Ours|ourselves|Ourselves|we're|We're|we’re|We’re|we've|We've|we’ve|We’ve|we'd|We'd|we’ll|We’ll|we'll|We'll)(?![A-Za-z.])/g;
function countRe(text, re) { re.lastIndex = 0; let n = 0; while (re.exec(text) !== null) n++; return n; }
const STOP = new Set(['the', 'and', 'of', 'to', 'a', 'in', 'is', 'for', 'that', 'with', 'on', 'are', 'you', 'it', 'this', 'as', 'be', 'or', 'your', 'can', 'from', 'at', 'by', 'an', 'have', 'more', 'if', 'not', 'but', 'they', 'their', 'will', 'which', 'also', 'its', 'has', 'was', 'all']);
const hasBest = s => /\bbest\b/i.test(s);
const hasYear = s => /\b(19|20)\d{2}\b/.test(s);
const hasNumber = s => /\d/.test(String(s).replace(/\b(19|20)\d{2}\b/g, ''));

// ---------- brands on the page ----------
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function anyCase(s) { return esc(s).replace(/[A-Za-z]/g, c => '[' + c.toLowerCase() + c.toUpperCase() + ']'); }
// one regex per brand; aliases listed in cs_aliases (or all, if the brand is case-sensitive) match only as written
function brandRegexes(brands) {
  return brands.map(b => {
    const al = [...new Set(String(b.aliases || b.brand).split('|').concat([b.brand]).map(x => x.trim()).filter(x => x.length >= 2))].sort((a, c) => c.length - a.length);
    const allCs = b.case_sensitive === true || b.case_sensitive === 'true';
    const cs = new Set(String(b.cs_aliases || '').split('|').filter(Boolean));
    return { brand: b.brand, industry_id: b.industry_id, re: new RegExp('(?<![A-Za-z0-9_-])(' + al.map(a => allCs || cs.has(a) ? esc(a) : anyCase(a)).join('|') + ')(?![A-Za-z0-9_])') };
  });
}
const PRICE = /[$€£]\s?\d|\b\d+(?:\.\d+)?\s?(?:usd|dollars)\b|\bfree (?:plan|trial|version|tier)\b|\bper (?:month|user|year|seat|person)\b|\/(?:mo|month|yr|year|user)\b|\bpricing\b|\bplans? (?:start|begin|cost)/i;
function brandsOnPage(blocks, brands) {
  const bre = brandRegexes(brands); const seen = new Map();
  // first appearance (block index) for each brand
  blocks.forEach((b, i) => { for (const r of bre) { if (seen.has(r.brand)) continue; if (r.re.test(b.text)) seen.set(r.brand, { r, first: i }); } });
  const list = [...seen.values()].sort((a, c) => a.first - c.first);
  const n = list.length; const rows = [];
  const h2Before = []; let h2 = 0; blocks.forEach((b, i) => { if (b.h === 2) h2++; h2Before[i] = h2; });
  for (let k = 0; k < n; k++) {
    const { r, first } = list[k];
    let own = -1; for (let i = 0; i < blocks.length; i++) if ((blocks[i].h === 2 || blocks[i].h === 3) && r.re.test(blocks[i].text)) { own = i; break; }
    let secWords = 0, price = false, ownLevel = 0;
    if (own >= 0) {
      ownLevel = blocks[own].h; let txt = '';
      for (let i = own + 1; i < blocks.length; i++) { if (blocks[i].h && blocks[i].h <= ownLevel) break; txt += ' ' + blocks[i].text; }
      secWords = words(txt).length; price = PRICE.test(blocks[own].text + ' ' + txt);
    }
    rows.push({ brand: r.brand, industry_id: r.industry_id, position: k + 1, n_brands: n, position_share: n ? (k + 1) / n : null, h2_index: h2Before[first], own_heading: ownLevel === 2 ? 'H2' : ownLevel === 3 ? 'H3' : 'none', section_words: secWords, price_shown: price });
  }
  const tot = rows.reduce((s, x) => s + x.section_words, 0);
  for (const x of rows) {
    x.share_words = tot ? x.section_words / tot : null;
    const others = rows.filter(y => y !== x); const avg = others.length ? others.reduce((s, y) => s + y.section_words, 0) / others.length : 0;
    x.ratio_to_others = avg ? x.section_words / avg : null;
  }
  return rows;
}

// ---------- all page measures ----------
function measurePage(url, html, brands, asOf) {
  const doc = parseHtml(html);
  const head = findAll(doc, x => x.tag === 'head')[0] || doc;
  const titleEl = findAll(doc, x => x.tag === 'title' && !hasAncestor(x, p => p.tag === 'svg' || p.tag === 'body'))[0] || findAll(doc, x => x.tag === 'title')[0];
  const title = clean(titleEl ? titleEl.raw ? decode(titleEl.raw) : textOf(titleEl) : '');
  const desc = metaContent(doc, 'description');
  const lang = ((findAll(doc, x => x.tag === 'html')[0] || { attrs: {} }).attrs.lang || '').toLowerCase();
  const canonicalEl = findAll(head, x => x.tag === 'link' && /(^|\s)canonical(\s|$)/i.test(x.attrs.rel || ''))[0];
  const mdAlt = findAll(doc, x => x.tag === 'link' && /alternate/i.test(x.attrs.rel || '') && /markdown/i.test(x.attrs.type || ''))[0];
  // headings in the whole document (technical)
  const allHeads = findAll(doc, x => /^h[1-6]$/.test(x.tag) && !hasAncestor(x, p => p.tag === 'svg' || p.tag === 'template' || p.tag === 'noscript'));
  const levels = allHeads.map(h => Number(h.tag[1]));
  const h1s = allHeads.filter(h => h.tag === 'h1').map(h => clean(textOf(h)));
  let skips = 0; for (let k = 1; k < levels.length; k++) if (levels[k] - levels[k - 1] > 1) skips++;
  const sch = schemaInfo(doc);
  // main content
  const mc = mainContent(doc);
  const mainText = mc.blocks.map(b => b.text).join(NL);
  const w = words(mainText); const wc = w.length; const per100 = x => wc ? 100 * x / wc : null;
  const inMain = x => !hasAncestor(x, p => mc.skip(p)) && (x === mc.root || isInside(x, mc.root));
  const mainEls = findAll(mc.root, x => !mc.skip(x)) ;
  const lists = mainEls.filter(x => (x.tag === 'ul' || x.tag === 'ol') && inMain(x));
  const items = mainEls.filter(x => x.tag === 'li' && inMain(x));
  const tables = mainEls.filter(x => x.tag === 'table' && inMain(x));
  const dom = domainOf(url); let ext = 0, int = 0; const linkSet = new Map();
  for (const a of mainEls.filter(x => x.tag === 'a' && x.attrs.href && inMain(x))) {
    const h = a.attrs.href.trim(); if (!h || h[0] === '#' || /^(javascript|mailto|tel|sms|data):/i.test(h)) continue;
    const abs = resolveUrl(url, h); if (!/^https?:/i.test(abs)) continue;
    const internal = domainOf(abs) === dom;
    if (internal) int++; else ext++;
    const key = abs.replace(/#.*$/, '');
    if (!linkSet.has(key)) linkSet.set(key, internal);
  }
  const mainHeads = mc.blocks.filter(b => b.h);
  // author and reviewer
  const docText = clean(blocksOf(findAll(doc, x => x.tag === 'body')[0] || doc, x => DROP_TAGS.has(x.tag) && x.tag !== 'footer' && x.tag !== 'aside').map(b => b.text).join(NL));
  const authorEls = findAll(doc, x => /author|byline/i.test((x.attrs.class || '') + ' ' + (x.attrs.rel || '') + ' ' + (x.attrs.itemprop || '') + ' ' + (x.attrs.id || '')) && x.tag !== 'meta' && x.tag !== 'link' && x.tag !== 'script');
  const authorText = authorEls.map(x => clean(textOf(x))).find(t => t.length >= 3 && t.length <= 120 && /[A-Z][a-z]+/.test(t)) || '';
  const authorNamed = sch.objs.some(o => personNamed(o.author) || personNamed(o.creator)) || !!metaContent(doc, 'author') || !!authorText || /(?:^|\s)(?:[Ww]ritten |[Ww]ords )?[Bb]y:?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z'’.-]+){1,3}\b/.test(docText.slice(0, 20000));
  const reviewerNamed = sch.objs.some(o => personNamed(o.reviewedBy)) || /\b(?:[Mm]edically |[Ee]xpert |[Ff]inancially |[Ll]egally |[Tt]echnically )?(?:[Rr]eviewed|REVIEWED|[Ff]act[- ]?[Cc]hecked|FACT[- ]CHECKED|[Ee]dited and reviewed)\s+[Bb][Yy]\s*:?\s*[A-Z][a-z]+/.test(docText);
  // dates
  const modSchema = firstStr(sch.objs, 'dateModified'); const pubSchema = firstStr(sch.objs, 'datePublished');
  const modMeta = metaContent(doc, 'article:modified_time') || metaContent(doc, 'og:updated_time') || metaContent(doc, 'dateModified') || metaContent(doc, 'last-modified');
  const pubMeta = metaContent(doc, 'article:published_time') || metaContent(doc, 'datePublished') || metaContent(doc, 'date') || metaContent(doc, 'publish-date');
  const visUpd = docText.match(new RegExp('\\b(?:last\\s+)?(?:updated|modified|reviewed)(?:\\s+on)?\\s*:?\\s*((?:' + MONTHS + ')\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}\\s+(?:' + MONTHS + ')\\.?,?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4})', 'i'));
  const timeEl = findAll(doc, x => x.tag === 'time' && x.attrs.datetime)[0];
  let updated = '', updatedSrc = '';
  for (const [v, s] of [[modSchema, 'schema_modified'], [modMeta, 'meta_modified'], [visUpd && visUpd[1], 'visible_updated'], [pubSchema, 'schema_published'], [pubMeta, 'meta_published'], [timeEl && timeEl.attrs.datetime, 'time_tag']]) { const d = toIsoDate(v || ''); if (d && d >= '1995-01-01') { updated = d; updatedSrc = s; break; } }
  let age = null; if (updated) { const a = Date.parse(updated + 'T00:00:00Z'), b = Date.parse(asOf + 'T00:00:00Z'); if (!isNaN(a) && !isNaN(b)) age = Math.round((b - a) / 86400000); }
  // language
  const lw = w.slice(0, 3000).map(x => x.toLowerCase().replace(/[^a-z']/g, ''));
  const stopShare = lw.length ? lw.filter(x => STOP.has(x)).length / lw.length : 0;
  const english = lang ? lang.startsWith('en') : stopShare >= 0.08;
  const h1 = h1s[0] || '';
  const row = {
    url, domain: dom, lang, english, title, title_chars: title.length, meta_desc_chars: desc.length,
    h1_count: h1s.length, heading_skips: skips, canonical: canonicalEl ? resolveUrl(url, canonicalEl.attrs.href || '') : '',
    schema_types: sch.list.join('|'), n_schema_types: sch.list.length, ...sch.flags,
    md_alternate_link: !!mdAlt, md_alternate_href: mdAlt ? resolveUrl(url, mdAlt.attrs.href || '') : '',
    word_count: wc, h2_count: mainHeads.filter(b => b.h === 2).length, h3_count: mainHeads.filter(b => b.h === 3).length,
    lists: lists.length, list_items: items.length, tables: tables.length, external_links: ext, internal_links: int,
    statistics: statCount(mc.blocks), statistics_per_100: null, author_named: authorNamed, reviewer_named: reviewerNamed,
    last_updated: updated, last_updated_source: updatedSrc || 'no_date', age_days: age,
    fp_singular: countRe(mainText, FP1), fp_plural: countRe(mainText, FP2), fp_singular_per_100: null, fp_plural_per_100: null,
    title_has_best: hasBest(title), title_has_year: hasYear(title), title_has_number: hasNumber(title),
    h1_text: h1.slice(0, 300), h1_has_best: hasBest(h1), h1_has_year: hasYear(h1), h1_has_number: hasNumber(h1), h1_has_i: countRe(h1, FP1) > 0, h1_has_we: countRe(h1, FP2) > 0,
    html_bytes: html.length
  };
  row.statistics_per_100 = per100(row.statistics); row.fp_singular_per_100 = per100(row.fp_singular); row.fp_plural_per_100 = per100(row.fp_plural);
  const brandRows = brandsOnPage(mc.blocks, brands || []);
  // unique link addresses in the main content, for the broken-link check (first 60 in page order)
  const links = [...linkSet.entries()].slice(0, 60).map(([u, internal]) => ({ u, internal }));
  return { row, brandRows, mainText, blocks: mc.blocks, links };
}
module.exports = { parseHtml, mainContent, measurePage, brandsOnPage, resolveUrl, domainOf, words, toIsoDate, statCount, blocksOf, textOf, findAll };
