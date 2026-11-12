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

The dataset is added after collection.

## Pre-registration

The protocol, the final prompt set and the code are committed and tagged `preregistration` before any study answer is collected. Anything analysed beyond the protocol is labelled exploratory in the report.

## Not released

API keys and stored copies of other websites' pages.
