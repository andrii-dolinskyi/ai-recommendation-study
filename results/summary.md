# Analysis summary

Run: full

## Flow

- pages_behind_recommendations: 23137
- social_media_pages_left_out: 941
- social_media_pages_left_out: reddit.com: 713
- social_media_pages_left_out: youtube.com: 114
- social_media_pages_left_out: facebook.com: 54
- social_media_pages_left_out: medium.com: 25
- social_media_pages_left_out: linkedin.com: 17
- social_media_pages_left_out: instagram.com: 11
- social_media_pages_left_out: tiktok.com: 6
- social_media_pages_left_out: pinterest.com: 1
- video_or_google_results_not_fetched: 111
- pages_in_page_table: 22085
- failed_no_html: 866
- non_english: 122
- measured_english: 21097
- under_200_words_content_excluded: 2157
- answers: 16000
- brand_mentions: 80742
- recommended: 42838
- rq2_rows: 234208
- rq2_groups: 26490

## Thesis support

Supported.

## RQ1 pooled

| measure                | family    | kind   |   n_pages |   n_domains |   rate_ratio |   ci_low |   ci_high |           p |        q_bh | finding   |
|:-----------------------|:----------|:-------|----------:|------------:|-------------:|---------:|----------:|------------:|------------:|:----------|
| h1_count               | technical | count  |     21095 |        7368 |     0.989111 | 0.945427 |  1.03481  | 0.634717    | 0.728647    | False     |
| heading_skips          | technical | count  |     21095 |        7368 |     0.972916 | 0.932845 |  1.01471  | 0.200685    | 0.453071    | False     |
| title_chars            | technical | cont   |     21095 |        7368 |     0.971268 | 0.933584 |  1.01047  | 0.148743    | 0.389743    | False     |
| meta_desc_chars        | technical | cont   |     21095 |        7368 |     0.983699 | 0.947706 |  1.02106  | 0.387478    | 0.589592    | False     |
| n_schema_types         | technical | count  |     21095 |        7368 |     1.03183  | 0.989887 |  1.07555  | 0.138896    | 0.389743    | False     |
| schema_Article         | technical | bool   |     21095 |        7368 |     1.06811  | 0.925493 |  1.23269  | 0.367551    | 0.589592    | False     |
| schema_Product         | technical | bool   |     21095 |        7368 |     1.10522  | 0.934576 |  1.30703  | 0.242303    | 0.493926    | False     |
| schema_Review          | technical | bool   |     21095 |        7368 |     1.09821  | 0.914463 |  1.31888  | 0.315943    | 0.589592    | False     |
| schema_FAQPage         | technical | bool   |     21095 |        7368 |     1.14795  | 1.04281  |  1.26369  | 0.00487192  | 0.0258212   | True      |
| schema_ItemList        | technical | bool   |     21095 |        7368 |     0.961469 | 0.827406 |  1.11725  | 0.608052    | 0.728647    | False     |
| schema_HowTo           | technical | bool   |     21095 |        7368 |     1.122    | 0.800256 |  1.5731   | 0.50436     | 0.703449    | False     |
| schema_Organization    | technical | bool   |     21095 |        7368 |     1.04625  | 0.95553  |  1.14558  | 0.328571    | 0.589592    | False     |
| schema_Person          | technical | bool   |     21095 |        7368 |     1.05624  | 0.967852 |  1.1527   | 0.219764    | 0.4659      | False     |
| schema_BreadcrumbList  | technical | bool   |     21095 |        7368 |     0.990542 | 0.912569 |  1.07518  | 0.820287    | 0.869504    | False     |
| schema_other           | technical | bool   |     21095 |        7368 |     0.977367 | 0.892446 |  1.07037  | 0.621565    | 0.728647    | False     |
| lab_server_response_ms | technical | cont   |     20908 |        7342 |     0.992108 | 0.963613 |  1.02144  | 0.59408     | 0.728647    | False     |
| lcp_s                  | technical | cont   |     18916 |        5844 |     0.95222  | 0.916733 |  0.989081 | 0.0115188   | 0.0554997   | False     |
| inp_ms                 | technical | cont   |     17811 |        5426 |     1.00389  | 0.97809  |  1.03037  | 0.770202    | 0.833075    | False     |
| cls                    | technical | cont   |     19009 |        5862 |     1.01636  | 0.98076  |  1.05325  | 0.37236     | 0.589592    | False     |
| fcp_s                  | technical | cont   |     19021 |        5865 |     0.929821 | 0.891531 |  0.969755 | 0.00069527  | 0.00460616  | True      |
| ttfb_s                 | technical | cont   |     18650 |        5754 |     0.942256 | 0.904677 |  0.981396 | 0.00417841  | 0.0246062   | True      |
| lab_score              | technical | cont   |     20499 |        7327 |     0.955767 | 0.916535 |  0.99668  | 0.0343851   | 0.140185    | False     |
| lab_lcp_s              | technical | cont   |     20503 |        7330 |     1.01358  | 0.970657 |  1.0584   | 0.541195    | 0.728647    | False     |
| lab_cls                | technical | cont   |     21017 |        7357 |     1.02392  | 0.991143 |  1.05778  | 0.154426    | 0.389743    | False     |
| lab_tbt_ms             | technical | cont   |     20503 |        7330 |     0.99011  | 0.956594 |  1.0248   | 0.571627    | 0.728647    | False     |
| lab_fcp_s              | technical | cont   |     20623 |        7340 |     1.0327   | 0.995134 |  1.07168  | 0.0887596   | 0.317235    | False     |
| lab_si_s               | technical | cont   |     20619 |        7337 |     0.964168 | 0.923647 |  1.00647  | 0.095769    | 0.317235    | False     |
| markdown_version       | technical | bool   |     21095 |        7368 |     1.16344  | 1.01683  |  1.3312   | 0.027607    | 0.121931    | False     |
| word_count             | content   | count  |     18939 |        6763 |     1.09522  | 1.04328  |  1.14975  | 0.000243243 | 0.00184169  | True      |
| h2_count               | content   | count  |     18939 |        6763 |     1.09954  | 1.0534   |  1.1477   | 1.43604e-05 | 0.00012685  | True      |
| h3_count               | content   | count  |     18939 |        6763 |     1.03553  | 0.994017 |  1.07877  | 0.0944246   | 0.317235    | False     |
| lists                  | content   | count  |     18939 |        6763 |     0.980727 | 0.938982 |  1.02433  | 0.380536    | 0.589592    | False     |
| list_items             | content   | count  |     18939 |        6763 |     0.990364 | 0.950259 |  1.03216  | 0.646159    | 0.728647    | False     |
| tables                 | content   | count  |     18939 |        6763 |     1.00027  | 0.954024 |  1.04876  | 0.990999    | 0.990999    | False     |
| external_links         | content   | count  |     18939 |        6763 |     0.963784 | 0.914546 |  1.01567  | 0.167962    | 0.404637    | False     |
| internal_links         | content   | count  |     18939 |        6763 |     1.03793  | 0.991637 |  1.08637  | 0.109778    | 0.342248    | False     |
| links_broken           | content   | count  |     18939 |        6763 |     0.982664 | 0.946174 |  1.02056  | 0.36504     | 0.589592    | False     |
| broken_share           | content   | cont   |     17254 |        6361 |     1.02609  | 0.986009 |  1.06781  | 0.205164    | 0.453071    | False     |
| statistics_per_100     | content   | rate   |     18939 |        6763 |     0.983949 | 0.948355 |  1.02088  | 0.389353    | 0.589592    | False     |
| author_named           | content   | bool   |     18939 |        6763 |     1.04326  | 0.935894 |  1.16294  | 0.444688    | 0.648441    | False     |
| reviewer_named         | content   | bool   |     18939 |        6763 |     1.01163  | 0.85611  |  1.19541  | 0.891973    | 0.915667    | False     |
| age_days               | content   | count  |     13922 |        5099 |     0.840253 | 0.804068 |  0.878067 | 9.20098e-15 | 1.62551e-13 | True      |
| no_date                | content   | bool   |     18939 |        6763 |     0.940829 | 0.84076  |  1.05281  | 0.287744    | 0.564831    | False     |
| fp_singular_per_100    | content   | rate   |     18939 |        6763 |     1.01315  | 0.979188 |  1.04829  | 0.452685    | 0.648441    | False     |
| fp_plural_per_100      | content   | rate   |     18939 |        6763 |     0.997615 | 0.961717 |  1.03485  | 0.898391    | 0.915667    | False     |
| title_has_best         | content   | bool   |     18939 |        6763 |     1.46366  | 1.33083  |  1.60975  | 4.22452e-15 | 1.1195e-13  | True      |
| title_has_year         | content   | bool   |     18939 |        6763 |     1.65946  | 1.52415  |  1.80677  | 1.7754e-31  | 9.40963e-30 | True      |
| title_has_number       | content   | bool   |     18939 |        6763 |     0.979025 | 0.894428 |  1.07162  | 0.645704    | 0.728647    | False     |
| h1_has_best            | content   | bool   |     18939 |        6763 |     1.35045  | 1.21831  |  1.49692  | 1.07483e-08 | 1.13932e-07 | True      |
| h1_has_year            | content   | bool   |     18939 |        6763 |     1.49747  | 1.3391   |  1.67457  | 1.44199e-12 | 1.91063e-11 | True      |
| h1_has_number          | content   | bool   |     18939 |        6763 |     0.977821 | 0.895368 |  1.06787  | 0.61776     | 0.728647    | False     |
| h1_has_i               | content   | bool   |     18939 |        6763 |     0.947748 | 0.729916 |  1.23059  | 0.687119    | 0.758694    | False     |
| h1_has_we              | content   | bool   |     18939 |        6763 |     1.13035  | 0.955244 |  1.33757  | 0.153632    | 0.389743    | False     |

## RQ2 pooled

| measure         |   n_rows |   n_groups |   odds_ratio |   ci_low |   ci_high |           p |        q_bh | finding   |
|:----------------|---------:|-----------:|-------------:|---------:|----------:|------------:|------------:|:----------|
| position        |   225808 |      25038 |     0.368643 | 0.36361  |  0.373746 | 0           | 0           | True      |
| position_share  |   225808 |      25038 |     0.418405 | 0.41322  |  0.423655 | 0           | 0           | True      |
| h2_index        |   225808 |      25038 |     0.31522  | 0.309066 |  0.321497 | 0           | 0           | True      |
| own_heading_h2  |   225808 |      25038 |     6.71186  | 6.40924  |  7.02876  | 0           | 0           | True      |
| own_heading_h3  |   225808 |      25038 |     4.93053  | 4.74576  |  5.12249  | 0           | 0           | True      |
| section_words   |   225808 |      25038 |     3.08994  | 3.03095  |  3.15008  | 0           | 0           | True      |
| share_words     |   197358 |      20757 |     1.88438  | 1.85574  |  1.91346  | 0           | 0           | True      |
| ratio_to_others |   189039 |      18707 |     3.20692  | 2.79737  |  3.67643  | 9.91078e-63 | 9.91078e-63 | True      |
| price_shown     |   225808 |      25038 |     4.38979  | 4.24659  |  4.53783  | 0           | 0           | True      |

## Exploratory (below the hand-check bar, outside the correction and the thesis rule)

| measure   |   n_rows |   n_groups |   odds_ratio |   ci_low |   ci_high |            p | engine         |
|:----------|---------:|-----------:|-------------:|---------:|----------:|-------------:|:---------------|
| criticism |   225456 |      25036 |      4.01684 |  3.89314 |   4.14447 | 0            | all            |
| criticism |    32924 |       4878 |      3.58195 |  3.28906 |   3.90091 | 6.51599e-189 | chatgpt        |
| criticism |    56321 |       5985 |      4.04461 |  3.831   |   4.27013 | 0            | gemini         |
| criticism |    38521 |       4709 |      4.53253 |  4.23668 |   4.84905 | 0            | google_ai_mode |
| criticism |    97690 |       9464 |      3.85768 |  3.65002 |   4.07716 | 0            | perplexity     |

## Not estimated (too little data)

0 models; see not_estimated.csv.
