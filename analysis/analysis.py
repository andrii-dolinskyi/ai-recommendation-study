"""AI Recommendation Study: analysis plan (protocol section 6).

Usage:
  python analysis/analysis.py DATA_DIR OUT_DIR [--run full]

DATA_DIR holds the exported study tables as JSON ({"rows": [...]}) or CSV, directly or in one folder per batch
(DATA_DIR/full1/, DATA_DIR/full2/, ...; --run full then covers full1, full2, ...):
  mentions, links, flags, pages, page_brands, psi, ranks  (one file each, .json or .csv)
  prompts.csv                                             (the frozen prompt set)
OUT_DIR receives one CSV per result table and summary.md.

Every measure is tested on its own with the same controls:
  RQ1  page level   negative binomial regression of reach - 1 on one measure + log domain rank, log page rank,
                    page type and industry; standard errors clustered by domain; rate ratio per SD (or yes vs no).
  RQ2  brand level  conditional logistic regression, one group per answer and cited page, on one measure + brand
                    fame (log rank of the brand's own domain); pages naming at least 2 brands; odds ratio per SD.
Benjamini-Hochberg (FDR 5%) separately for RQ1 and RQ2; splits per engine; robustness model with all page measures.
"""
import argparse
import json
import re
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.discrete.conditional_models import ConditionalLogit
from statsmodels.stats.multitest import multipletests

SEED = 20261105
RESAMPLES = 1000
ENGINES = ["chatgpt", "gemini", "google_ai_mode", "perplexity"]
# one label each (pilot decision): who owns the page, relative to the recommended brand, and the page's format
PAGE_OWNERS = ["own_site", "competitor", "publisher", "retailer", "review_platform", "social_media", "other"]
PAGE_TYPES = ["listicle", "comparison", "review", "article", "news", "homepage", "product_page", "pricing_page",
              "category_page", "directory", "forum", "video", "documentation", "other"]
MIN_WORDS = 200
# social media pages (the sites step 6 labels social_media) stay in the link statistics but are left out of
# page measures: most Reddit pages return no text without a browser (decision after the second full-run batch)
SOCIAL_DOMAINS = ["youtube.com", "youtu.be", "linkedin.com", "reddit.com", "x.com", "twitter.com", "facebook.com",
                  "instagram.com", "tiktok.com", "quora.com", "medium.com", "pinterest.com"]

# measure name -> (kind, family); kind: count (log1p then SD), cont (SD), bool (yes vs no), rate (SD)
RQ1_MEASURES = {
    # technical
    "h1_count": ("count", "technical"), "heading_skips": ("count", "technical"),
    "title_chars": ("cont", "technical"), "meta_desc_chars": ("cont", "technical"),
    "n_schema_types": ("count", "technical"),
    **{f"schema_{t}": ("bool", "technical") for t in ["Article", "Product", "Review", "FAQPage", "ItemList", "HowTo",
                                                      "Organization", "Person", "BreadcrumbList", "other"]},
    "lab_server_response_ms": ("cont", "technical"),
    "lcp_s": ("cont", "technical"), "inp_ms": ("cont", "technical"), "cls": ("cont", "technical"),
    "fcp_s": ("cont", "technical"), "ttfb_s": ("cont", "technical"),
    "lab_score": ("cont", "technical"), "lab_lcp_s": ("cont", "technical"), "lab_cls": ("cont", "technical"),
    "lab_tbt_ms": ("cont", "technical"), "lab_fcp_s": ("cont", "technical"), "lab_si_s": ("cont", "technical"),
    "markdown_version": ("bool", "technical"),
    # content (pages with at least 200 words of main content)
    "word_count": ("count", "content"), "h2_count": ("count", "content"), "h3_count": ("count", "content"),
    "lists": ("count", "content"), "list_items": ("count", "content"), "tables": ("count", "content"),
    "external_links": ("count", "content"), "internal_links": ("count", "content"),
    "links_broken": ("count", "content"), "broken_share": ("cont", "content"),
    "statistics_per_100": ("rate", "content"), "author_named": ("bool", "content"), "reviewer_named": ("bool", "content"),
    "age_days": ("count", "content"), "no_date": ("bool", "content"),
    "fp_singular_per_100": ("rate", "content"), "fp_plural_per_100": ("rate", "content"),
    "title_has_best": ("bool", "content"), "title_has_year": ("bool", "content"), "title_has_number": ("bool", "content"),
    "h1_has_best": ("bool", "content"), "h1_has_year": ("bool", "content"), "h1_has_number": ("bool", "content"),
    "h1_has_i": ("bool", "content"), "h1_has_we": ("bool", "content"),
}
RQ2_MEASURES = {
    "position": ("count", "brand_on_page"), "position_share": ("cont", "brand_on_page"),
    "h2_index": ("count", "brand_on_page"), "own_heading_h2": ("bool", "brand_on_page"),
    "own_heading_h3": ("bool", "brand_on_page"), "section_words": ("count", "brand_on_page"),
    "share_words": ("cont", "brand_on_page"), "ratio_to_others": ("cont", "brand_on_page"),
    "price_shown": ("bool", "brand_on_page"), "criticism": ("bool", "brand_on_page"),
}
# measures the final hand-check put below kappa 0.7 (protocol section 7): fitted and reported as exploratory,
# outside the correction and the thesis rule
EXPLORATORY = {"criticism"}
RQ2_CONFIRM = {m: v for m, v in RQ2_MEASURES.items() if m not in EXPLORATORY}


# ------------------------------------------------------------------ loading
def load(data: Path, name: str) -> pd.DataFrame:
    """One study table: DATA_DIR/<name>.json or .csv, plus the same file in each batch folder (DATA_DIR/full1/, ...)."""
    frames = []
    for folder in [data] + sorted(p for p in data.iterdir() if p.is_dir()):
        for ext in (".json", ".csv"):
            p = folder / (name + ext)
            if p.exists():
                if ext == ".json":
                    raw = json.loads(p.read_text())
                    frames.append(pd.DataFrame(raw["rows"] if isinstance(raw, dict) else raw))
                else:
                    frames.append(pd.read_csv(p))
                break
    frames = [f for f in frames if len(f)]
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def in_run(runs: pd.Series, run: str) -> pd.Series:
    """Rows of the run, or of its batches (run 'full' covers full1, full2, ...)."""
    return runs.astype(str).str.fullmatch(re.escape(run) + r"\d*")


def as_bool(s: pd.Series) -> pd.Series:
    return s.map(lambda v: None if v is None or (isinstance(v, float) and np.isnan(v)) else str(v).lower() in ("true", "1", "yes"))


def norm_domain(d: str) -> str:
    return str(d or "").lower().replace("https://", "").replace("http://", "").removeprefix("www.").split("/")[0]


# ------------------------------------------------------------------ transforms
def transform(x: pd.Series, kind: str) -> pd.Series:
    x = pd.to_numeric(x if kind != "bool" else as_bool(x).astype("float"), errors="coerce")
    if kind == "bool":
        return x
    if kind == "count":
        x = np.log1p(x.clip(lower=0))
    sd = x.std()
    return (x - x.mean()) / sd if sd and np.isfinite(sd) else x * np.nan


# ------------------------------------------------------------------ bootstrap share
def share_ci(df: pd.DataFrame, value: str, by: list, cluster: str, rng) -> pd.DataFrame:
    rows = []
    groups = df.groupby(by) if by else [((), df)]
    for key, g in groups:
        agg = g.groupby(cluster)[value].agg(["sum", "count"])
        s, n = agg["sum"].to_numpy(float), agg["count"].to_numpy(float)
        if not len(s):
            continue
        idx = rng.integers(0, len(s), size=(RESAMPLES, len(s)))
        boots = s[idx].sum(1) / n[idx].sum(1)
        key = key if isinstance(key, tuple) else (key,)
        rows.append({**dict(zip(by, key)), "share": s.sum() / n.sum(), "ci_low": np.quantile(boots, .025),
                     "ci_high": np.quantile(boots, .975), "n": int(n.sum()), "prompts": len(s)})
    return pd.DataFrame(rows)


# ------------------------------------------------------------------ build analysis tables
def build(data: Path, run: str):
    prompts_file = data / "prompts.csv" if (data / "prompts.csv").exists() else data.parent / "prompts" / "prompts.csv"
    prompts = pd.read_csv(prompts_file, dtype=str)
    mentions, links, flags = load(data, "mentions"), load(data, "links"), load(data, "flags")
    pages, pbrands, psi, ranks = load(data, "pages"), load(data, "page_brands"), load(data, "psi"), load(data, "ranks")
    for df in (mentions, links, flags, pages, pbrands, psi, ranks):
        if "run" in df:
            df.drop(df.index[~in_run(df["run"], run)], inplace=True)
    mentions["recommended"] = as_bool(mentions["recommended"])
    links["recommended"] = as_bool(links["recommended"])
    # latest row per page; measured English pages only
    pages = pages.sort_values("measured_at").drop_duplicates("url_norm", keep="last")
    pages["english"] = as_bool(pages["english"])
    rank = {(r.kind, str(r.target)): r["rank"] for _, r in ranks.iterrows()} if len(ranks) else {}
    pages["domain_rank"] = pages["domain"].map(lambda d: rank.get(("domain", norm_domain(d)), np.nan))
    pages["page_rank"] = [rank.get(("page", str(f or u)), np.nan) for f, u in zip(pages["final_url"], pages["url"])]
    if len(psi):
        psi = psi.sort_values("fetched_at").drop_duplicates("url_norm", keep="last")
        pages = pages.merge(psi.drop(columns=[c for c in ("run", "url", "id", "fetched_at", "error") if c in psi]), on="url_norm", how="left")
    pages["no_date"] = pages["last_updated_source"].eq("no_date")
    # reach: recommendations whose link is the page, overall and per engine
    rec_links = links[links["recommended"] == True].drop_duplicates(["answer_id", "brand", "url_norm"])
    reach = rec_links.groupby("url_norm").size().rename("reach_all")
    per_engine = rec_links.groupby(["url_norm", "engine"]).size().unstack(fill_value=0).add_prefix("reach_")
    main_ind = rec_links.groupby(["url_norm", "industry_id"]).size().reset_index().sort_values(0).drop_duplicates("url_norm", keep="last")
    pages = pages.merge(reach, on="url_norm", how="left").merge(per_engine, on="url_norm", how="left")
    pages = pages.merge(main_ind[["url_norm", "industry_id"]].rename(columns={"industry_id": "industry"}), on="url_norm", how="left")
    for e in ENGINES:
        pages["reach_" + e] = pages.get("reach_" + e, 0)
        pages["reach_" + e] = pages["reach_" + e].fillna(0)
    # only pages behind recommendations are analysed (the page table can hold pages measured for other links);
    # the study measures websites: social media pages are counted here, by platform, and left out of page measures
    def social_site(u):
        h = norm_domain(u)
        return next((d for d in SOCIAL_DOMAINS if h == d or h.endswith("." + d)), "")
    rec_urls = pd.Series(rec_links["url_norm"].dropna().unique())
    rec_social = rec_urls.map(social_site)
    site_urls = set(rec_urls[rec_social.eq("")])
    in_set = pages["url_norm"].isin(site_urls)
    flow = {
        "pages_behind_recommendations": int(len(rec_urls)),
        "social_media_pages_left_out": int(rec_social.ne("").sum()),
    }
    for d, n in rec_social[rec_social.ne("")].value_counts().items():
        flow["social_media_pages_left_out: " + d] = int(n)
    flow.update({
        "video_or_google_results_not_fetched": int(len(site_urls) - in_set.sum()),
        "pages_in_page_table": int(in_set.sum()),
    })
    pages = pages[in_set].copy()
    flow.update({
        "failed_no_html": int((pages["status"] != "measured").sum()),
        "non_english": int(((pages["status"] == "measured") & (pages["english"] == False)).sum()),
    })
    pg = pages[(pages["status"] == "measured") & (pages["english"] != False)].copy()
    flow["measured_english"] = int(len(pg))
    flow["under_200_words_content_excluded"] = int((pd.to_numeric(pg["word_count"], errors="coerce") < MIN_WORDS).sum())
    # brand on page x answer groups
    brand_dom = {}
    for _, b in load(data, "brands").iterrows():
        ds = [norm_domain(d) for d in str(b.get("domains") or "").split("|") if d]
        if ds:
            brand_dom[(b["brand"], int(b["industry_id"]))] = ds[0]
    rec = mentions.set_index(["answer_id", "brand"])["recommended"].to_dict()
    # one group per answer and a page behind one of that answer's recommendations (links of only-mentioned brands are not used)
    pairs = rec_links.drop_duplicates(["answer_id", "url_norm"])[["answer_id", "url_norm", "engine", "industry_id", "prompt_id"]]
    pb = pbrands.drop_duplicates(["url_norm", "brand"])
    rq2 = pairs.merge(pb, on="url_norm", how="inner", suffixes=("", "_b"))
    rq2 = rq2[rq2["url_norm"].isin(pg["url_norm"])]
    rq2["y"] = [1 if rec.get((a, b)) is True else 0 for a, b in zip(rq2["answer_id"], rq2["brand"])]
    rq2["group"] = rq2["answer_id"] + "|" + rq2["url_norm"]
    rq2["own_heading_h2"] = rq2["own_heading"].eq("H2")
    rq2["own_heading_h3"] = rq2["own_heading"].eq("H3")
    rq2["brand_fame"] = [np.log1p(rank.get(("domain", brand_dom.get((b, int(i)), "")), np.nan)) for b, i in zip(rq2["brand"], rq2["industry_id_b"].fillna(rq2["industry_id"]))]
    rq2 = rq2[pd.to_numeric(rq2["n_brands"], errors="coerce") >= 2]
    return dict(prompts=prompts, mentions=mentions, links=links, flags=flags, pages=pg, rq2=rq2, flow=flow)


# ------------------------------------------------------------------ models
def drop_separated(X: pd.DataFrame, y: pd.Series) -> pd.DataFrame:
    """Drop constant columns, and control dummies whose rows all share one outcome value (they cannot be estimated)."""
    keep = []
    for c in X.columns:
        col = X[c]
        if col.std() == 0 or not np.isfinite(col.std()):
            continue
        if c.startswith(("type_", "ind_")) and y[col == 1].nunique() < 2:
            continue
        keep.append(c)
    return X[keep]


def fit_nb(y: np.ndarray, X: pd.DataFrame, groups):
    """Negative binomial with domain-clustered errors; if that fit is unstable, a negative binomial GLM with the
    dispersion fixed at the first fit's estimate (same model, steadier optimiser)."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        alpha = 1.0
        try:
            res = sm.NegativeBinomial(y, X.to_numpy(float)).fit(disp=0, maxiter=300, cov_type="cluster", cov_kwds={"groups": groups})
            alpha = float(res.params[-1]) if np.isfinite(res.params[-1]) and res.params[-1] > 0 else 1.0
            if np.all(np.isfinite(res.bse[:-1])):
                return res
        except Exception:
            pass
        try:
            return sm.GLM(y, X.to_numpy(float), family=sm.families.NegativeBinomial(alpha=alpha)).fit(cov_type="cluster", cov_kwds={"groups": groups})
        except Exception:
            return None


def rq1_model(pg: pd.DataFrame, measure: str, kind: str, family: str, outcome: str, extra=None):
    d = pg.copy()
    if family == "content":
        d = d[pd.to_numeric(d["word_count"], errors="coerce") >= MIN_WORDS]
    d["x"] = transform(d[measure], kind) if measure in d else np.nan
    d["y"] = pd.to_numeric(d[outcome], errors="coerce") - (1 if outcome == "reach_all" else 0)
    if outcome != "reach_all":
        d = d[pd.to_numeric(d[outcome], errors="coerce") > 0]
        d["y"] = pd.to_numeric(d[outcome], errors="coerce") - 1
    d["log_domain_rank"] = np.log1p(pd.to_numeric(d["domain_rank"], errors="coerce"))
    d["log_page_rank"] = np.log1p(pd.to_numeric(d["page_rank"], errors="coerce"))
    d = d.dropna(subset=["x", "y", "log_domain_rank", "log_page_rank"])
    if len(d) < 30 or d["x"].nunique() < 2:
        return None
    # a yes-or-no measure needs at least 10 pages on each side to be estimated
    if kind == "bool" and min((d["x"] == 1).sum(), (d["x"] == 0).sum()) < 10:
        return None
    # the outcome needs at least 10 pages cited more than once (or, per engine, more than once by that engine)
    if (d["y"] > 0).sum() < 10:
        return None
    # a yes-or-no measure with no page cited more than once on one side cannot be estimated (the rate ratio is 0 or infinite)
    if kind == "bool" and min((d.loc[d["x"] == 1, "y"] > 0).sum(), (d.loc[d["x"] == 0, "y"] > 0).sum()) == 0:
        return None
    X = pd.concat([d[["x", "log_domain_rank", "log_page_rank"]],
                   pd.get_dummies(d["page_type"].fillna("unknown"), prefix="type", drop_first=True, dtype=float),
                   pd.get_dummies(d["industry"].astype(str), prefix="ind", drop_first=True, dtype=float)], axis=1)
    X = drop_separated(X, d["y"])
    if "x" not in X:
        return None
    X = sm.add_constant(X, has_constant="add")
    groups = pd.factorize(d["domain"])[0]
    res = fit_nb(d["y"].to_numpy(float), X, groups)
    if res is None:
        return None
    # a fit that did not converge gives no estimate
    conv = res.converged if hasattr(res, "converged") else res.mle_retvals.get("converged", True)
    if not conv:
        return None
    i = list(X.columns).index("x")
    b, se = res.params[i], res.bse[i]
    if not np.isfinite(se):
        return None
    return {"measure": measure, "family": family, "kind": kind, "n_pages": len(d), "n_domains": int(len(set(groups))),
            "rate_ratio": float(np.exp(b)), "ci_low": float(np.exp(b - 1.96 * se)), "ci_high": float(np.exp(b + 1.96 * se)),
            "p": float(res.pvalues[i])}


def rq2_model(d: pd.DataFrame, measure: str, kind: str):
    d = d.copy()
    d["x"] = transform(d[measure], kind)
    d = d.dropna(subset=["x", "brand_fame"])
    var = d.groupby("group")["y"].agg(["min", "max"])
    keep = var.index[(var["min"] == 0) & (var["max"] == 1)]
    d = d[d["group"].isin(keep)]
    if d["group"].nunique() < 20 or d["x"].nunique() < 2:
        return None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            res = ConditionalLogit(d["y"].to_numpy(float), d[["x", "brand_fame"]].to_numpy(float), groups=d["group"].to_numpy()).fit(disp=0)
        except Exception:
            return None
    b, se = res.params[0], res.bse[0]
    return {"measure": measure, "n_rows": len(d), "n_groups": int(d["group"].nunique()),
            "odds_ratio": float(np.exp(b)), "ci_low": float(np.exp(b - 1.96 * se)), "ci_high": float(np.exp(b + 1.96 * se)),
            "p": float(res.pvalues[0])}


def bh(df: pd.DataFrame) -> pd.DataFrame:
    if not len(df):
        return df
    df = df.copy()
    rej, q, _, _ = multipletests(df["p"], alpha=0.05, method="fdr_bh")
    df["q_bh"], df["finding"] = q, rej
    return df


def robustness(pg: pd.DataFrame) -> pd.DataFrame:
    d = pg[pd.to_numeric(pg["word_count"], errors="coerce") >= MIN_WORDS].copy()
    cols = []
    for m, (kind, _) in RQ1_MEASURES.items():
        if m in d:
            d["x_" + m] = transform(d[m], kind)
            if d["x_" + m].notna().mean() > 0.9 and d["x_" + m].nunique() > 1:
                cols.append("x_" + m)
    corr = d[cols].corr().abs()
    keep = []
    for c in cols:  # keep one of any pair correlated above 0.8, in the order of the measure list
        if all(corr.loc[c, k] <= 0.8 for k in keep):
            keep.append(c)
    d["log_domain_rank"] = np.log1p(pd.to_numeric(d["domain_rank"], errors="coerce"))
    d["log_page_rank"] = np.log1p(pd.to_numeric(d["page_rank"], errors="coerce"))
    d["y"] = pd.to_numeric(d["reach_all"], errors="coerce") - 1
    d = d.dropna(subset=keep + ["y", "log_domain_rank", "log_page_rank"])
    X = pd.concat([d[keep + ["log_domain_rank", "log_page_rank"]],
                   pd.get_dummies(d["page_type"].fillna("unknown"), prefix="type", drop_first=True, dtype=float),
                   pd.get_dummies(d["industry"].astype(str), prefix="ind", drop_first=True, dtype=float)], axis=1)
    X = sm.add_constant(drop_separated(X, d["y"]), has_constant="add")
    if len(d) < 50:
        return pd.DataFrame()
    res = fit_nb(d["y"].to_numpy(float), X, pd.factorize(d["domain"])[0])
    if res is None:
        return pd.DataFrame()
    rows = []
    for i, c in enumerate(X.columns):
        if c.startswith("x_"):
            b, se = res.params[i], res.bse[i]
            rows.append({"measure": c[2:], "rate_ratio": np.exp(b), "ci_low": np.exp(b - 1.96 * se), "ci_high": np.exp(b + 1.96 * se), "p": res.pvalues[i], "n_pages": len(d)})
    return pd.DataFrame(rows)


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data"); ap.add_argument("out"); ap.add_argument("--run", default="full")
    a = ap.parse_args()
    data, out = Path(a.data), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)
    T = build(data, a.run)
    pg, rq2, mentions, links, flags = T["pages"], T["rq2"], T["mentions"], T["links"], T["flags"]

    # descriptive
    rec = mentions[mentions["recommended"] == True].copy()
    rec["also_cited"] = as_bool(rec["own_site_cited_anywhere"]).astype(float)
    desc = [share_ci(rec, "also_cited", ["engine"], "prompt_id", rng).assign(table="own site cited anywhere, recommended brands")]
    rl = links[links["recommended"] == True].copy()
    for t in PAGE_OWNERS:
        rl["is_" + t] = (rl["link_type"] == t).astype(float)
        desc.append(share_ci(rl, "is_" + t, ["engine"], "prompt_id", rng).assign(table="page owner share: " + t))
    if "page_type" in pg:  # format of the measured pages behind recommendations
        for t in PAGE_TYPES:
            pg["is_" + t] = (pg["page_type"] == t).astype(float)
        desc.append(pd.DataFrame([{"engine": "all", "share": pg["is_" + t].mean(), "n": len(pg), "table": "page type share: " + t} for t in PAGE_TYPES]))
    nolink = rec.assign(no_link=(pd.to_numeric(rec["n_links"], errors="coerce") == 0).astype(float))
    desc.append(share_ci(nolink, "no_link", ["engine"], "prompt_id", rng).assign(table="recommended brands with no link"))
    if "has_pick" in flags:  # answers that name their own pick (the rule then keeps only the picks)
        fl = flags[pd.to_numeric(flags["n_brands_mentioned"], errors="coerce") > 0].copy()
        fl["names_pick"] = as_bool(fl["has_pick"]).astype(float)
        desc.append(share_ci(fl, "names_pick", ["engine"], "prompt_id", rng).assign(table="answers naming their own pick"))
    pd.concat(desc).to_csv(out / "descriptive_shares.csv", index=False)
    meas = [m for m in list(RQ1_MEASURES) if m in pg]
    q = pg[meas].apply(lambda s: pd.to_numeric(as_bool(s) if s.dtype == object and set(map(str, s.dropna().unique())) <= {"True", "False", "true", "false"} else s, errors="coerce"))
    q.describe(percentiles=[.25, .5, .75]).T.to_csv(out / "page_measures_distribution.csv")

    # RQ1 and RQ2, pooled and per engine
    rq1 = pd.DataFrame([r for m, (k, f) in RQ1_MEASURES.items() if (r := rq1_model(pg, m, k, f, "reach_all"))])
    rq1 = bh(rq1); rq1.to_csv(out / "rq1_pooled.csv", index=False)
    rq2r = pd.DataFrame([r for m, (k, _) in RQ2_CONFIRM.items() if (r := rq2_model(rq2, m, k))])
    rq2r = bh(rq2r); rq2r.to_csv(out / "rq2_pooled.csv", index=False)
    rq2x = pd.DataFrame([{**r, "engine": e or "all"} for e in [None] + ENGINES for m, (k, _) in RQ2_MEASURES.items()
                         if m in EXPLORATORY and (r := rq2_model(rq2 if e is None else rq2[rq2["engine"] == e], m, k))])
    rq2x.to_csv(out / "rq2_exploratory.csv", index=False)
    split1, split2 = [], []
    for e in ENGINES:
        for m, (k, f) in RQ1_MEASURES.items():
            if (r := rq1_model(pg, m, k, f, "reach_" + e)):
                split1.append({**r, "engine": e})
        for m, (k, _) in RQ2_CONFIRM.items():
            if (r := rq2_model(rq2[rq2["engine"] == e], m, k)):
                split2.append({**r, "engine": e})
    s1, s2 = pd.DataFrame(split1), pd.DataFrame(split2)
    s1.to_csv(out / "rq1_by_engine.csv", index=False); s2.to_csv(out / "rq2_by_engine.csv", index=False)
    # models not fitted because of too little data (protocol section 6), listed so the report can say so
    fitted = lambda df, e=None: set(df["measure"]) if len(df) and e is None else (set(df.loc[df["engine"] == e, "measure"]) if len(df) else set())
    skipped = [{"rq": rq, "engine": e or "all", "measure": m} for rq, measures, pooled, split in
               (("RQ1", RQ1_MEASURES, rq1, s1), ("RQ2", RQ2_CONFIRM, rq2r, s2))
               for e in [None] + ENGINES for m in measures if m not in fitted(pooled if e is None else split, e)]
    pd.DataFrame(skipped, columns=["rq", "engine", "measure"]).to_csv(out / "not_estimated.csv", index=False)
    robustness(pg).to_csv(out / "rq1_robustness_all_measures.csv", index=False)

    # thesis rule: a finding after BH that points the same way on at least three of the four engines
    def support(pooled, split, effect):
        rows = []
        for _, r in pooled[pooled.get("finding", pd.Series(dtype=bool)) == True].iterrows() if len(pooled) else []:
            sp = split[split["measure"] == r["measure"]] if len(split) else pd.DataFrame()
            same = int(((sp[effect] > 1) == (r[effect] > 1)).sum()) if len(sp) else 0
            rows.append({"measure": r["measure"], effect: r[effect], "q_bh": r["q_bh"], "engines_same_direction": same, "supports_thesis": same >= 3})
        return pd.DataFrame(rows)
    sup = pd.concat([support(rq1, s1, "rate_ratio").assign(rq="RQ1"), support(rq2r, s2, "odds_ratio").assign(rq="RQ2")])
    sup.to_csv(out / "thesis_support.csv", index=False)
    flow = T["flow"]
    flow.update({"answers": int(len(flags)), "brand_mentions": int(len(mentions)), "recommended": int(len(rec)),
                 "rq2_rows": int(len(rq2)), "rq2_groups": int(rq2["group"].nunique()) if len(rq2) else 0})
    (out / "flow.json").write_text(json.dumps(flow, indent=2))
    lines = ["# Analysis summary", "", "Run: " + a.run, "", "## Flow", ""] + [f"- {k}: {v}" for k, v in flow.items()]
    lines += ["", "## Thesis support", "", "Supported." if len(sup) and sup["supports_thesis"].any() else "Not supported by any measure.", ""]
    for name, df in (("RQ1 pooled", rq1), ("RQ2 pooled", rq2r)):
        lines += ["## " + name, "", df.to_markdown(index=False) if len(df) else "No model could be fitted.", ""]
    lines += ["## Exploratory (below the hand-check bar, outside the correction and the thesis rule)", "",
              rq2x.to_markdown(index=False) if len(rq2x) else "No model could be fitted.", ""]
    lines += ["## Not estimated (too little data)", "", f"{len(skipped)} models; see not_estimated.csv.", ""]
    for rq in ("RQ1", "RQ2"):
        for e in ["all"] + ENGINES:
            ms = [x["measure"] for x in skipped if x["rq"] == rq and x["engine"] == e]
            if ms:
                lines.append(f"- {rq}, {e}: " + ", ".join(ms))
    (out / "summary.md").write_text("\n".join(lines))
    print("\n".join(lines[:12]))


if __name__ == "__main__":
    sys.exit(main())
