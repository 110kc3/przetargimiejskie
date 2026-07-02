# TODO

> Open backlog only. Shipped work lives in [CHANGELOG.md](./CHANGELOG.md)
> (extension) and git history (pipeline/site). **Last refreshed: 23 June 2026 —
> extension v1.31.0.**
>
> **Recently shipped (removed from this list):**
> - **P0-C — SEO site pages (2 July 2026):** `scripts/build-seo-pages.mjs` (called
>   from `build-site.sh`) statically generates `/<miasto>/` per city, one page per
>   property (full auction history), monthly "co miasto wystawiło" recaps (24 mo),
>   the `/miasta/` hub, and `sitemap.xml` — 1 026 URLs over the Śląskie cities
>   (mirrors the landing's public gate; widen via `PUBLIC_VOIVODESHIPS`). Plus
>   `site/robots.txt` (excludes the `/archiwum-all` test view, points at the
>   sitemap). Titles/meta target the GTM §3 queries; stale `active` listings
>   render as "po terminie", so counts match `meta.json`. Site-only → no
>   extension version bump.
> - Houses/land kinds + the requested **kind & city filters** — extension popup
>   (v1.31.0) and site archive/raporty — plus the deal-score badge, Google-Maps
>   column, and land sources/prices.
> - **23 June bug sweep (ext v1.30.2):** watchlist-scan abort that silenced all
>   notifications, notification-click registry race, wadium urgency on non-ISO
>   dates, `zabudowa`/`zabudowy` → *dom* alias (extension i18n **and** pipeline
>   `KIND_ALIASES`), first-attempt discount baseline, archive null-row sort.
>   Pipeline: kind heal now runs on the first-run / `MERGE_HISTORY=0` paths,
>   dateless-listing dedupe, property-kind reconciliation from listings, a
>   discriminating dateless merge fingerprint, malformed `auction_date` kept
>   (not dropped), zero-count index placeholder on first-run failure. Site:
>   kind-alias normalisation on load + cities-stat default.
> - Website **favicon** (all pages).
>
> **Uncommitted — 25 June 2026 session (needs commit/PR, then move to shipped):**
> - **Pipeline now refreshes DAILY** — `refresh.yml` cron `0 4 * * *` (04:00 UTC
>   ≈ 06:00 PL) instead of weekly Mondays. OVH deploy already chains off it via
>   `workflow_run`; `health.yml` / `health-check.js` comments updated for daily.
> - **Geoportal/ULDK fixes:** `geoportal.js` fallback now keeps the street for
>   addr-only plots; `uldk.js` gained a *construct-and-verify* path (build
>   `gmina.OOOO.parcel`, confirm via ULDK `GetParcelById`) that bypasses
>   placeholder obręb names. Applied to Sosnowiec land data: **63 → 157 precise
>   geoportal links** (+94). New `uldk`/`geoportal` unit tests. Full write-up in
>   `BUGCHECK-2026-06-25.md`.
> - **Quick-win chores (done):** health `STALE_DAYS` 14 -> 3 (safe under the
>   daily cadence — `generated_at` is rewritten every run); `.gitattributes`
>   line-ending normalisation, which kills the CRLF `git status` noise
>   (~1,200 -> 15 modified files); popup `mapsCell` now uses the structured
>   `street`+`building` like the archive. Ext **v1.31.0 -> v1.31.1** (+ CHANGELOG).

## Project review — CI capacity + expansion strategy (2 July 2026)

**Findings (verified against live CI runs via the GitHub API):**

- **There is no 1h GitHub limit.** Last 8 refresh runs: 36–56 min wall, all green.
  Public repo → Actions minutes are free/unlimited; per-job cap is 6h. The wall
  time was self-inflicted `max-parallel: 4`. A refresh costs ~130 runner-min
  across 46 cities (~2.8 min/city, ≈half of it per-job setup).
- **Shipped in this review:** `max-parallel` 4 → 10 in `refresh.yml` +
  `backfill.yml` (each job crawls a *different* BIP — the in-job throttle is the
  politeness layer, not job count); Playwright Chromium install now conditional
  on the registry's `needsRender` flag (only Chrzanów; saves ~1–2 min × every
  other job). SPIKE-COVERAGE verified **all fixes already shipped** — doc header
  updated so it reads as the audit record it now is.
- **Don't move the refresh to a local PC.** It would lose the 04:00 schedule,
  per-city failure isolation, the health gate, and the rebase-retry commit flow;
  Windows needs WSL for tesseract/catdoc anyway. If capacity ever matters, a
  **self-hosted runner** keeps the workflows unchanged.

**Deferred (from the review):**

- **Shard small cities into grouped matrix jobs** (~4–5/job): most city jobs
  finish in <2 min of which crawling is seconds — grouping amortizes the
  apt-get/npm/checkout overhead and roughly halves total runner minutes. Do it
  when the built-city count makes wall time creep again (~100+ cities).
- **Build order: the Low-effort + big-city subset of the BUILD-ready queue
  first** (Wrocław, Poznań, Bydgoszcz, Płock, Kalisz, Elbląg, Grudziądz,
  Włocławek…) — high auction volume + completes the credible national claim.
- **Demand-gate the ~900-town long tail.** ~40% of spiked cities are
  NO-BUILD (bezprzetargowo pattern) and small towns add a handful of auctions/yr
  but a permanent maintenance liability. Only worth it as a "complete Poland"
  marketing moat with revenue behind it.
- **Distribution before more adapters:** the Web Store submit (below; SEO pages
  shipped 2 July) converts the built cities into users; more adapters multiply
  inventory nobody sees. Per EXPANSION.md: let revenue, not the city list,
  decide.

**Time to spike all of Poland + build (at demonstrated pace — 204 spikes in ~5
days of batched agents; 7 adapters built+tested in a day):**

| Work | Remaining | Estimate |
|---|---|---|
| Powiat-seat spikes | 132 of 380 | ~1 week |
| Long-tail spikes (~900 towns) | ~700 | 2–4 weeks, low BUILD hit-rate |
| Builds — BUILD-ready queue | 64 | 2–4 weeks incl. first-live-refresh fix cycle |
| Builds — from pending spikes | est. +30–60 | +2–4 weeks |

**Total "every city in Poland" ≈ 1.5–3 months** at current cadence; powiat
seats only ≈ 3–4 weeks. The wrapper/pipeline itself is done — registry, matrix
CI, health checks, backfill, three parser families; marginal cost is per-city
only. CI scales to ~200 cities with the parallelism fix alone (+ sharding
beyond that).

## All-Poland city spike + CI fixes (27 June 2026)

**Spike every Polish city** — new `spikes/<woj>/<powiat>/<city>.md` tree grouped by
district (powiat), with a resume ledger
([spikes/SPIKE-PROGRESS.md](./spikes/SPIKE-PROGRESS.md)) +
[spikes/master-cities.json](./spikes/master-cities.json). **All 66 *miasta na
prawach powiatu* spiked** (one live-verified agent per city), plus a first batch of
land-powiat seats. Full architecture writeup in
[PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md).

- **First build of the wave shipped:** `pipeline/src/cities/legnica/` (+
  `pipeline/tests/parse-legnica.test.js`, registered in `cities/index.js`).
- **TODO — build the BUILD-verdict cities** (clone the closest analog adapter,
  groundtruth a parser test, register). BUILD list is in SPIKE-PROGRESS (e.g.
  Łódź, Wrocław, Wałbrzych, Olsztyn, Toruń, Białystok, Szczecin, Gdańsk,
  Bydgoszcz, Kielce, Gorzów Wlkp., Nysa, Piła, Stargard…).
- **TODO — continue spiking** the remaining land-powiat seats, then the town long
  tail per voivodeship (resume protocol in SPIKE-PROGRESS).

**CI fixes — refresh #88 (cancelled) + health (failed):**

- **Kędzierzyn-Koźle** crawler **bounded** (current+prev-year master-table filter +
  12-min wall-clock budget + 150-article cap) so it can't exceed the 25-min matrix
  job timeout that cancelled the run.
- **Oświęcim** crawler fixed — REKORD CMS now emits **relative** hrefs
  (`5987/dokument/…`) → optional-slash regexes; pagination is **1-indexed**
  (`strona/0` 404s). **Chrzanów** crawler fixed — board pages list only local
  article stubs; added the stub→`bip.malopolska.pl` fetch level. Both root causes
  **LIVE-VERIFIED** (27 June).
- `scripts/health-check.js` gained a documented **`EXEMPT_NEW`** set
  (kedzierzyn-kozle, oswiecim, chrzanow): a first-run adapter with missing meta /
  `unique=0` now WARNs instead of failing the build. **➡ Remove each from
  `EXEMPT_NEW` once its first live refresh commits non-empty data** (then a real
  future drop to 0 fails again).
- All four pipeline edits verified by direct read; they get their runtime
  validation on the next live refresh. Pipeline-only → no extension version bump.

## Neighbouring-voivodeship expansion (IN PROGRESS — 26 June 2026)

First push **outside Śląskie**, into the two adjacent voivodeships that hug the
existing cluster. Seven candidate gminas were live-spiked in parallel (full
per-city source profiles in [SPIKE-NEIGHBORS.md](./SPIKE-NEIGHBORS.md)): **5 BUILD,
2 NEEDS-LIVE-VERIFY, zero dead ends — and all 7 adapters are now built, parser-
tested and registered** (16 → 17 cities in `cities/index.js`; full suite 352/352).

**Build status — all 7 BUILT + parser-tested + registered (26 June 2026)**

| City | Voivodeship | Source profile (closest analog) | Parser test | Streams |
|---|---|---|---|---|
| Kędzierzyn-Koźle | Opolskie | Logonet eUrząd, text PDFs (Tarnowskie Góry) | ✅ green | announcements + **results** |
| Trzebinia | Małopolskie | Joomla HTML + price table (Bytom) | ✅ green | announcements + **results** |
| Kraków | Małopolskie | bespoke BIP, multi-property HTML (Tarn. Góry) | ✅ green | announcements + **results** |
| Olkusz | Małopolskie | WordPress HTML (FINN family) | ✅ green | announcements (offer-side) |
| Opole | Opolskie | SISCO, SSR articles | ✅ green | announcements only |
| Oświęcim | Małopolskie | REKORD list + PDF→OCR, multi-property | ✅ green | announcements (results scanned) |
| Chrzanów | Małopolskie | city-portal index + SPA BIP (render.js), land table | ✅ green | announcements (results pending) |

Each parser is groundtruthed against real fetched documents and unit-tested. The
**crawlers** (live BIP fetch) are validated on the first real refresh — see the
per-`config.js` "confirm on first CI refresh" notes (the SPA/OCR/SISCO-list/PDF
body paths especially).

### Pending — from YOU (Kamil): manual / account / review

Cannot be automated from inside a session:

1. **Run the first live refresh & review the data.** Parsers are unit-tested
   offline, but each *crawler* is only validated against the live BIP on a real
   run. Either push (CI `refresh.yml` runs it automatically) or run locally —
   `cd pipeline && CITY=kedzierzyn-kozle npm run refresh && npm run build-index`
   (needs `poppler-utils tesseract-ocr tesseract-ocr-pol`) — then **review the
   committed `data/kedzierzyn-kozle/` delta** before trusting it. Repeat per city
   as each lands.
2. **Decide on on-page overlays for the new cities.** Today they work **data-only**
   (popup + archive + website, fed from `data/<city>/*.json`) with **no extension
   change and no Web Store resubmit** — same posture as Zabrze/Sosnowiec. Adding
   the in-page badge overlay for a new host needs a `extension/sites/<city>.js` DOM
   adapter **+** new `host_permissions` in `manifest.json` **+ a Chrome Web Store
   resubmit** (account action, new-host-permissions review). Tell me if you want
   overlays; otherwise they stay data-only.
3. **Rebrand "Silesian" copy + `schema_version: 2` call.** README/PRIVACY/store
   copy still say "Silesian"; the data is now multi-voivodeship. Decide when to
   update the copy and whether to bundle the city-namespaced-key schema bump
   (P2-E) — both are user-facing calls.

### Pending — from ME (code, automatable next session)

1. ✅ **DONE — all 7 adapters built, parser-tested, registered.** Each has a
   groundtruthed `pipeline/tests/parse-<city>.test.js` and a `cities/index.js`
   entry; full suite 352/352.
2. **Crawler hardening after the first live refresh** (the body-fetch paths that
   can't be verified offline — flagged per-`config.js`): **Chrzanów** SPA body via
   `render.js` vs. BIP article JSON vs. text-PDF; **Oświęcim** scanned-PDF OCR
   output quality (REKORD `api/download/file`); **Opole** SISCO SPA list →
   `?news_id` harvest (AJAX endpoint / id-probing); the Małopolskie WordPress/Joomla
   index harvests + pagination depth. Tune against the first run's logs/deltas.
3. **Result (achieved-price) streams still to add:** **Chrzanów** "Wyniki
   przetargów" board; **Oświęcim** result notices (scanned → OCR); confirm whether
   **Opole** posts any result notice at all. (Kędzierzyn-Koźle, Trzebinia, Kraków
   already parse results.)
4. **Kędzierzyn-Koźle refinements** (low risk, after first run): flat-*announcement*
   table parsing (upcoming flat auctions as active listings) + genitive↔nominative
   announcement↔result join key; confirm the Logonet `/api/menu/<id>/articles` JSON
   and board-85 master-table auto-discovery reaches every year.
5. **README "Cities covered" / attribution** refresh (done for the 7) and (optional)
   the **per-city CI matrix** in `refresh.yml` (EXPANSION §1.6) so one new city's
   break is isolated.

> This expansion is **pipeline-only** → **no extension version bump** (per
> CLAUDE.md): the new cities surface through the existing `data/<city>/*.json`
> path that the popup, archive and website already read.

## Highest leverage

### Publish to the Chrome Web Store — SUBMIT (account action)

The live store build is **v1.3.3** (29 May) — local is **v1.31.0**, so roughly a
month of features and fixes is unpublished (houses/land + filters, deal score,
maps column, popup city/kind filters, the v1.30.2 bug sweep). Rebuild the zip
from `extension/` (verify `manifest.json` at the zip root; it's gitignored),
upload via the developer dashboard. Listing copy is ready in
[WEB_STORE_LISTING.md](./WEB_STORE_LISTING.md). Expect a new-host-permissions
review flag (the v1.21/v1.22 city hosts); no new permissions since. **This is the
only remaining step and it's an account action — can't be automated.**

### P0-C follow-ups (SEO pages shipped 2 July 2026 — see Recently shipped)

The generator is live in `build-site.sh`. Remaining from GTM week 1–2:
privacy-friendly analytics (Plausible/Umami) to measure whether the pages pull
traffic (the §6 kill criteria need data), submitting `sitemap.xml` to Google
Search Console (account action), and widening `PUBLIC_VOIVODESHIPS` in
`scripts/build-seo-pages.mjs` + a locative `CITY_LOC` entry per city when the
public gate opens beyond Śląskie.

## Extension

### P1-A — Extension CI job (lint + manifest + parity)

The ~10.8k LOC of `extension/` + `site/` JS has no lint or manifest validation
of its own. Add a CI job running `web-ext lint` (or eslint), `manifest.json`
validation, and the existing normalize-parity test. Cheap insurance for the
user-facing artifact. (The manifest↔popup↔changelog version lockstep is already
enforced by `pipeline/tests/extension-version.test.js`.)

### Content-script adapters — Zabrze + Sosnowiec (deferred)

7/9 cities have on-page overlays. Zabrze (Vue SPA; address lives in a downloaded
attachment, no DOM key) and Sosnowiec (React SPA, JSON-backed; content.js runs
once at document_idle before hydration) stay popup/archive-only. Revisit only if
either gains a server-rendered surface or content.js is reworked to observe SPA
navigation.

### Manifest host-list alignment (cosmetic)

`content_scripts.matches` includes `katowice.eu` and `bytom.pl` (no-www) that
aren't in `host_permissions`. No functional impact (the SW only fetches
raw.githubusercontent.com; content scripts inject off `matches` alone). Align
the two lists, or add a consistency test, only if a future change needs
page-host fetch permissions.

## Pipeline

### P1-D — Weekly newsletter digest generator

GTM.md week-1 item and the vehicle for sponsorship + lead-gen. A GitHub Action
renders a Markdown/HTML "new auctions this week per city" digest from the
`data/*/properties.json` deltas. Build the generator now; the send/ESP
integration (and the RODO privacy update, see Chores) can follow.

### P2-B — Gliwice/Katowice area backfill (network-gated)

~37 Gliwice + ~40 Katowice concluded listings have no `area_m2` (result
PDFs/yearly-summaries carry no area; detail-page enrichment only covered
listings active at crawl time). A one-off crawl of archived detail slugs still
resolvable on `zgm-gliwice.pl` (and Katowice DispForm pages) fills the gap and
makes the zł/m² deal score far more complete. Write as
`pipeline/scripts/backfill-areas-<city>.js`, idempotent (skip rows that already
have area), run once under CI. Requires live network + mutates committed data,
so it can't be authored/verified fully offline.

### Tarnowskie Góry — active listings missing price + area (PDF extraction)

15 active listings carry no starting price and 18 no `area_m2` — the worst of
any city (audit 25 June 2026). The source is a React SPA with a clean JSON API
where each announcement carries ONE text PDF holding address / parcel / area /
starting price / auction date — so the data exists; the gap is the PDF
field-extraction not pulling price + area for these announcements. Fix the
parser's PDF field parsing, then re-crawl. Network-gated (needs the
announcement PDFs): author against the cached PDFs in `pipeline/pdf-text-cache/`
and verify before shipping.

### Tarnowskie Góry — geoportal links don't resolve (name-only obręby)

~45 land plots fall back to a Google search instead of a precise geoportal
deep-link. Unlike Sosnowiec (fixed 25 June via the obręb-number construct
path), TG's weak plots have NAME-ONLY obręby — no numeric code, so
construct-and-verify can't help — and several parcels don't resolve in ULDK by
name even after stripping the `" arkusz"` suffix (e.g. `Strzybnica arkusz
2476/3` → `brak wyników`). Needs deeper obręb/parcel normalisation (likely a
TG obręb name→number map); 12 of the 45 are addr-only (no parcel) and can't be
precise at all.

### P2-D — Make `heal-properties.js` folds durable in refresh

`heal-properties.js` (VERIFIED_JUNK, VERIFIED_RENAMES, crossCityDisplay) is a
MANUAL maintenance script whose output is committed, but `refresh.js` only runs
the street-variant + kind heals post-merge — so a bled junk key a fresh crawl
re-emits survives until a human runs heal again (and genitive→nominative display
fixes get reverted by the next refresh's `old.street = fp.street`). Export the
heal maps from a module and apply them inside `refresh.js` post-merge so every CI
run self-heals. (Partly related: as of 23 June the *kind* heal already runs on
all refresh paths; this item is the junk/rename maps.) Touches the shared build
path — verify against all 9 cities before shipping.

### P2-E — `schema_version: 2` with city-namespaced keys at the pipeline layer

EXPANSION §1.5: move the `city|street|building|apt` namespacing from the
extension's `background.js` into the pipeline, bump `schema_version` to 2, add a
`city` field per record. Cross-cutting across all 9 cities' data plus
`background.js`, `content.js` and `watchlist.js`, verifiable only in a real
browser — do it ONLY bundled with a schema bump that's needed anyway, as the
first task of that bump (not a standalone blind refactor).

### Verify Bytom `.doc` history retention over time

Confirm the Bytom `.doc` result-history is retained across refreshes (was a
watch-item from the results-stream work). Spot-check that old concluded auctions
persist after several crawl cycles.

### Katowice junk key — drop the P2-C allowlist once source is confirmed clean

The `oddzialow mlodziezy i ustny|86|` column-bleed fold is shipped, but the
sanity-check allowlist entry was kept as a re-derivation guard (heal runs
manually, and `mergeProperties` re-adds fresh-crawl-only keys). Drop it once a
Katowice CI run confirms the source no longer emits the bleed, or once the folds
are wired into refresh (P2-D).

### Katowice historical result PDFs — WON'T FIX (city policy)

The ~269 pre-2025 individual result PDFs return 404 **by design**: UM Katowice
removes individual wykazy after the required publication period (sensitive data),
keeping only the annual summaries (*"Informacja w sprawie zbywania
nieruchomości… za rok…"*). Confirmed by the Referat Obrotu Nieruchomościami
Miasta (reply received 23 June 2026). The pipeline already relies on the annual
summaries — nothing to recover; closing this out.

## Monetization

### Alert + saved-search MVP

[EXPANSION.md §4.6](./EXPANSION.md) — the smallest paid slice over the published
data: email alerts off a saved search ("new active listing in district X under N
zł/m²"). Needs a tiny hosted layer (Vercel + Supabase + Resend), independent of
the extension. Not started; decide whether to do this before adding more cities.
A RODO/privacy policy split is a prerequisite (see Chores).

## Chores (quick wins)

- **RODO/privacy split:** `PRIVACY.md` only covers the zero-data extension. The
  day a newsletter (P1-D) or lead form ships, a separate policy is needed
  (consent, lawful basis, deletion/export). Draft it alongside P1-D.

## Reference — city coverage

Nine cities built and published: Gliwice, Katowice, Bytom, Zabrze, Sosnowiec,
Rybnik, Bielsko-Biała, Mysłowice, Świętochłowice (+ Tarnowskie Góry data). The
Silesian field is fully spiked; everything not built is deferred on flat-auction
volume, not mechanics. Full status + drop rationale in
[SPIKE-WAVE2.md](./SPIKE-WAVE2.md); per-adapter notes in each
`pipeline/src/cities/<id>/config.js`.

- **Deferred (revisit on volume):** Jaworzno, Żory, Ruda Śląska.
- **Dropped (no open flat-auction stream):** Chorzów, Tychy, Dąbrowa Górnicza,
  Częstochowa, Siemianowice, Piekary, Wodzisław — flats go bezprzetargowo to
  tenants; auctions there are land/commercial.
- **Now the active expansion (no longer "out of region"):** the Małopolskie +
  Opolskie neighbours — Kędzierzyn-Koźle (built), Kraków, Trzebinia, Chrzanów,
  Olkusz, Oświęcim, Opole. See the *Neighbouring-voivodeship expansion* section at
  the top of this file and [SPIKE-NEIGHBORS.md](./SPIKE-NEIGHBORS.md).
- **Out of region / demand-gated:** Warszawa (~18 district BIPs).
- **Heuristic for any future spike:** a dedicated municipal housing manager
  (ZGM/ZBM/MZBM/ZGL) publishing "przetarg ustny … na sprzedaż lokali
  mieszkalnych" = build candidate; generic city-BIP property sections skew to
  land + tenant sales. Confirm open flat-auction volume EARLY.
