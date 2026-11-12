# AI Recommendation Study: Thesis and Methodology

Protocol date: 2026-11-10

**Thesis:** The quality of a webpage impacts decisions of ChatGPT, Perplexity, Gemini, and Google AI Mode to recommend brands.

The study sends 4,000 US buyer questions from 40 industries to ChatGPT, Gemini, Perplexity and Google AI Mode (16,000 answers). It finds every brand the engines recommend and the page behind each recommendation, then measures those pages' technical SEO and content. This protocol fixes the questions, measures and analysis; its structure follows the OSF preregistration template and the STROBE checklist for observational studies.

## 1. Research questions

The study answers three questions. The first two test the thesis; the third describes the data.

| # | Question | Unit | Outcome |
| --- | --- | --- | --- |
| RQ1 | Which technical and content measures of a page go with it backing more brand recommendations? | Page | Reach: recommendations that link to the page |
| RQ2 | Does the way a page presents a brand (position, section, words spent, price, criticism) go with AI engines recommending that brand? | Brand on a page | Recommended in the answer that cites the page: yes or no |
| RQ3 | Where do the links behind AI recommendations point, and how often are recommended brands also cited? | Recommendation | Page owner; own site cited |

**Support for the thesis:** at least one page measure (RQ1) or brand-on-page measure (RQ2) keeps a link to its outcome after correction for many tests, in the same direction on at least three of the four engines. If no measure does, the thesis is not supported, and the report says so.

**No scores or thresholds:** every measure is recorded as its raw value (a count, a length, seconds, yes or no). The report shows the average and spread of each one and tests each one on its own.

## 2. Study design

An observational, cross-sectional study: each prompt is sent once to each engine in one collection run, and nothing on the pages is changed. The protocol, prompt set, settings and code are committed to GitHub with a date before collection (pre-registration).

**Setting**

- **Engines:** ChatGPT (with web search), Gemini and Google AI Mode through the Oxylabs Web API; Perplexity through Perplexity's own Sonar API (model sonar, web search on, low search context, US location). Collection of Perplexity through Oxylabs failed on 99 of 100 pilot prompts, so its answers come from the API, not from the perplexity.ai website, and are labelled as such in the data.
- **Location and language:** United States, US English. Answers are logged-out.
- **Scope:** product and service categories where the answer is a brand. Local places (restaurants, clinics, shops) are left out because their answers depend on the city.

**Units of analysis**

| Unit | What it is | Count |
| --- | --- | --- |
| Prompt | One buyer question | 4,000 |
| Answer | One engine's reply to one prompt | 16,000 |
| Recommendation | One brand recommended in one answer | Counted after collection |
| Page | One unique URL behind at least one recommendation | Counted after collection |
| Brand on a page | One brand named on one of those pages | Counted after collection |

**Sample size:** 100 prompts per industry give 400 answers per industry, enough to measure a share within about ±5 percentage points (95% confidence). RQ1 and RQ2 pool all industries.

## 3. Prompt set

Every prompt is a question whose only useful answer is one or more brands. The set has 40 industries × 5 subcategories × 5 templates × 4 prompts = 4,000 prompts (Appendix A lists the industries and subcategories).

**Templates**

| Template | Shape | Example |
| --- | --- | --- |
| Best overall | What is the best [category]? | What is the best platform for tracking brand visibility in AI search? |
| Best for a buyer | What is the best [category] for [who]? | Which CRM is best for a 10-person real estate agency? |
| Must-have feature | Which [category] offers [feature]? | Which fintech app offers tax tracking for freelancers? |
| Budget | What is a good [category] for [budget]? | What are good noise-cancelling headphones under $200? |
| Problem | I need to [goal]. What should I use? | Our support inbox is out of control. Which help desk should we use? |

**Rules every prompt must pass**

- A good answer names brands. If “it depends” with no brand is a fair answer, the prompt is dropped. The prompt must ask which brand, company, product, platform, app, service, provider or store to choose; if a type of product could answer it, it is dropped.
- No brand, product or company names in the prompt, so no “alternatives to X” or “X vs Y”.
- No years, dates, cities, states or “near me”.
- No how-to or definition questions.
- One subcategory per prompt.

**Seeding:** Claude Sonnet 5.5 writes 40 candidates per subcategory (8 per template) with the prompt in Appendix B: 200 per industry, 8,000 in all.

**Filtering:** code checks the rules it can (years, place names), then removes near-duplicates (word overlap above 60% within a subcategory). Jev answers five questions per candidate (Appendix C). A candidate stays only if all five score 0.5 or higher; the 4 highest-scoring candidates per template and subcategory make the final set. A cell left with fewer than 4 prompts is topped up from a second seeding round of the same subcategory.

**Hand-check:** a person checks 200 random prompts against the rules. Any industry where more than 10% fail is reseeded and filtered again. In the first round, the hand-check found prompts that asked for “the best [product]” without asking for a brand, so an answer could name only a type of product; Jev confirmed this for 577 of 3,998 prompts (14.4%). The brand rule was added to the seeding prompt and to the filter, and the whole set was seeded and filtered again. The first-round prompts and their outcomes are kept in the repository under prompts/round1.

## 4. Procedure

Sixteen steps in five phases, run in order. Pilot data are not used in the results.

### Preparation

1. Fix the 40 industries and 200 subcategories (Appendix A).
2. Seed 8,000 candidate prompts with Claude Sonnet (Appendix B).
3. Filter to 4,000 prompts with code rules, duplicate removal and Jev (section 3).
4. Hand-check 200 prompts; reseed any industry with more than 10% failures.

### Pilot

5. Send 100 prompts, spread across all industries and templates, to the 4 engines: 400 answers.
6. Run steps 10 to 14 on the pilot answers.
7. Go on only if: at least 95% of requests return a parsed answer on every engine; brands are found in at least 90% of answers; every measure computes on at least 95% of fetched pages; Jev agrees with a person on 50 answers and 50 pages (kappa 0.7 or higher). Otherwise fix the cause and repeat the pilot.

### Collection

8. Pre-register: commit this protocol, the prompt set, the settings file and the code to GitHub with a date.
9. Send all 4,000 prompts to ChatGPT, Gemini and Google AI Mode through Oxylabs and to Perplexity through the Sonar API (US, English); retry failed requests up to two times.
10. Build a brand list per industry: Claude drafts names and aliases from a sample of answers, products count for their maker (Pixel counts for Google), fixed rules drop aliases of one or two characters and match aliases that are everyday words only with their capital letter, and a person reviews the list. The lists reviewed in the pilot are kept for the full run; brands in full-run answers that are not on them are drafted the same way, and a person reviews only those additions.
11. Find recommendations: match brand names in each answer, Jev answers whether the answer names its own pick, whether each brand is one of its picks and whether each brand is offered as an option, and the rule in section 4 labels each brand recommended or only mentioned; then attach the link behind each recommendation and label who owns the page.
12. Fetch every page behind a recommendation once, with a desktop Chrome user agent; pages that block the request, come back without text, or send the request to another language version are fetched again through Oxylabs from the United States, up to three tries: a plain request (with JavaScript rendering for pages that came back without text), the same request with a mobile browser identity, then the other of the two. Run PageSpeed Insights (mobile) on every measured page.

### Measurement

13. Compute the page and brand-on-page measures from each page's HTML as it is fetched (section 5); pages are not stored.
14. Collect the rest: Jev labels page type and criticism of each brand, code checks for markdown page versions, and domain and page ranks are fetched.
15. Hand-check the measures (section 7).

### Analysis and publication

16. Run the analysis plan exactly as committed (section 6); anything added later is labelled exploratory.

## 5. Measures

Every measure is a raw value. Main content means the page without header, footer, navigation, sidebars and comments, extracted by the study's own code (published in the repository; on 112 pilot pages its word counts matched trafilatura's with a median ratio of 1.04); rates are per 100 words of main content.

### Answers

| Measure | Recorded as | Source |
| --- | --- | --- |
| Recommended brands | Brands in order of first appearance, each labelled recommended or only mentioned. When the answer itself singles out brands, at the start, at the end or as its suggestion for a purpose ("the top choices are X and Y", "I recommend X", "I would look into X or Y first"), only those brands are recommended; alternatives next to them, such as "if your budget is lower, consider Z" after a stated top choice, count as mentioned. When it singles out none and only gives a list (a short list, or "best for ..." entries, even one labelled "best overall"), every brand it offers as an option is recommended. Brands named for comparison, background or a warning are always mentioned. The rule is applied to each answer by what it says, whatever engine wrote it | Answer text, brand list, Jev |
| Link behind a recommendation | The URL cited in the same sentence, list item or paragraph as the recommended brand (inline link, citation marker or cited passage); if that part names no brand, the brand whose list item or section it sits in. Only links behind recommendations are analysed | Answer and its citations |
| Page owner | Who owns the page behind the recommendation, relative to the recommended brand, one label each, checked in this order: own site (the brand's own domain), retailer (Amazon, Walmart, Best Buy, app stores), review platform (G2, Capterra, Trustpilot, Yelp, Clutch), social media (YouTube, Reddit, X, LinkedIn, Quora, TikTok), other (government, education, Wikipedia), competitor (another brand in the same industry list; a competitor missing from the list counts as publisher), publisher (every other site: media, magazines, blogs); or no link | Link domain vs brand list and fixed lists of retail, review and social sites |
| Own site cited anywhere | Yes or no: the brand's domain appears anywhere among the answer's citations and links | Citations |
| Citations | Every cited URL, for the share of recommended brands that are also cited | Citations |
| Reach (RQ1 outcome) | Number of recommendations whose link is the page | Derived |

### Pages: technical SEO

| Measure | Recorded as | Source |
| --- | --- | --- |
| H1 count | Number of H1 tags | HTML |
| Skipped heading levels | Number of jumps of more than one level, such as H2 to H4 | HTML |
| Title length | Characters | HTML |
| Meta description length | Characters; 0 when missing | HTML |
| Structured data | Each schema.org type present, yes or no (Article, Product, Review, FAQPage, ItemList, HowTo, Organization, Person, BreadcrumbList, other), plus the number of types | JSON-LD, microdata, RDFa |
| Server response time | Seconds | PageSpeed Insights API (lab test, mobile) |
| Core Web Vitals, field | LCP (s), INP (ms), CLS, FCP (s), TTFB (s) from real Chrome users over 28 days; page level, or origin level (flagged) when the page has too little traffic | PageSpeed Insights API (CrUX), mobile |
| Speed, lab | Performance score, LCP, CLS, Total Blocking Time, FCP, Speed Index | PageSpeed Insights API (Lighthouse), mobile |
| Markdown for AI | A markdown version of the page (alternate link tag, .md URL, or a markdown reply to `Accept: text/markdown`) | HTTP requests |

### Pages: content

| Measure | Recorded as | Source |
| --- | --- | --- |
| Word count | Words of main content | Main content |
| H2 and H3 sections | Number of each | HTML |
| Lists, list items, tables | Number of each in the main content | HTML |
| External links | Links in the main content to other domains | HTML |
| Internal links | Links in the main content to the same domain | HTML |
| Broken links | Links in the main content, internal and external, whose address answers 404, 410 or a server error (5xx), or whose domain does not respond: the count, internal and external separately, and the share of links checked. Links that answer 401, 403 or 429, or time out, count as not checked | HTTP requests |
| Statistics | Figures written in digits (percentages, prices, counts, ratings) per 100 words; years and list numbers not counted | Main content |
| Author named | Yes or no: byline, author meta tag or schema author | HTML |
| Reviewer named | Yes or no: schema reviewedBy, or a “Reviewed by” or “Fact-checked by” line | HTML |
| Last updated | Date (schema dateModified, article:modified_time or a visible “Updated” date, else the published date) and age in days at collection; “no date” when none is shown | HTML |
| First person singular | I, me, my, mine, myself per 100 words | Main content |
| First person plural | We, us, our, ours, ourselves per 100 words; “US” in capitals not counted | Main content |
| Title wording | Yes or no for each: contains “best”, a year, a number | Title tag |
| H1 wording | Yes or no for each: contains “best”, a year, a number, I, we | H1 |

### Brands on a page

Recorded for every brand a page names, recommended or not, so recommended brands can be compared with the others on the same page (RQ2).

| Measure | Recorded as | Source |
| --- | --- | --- |
| Position | Order of first appearance among the page's brands (1 = first), and that order divided by the number of brands | Main content |
| Section | Which H2 the brand first appears under (1st, 2nd, 3rd …), and the level of its own heading: H2, H3 or none | HTML |
| Words on the brand | Words in the brand's own section | Main content |
| Share of words | Words on the brand divided by words on all brands on the page, and its ratio to the average of the other brands | Main content |
| Price shown | Yes or no: a price or plan in the brand's section | Main content |
| Criticism | Yes or no: the page criticizes the brand: a drawback, weakness, complaint or con, or who it does not suit; plain facts such as prices, fees, plan limits or fine print count only when the page presents them as a downside | Jev |

### Controls

| Measure | Recorded as | Source |
| --- | --- | --- |
| Domain rank | Backlink-based authority on a 0–1,000 scale | Backlink index |
| Page rank | Backlink-based authority of the URL, 0–1,000 | Backlink index |
| Page type | The page's format, kept apart from who owns it, one label each: listicle (several options, ranked or not, such as "best X", "top 10 X" or "X alternatives"), comparison (two or three named options side by side, such as "X vs Y"), review (an assessment of one product), article (an informational article that does not list or rank options, such as a how-to, an explainer or a buying guide), news (recent events, including press releases), homepage, product page (one product, plan or service), pricing page (one company's plans and prices), category page (a store page listing many products of one kind), directory (many companies with a profile each, such as G2, Clutch or Yelp), forum (a discussion thread, such as Reddit, Quora or a community), video, documentation (a help center or product documentation), other | Jev |
| Brand fame (RQ2) | The brand's own domain rank | Backlink index |
| Industry, engine, template | Taken from the prompt and the request | Prompt set |

## 6. Analysis plan

Each measure is tested on its own, with the same controls, so the report can say which ones matter and by how much.

| Part | Method | Reported as |
| --- | --- | --- |
| Descriptive (RQ3 and all measures) | Shares of page owners and of recommended brands also cited, by engine and industry; median and quartiles of every page measure | Shares with 95% bootstrap intervals (1,000 resamples, clustered by prompt); distribution charts |
| RQ1: page measures | Negative binomial regression of reach minus 1 on one measure plus log domain rank, log page rank, page type and industry; standard errors clustered by domain | Rate ratio per standard deviation (or yes vs no) with 95% interval |
| RQ2: brand on a page | Conditional logistic regression, one group per answer and a page behind one of its recommendations, on one measure plus brand fame; pages naming at least 2 brands | Odds ratio per standard deviation (or yes vs no) with 95% interval |
| Robustness | RQ1 with all page measures in one model, keeping one of any pair correlated above 0.8 | Rate ratios side by side |
| Splits | RQ1 and RQ2 rerun per engine (reach counted on that engine only); per industry, descriptive only | Same as above |

**Inference:** a measure counts as a finding when its 95% interval excludes 1 after Benjamini–Hochberg correction (false discovery rate 5%), applied separately to RQ1 and RQ2. Section 1 says when the thesis is supported. Results are reported as links, not proof of cause.

**Transformations:** counts and ranks enter as log(1 + x); continuous measures are standardised (mean 0, standard deviation 1) so their effects can be compared.

**Exclusions**, each counted in a flow table in the report:

- Answers still failing after two retries.
- Pages with no HTML after the fetch and up to three Oxylabs tries, and non-English pages.
- Pages with under 200 words of main content (blocked, image-only or app shells), from content measures only.
- Video pages (YouTube, TikTok) and Google search or shopping result links: kept in the link statistics, left out of the page measures.

**Missing data:** nothing is imputed. A page missing a measure leaves only that measure's model. Core Web Vitals use origin-level data when page-level data is missing, flagged in the data; “no date” is its own category for last updated.

**Exploratory analysis:** anything not listed here is labelled exploratory in the report. Code: Python with statsmodels; random seed 20261105.

## 7. Data quality

A person checks random samples against the automated values before analysis; each sample shows suggested marks from a second reader, which the person confirms or changes. A yes-or-no measure with agreement below kappa 0.7, or a count off by more than 10% on average, is reported as exploratory only.

| What is checked | Sample | Against |
| --- | --- | --- |
| Prompts follow the rules | 200 prompts | Section 3 rules |
| Recommended or only mentioned (Jev) | 30 answers | A person's reading |
| Link behind each recommendation and its page owner | 30 answers | A person's reading |
| Brand list: names and aliases | Every industry list | Brands found in a 20-answer sample |
| Page measures: headings, words, links, dates, author, reviewer | 30 pages | The page in a browser |
| Brand on a page: position, section, words, price | 30 pages | The page in a browser |
| Page type and criticism (Jev) | 30 pages | A person's reading |

**Pilot check, recommended or only mentioned:** once the recommendation rule was fixed, suggested marks for 130 brands in 30 new pilot answers were read and marked by a person. Agreement with Jev: 91.5%, kappa 0.82 (Perplexity 0.92, Gemini 0.86, Google AI Mode 0.78, ChatGPT 0.56).

**Pilot check, pages:** suggested marks for 30 pilot pages behind recommendations were read and marked by a person. Agreement with the study's values: page type 93%, kappa 0.92; page owner 97%, kappa 0.96. Criticism reached 74%, kappa 0.51, because the first question also counted plain facts such as prices, fees and plan limits as negative; the question was narrowed to real criticism (kappa 0.85 on the same pages) and then checked on 20 new pages, where suggested marks for 61 brands were read and marked by a person: agreement 98%, kappa 0.97. A person also reviewed all 668 brands in the 40 industry brand lists and flagged none.

**Fixed settings:** Jev is pinned to jev-1.14.0 and the Claude model to claude-sonnet-5-5; every response records the model that answered. Prompts, settings and code are frozen at pre-registration.

## 8. Limitations

- **One****market.** Answers change over time and by place; this is one collection run, from the US, in English.
- **Logged-out answers.** Logged-in and personalised answers can differ.
- **Automated judgments.** Brand matching, recommended-or-mentioned, page type and criticism are automated; the hand-checks in section 7 measure their error. Jev can also give a different label when the same question is asked again: two reruns of the recommended-or-mentioned step on the same pilot answers changed 36 and 45 of 1,852 labels (about 2%), and agreement with the person's reading stayed at kappa 0.82.
- **Link attribu****tion****.** All four engines show where each citation sits; a citation in a part of the answer that names no brand is given to the brand whose list item or section it sits in, which can be wrong; the hand-check in section 7 measures how often.
- **Field speed data.** Real-user Core Web Vitals exist only for pages and sites with enough Chrome traffic; the rest rely on origin-level or lab data.

**Outputs**

- **Pre-registration:** a dated GitHub commit of this protocol, the prompt set, the settings file and the code, made before collection.
- **Report:** findings and charts on snoika.com Reports.
- **Public dataset:** prompts, recommendations with their links, and the page and brand-on-page measures.
- **Code:** the n8n workflows with their JavaScript, and the Python analysis script, on GitHub.
- **Not released:** API keys and stored copies of other sites' pages.

## Appendix A: Industries and subcategories

Forty industries in six groups, each with five subcategories; every subcategory gets 20 prompts (4 per template).

| # | Group | Industry | Subcategories |
| --- | --- | --- | --- |
| 1 | Software and AI | CRM and sales software | CRM; sales engagement; B2B contact data; proposal software; sales call recording |
| 2 | Software and AI | Marketing, SEO and AI visibility tools | SEO tools; AI search visibility tracking; email marketing; social media management; marketing automation |
| 3 | Software and AI | Project management and collaboration | Project management; team chat; video conferencing; online whiteboards; team wikis |
| 4 | Software and AI | HR, payroll and recruiting | Payroll; HR platforms; applicant tracking; employee scheduling; time tracking |
| 5 | Software and AI | Accounting and invoicing | Small-business accounting; invoicing; expense management; accounts payable automation; online bookkeeping services |
| 6 | Software and AI | Customer support | Help desks; live chat; AI customer service agents; contact center software; customer survey tools |
| 7 | Software and AI | E-commerce platforms | Online store builders; B2B e-commerce; print on demand; dropshipping suppliers; shipping software |
| 8 | Software and AI | Website builders and hosting | Website builders; shared web hosting; managed WordPress hosting; domain registrars; cloud hosting |
| 9 | Software and AI | Business cybersecurity | Endpoint protection; email security; single sign-on; security awareness training; business VPN |
| 10 | Software and AI | AI assistants and creative AI tools | AI chat assistants; AI writing tools; AI image generators; AI video generators; AI meeting note-takers |
| 11 | Finance | Banks and neobanks | Checking accounts; high-yield savings; business bank accounts; kids' debit cards; CDs |
| 12 | Finance | Payments | Online payment processing; POS systems; international money transfer; buy now, pay later; peer-to-peer payment apps |
| 13 | Finance | Investing and trading apps | Brokerage apps; robo-advisors; IRA providers; crypto exchanges; stock research tools |
| 14 | Finance | Credit cards and loans | Travel credit cards; cash-back cards; personal loans; student loan refinancing; mortgage lenders |
| 15 | Finance | Insurance | Car insurance; home insurance; renters insurance; life insurance; pet insurance |
| 16 | Finance | Tax and personal finance apps | Tax filing software; budgeting apps; credit monitoring; crypto tax software; tax tracking for freelancers |
| 17 | Consumer tech | Smartphones | Flagship phones; budget phones; camera phones; foldable phones; phones for seniors |
| 18 | Consumer tech | Laptops | Student laptops; gaming laptops; business laptops; 2-in-1 laptops; laptops for video editing |
| 19 | Consumer tech | Headphones and speakers | Noise-cancelling headphones; wireless earbuds; Bluetooth speakers; soundbars; running headphones |
| 20 | Consumer tech | Smart home and cameras | Home security cameras; video doorbells; smart thermostats; smart locks; mesh Wi-Fi |
| 21 | Consumer tech | TVs, monitors and streaming devices | OLED TVs; budget 4K TVs; streaming devices; projectors; computer monitors |
| 22 | Consumer tech | Gaming | Gaming consoles; gaming headsets; gaming chairs; gaming monitors; gaming mice and keyboards |
| 23 | Apps and subscriptions | Online security and privacy apps | VPNs; password managers; antivirus; identity theft protection; parental control apps |
| 24 | Apps and subscriptions | Video and music streaming | Video streaming; music streaming; live TV streaming; audiobook apps; podcast apps |
| 25 | Apps and subscriptions | Language learning and online courses | Language apps; online course platforms; coding bootcamps; test prep; online tutoring |
| 26 | Apps and subscriptions | Fitness and health apps | Workout apps; meditation apps; fitness trackers; sleep tracking apps; online therapy |
| 27 | Apps and subscriptions | Mobile and internet providers | Mobile carriers; prepaid plans; home internet; 5G home internet; satellite internet |
| 28 | Shopping | Online stores and marketplaces | Marketplaces for used goods; refurbished electronics; secondhand fashion; deal and cashback sites; photo printing services |
| 29 | Shopping | Fashion | Men's clothing; women's workwear; sustainable clothing; jeans; clothing subscriptions |
| 30 | Shopping | Running shoes and sportswear | Road running shoes; trail running shoes; walking shoes; sports bras; gym clothes |
| 31 | Shopping | Beauty and skincare | Acne skincare; sunscreen; anti-aging serums; hair care; men's razors |
| 32 | Shopping | Home appliances | Robot vacuums; espresso machines; air purifiers; air fryers; washing machines |
| 33 | Shopping | Furniture and mattresses | Mattresses; office chairs; standing desks; sofas; bed sheets |
| 34 | Shopping | Baby and kids | Strollers; car seats; baby monitors; diapers; kids' tablets |
| 35 | Shopping | Pet products | Dog food; cat food; cat litter; GPS pet trackers; online pet stores |
| 36 | Travel, mobility and food | Hotels and travel booking | Hotel booking sites; flight search sites; vacation rentals; cruise lines; tour booking |
| 37 | Travel, mobility and food | Airlines | Domestic airlines; budget airlines; transatlantic business class; airline loyalty programs; flying with pets |
| 38 | Travel, mobility and food | Cars and EVs | Electric cars; family SUVs; hybrid cars; pickup trucks; car rental |
| 39 | Travel, mobility and food | Food and drink delivery | Meal kits; food delivery apps; prepared meal delivery; grocery delivery; coffee subscriptions |
| 40 | Travel, mobility and food | Outdoor and travel gear | Camping tents; hiking backpacks; carry-on luggage; hiking boots; rain jackets |

## Appendix B: Seeding prompt

Sent once per subcategory (200 calls) to claude-sonnet-5-5 at its default temperature; the words in braces are filled from Appendix A.

```text
You write test questions for a research study on how AI assistants recommend brands.

Industry: {industry}
Subcategory: {subcategory}
Market: United States. Language: US English.

Write 40 questions, 8 for each of the 5 templates below. Each question is one a real
US buyer would type into ChatGPT, Gemini, Perplexity or Google AI Mode while choosing
a product or service in this subcategory.

Templates
1. Best overall: asks for the best option in the subcategory.
2. Best for a buyer: names who is buying or their situation (team size, role,
   skill level, life stage, use case).
3. Must-have feature: names one specific feature, integration, spec or requirement.
4. Budget: names a price limit, a free option or a low-cost tier.
5. Problem: describes a problem or goal in the buyer's own words, then asks what to use.

Rules for every question
- A good answer must name specific brands or products. If "it depends" with no brand
  is a fair answer, do not write the question.
- Ask which brand, company, product, platform, app, service, provider or store to
  choose. If naming only a type or style of product could answer the question,
  rewrite it to ask for the brand, for example "Which brand makes the best ...".
- Do not name any brand, product or company.
- No years, dates, cities, states or "near me".
- No how-to, definition or comparison questions.
- Stay inside {subcategory}.
- Every question differs from the others in buyer, feature, budget or problem.
  Vary the opening words.

Examples (from another subcategory; do not copy their wording)
Good: "Which CRM is best for a 10-person real estate agency?"
Good: "Which brand makes the best hiking backpack for a week-long trip?"
Bad: "What is the best backpack for hiking?" (a type of backpack could answer it)
Bad: "What is a CRM?" (a good answer names no brand)
Bad: "Is HubSpot better than Salesforce?" (names brands)
Bad: "Best CRM 2026" (not a question; has a year)

Return only JSON: [{"template": 1, "question": "..."}, ...]
```

## Appendix C: Jev questions

Jev (jev-1.14.0) answers each question against one state: the prompt, the answer text, or the page's main content cut to fit Jev's input limit. Yes-or-no questions return a score from 0 to 1; 0.5 or higher counts as yes.

| Step | Type | Question, exact wording | State |
| --- | --- | --- | --- |
| Prompt filter | Yes or no | Would a good answer to `prompt` name specific brands or products for the reader to choose from? | Candidate prompt |
| Prompt filter | Yes or no | Does `prompt` read like a question a real US buyer would ask an AI assistant before choosing a product or service? | Candidate prompt |
| Prompt filter | Yes or no | Is `prompt` about {subcategory} in the {industry} industry? | Candidate prompt |
| Prompt filter | Yes or no | Is `prompt` free of any brand, product or company name? | Candidate prompt |
| Prompt filter | Yes or no | Does prompt explicitly ask which brand, company, product, platform, app, service, provider or store to choose, so that naming only a type or style of product would not answer it? | Candidate prompt |
| Brand offered as an option | Yes or no | Does `answer` recommend {brand} to the reader as an option to choose, rather than only mentioning it? | Answer text |
| Answer names its own pick | Yes or no | Does `answer` say which brand or brands it recommends, such as a top pick, "I recommend", "I would shortlist" or "the best choices are", rather than only listing options or saying it depends? | Answer text |
| Brand is one of the picks | Yes or no | Is {brand} one of the brands that `answer` names as its own choice: its top pick, the brand or brands it says it recommends, or the short list it says to choose from (for example "I would shortlist X, Y and Z", "the top choices are X and Y", "Top recommended")? Answer no if {brand} is only a further option, an alternative, or named best only for a particular situation or type of buyer. | Answer text |
| Page type | Choice | What kind of page is `page`, by its format (not by who owns it): listicle, comparison, review, article, news, homepage, product page, pricing page, category page, directory, forum, video, documentation or other? Each option carries its one-line definition from the Page type row in section 5. | Page main content |
| Criticism | Yes or no | Does `page` criticize {brand}: does it state a drawback, weakness, complaint or con of {brand}, or say who {brand} does not suit? Answer no for plain facts such as prices, fees, plan limits, what a plan does not include, availability or fine print, unless the page presents them as a downside of {brand}. | Page main content |
