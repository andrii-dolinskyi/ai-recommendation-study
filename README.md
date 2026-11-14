# AI Recommendation Study

**Thesis:** The quality of a webpage impacts decisions of ChatGPT, Perplexity, Gemini, and Google AI Mode to recommend brands.

The study sends 4,000 US buyer questions from 40 industries to four AI engines (16,000 answers), finds every brand the engines recommend and the page behind each recommendation, then measures those pages' technical SEO and content.

## What is in this repository

| Folder | Contents |
| --- | --- |
| `protocol/` | The study protocol: research questions, design, prompt set, procedure, measures and analysis plan |
| `prompts/` | The 40 industries and 200 subcategories, the exact prompt used to seed candidate questions, and the final 4,000 prompts with their filter log |
| `workflows/` | The collection and measurement steps (n8n) and the JavaScript that runs inside them |
| `analysis/` | The Python analysis script (models, corrections and the thesis rule from the protocol) |
| `settings/` | The fixed settings of the run: engines and how each is asked, models, questions, labels, fetch rules and analysis constants |
| `pilot/` | The 100 pilot prompts and the pilot quality checks |
| `data/` | The dataset: one folder per batch (`full1` to `full4`, 10 industries each) with the recommendations and mentions, links, answer flags, pages, brands on pages, PageSpeed results, ranks and fetch log; `brands.csv` is the full-run brand list |
| `n8n_tables/` | Copies of the other n8n tables (all brand list rows, Google redirects, drafted candidate questions), exported when the run ended |

The analysis reads `data/` with all batch folders: `python analysis/analysis.py data out --run full`.

## Pre-registration

The protocol, the final prompt set and the code are committed and tagged `preregistration` before any study answer is collected. Anything analysed beyond the protocol is labelled exploratory in the report.

## Not released

API keys, the engines' answer texts (`answers.csv`, kept by the study team; the released tables give the brands, recommendations, links and measures taken from them) and stored copies of other websites' pages.
