// Runs after Jev; helper functions (domainOf, normUrl, SOCIAL) come from recs_core.js
const RETAILER = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:amazon\.[a-z.]+|ebay\.[a-z.]+|walmart\.com|target\.com|bestbuy\.com|etsy\.com|homedepot\.com|lowes\.com|costco\.com|wayfair\.com|newegg\.com|macys\.com|nordstrom\.com|sephora\.com|ulta\.com|chewy\.com|kohls\.com|zappos\.com|rei\.com|backmarket\.com|samsclub\.com|bhphotovideo\.com|overstock\.com|temu\.com|aliexpress\.com|play\.google\.com|apps\.apple\.com|chromewebstore\.google\.com|apps\.microsoft\.com)(?:[\/?#:]|$)/i;
const REVIEW_PLATFORM = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:g2\.com|capterra\.com|trustpilot\.com|getapp\.com|softwareadvice\.com|trustradius\.com|yelp\.com|tripadvisor\.[a-z.]+|clutch\.co|sitejabber\.com|bbb\.org|consumeraffairs\.com|glassdoor\.com|reviews\.io|gartner\.com\/reviews)(?:[\/?#:]|$)/i;
const OTHER_SITE = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:[a-z0-9-]+\.(?:gov|edu|mil)|wikipedia\.org)(?:[\/?#:]|$)/i;
const reqs = $('Find Brands In Answers').all().filter(i => i.json.has_mentions);
const brands = {}; const owner = {};
const brandRun = String($('Run Settings').first().json.brand_run || $('Run Settings').first().json.run);
for (const i of $('Get Brands').all()) { const b = i.json; if (!b.brand || b.run !== brandRun) continue;
  const ds = new Set(String(b.domains || '').split('|').filter(Boolean).map(d => domainOf('https://' + d)));
  brands[b.industry_id + '|' + b.brand] = ds;
  for (const d of ds) (owner[b.industry_id + '|' + d] || (owner[b.industry_id + '|' + d] = new Set())).add(b.brand); }
const out = [];
$input.all().forEach((it, i) => {
  const a = reqs[i].json; const ans = (it.json && it.json.answers) || {};
  if (!it.json || !it.json.answers) throw new Error('Jev returned no answers for ' + a.answer_id + ': ' + JSON.stringify(it.json || {}).slice(0, 300));
  const allDoms = new Set(a.allUrls.map(u => domainOf(u)));
  const num = q => ans[q] && typeof ans[q].noul === 'number' ? ans[q].noul : null;
  // recommendation rule (agreed in the pilot): when the answer singles out brands itself ("the top choices are X and Y",
  // "I recommend X", "I would look into X or Y first"), only those are recommended; when it singles out none and only lists
  // options (a short list, or "best for ..." entries), every main option is recommended
  const pHas = num('hp');
  const picks = a.mentions.map((m, k) => num('t' + k));
  const hasPick = pHas !== null && pHas >= 0.5 && picks.some(p => p !== null && p >= 0.5);
  let nRec = 0, nOff = 0;
  a.mentions.forEach((m, k) => {
    const pOpt = num('b' + k); const pPick = picks[k];
    const offered = pOpt !== null && pOpt >= 0.5; const pick = pPick !== null && pPick >= 0.5;
    const p = hasPick ? pPick : pOpt; const rec = hasPick ? pick : offered;
    if (rec) nRec++; if (offered) nOff++;
    const bd = brands[a.industry_id + '|' + m.brand] || new Set();
    const seen = new Set(); const rows = [];
    for (const an of a.anchors) if (an.brands.includes(m.brand)) for (const u of an.urls) {
      const un = normUrl(u); if (!un || seen.has(un)) continue; seen.add(un);
      const d = domainOf(un); const own = owner[a.industry_id + '|' + d];
      // page owner, relative to the recommended brand (one label each): own_site, retailer, review_platform, social_media, other, competitor, publisher
      const type = bd.has(d) ? 'own_site' : RETAILER.test(un) ? 'retailer' : REVIEW_PLATFORM.test(un) ? 'review_platform' : SOCIAL.includes(d) ? 'social_media' : OTHER_SITE.test(un) ? 'other' : (own && ![...own].includes(m.brand)) ? 'competitor' : 'publisher';
      rows.push({ run: a.run, answer_id: a.answer_id, prompt_id: a.prompt_id, engine: a.engine, industry_id: a.industry_id, brand: m.brand, recommended: rec, url: u.slice(0, 2000), url_norm: un.slice(0, 2000), domain: d, method: an.how, link_type: type });
    }
    out.push({ json: { kind: 'mention', row: { run: a.run, answer_id: a.answer_id, prompt_id: a.prompt_id, engine: a.engine, industry_id: a.industry_id, brand: m.brand, mention_order: m.order, first_pos: m.first, n_mentions: m.count, p_recommended: p, recommended: rec, p_option: pOpt, offered, p_pick: pPick, pick, own_site_cited_anywhere: [...bd].some(d => allDoms.has(d)), n_links: rows.length, jev_model: String(it.json.model || '') } } });
    for (const r of rows) out.push({ json: { kind: 'link', row: r } });
  });
  out.push({ json: { kind: 'flag', row: { run: a.run, answer_id: a.answer_id, prompt_id: a.prompt_id, engine: a.engine, industry_id: a.industry_id, n_brands_mentioned: a.mentions.length, n_recommended: nRec, n_offered: nOff, has_pick: hasPick, p_has_pick: pHas, has_ad: a.sponsors.length > 0, ad_sponsors: a.sponsors.join('|'), n_citations: a.n_citations, answer_chars: a.answer_chars } } });
});
return out;
