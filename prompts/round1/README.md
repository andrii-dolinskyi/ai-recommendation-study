# First seeding round (replaced)

These files are the first prompt set and are kept as a record. They are not used in the study.

- `prompts.csv`: the 3,998 prompts kept in round 1, with the score of the brand question added afterwards (`jev_asks_brand`) and the outcome (`round1_outcome`).
- `prompt_filter_log.csv`: every round-1 candidate and what happened to it in the filter.
- `handcheck_200.csv`: the 200-prompt hand-check sample, marked with the brand rule.

**Why the round was replaced.** The hand-check found prompts that asked for "the best [product]" without asking for a brand, so an answer could name only a type of product. Jev scored all 3,998 prompts on the question "Does the prompt explicitly ask which brand, company, product, platform, app, service, provider or store to choose, so that naming only a type or style of product would not answer it?" and 577 prompts (14.4%) scored below 0.5. In the 200-prompt sample, 175 passed and 25 failed.

**What changed for round 2.** The brand rule was added to the seeding prompt and as a fifth Jev question in the filter. Three industries were renamed so their subcategories fit the name (21, 23 and 39), and "Chromebooks" was replaced with "2-in-1 laptops". The whole set was then seeded and filtered again.
