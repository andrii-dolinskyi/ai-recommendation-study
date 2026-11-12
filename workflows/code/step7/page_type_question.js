// Jev page questions, set just before each Jev call: the page type (the format of the page, kept apart from who owns it;
// ownership comes from the page's domain, per recommendation) and criticism of each brand on the page (pilot wording)
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
// criticism: real criticism only; plain facts (prices, fees, plan limits, fine print) do not count unless presented as a downside
const CRIT = b => 'Does `page` criticize ' + b + ': does it state a drawback, weakness, complaint or con of ' + b + ', or say who ' + b + ' does not suit? Answer no for plain facts such as prices, fees, plan limits, what a plan does not include, availability or fine print, unless the page presents them as a downside of ' + b + '.';
return $input.all().map(i => {
  const j = Object.assign({}, i.json);
  if (j.jev && j.jev.questions) {
    const q = Object.assign({}, j.jev.questions, { page_type: { type: 'choice', instructions: 'What kind of page is `page`, by its format (not by who owns it)?', criteria: PAGE_TYPES } });
    (j.brandRows || []).slice(0, 40).forEach((b, k) => { if (q['c' + k]) q['c' + k] = { type: 'noul', instructions: CRIT(b.brand) }; });
    j.jev = Object.assign({}, j.jev, { questions: q });
  }
  return { json: j };
});
