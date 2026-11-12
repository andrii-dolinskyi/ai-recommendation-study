const items = $('When Called').all().map(i => i.json);
const brands = $('Get Brands').all().map(i => i.json).filter(b => b.brand);
const PAGE_TYPES = {
  listicle: 'Listicle: a list of several options, ranked or not, such as "best X", "top 10 X" or "X alternatives".',
  comparison: 'Comparison: two or three named options compared side by side, such as "X vs Y".',
  review: 'Review: an assessment of one product.',
  article: 'Article: an informational article that does not list or rank options, such as a how-to, an explainer or a buying guide.',
  news: 'News: a report on recent events, including press releases.',
  homepage: 'Homepage: the front page of a website.',
  product_page: 'Product page: a page about one product, plan or service.',
  pricing_page: 'Pricing page: the plans and prices of one company.',
  category_page: 'Category page: a store page listing many products of one kind.',
  directory: 'Directory: a listing of many companies with a profile for each, such as G2, Clutch or Yelp.',
  forum: 'Forum: a discussion thread, such as Reddit, Quora or a community.',
  video: 'Video: a video page.',
  documentation: 'Documentation: a help center or product documentation page.',
  other: 'Other: anything else.'
};
const out = [];
for (const it of items) {
  const meta = Object.assign({}, it); delete meta.html;
  const inds = new Set(String(it.industry_ids || '').split('|').filter(Boolean).map(Number));
  const bs = brands.filter(b => inds.has(Number(b.industry_id)));
  let r;
  try { r = measurePage(it.final_url || it.url, String(it.html || ''), bs, it.as_of); }
  catch (e) { out.push({ json: { meta, measured: false, error: 'measure: ' + String(e.message || e).slice(0, 200), jev: { model: 'jev-1.14.0', state: { page: 'empty' }, questions: { page_type: { type: 'choice', criteria: PAGE_TYPES } } } } }); continue; }
  const seen = new Set(); const brows = r.brandRows.filter(b => !seen.has(b.brand) && seen.add(b.brand));
  const pageText = ('URL: ' + it.url + NL + 'Title: ' + r.row.title + NL + NL + r.mainText).slice(0, 60000);
  const questions = { page_type: { type: 'choice', instructions: 'What kind of page is `page`, by its format (not by who owns it)?', criteria: PAGE_TYPES } };
  brows.slice(0, 40).forEach((b, k) => { questions['c' + k] = { type: 'noul', instructions: 'Does `page` criticize ' + b.brand + ': does it state a drawback, weakness, complaint or con of ' + b.brand + ', or say who ' + b.brand + ' does not suit? Answer no for plain facts such as prices, fees, plan limits, what a plan does not include, availability or fine print, unless the page presents them as a downside of ' + b.brand + '.' }; });
  out.push({ json: { meta, measured: true, page: r.row, brandRows: brows, links: r.links, jev: { model: 'jev-1.14.0', state: { page: pageText }, questions } } });
}
return out;
