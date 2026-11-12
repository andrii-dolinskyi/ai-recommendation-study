# Workflows

Every collection and measurement step runs as an n8n workflow. Each one starts with a **Run Settings** node (run name `pilot` or `full`, limits, retry switch) and is safe to run again: rows already done are skipped. Results are stored in n8n data tables and exported for analysis.

| Step | Workflow | What it does |
| --- | --- | --- |
| 1 | AIRS 1 · Seed prompts | Claude Sonnet 5.5 writes 40 candidate questions per subcategory |
| 2 | AIRS 2 · Filter prompts | Text rules, duplicate check, five Jev questions, keeps the best 4 per template and subcategory |
| 3 | AIRS 3 · Submit prompts to engines | Sends prompts to ChatGPT, Gemini and Google AI Mode through Oxylabs (US) |
| 3P | AIRS 3P · Perplexity answers | Sends prompts to Perplexity's Sonar API (model `sonar`, web search, US) |
| 4 | AIRS 4 · Fetch answers | Collects finished Oxylabs jobs: answer text, citations and links |
| 5 | AIRS 5 · Brand lists | Claude Sonnet 5.5 drafts each industry's brand list from the answers |
| 5b | AIRS 5b · Clean brand aliases | Fixed alias rules (short and everyday-word aliases) |
| 6a | AIRS 6a · Resolve Google redirects | Turns google.com/goto source links into the real page address |
| 6 | AIRS 6 · Recommendations and links | Finds brands in answers; Jev answers whether the answer names its own pick, whether each brand is one of its picks and whether each is offered as an option; the recommendation rule labels each brand recommended or only mentioned; attaches each link and labels who owns the page relative to the recommended brand, one of: own site, competitor, publisher, retailer, review platform, social media, other |
| 7 | AIRS 7 · Pages (with 7s, 7m) | Fetches every page behind a recommendation (Oxylabs from the United States when blocked, empty or sent to another language version: a plain or rendered request, then a mobile one, then the other mode), measures it, checks its links, Jev page type (format, one of: listicle, comparison, review, article, news, homepage, product page, pricing page, category page, directory, forum, video, documentation, other) and criticism |
| 7p | AIRS 7p · PageSpeed | PageSpeed Insights (mobile): real-user Core Web Vitals and lab results |
| 8 | AIRS 8 · Ranks | Backlink-based domain and page ranks (0 to 1,000) |

`code/` holds the JavaScript that runs inside the Code nodes, as tested outside n8n:

- `recs_core.js`: brand matching in answers, ChatGPT ad removal, link attribution (step 6)
- `brand_clean.js`: alias rules (step 5b)
- `step6_pick_questions.js`, `step6_attribute_links.js`: the top-pick questions and the recommendation rule (step 6)
- `pages_core.js`: HTML parsing, main-content extraction and every page and brand-on-page measure (step 7)
- `step7/`: page fetch with the Oxylabs fallback, broken-link check, Jev questions, row packing, page queue, and the PageSpeed queue and parsing

Credentials (Oxylabs, Perplexity, Anthropic, Jev, PageSpeed, ranks) are stored in n8n and are not part of this repository.
