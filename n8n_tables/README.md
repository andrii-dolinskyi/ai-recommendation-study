# n8n tables

Copies of the study's n8n tables that are not split by batch, exported when the run ended and the tables were emptied in n8n.

| File | Contents |
| --- | --- |
| `brands.csv` | Every brand list row: the reviewed pilot lists (`pilot`) and the full-run list (`full`: pilot lists copied per industry plus the additions drafted from each batch) |
| `redirects.csv` | Google redirect links found in answers and the address each one resolved to |
| `candidates.csv` | Every candidate question drafted before filtering, with the model and time it was drafted |

The brand list the analysis uses is `data/brands.csv` (the `full` list). The final prompts and their filter log are in `prompts/`.
