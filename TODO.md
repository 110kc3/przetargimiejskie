# TODO

> Open backlog only. Completed work lives in [CHANGELOG.md](./CHANGELOG.md)
> (extension) and git history (pipeline/site). 13 June 2026 audit: extension
> bug fixes shipped as v1.20.1 (Warsaw-time wadium flag, i18n default
> fallback, escaping hardening, archive/popup prior-count parity); new items
> below (6-city adapter gap, store-zip rebuild). Last big sweep: 10 June 2026 —
> the June bug reviews (pipeline ~25 findings, extension E/L series), the
> Zabrze result-stream + edge cases, the Świętochłowice price/date fix, the
> Katowice land-row/kind fixes, the per-city CI matrix, and the site/archive
> fixes are all DONE and removed from this list.
>
> **14 June 2026 audit (improvement backlog below):** a full read-through of
> README/PLAN/EXPANSION/GTM produced a prioritised improvement list (P0/P1/P2 +
> chores), captured in the new section directly below. **Shipped that day:**
> P0-B (health monitor), P1-B (version-lockstep test), P1-C (deal-score badge,
> ext **v1.23.0**), P2-A (normalize parity test), P2-C (Katowice junk-key fold).
> Still open: P0-A coverage growth, P0-C (SEO site), P1-A (extension CI), P1-D
> (newsletter), P2-B (area backfill), P2-D (durable heals), P2-E (schema v2),
> chores.

## Improvement backlog (14 June 2026 audit)

> Prioritised: **P0** = highest leverage, do soon; **P1** = strong value, clear
> scope; **P2** = worth doing, not urgent; **Chores** = quick wins. Two P2s are
> DONE (struck through). The strategic throughline: the SEO site + freshness
> monitoring + normalize-parity are the three things that most protect and grow
> the product for the least work.

### P0-A — Guard pipeline↔extension `normalize.js` parity (DONE substrate, expand coverage)

The extension's `extension/normalize.js` (IIFE → `window.ZGM_NORMALIZE`) and the
pipeline's `pipeline/src/core/normalize.js` (ESM) hand-maintain the SAME
`parseAddress` join-key logic in two files (different module systems, no
extension build step). Every drift between them has silently hidden auction
history in production (v1.14.0 join-key bugs, v1.14.2 E1–E4). **Done so far:**
`pipeline/tests/normalize-parity.test.js` loads the extension file via `node:vm`
and asserts identical `parseAddress` output over 20 bug-history fixtures (runs
in `npm test`, so CI is now red on any divergence). **Still open:** grow the
fixture list whenever a new join bug is found; consider asserting
`addressFromSlug` parity too if the pipeline ever gains a slug parser.

### ~~P0-B — Data-freshness / source-health monitor~~ — DONE (14 June 2026)

Shipped `pipeline/scripts/health-check.js` (+ `npm run health`) and a daily
`.github/workflows/health.yml` (07:00 UTC, also on data-touching PRs). It reads
the committed `data/index.json` + per-city `meta.json` (no network) and FAILS
the job — GitHub then emails, the same visibility refresh.yml relies on — when a
city's `unique_properties` is 0 (adapter broke) or its `generated_at` is older
than `STALE_DAYS` (default 14; a missed fortnight of weekly refreshes). 0 active
auctions/listings is a non-failing WARN (can be a legitimate quiet period — e.g.
Rybnik today). Verified green against current data (9 cities). **Follow-up
(optional):** add an `if: failure()` step that opens a tracking issue via a
pinned github-script, and a "dropped from non-zero to 0" delta check (needs
previous-state history, not just the current snapshot).

### P0-C — Build the SEO site pages (per-city + per-listing)

GTM.md §3/§7 makes indexable per-city and per-listing pages the **prerequisite
for every revenue model** and the cheap demand test ("if SEO doesn't pull
traffic, nothing works — learned for ≈€0"). Today `site/` is only `index.html` +
`archiwum/` + `privacy/`. All the JSON already exists. In `pages.yml`, generate
at build time: one `/<miasto>/` page per city and one page per listing, with
`<title>`/meta on the queries the doc lists (`przetarg mieszkania <miasto>`,
`lokale ZGM <miasto>`), a `sitemap.xml`, and a monthly "co miasto wystawiło w
<miesiąc>" recap per city. Mostly templating over existing data — the
highest-impact unbuilt item in the repo.

### P1-A — Extension CI job (lint + manifest + parity)

The ~10.8k LOC of `extension/` + `site/` JS has no lint, no manifest validation,
no test of its own. Add a CI job running `web-ext lint` (or eslint), a
`manifest.json` validation, and the P0-A parity test. Cheap insurance for the
user-facing artifact.

### ~~P1-B — Auto-enforce the manifest↔popup version match~~ — DONE (14 June 2026)

Shipped `pipeline/tests/extension-version.test.js` (runs in `npm test`/CI): it
asserts `extension/manifest.json` `version`, the `extension/popup.html`
`<span class="version">vX.Y.Z</span>` label, and the top `## vX.Y.Z` header in
`CHANGELOG.md` are all the same semver. Drift in any of the three — including
forgetting the changelog entry on a bump — is now a red build. (It caught its
own first use: the v1.23.0 bump for P1-C failed until the changelog entry was
added.)

### ~~P1-C — "Deal score" / zł-m² vs local-median badge~~ — DONE (14 June 2026, ext v1.23.0)

Shipped `extension/dealscore.js` (loaded in the popup and as a content script):
computes the median zł/m² per city client-side from the already-fetched data
(residential only — garages/commercial excluded; ≥5 priced flats required), and
shows a green "▼ N% below median" / amber "▲ N% above median" badge next to
zł/m² in the popup's active table AND on the on-page stats chip. PL/EN strings,
popup.css + styles.css badge styles, no new permissions. Core math is
CI-covered by `pipeline/tests/dealscore.test.js`; sanity-checked against live
data (Gliwice ~5067, Katowice ~4198, Zabrze ~3155 zł/m²). **Not yet done:** the
**archive page** rows (archive.js) don't show the badge — add there next; and
per-**district** medians (currently per-city) once district data exists. Pairs
with P2-B (area backfill) for completeness.

### P1-D — Weekly newsletter digest generator

GTM.md week-1 item and the vehicle for sponsorship + lead-gen. A GitHub Action
renders a Markdown/HTML "new auctions this week per city" digest from the
`data/*/properties.json` deltas. Build the generator now; the send/ESP
integration (and the RODO privacy-policy update, see Chores) can follow.

### ~~P2-A — Anti-drift mechanism for the two normalize.js files~~ — DONE (14 June 2026)

The genuinely-safe form of "de-duplicate normalize.js" (a blind source-merge
would need real-browser verification and the files have diverged surfaces —
`nominativeStreetDisplay` is pipeline-only, `addressFromSlug` extension-only).
Shipped as `pipeline/tests/normalize-parity.test.js` (see P0-A): the two files
can no longer silently diverge on `parseAddress`. A true single-source merge
(generate one file from the other in a build step) remains optional and is only
worth it if the extension ever gains a build pipeline.

### P2-B — Gliwice/Katowice area backfill (network-gated)

~37 Gliwice + ~40 Katowice concluded listings have no `area_m2` because result
PDFs/yearly-summaries carry no area and detail-page enrichment only covered
listings active at crawl time. A one-off crawl of archived detail slugs still
resolvable on `zgm-gliwice.pl` (and Katowice DispForm pages) fills the gap and
makes P1-C (zł/m²) far more complete. **Not done in the 14 June pass:** it
requires live network + mutates committed data and so can't be authored and
verified offline; write it as `pipeline/scripts/backfill-areas-<city>.js`,
idempotent (skip rows that already have area), and run once under CI.

### ~~P2-C — Resolve the Katowice `oddzialow mlodziezy i ustny|86|` junk key~~ — DONE in data (14 June 2026)

The real 2025-02-24 sale (450 000 → 517 500 zł) stranded under this
column-bleed key now has a unique survivor by date+price+final:
`powstanczej|5|8` (area **86,38 m²** — the bled "86" was the area; "Powstańcza"
is the short spelling of "Oddziałów Młodzieży Powstańczej", proven by the
`|5|10` twin pair). The earlier "matches no survivor" note was stale — the
per-auction wykaz source captured the flat cleanly in a later refresh.
**Done:** added the fold to `heal-properties.js` VERIFIED_JUNK
(`['oddzialow mlodziezy i ustny|86|', 'powstanczej|5|8']`), ran heal + recount +
build-index (Katowice 128→127 unique, archived 134→133 — the duplicate sold
auction was being double-counted), and fixed `recount-auctions.js` to also
recompute `unique_properties` (it previously left it stale after a fold).
**Caveat / follow-up:** the sanity-check allowlist entry was KEPT (not removed)
as a re-derivation guard, because heal runs manually (not in `refresh.yml`) and
`mergeProperties` re-adds a fresh-crawl-only key — so if the 2025 BIP
yearly-summary still re-emits the bleed, the junk returns between a refresh and
the next manual heal. Drop the allowlist once a Katowice CI run confirms the
source no longer emits it, OR once the VERIFIED_JUNK folds are wired into
refresh (see P2-D).

### P2-D — Make `heal-properties.js` folds durable in refresh (optional)

Root cause behind the P2-C caveat: `heal-properties.js` (VERIFIED_JUNK,
VERIFIED_RENAMES, crossCityDisplay) is a MANUAL maintenance script whose output
is committed, but `refresh.js` only runs `healStreetVariants` post-merge — so
any bled junk key a fresh crawl re-emits survives until a human runs heal again
(and `crossCityDisplay` genitive→nominative fixes get reverted by the next
refresh's `old.street = fp.street`). Export the heal maps from a module and
apply them inside `refresh.js` post-merge so every CI run self-heals. This makes
the P2-C allowlist genuinely removable. Touches the shared build path — verify
against all 9 cities before shipping.

### P2-E — `schema_version: 2` with city-namespaced keys at the pipeline layer

EXPANSION §1.5: move the `city|street|building|apt` namespacing from the
extension's `background.js mergeCityPayloads()` into the pipeline, bump
`schema_version` to 2, add a `city` field per record. **Deliberately NOT done in
the 14 June pass:** it is a cross-cutting change across all 9 cities' data files
plus `background.js`, `content.js` (`byKey`) and `watchlist.js`, verifiable only
in a real browser — exactly what Wave 0 deferred, and EXPANSION + CLAUDE.md
("No Guessing") both say to do it ONLY bundled with a schema bump that's needed
anyway. Keep it as the first task of the next real schema bump, not a standalone
blind refactor.

### Chores (quick wins)

- **`.gitignore` the committed `_site/`** and remove it from the index — it's a
  build artifact (`build-site.sh` regenerates it) that goes stale and actively
  misled debugging during the 10 June "site looks broken" incident. (Also listed
  under Pipeline below.)
- **Align manifest `matches` vs `host_permissions`** lists, or add a test
  asserting they stay consistent (also under Extension below — cosmetic today).
- **RODO/privacy split:** `PRIVACY.md` only covers the zero-data extension. The
  day a newsletter (P1-D) or lead form ships, a separate policy is needed
  (consent, lawful basis, deletion/export) per GTM.md §5 / EXPANSION §4.7. Draft
  it alongside P1-D so legal isn't the launch blocker.

## Pipeline

### ~~CI security scanning — Trivy + SAST~~ — DONE (13 June 2026)

`.github/workflows/security.yml` added: CodeQL (javascript, PR/push + Monday
cron) and Trivy `fs` (vuln + secret scanners, SARIF → Security tab,
non-blocking). All third-party actions across security.yml, refresh.yml,
pages.yml and ovh-deploy.yml are now pinned to a full commit SHA with the
human tag in a trailing comment (checkout v4.3.1, setup-node v4.4.0,
upload-pages-artifact v3.0.1, deploy-pages v4.0.5, codeql-action v3.36.2,
trivy-action 0.35.0).

NOTE: SARIF upload to the Security tab requires code scanning to be enabled
on the repo (free for public repos). If the first run errors on upload,
enable it under Settings → Security → Code scanning.

### ~~Wire the remaining sold-price results streams~~ — DONE where streams exist (10 June 2026)

- **Sosnowiec — WIRED.** Dedicated "Wyniki przetargów" board found (menu
  **7043**, sibling of Przetargi; 182 archived notices, mostly land —
  `isFlatResult` keeps the flat sales). `crawlResultDocs` walks it via the
  same JSON API; `parseResultDoc` reads the past-tense body ("że w dniu
  23.01.2026 r. … odbył się"), cena wywoławcza, "osiągnięto najwyższą cenę"
  and the buyer. Validated against the real Zwycięstwa 25/15 article
  (77 000 → 92 000 zł, 17,85 m²); `areaFromText` also gained the abbreviated
  "pow. użytkowej" label. Tests in `tests/parse-sosnowiec.test.js`.
- **Świętochłowice — WIRED (validate on first CI run).** The board's
  "Informacja o wyniku z III przetargu … przy ul. Polaka 7/6" PDFs (~45 KB)
  now feed `crawlResultDocs` from the SAME memoised page walk as the
  announcements; the title alone yields the address key + round, the body
  (pdftotext, catdoc fallback) the date + prices. Body parsing is
  best-effort (no extractable sample at build time — Zabrze precedent): a
  record is emitted only when the outcome is determinable, otherwise the
  refresh WARN flags it for tuning. Tests in
  `tests/parse-swietochlowice.test.js`.
- **Rybnik — confirmed NONE.** The ZGM BIP menu has no results category
  ("Wyniki postępowań" = procurement only); the flat-sale section carries
  zasady/wykazy/ogłoszenia only. Announcement-history model stands.
- **Bytom — confirmed NONE (re-spiked).** No results category under "Zbycie
  nieruchomości" (six announcement categories only) and zero "wynik"
  content on the Tablica ogłoszeń. Bytom does not publish achieved prices;
  announcement-round history remains the signal.

Remaining without an achieved-price stream by SOURCE limitation: Bytom,
Rybnik, Bielsko-Biała (giełda drops sold items), Mysłowice (none observed —
worth a look if one appears on the FINN board).

### Verify Bytom `.doc` history retention over time

Time-gated: `retained_properties` is still 0 after the 10 June run (nothing
has rolled off the source yet). Confirm, once older auctions age out of both
the i-BIIP catalog and the BIP list, that their `properties.json` entries
(figures recovered from the cached `.doc`) survive the merge.

### ~~Verify the first per-city matrix CI run~~ — DONE (13 June 2026)

Verified against the 12 June run: per-city `data: refresh <city>` commits
landed without rebase-retry collisions and `data: rebuild index` produced a
complete 9-city `data/index.json` (shape matches what site/index.html and
archiwum consume).

### Katowice — externally blocked / product-gated

- **2024 + 2022 yearly-summary PDFs are confirmed unpublished** (both
  SharePoint folders enumerated exhaustively, 10 June 2026). Needs a content
  ticket at UM Katowice; nothing to code. Per-auction result wykazy cover
  those years partially.
- **Land-plot sales (~29 of 60 announcements) are skipped by design** — they
  don't fit `street|building|apt`. If the product ever surfaces land:
  synthetic `dz. nr <parcel>` keys (cheap) vs a `kind: "grunt"` type
  (principled). Decision needed first.

### City-namespaced keys in the data files (optional)

[EXPANSION.md §1.5](./EXPANSION.md): namespace property keys at the pipeline
layer (`city|street|building|apt`, `schema_version: 2`) instead of inside
`extension/background.js mergeCityPayloads()`. Pure tidying — the
extension-side namespacing works for all nine cities; do it only as part of a
schema bump that's needed anyway.

### Chore: stop committing `_site/`

`_site/` is a build artifact (`build-site.sh` regenerates it; the deploy
builds from `site/`), and the committed copy goes stale and confuses
debugging (it shadowed the real cause during the 10 June "site looks broken"
incident). Add it to `.gitignore` and remove from the index.

## Extension

### Publish to the Chrome Web Store — SUBMIT (account action, 13 June 2026)

The live store build is **v1.3.3** (29 May): 2 cities, the old "Od roku"
filter, none of the v1.14.2+ fixes/features. The latest local build is
**v1.23.0** (deal-score badge) — rebuild `przetargimiejskie-extension-v1.23.0.zip`
at the repo root from `extension/` (manifest.json verified at the root of the
zip; it's gitignored) before uploading. Listing copy is ready in
[WEB_STORE_LISTING.md](./WEB_STORE_LISTING.md). **Only remaining step is the
developer-dashboard upload + submission itself — an account action I can't
perform.** Note the v1.21.0/v1.22.0 host additions mean the store review will
flag new host permissions (expected); v1.23.0 adds no new permissions.

### ~~Content-script adapters for the newer cities~~ — 7/9 DONE (13 June 2026)

Shipped on-page overlays for four more cities (v1.21.0 + v1.22.0):
**Rybnik** (`sites/rybnik.js`, OGŁOSZENIE link label), **Mysłowice** +
**Świętochłowice** (`sites/myslowice.js` / `swietochlowice.js` + shared
`sites/finn-common.js`, FINN/Liferay title), **Bielsko-Biała**
(`sites/bielsko.js`, giełda node "Adres:" field, detail pages only). Keys
verified against the published data.

Still popup/archive-only, deferred by platform (not worth the risk with a
single document_idle content script):
- **Zabrze** — Vue SPA list; each flat's address lives inside a downloaded
  announcement attachment, not the page DOM. No reliable DOM key.
- **Sosnowiec** — React SPA backed by a JSON API; content.js runs once at
  document_idle (before hydration) and doesn't re-fire on SPA route changes.

Revisit only if either site gains a server-rendered surface, or if the content
script is reworked to observe SPA navigations + late hydration.

### Manifest host-list alignment (cosmetic)

`content_scripts.matches` includes `https://katowice.eu/*` and
`https://bytom.pl/*` (no-www) absent from `host_permissions`. No functional
impact (the SW only fetches raw.githubusercontent.com; content scripts inject
off `matches` alone). The v1.21/v1.22 city hosts were likewise added to
`matches` only — content scripts don't need `host_permissions`. Align the two
lists only if a future change needs page-host fetch permissions.

## City coverage (reference)

Nine cities built and published: Gliwice, Katowice, Bytom, Zabrze, Sosnowiec,
Rybnik, Bielsko-Biała, Mysłowice, Świętochłowice. The Silesian field is fully
spiked — everything not built is deferred on **flat-auction volume**, not
mechanics. Full status, drop rationales and the 10 June 2026 re-verification
live in [SPIKE-WAVE2.md](./SPIKE-WAVE2.md); per-adapter notes in each
`pipeline/src/cities/<id>/config.js`.

- **Deferred (revisit on volume):** Jaworzno (Sosnowiec-platform JSON API,
  scrapeable; flats only as council consents), Żory (plain-fetch scrapeable;
  ~5 wykazy/yr, no przetarg stream — `zbmzory.pl` is still domain-hijacked,
  keep blacklisted), Ruda Śląska (bip.info.pl + OCR template candidate; ~0
  open flat auctions now).
- **Dropped (no open flat-auction stream):** Chorzów, Tychy, Dąbrowa
  Górnicza, Częstochowa, Siemianowice, Piekary, Wodzisław — flats go
  bezprzetargowo to tenants; auctions are land/commercial. Several have
  ideal mechanics if the product ever expands to land sales.
- **Out of region / demand-gated:** Kraków, Warszawa (≈18 district BIPs —
  last).
- **Heuristic for any future spike:** a dedicated municipal housing manager
  (ZGM/ZBM/MZBM/ZGL) publishing "przetarg ustny … na sprzedaż lokali
  mieszkalnych" = build candidate; generic city-BIP property sections skew
  to land + tenant sales. Confirm open flat-auction volume EARLY.

## Monetization: alert + saved-search MVP

[EXPANSION.md §4.6](./EXPANSION.md) — the smallest paid slice over the
published data: email alerts off a saved search ("new active listing in
district X under N zł/m²"). Needs a tiny hosted layer (Vercel + Supabase +
Resend), independent of the extension. Not started; decide whether to do
this before adding more cities.

## Leftovers from the 12 June 2026 bug sweep (missing m² / weird streets)

- **Katowice `oddzialow mlodziezy i ustny|86|`** — junk key from the (now
  fixed) yearly-summary column bleed. Holds a REAL sale (2025-02-24,
  450 000 → 517 500 zł) whose true building/apt the bleed destroyed, and no
  surviving property matches it by date+price, so `heal-properties.js`
  deliberately refuses to fold it. Resolve manually against the source PDF
  ("Przetargi 2025 na BIP.pdf") and either re-key or fold it.
- ~~Genitive street display~~ — DONE for unambiguous endings (-owej/-nej/
  -czej/-niej via `nominativeStreetDisplay`) and for -skiej/-ckiej/-dzkiej
  with a nominative twin anywhere in the dataset (cross-city evidence in
  heal-properties). Remaining genitives ("Częstochowskiej", "Jagiellońskiej",
  "Grunwaldzkiej") are morphologically ambiguous with patron surnames — flip
  only if a curated allowlist of place-adjectives is ever added.
- ~~Bytom multi-street property~~ — DONE: joint-lot titles ("ul. Strażacka 3
  i ul. Podgórna 6/1") key on the first address (crawl.js `primaryAddress`);
  the published record was re-keyed to `strazacka|3|` with the 1 749 m² total
  moved to `land_area_m2`.
- **Area backfill for concluded listings** — Gliwice 37 and Katowice 40-odd
  properties have no `area_m2` because result PDFs carry no area and
  detail-page enrichment only covers listings active at crawl time. Zabrze
  self-heals on the next refresh (announcement text is cached; the wrapped-m²
  parser fix re-reads it). For Gliwice, consider a one-off crawl of archived
  detail slugs still resolvable on zgm-gliwice.pl.
- ~~Świętochłowice cellar-area leftovers~~ — DONE (12 June, evening): the CI
  refresh with the fixed `areaFromText` healed all five (verified 37–50 m²).
- **CI data sanity gate added** (12 June): `pipeline/scripts/sanity-check.js`
  runs per city in refresh.yml between refresh and commit — glued prices,
  cellar/plot areas, junk streets, zombie duplicates. Known exception:
  `katowice|oddzialow mlodziezy i ustny|86|` is allowlisted until the manual
  re-key (entry above). Keep the allowlist tied to TODO entries.
